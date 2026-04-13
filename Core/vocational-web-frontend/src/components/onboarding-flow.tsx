"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"

import { Chat } from "@/components/Chat"
import { Landing } from "@/components/Landing"
import { Questionnaire } from "@/components/Questionnaire"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { labelForGradeKey } from "@/lib/gradeLabels"
import type { GradesMap } from "@/lib/types/grades"
import { GRADE_KEYS } from "@/lib/types/grades"
import { cn } from "@/lib/utils"

type Step = "LANDING" | "UPLOAD" | "QUESTIONNAIRE" | "CONFIRM" | "CHAT"

const QUESTIONS: { key: keyof QuestionnaireMap; text: string }[] = [
  {
    key: "q1Analitico",
    text: "¿Qué tanto disfrutas resolver problemas lógicos y matemáticos?",
  },
  {
    key: "q2Empatia",
    text: "¿Qué tanto te motiva ayudar a otras personas o entender cómo se sienten?",
  },
  {
    key: "q3Creatividad",
    text: "¿Qué tanto te atrae crear cosas nuevas (diseño, arte, escritura, música)?",
  },
  {
    key: "q4LecturaDebate",
    text: "¿Qué tanto te gusta leer en profundidad o debatir ideas con claridad?",
  },
  {
    key: "q5LiderazgoNegocios",
    text: "¿Qué tanto te atrae tomar decisiones, liderar proyectos o pensar en negocios?",
  },
]

type QuestionnaireMap = {
  q1Analitico: number | null
  q2Empatia: number | null
  q3Creatividad: number | null
  q4LecturaDebate: number | null
  q5LiderazgoNegocios: number | null
}

/** Payload enviado al backend (solo numeros) */
type QuestionnairePayload = {
  q1Analitico: number
  q2Empatia: number
  q3Creatividad: number
  q4LecturaDebate: number
  q5LiderazgoNegocios: number
}

function emptyQuestionnaire(): QuestionnaireMap {
  return {
    q1Analitico: null,
    q2Empatia: null,
    q3Creatividad: null,
    q4LecturaDebate: null,
    q5LiderazgoNegocios: null,
  }
}

function assertQuestionnaireComplete(
  q: QuestionnaireMap
): QuestionnairePayload | null {
  const out: Partial<QuestionnairePayload> = {}
  for (const item of QUESTIONS) {
    const v = q[item.key]
    if (v == null || typeof v !== "number") {
      return null
    }
    out[item.key] = v
  }
  return out as QuestionnairePayload
}

const ASSESSMENT_URL = "/api/assessments"

const glassCard =
  "border border-zinc-200/90 bg-white/85 shadow-sm backdrop-blur-md"

