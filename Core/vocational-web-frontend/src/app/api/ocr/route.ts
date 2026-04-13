import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"

import {
  GRADE_KEYS,
  type GradesMap,
} from "@/lib/types/grades"

const VISION_MODEL =
  process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash"

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

const EXTRACTION_PROMPT = `Eres un sistema avanzado de extracción de datos para el Ministerio de Educación del Perú. 
Analiza este documento (libreta de notas o constancia de logros). Tu único objetivo es extraer, calcular y devolver el promedio numérico final para 8 áreas curriculares específicas, retornando UNICAMENTE un objeto JSON válido.

REGLAS DE CÁLCULO Y LÓGICA:
1. SISTEMA LITERAL A VIGESIMAL: Si las notas están en letras (AD, A, B, C), conviértelas a números ANTES de promediar usando esta escala estricta:
   - AD (Logro Destacado) = 19
   - A (Logro Esperado) = 16
   - B (En Proceso) = 12
   - C (En Inicio) = 10
2. PERIODOS (Bimestres/Trimestres): Si la libreta es de un solo año y tiene varios periodos, busca la columna de "Promedio Final" o "Calificación Final del Área". Si no existe esa columna, calcula el promedio matemático de los periodos.
3. AÑOS MULTIPLES O VACÍOS: Si la libreta tiene varios años (ej. 1ro a 5to), calcula el promedio matemático solo de los años que tengan notas. Ignora las columnas o años vacíos. Si solo hay un año con datos, usa ese dato directo (no hay necesidad de promediar con cero).
4. SUB-CURSOS: Si un área se divide en sub-cursos (ej. Álgebra y Geometría), unifica sus notas y promedia para obtener la nota del área principal (Matemática).
5. ÁREAS FALTANTES: Si no encuentras ninguna nota o referencia para una de las 8 áreas requeridas, asígnale el valor 13.
6. FORMATO DE SALIDA: Todas las notas finales deben ser NÚMEROS ENTEROS (redondeados) entre 0 y 20.

Las claves exactas del JSON que DEBES devolver son:
{
  "notaMatematica": 0,
  "notaComunicacion": 0,
  "notaCienciaTecnologia": 0,
  "notaCienciasSociales": 0,
  "notaIngles": 0,
  "notaArteCultura": 0,
  "notaEducacionFisica": 0,
  "notaDesarrolloPersonal": 0
}`

const DEFAULT_GRADE = 13

function extensionFromName(name: string): string {
  const i = name.lastIndexOf(".")
  if (i < 0) return ""
  return name.slice(i + 1).toLowerCase()
}

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
])

function mimeFromExtension(ext: string): string | null {
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "webp") return "image/webp"
  if (ext === "pdf") return "application/pdf"
  return null
}

function resolveMimeType(
  ext: string,
  declaredType: string | undefined
): string | null {
  if (declaredType && ALLOWED_MIME.has(declaredType)) {
    return declaredType
  }
  return mimeFromExtension(ext)
}

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

function normalizeGrades(parsed: Record<string, unknown>): GradesMap {
  const out = {} as GradesMap
  for (const key of GRADE_KEYS) {
    const v = parsed[key]
    let n =
      typeof v === "number" && Number.isFinite(v)
        ? Math.round(v)
        : typeof v === "string"
          ? Math.round(Number.parseFloat(v))
          : Number.NaN
    if (!Number.isFinite(n)) {
      n = DEFAULT_GRADE
    }
    out[key] = Math.min(20, Math.max(0, n))
  }
  return out
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
    const declaredType =
      file instanceof File && file.type ? file.type : undefined

    const mimeType = resolveMimeType(ext, declaredType)
    if (!mimeType) {
      return NextResponse.json(
        {
          error:
            "Formato no soportado. Usa JPG, PNG, WebP o PDF (máx. 4 MB en este entorno).",
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
          error: `El archivo supera el límite de ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Reduce el tamaño o divide el PDF.`,
        },
        { status: 413 }
      )
    }

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

    const grades = normalizeGrades(parsed)
    return NextResponse.json(grades)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const maxDuration = 120
