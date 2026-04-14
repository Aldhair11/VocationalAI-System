"use client"

import { motion } from "framer-motion"
import { Brain, Send } from "lucide-react"
import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { vocationalAssessmentChatUrl } from "@/lib/vocationalApi"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "ai" | "user"
  content: string
}

/** Marcador interno mientras se espera la respuesta del backend */
const PENDING_AI_CONTENT = "__pending_ai__"

function newId(): string {
  return crypto.randomUUID()
}

function AiMarkdown({ content }: { content: string }) {
  return (
    <div className="markdown-body font-sans text-sm leading-relaxed text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="mt-3 border-b border-zinc-200/80 pb-1.5 font-sans text-base font-semibold text-zinc-900 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 font-sans first:mt-0 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 font-sans">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 font-sans">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed font-sans">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-zinc-800 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200/90 bg-white">
              <table className="w-full min-w-[min(100%,320px)] border-collapse text-left text-xs font-sans">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-100/90 text-zinc-900">{children}</thead>
          ),
          tbody: ({ children }) => <tbody className="font-sans">{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/90 last:border-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-200/80 px-3 py-2.5 align-top text-xs font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200/80 px-3 py-2.5 align-top text-xs text-zinc-700">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-zinc-200" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-zinc-300 pl-3 text-zinc-600">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-zinc-100 p-2.5 font-mono text-xs text-zinc-800 [&>code]:bg-transparent [&>code]:p-0">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className)
            if (isBlock) {
              return (
                <code className={cn("font-mono text-xs", className)} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800"
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function AnalyzingDots() {
  return (
    <span className="inline-flex gap-0.5 pl-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-zinc-400"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  )
}

export type ChatProps = {
  assessmentId: number
  initialAiMessage: string
  className?: string
}

export function Chat({ assessmentId, initialAiMessage, className }: ChatProps) {
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: newId(),
      role: "ai",
      content:
        initialAiMessage.trim() ||
        "Aquí aparecerá la orientación según tus notas y tu perfil.",
    },
  ])
  const [draft, setDraft] = React.useState("")
  const [awaitingAi, setAwaitingAi] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const send = React.useCallback(async () => {
    const text = draft.trim()
    if (!text || awaitingAi) return

    const userMsg: Message = { id: newId(), role: "user", content: text }
    const pendingId = newId()
    const pendingMsg: Message = {
      id: pendingId,
      role: "ai",
      content: PENDING_AI_CONTENT,
    }

    setDraft("")
    setMessages((prev) => [...prev, userMsg, pendingMsg])
    setAwaitingAi(true)

    const url = vocationalAssessmentChatUrl(
      assessmentId,
      process.env.NEXT_PUBLIC_VOCATIONAL_API_URL
    )
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ message: text }),
      })
      const raw = await res.text()
      if (!res.ok) {
        let detail = raw.slice(0, 400)
        try {
          const errJson = JSON.parse(raw) as { message?: string }
          if (typeof errJson.message === "string" && errJson.message.trim()) {
            detail = errJson.message.trim()
          }
        } catch {}
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { ...m, content: `No se pudo obtener respuesta (${res.status}): ${detail}` }
              : m
          )
        )
        return
      }
      let mensaje = "No se recibió texto de la IA."
      if (raw.trim()) {
        try {
          const data = JSON.parse(raw) as { mensaje?: string }
          if (typeof data.mensaje === "string" && data.mensaje.trim()) {
            mensaje = data.mensaje.trim()
          }
        } catch {
          mensaje = raw.slice(0, 2000)
        }
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, content: mensaje } : m))
      )
    } catch (e) {
      const err =
        e instanceof Error ? e.message : "No se pudo conectar con el servidor."
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, content: `No se pudo completar la solicitud: ${err}` }
            : m
        )
      )
    } finally {
      setAwaitingAi(false)
    }
  }, [draft, awaitingAi, assessmentId])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col bg-zinc-50 font-sans",
        className
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:pb-28">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn(
                    "flex w-full gap-3 font-sans",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "ai" && (
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm"
                      aria-hidden
                    >
                      <Brain className="size-4" strokeWidth={2} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm font-sans",
                      m.role === "user"
                        ? "bg-zinc-900 text-zinc-50"
                        : "border border-zinc-200/90 bg-white text-zinc-800 shadow-sm"
                    )}
                  >
                    {m.role === "ai" && m.content === PENDING_AI_CONTENT ? (
                      <span className="inline-flex flex-wrap items-center gap-1 text-zinc-600">
                        <span>Analizando tu consulta</span>
                        <AnalyzingDots />
                      </span>
                    ) : m.role === "ai" ? (
                      <AiMarkdown content={m.content} />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">
                        {m.content}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 md:px-6">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 shadow-sm">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe un mensaje…"
                  disabled={awaitingAi}
                  className="h-11 flex-1 border-0 bg-transparent font-sans text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60 md:text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl"
                  aria-label="Enviar mensaje"
                  disabled={awaitingAi}
                  onClick={() => void send()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