export function OnboardingFlow() {
  const [step, setStep] = React.useState<Step>("LANDING")
  const [grades, setGrades] = React.useState<GradesMap | null>(null)
  const [questionnaire, setQuestionnaire] =
    React.useState<QuestionnaireMap>(emptyQuestionnaire)
  const [qIndex, setQIndex] = React.useState(0)
  const [ocrLoading, setOcrLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [fullName, setFullName] = React.useState("Estudiante")
  const [email, setEmail] = React.useState("alumno@ejemplo.com")
  const [submitLoading, setSubmitLoading] = React.useState(false)
  const [aiMessage, setAiMessage] = React.useState("")
  const [assessmentId, setAssessmentId] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!ocrLoading) return
    setProgress(8)
    const t = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + 7))
    }, 220)
    return () => window.clearInterval(t)
  }, [ocrLoading])

  async function processFile(file: File) {
    setError(null)
    setOcrLoading(true)
    setProgress(0)
    try {
      const fd = new FormData()
      fd.set("file", file)
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: fd,
      })
      const data = (await res.json()) as GradesMap & {
        error?: string
        detail?: unknown
      }
      if (!res.ok) {
        const detail =
          typeof data.detail === "string"
            ? ` ${data.detail.slice(0, 200)}`
            : ""
        throw new Error((data.error ?? `Extracción ${res.status}`) + detail)
      }
      if (typeof data.notaMatematica !== "number") {
        throw new Error(
          "La respuesta del servidor no incluye las notas esperadas."
        )
      }
      setGrades(data as GradesMap)
      setProgress(100)
      setQuestionnaire(emptyQuestionnaire())
      await new Promise((r) => setTimeout(r, 380))
      setStep("QUESTIONNAIRE")
      setQIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcrLoading(false)
      setProgress(0)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) void processFile(f)
  }

  function onSelectQuestionnaire(n: number) {
    const q = QUESTIONS[qIndex]
    if (!q) return
    setQuestionnaire((prev) => ({ ...prev, [q.key]: n }))
  }

  function onNextQuestionnaire() {
    const q = QUESTIONS[qIndex]
    if (!q || questionnaire[q.key] == null) return
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex((i) => i + 1)
    } else {
      setStep("CONFIRM")
    }
  }

  async function submitAssessment() {
    if (!grades) return
    const qPayload = assertQuestionnaireComplete(questionnaire)
    if (!qPayload) {
      setError("Faltan respuestas en el cuestionario.")
      return
    }
    setError(null)
    setSubmitLoading(true)
    try {
      const body = {
        fullName: fullName.trim() || "Estudiante",
        email: email.trim() || "alumno@ejemplo.com",
        grades,
        questionnaire: qPayload,
      }
      const res = await fetch(ASSESSMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${raw.slice(0, 400)}`)
      }
      let mensaje = raw
      let id: number | undefined
      try {
        const j = JSON.parse(raw) as {
          id?: number
          mensajeOrientador?: string
        }
        if (typeof j.id === "number") {
          id = j.id
        }
        if (j.mensajeOrientador?.trim()) {
          mensaje = j.mensajeOrientador.trim()
        }
      } catch {}
      if (id === undefined) {
        throw new Error(
          "La respuesta del servidor no incluye el id de evaluación; no se puede iniciar el chat."
        )
      }
      setAssessmentId(id)
      setAiMessage(mensaje)
      setStep("CHAT")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const selectedByKey = questionnaire as Record<string, number | null | undefined>

  return (
    <>
      {step === "CHAT" && assessmentId !== null && (
        <div className="fixed inset-0 z-40 flex min-h-dvh flex-col bg-zinc-50 font-sans">
          <Chat
            assessmentId={assessmentId}
            initialAiMessage={aiMessage}
            className="min-h-0 flex-1"
          />
        </div>
      )}

      {step !== "CHAT" && (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-10 md:gap-12 md:py-14">
          {step === "LANDING" && (
            <Landing onStart={() => setStep("UPLOAD")} />
          )}

          {step === "UPLOAD" && (
            <Card
              className={cn(glassCard, "mx-auto w-full max-w-xl overflow-hidden")}
            >
              <CardHeader>
                <CardTitle className="font-sans text-xl text-zinc-900">
                  Libreta de notas
                </CardTitle>
                <CardDescription className="font-sans text-zinc-600">
                  Imagen (JPG, PNG, WebP) o PDF hasta 4 MB. Los PDF se envían a
                  Gemini para lectura directa del documento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void processFile(f)
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  onClick={() => !ocrLoading && fileInputRef.current?.click()}
                  className={cn(
                    "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 transition hover:border-zinc-300 hover:bg-white",
                    ocrLoading && "pointer-events-none opacity-80"
                  )}
                >
                  {ocrLoading ? (
                    <div className="flex w-full max-w-sm flex-col items-center gap-4">
                      <Loader2 className="size-10 animate-spin text-zinc-700" />
                      <p className="font-sans text-sm font-medium text-zinc-700">
                        Leyendo tu libreta…
                      </p>
                      <Progress
                        value={progress}
                        className="h-1.5 w-full bg-zinc-200/80"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-center font-sans text-sm font-medium text-zinc-600">
                        Arrastra aquí o haz clic para elegir archivo
                      </p>
                      <p className="mt-2 font-sans text-xs text-zinc-500">
                        Imagen o PDF · 8 áreas · literal MINEDU (AD/A/B/C)
                      </p>
                    </>
                  )}
                </div>
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 font-sans text-sm text-red-800">
                    {error}
                  </p>
                )}
                <Button
                  variant="ghost"
                  className="font-sans text-zinc-600"
                  onClick={() => setStep("LANDING")}
                >
                  ← Volver
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "QUESTIONNAIRE" && (
            <Questionnaire
              questions={QUESTIONS}
              qIndex={qIndex}
              selectedByKey={selectedByKey}
              onSelect={onSelectQuestionnaire}
              onNext={onNextQuestionnaire}
            />
          )}

          {step === "CONFIRM" && grades && (
            <Card
              className={cn(glassCard, "mx-auto w-full max-w-xl overflow-hidden")}
            >
              <CardHeader>
                <CardTitle className="font-sans text-zinc-900">
                  Confirmar
                </CardTitle>
                <CardDescription className="font-sans text-zinc-600">
                  Revisa notas y perfil antes de enviar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-medium text-zinc-600">
                      Nombre (opcional)
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Cómo te llamamos"
                      className="border-zinc-200 bg-white font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-medium text-zinc-600">
                      Correo
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="border-zinc-200 bg-white font-sans"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Notas por área
                  </h3>
                  <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white px-4 py-1 font-sans">
                    {GRADE_KEYS.map((key) => (
                      <li
                        key={key}
                        className="flex items-baseline justify-between gap-4 py-3"
                      >
                        <span className="text-sm text-zinc-700">
                          {labelForGradeKey(key)}
                        </span>
                        <span className="tabular-nums text-sm font-semibold text-zinc-900">
                          {grades[key]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Tu perfil
                  </h3>
                  <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white px-4 py-1 font-sans">
                    {QUESTIONS.map((q) => (
                      <li
                        key={q.key}
                        className="flex items-baseline justify-between gap-4 py-3"
                      >
                        <span className="line-clamp-2 text-sm text-zinc-700">
                          {q.text}
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-zinc-900">
                          {questionnaire[q.key] ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 font-sans text-sm text-red-800">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    className="font-sans"
                    onClick={() => {
                      setStep("QUESTIONNAIRE")
                      setQIndex(QUESTIONS.length - 1)
                    }}
                  >
                    ← Atrás
                  </Button>
                  <Button
                    className="min-w-[200px] rounded-xl font-sans font-medium"
                    disabled={submitLoading}
                    onClick={() => void submitAssessment()}
                  >
                    {submitLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      "Consultar orientación"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
