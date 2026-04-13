"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

type LandingProps = {
  onStart: () => void
}

export function Landing({ onStart }: LandingProps) {
  return (
    <motion.div
      className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 md:grid-cols-2 md:gap-16 md:py-16"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col justify-center space-y-8 font-sans">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur">
          <Sparkles className="size-3.5 text-zinc-500" aria-hidden />
          Orientación vocacional
        </p>
        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            De tu libreta a una conversación clara.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-zinc-600">
            Sube una foto de tus notas, responde unas preguntas breves y recibe una
            orientación que puedes seguir preguntando en el chat.
          </p>
        </div>
        <div>
          <Button
            size="lg"
            className="h-12 rounded-xl px-8 text-base font-medium shadow-md"
            onClick={onStart}
          >
            Subir libreta
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-[280px] items-center justify-center md:min-h-[360px]">
        <div
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-zinc-100 via-white to-zinc-200/80 shadow-inner ring-1 ring-zinc-200/60"
          aria-hidden
        />
        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xl"
          initial={{ y: 8, opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3">
            <div className="size-2 rounded-full bg-emerald-500" />
            <div className="size-2 rounded-full bg-amber-400" />
            <div className="size-2 rounded-full bg-zinc-300" />
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              vista previa
            </span>
          </div>
          <div className="space-y-3 font-sans text-sm">
            <div className="rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Áreas curriculares</p>
              <p className="mt-1 font-mono text-xs leading-relaxed text-zinc-800">
                Matemática · Comunicación · CTA · …
              </p>
            </div>
            <div className="ml-6 rounded-lg bg-zinc-900 px-3 py-2 text-zinc-100">
              ¿Qué universidades encajan con mi perfil?
            </div>
            <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2 text-zinc-700 shadow-sm">
              <p className="text-xs leading-relaxed">
                Comparo opciones en Perú y te dejo una tabla con mensualidades
                aproximadas en soles (S/) …
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
