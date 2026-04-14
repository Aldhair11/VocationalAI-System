
const DEFAULT_ORIGIN = "http://127.0.0.1:8080"

const SUFFIX_ASSESSMENTS = "/api/v1/assessments"

export function normalizeVocationalApiOrigin(
  raw: string | undefined
): string {
  let u = (raw ?? "").trim()
  if (!u) return DEFAULT_ORIGIN
  u = u.replace(/\/+$/, "")
  if (u.endsWith(SUFFIX_ASSESSMENTS)) {
    u = u.slice(0, -SUFFIX_ASSESSMENTS.length).replace(/\/+$/, "")
  }
  return u || DEFAULT_ORIGIN
}

export function vocationalAssessmentsPostUrl(env?: string): string {
  return `${normalizeVocationalApiOrigin(env)}${SUFFIX_ASSESSMENTS}`
}

export function vocationalAssessmentChatUrl(
  assessmentId: number,
  env?: string
): string {
  return `${normalizeVocationalApiOrigin(env)}${SUFFIX_ASSESSMENTS}/${assessmentId}/chat`
}
