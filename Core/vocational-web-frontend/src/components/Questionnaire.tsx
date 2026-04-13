"use client"

import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type QuestionItem = {
  key: string
  text: string
}

type QuestionnaireProps = {
  questions: QuestionItem[]
  qIndex: number
  selectedByKey: Record<string, number | null | undefined>
  onSelect: (value: number) => void
  onNext: () => void
}

const shell =
  "border border-zinc-200/90 bg-white/90 shadow-sm backdrop-blur-sm"

const transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
}

export function Questionnaire({
  questions,
  qIndex,
  selectedByKey,
  onSelect,
  onNext,
}: QuestionnaireProps) {
  const current = questions[qIndex]
  if (!current) return null

  const selected = selectedByKey[current.key]
  const canProceed = selected != null
  const isLast = qIndex >= questions.length - 1

  return (
    <div className="w-full max-w-xl font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{
            x: -40,
            opacity: 0,
            transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
          }}
          transition={transition}
        >
          <Card className={cn(shell, "overflow-hidden")}>
            <CardHeader className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Pregunta {qIndex + 1} / {questions.length}
              </p>
              <CardTitle className="text-balance font-sans text-2xl font-semibold leading-snug text-zinc-900 md:text-3xl">
                {current.text}
              </CardTitle>
              <CardDescription className="font-sans text-zinc-500">
                1 = poco · 5 = mucho
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pb-8">
              <div className="flex flex-wrap justify-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(
                      "h-14 min-w-14 rounded-full border-zinc-200 bg-white font-sans text-lg font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-900 hover:bg-zinc-900 hover:text-white",
                      selected === n &&
                        "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-900"
                    )}
                    onClick={() => onSelect(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  size="lg"
                  className="min-w-[200px] rounded-xl font-sans font-medium"
                  disabled={!canProceed}
                  onClick={onNext}
                >
                  {isLast ? "Ver resumen" : "Siguiente"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
