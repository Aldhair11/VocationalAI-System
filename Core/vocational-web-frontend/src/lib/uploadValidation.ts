export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
] as const

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

export type AllowedFileKind = "pdf" | "png" | "jpeg" | "webp"

/** PDF spec: la firma %PDF puede aparecer dentro de los primeros 1024 bytes. */
const PDF_SIGNATURE_SCAN_BYTES = 1024

function containsPdfSignature(header: Uint8Array): boolean {
  const limit = Math.min(header.length, PDF_SIGNATURE_SCAN_BYTES)
  for (let i = 0; i <= limit - 4; i++) {
    if (
      header[i] === 0x25 &&
      header[i + 1] === 0x50 &&
      header[i + 2] === 0x44 &&
      header[i + 3] === 0x46
    ) {
      return true
    }
  }
  return false
}

function isZipArchive(header: Uint8Array): boolean {
  return header.length >= 2 && header[0] === 0x50 && header[1] === 0x4b
}

export function resolveUploadKind(
  header: Uint8Array,
  ext: string,
  mimeType?: string
): { ok: true; kind: AllowedFileKind } | { ok: false; error: string } {
  const kind = detectFileKind(header)
  if (kind) {
    const expectedKind: AllowedFileKind | null =
      ext === ".pdf"
        ? "pdf"
        : ext === ".png"
          ? "png"
          : ext === ".webp"
            ? "webp"
            : ext === ".jpg" || ext === ".jpeg"
              ? "jpeg"
              : null

    if (expectedKind && kind !== expectedKind) {
      return {
        ok: false,
        error: `La extensión del archivo (${ext}) no coincide con su contenido real.`,
      }
    }

    return { ok: true, kind }
  }

  if (ext === ".pdf") {
    if (isZipArchive(header)) {
      return {
        ok: false,
        error:
          "El archivo parece ser Word u Office, no un PDF. Ábrelo y guárdalo como PDF (Imprimir → Guardar como PDF).",
      }
    }

    if (
      !mimeType ||
      mimeType === "application/pdf" ||
      mimeType === "application/octet-stream"
    ) {
      return { ok: true, kind: "pdf" }
    }
  }

  return {
    ok: false,
    error:
      "El contenido no corresponde a una imagen o PDF válido. Verifica el archivo e intenta de nuevo.",
  }
}

export function detectFileKind(header: Uint8Array): AllowedFileKind | null {
  if (containsPdfSignature(header)) {
    return "pdf"
  }
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return "png"
  }
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "jpeg"
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "webp"
  }
  return null
}

export function extensionFromName(name: string): string {
  const i = name.lastIndexOf(".")
  if (i < 0) return ""
  return name.slice(i).toLowerCase()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mimeFromFileKind(kind: AllowedFileKind): string {
  if (kind === "pdf") return "application/pdf"
  if (kind === "png") return "image/png"
  if (kind === "jpeg") return "image/jpeg"
  return "image/webp"
}

export function validateUploadFileMeta(file: File): string | null {
  const ext = extensionFromName(file.name)
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return "Formato no permitido. Solo puedes subir JPG, PNG, WebP o PDF."
  }

  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    return "Tipo de archivo no permitido. Solo imagen (JPG, PNG, WebP) o PDF."
  }

  if (file.size === 0) {
    return "El archivo está vacío."
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `El archivo pesa ${formatFileSize(file.size)}. El máximo permitido es 4 MB. Comprime la imagen o divide el PDF.`
  }

  return null
}

export async function validateUploadFile(file: File): Promise<string | null> {
  const metaError = validateUploadFileMeta(file)
  if (metaError) return metaError

  const header = new Uint8Array(
    await file.slice(0, PDF_SIGNATURE_SCAN_BYTES).arrayBuffer()
  )
  const ext = extensionFromName(file.name)
  const resolved = resolveUploadKind(header, ext, file.type || undefined)

  if (!resolved.ok) {
    return resolved.error
  }

  return null
}

export async function parseOcrApiResponse(
  res: Response
): Promise<Record<string, unknown>> {
  const contentType = res.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return (await res.json()) as Record<string, unknown>
  }

  const text = await res.text()

  if (
    res.status === 413 ||
    /entity too large|payload too large|request en/i.test(text)
  ) {
    throw new Error(
      "El archivo supera el límite de 4 MB. Reduce el tamaño o usa una imagen más comprimida."
    )
  }

  throw new Error(
    "No se pudo procesar el archivo en el servidor. Verifica que sea una imagen o PDF de hasta 4 MB."
  )
}
