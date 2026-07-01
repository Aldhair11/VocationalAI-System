import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"

import {
  extensionFromName,
  MAX_UPLOAD_BYTES,
  mimeFromFileKind,
  resolveUploadKind,
} from "@/lib/uploadValidation"
import {
  GRADE_KEYS,
  type GradesMap,
} from "@/lib/types/grades"

const VISION_MODEL =
  process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash"

const MIN_DETECTED_GRADES = 3
const DEFAULT_GRADE = 13

const EXTRACTION_PROMPT = `Eres un sistema avanzado de extracción de datos para el Ministerio de Educación del Perú.

PASO 1 — VALIDACIÓN DEL DOCUMENTO (obligatorio):
- Si el archivo NO es una libreta de notas, constancia de logros, boleta escolar u otro documento escolar peruano con calificaciones visibles, devuelve ÚNICAMENTE este JSON:
  {"documentoValido": false, "motivo": "explicación breve en español para el estudiante"}
- Ejemplos de documentos NO válidos: selfies, memes, facturas, capturas sin notas, documentos en blanco, archivos ilegibles.
- NO inventes notas ni uses valores por defecto si el documento no es una libreta escolar.

PASO 2 — EXTRACCIÓN (solo si el documento SÍ es válido):
Devuelve ÚNICAMENTE un objeto JSON con esta forma:
{
  "documentoValido": true,
  "notaMatematica": 0,
  "notaComunicacion": 0,
  "notaCienciaTecnologia": 0,
  "notaCienciasSociales": 0,
  "notaIngles": 0,
  "notaArteCultura": 0,
  "notaEducacionFisica": 0,
  "notaDesarrolloPersonal": 0
}

REGLAS DE CÁLCULO Y LÓGICA:
1. SISTEMA LITERAL A VIGESIMAL: Si las notas están en letras (AD, A, B, C), conviértelas a números ANTES de promediar usando esta escala estricta:
   - AD (Logro Destacado) = 19
   - A (Logro Esperado) = 16
   - B (En Proceso) = 12
   - C (En Inicio) = 10
2. PERIODOS (Bimestres/Trimestres): Si la libreta es de un solo año y tiene varios periodos, busca la columna de "Promedio Final" o "Calificación Final del Área". Si no existe esa columna, calcula el promedio matemático de los periodos.
3. AÑOS MULTIPLES O VACÍOS: Si la libreta tiene varios años (ej. 1ro a 5to), calcula el promedio matemático solo de los años que tengan notas. Ignora las columnas o años vacíos.
4. SUB-CURSOS: Si un área se divide en sub-cursos (ej. Álgebra y Geometría), unifica sus notas y promedia para obtener la nota del área principal (Matemática).
5. ÁREAS FALTANTES: Si el documento es válido pero no encuentras una de las 8 áreas, usa null en esa clave. NO rellenes con 13 si no hay evidencia en el documento.
6. FORMATO DE SALIDA: Todas las notas detectadas deben ser NÚMEROS ENTEROS (redondeados) entre 0 y 20.`

function extractJsonFromModelText(raw: string): string {
  let t = raw.trim()
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "")
    t = t.replace(/\s*```\s*$/u, "")
  }
  const start = t.indexOf("{")
  const end = t.lastIndexOf("}")
  if (start >= 0 && end > start) {
    t = t.slice(start, end + 1)
  }
  return t.trim()
}

function parseGradeValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : typeof value === "string"
        ? Math.round(Number.parseFloat(value))
        : Number.NaN
  if (!Number.isFinite(n)) {
    return null
  }
  return Math.min(20, Math.max(0, n))
}

function buildGradesFromModel(
  parsed: Record<string, unknown>
): { ok: true; grades: GradesMap } | { ok: false; error: string } {
  if (parsed.documentoValido === false) {
    const motivo =
      typeof parsed.motivo === "string" && parsed.motivo.trim()
        ? parsed.motivo.trim()
        : "El archivo no parece ser una libreta o constancia de notas escolar."
    return { ok: false, error: motivo }
  }

  const detected: Partial<GradesMap> = {}
  let detectedCount = 0

  for (const key of GRADE_KEYS) {
    const value = parseGradeValue(parsed[key])
    if (value !== null) {
      detected[key] = value
      detectedCount += 1
    }
  }

  if (parsed.documentoValido !== true && detectedCount < MIN_DETECTED_GRADES) {
    return {
      ok: false,
      error:
        "No reconocemos una libreta de notas en este archivo. Sube una imagen o PDF legible de tu libreta o constancia de logros.",
    }
  }

  if (detectedCount < MIN_DETECTED_GRADES) {
    return {
      ok: false,
      error: `Solo se detectaron ${detectedCount} área(s) con notas. Necesitamos al menos ${MIN_DETECTED_GRADES}. Usa una libreta más legible o con más áreas visibles.`,
    }
  }

  const grades = {} as GradesMap
  for (const key of GRADE_KEYS) {
    grades[key] = detected[key] ?? DEFAULT_GRADE
  }

  return { ok: true, grades }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en el entorno del servidor." },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Falta el campo 'file' con el archivo." },
        { status: 400 }
      )
    }

    const name =
      file instanceof File && file.name ? file.name : "upload.bin"
    const ext = extensionFromName(name)

    if (![".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
      return NextResponse.json(
        {
          error:
            "Formato no permitido. Solo puedes subir JPG, PNG, WebP o PDF (máx. 4 MB).",
        },
        { status: 400 }
      )
    }

    const declaredType =
      file instanceof File && file.type ? file.type : undefined
    if (
      declaredType &&
      declaredType !== "application/octet-stream" &&
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
      ].includes(declaredType)
    ) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Solo imagen (JPG, PNG, WebP) o PDF.",
        },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length < 64) {
      return NextResponse.json(
        { error: "El archivo es demasiado pequeño o está vacío." },
        { status: 400 }
      )
    }
    if (buf.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `El archivo supera el límite de 4 MB. Reduce el tamaño o divide el PDF.`,
        },
        { status: 413 }
      )
    }

    const scanHeader = buf.subarray(0, Math.min(buf.length, 1024))
    const resolved = resolveUploadKind(scanHeader, ext, declaredType)
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 })
    }

    const mimeType = mimeFromFileKind(resolved.kind)
    const base64 = buf.toString("base64")

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: VISION_MODEL })

    const mediaPart = {
      inlineData: {
        mimeType,
        data: base64,
      },
    }

    const result = await model.generateContent([EXTRACTION_PROMPT, mediaPart])
    const response = result.response
    const text = response.text()
    if (!text?.trim()) {
      return NextResponse.json(
        { error: "El modelo no devolvió texto." },
        { status: 502 }
      )
    }

    let parsed: Record<string, unknown>
    try {
      const jsonStr = extractJsonFromModelText(text)
      parsed = JSON.parse(jsonStr) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        {
          error: "No se pudo interpretar el JSON devuelto por el modelo.",
          detail: text.slice(0, 800),
        },
        { status: 422 }
      )
    }

    const gradesResult = buildGradesFromModel(parsed)
    if (!gradesResult.ok) {
      return NextResponse.json({ error: gradesResult.error }, { status: 422 })
    }

    return NextResponse.json(gradesResult.grades)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 120
