import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { FlaskConical } from "lucide-react"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Orientación vocacional",
  description: "Plataforma de orientación vocacional",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} font-sans`}
    >
      <body
        className={`${geistSans.className} min-h-dvh font-sans antialiased text-slate-900`}
      >
        <div
          className="pointer-events-none fixed top-4 right-4 z-[60] flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/[0.12] px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-sm backdrop-blur-sm md:top-5 md:right-6"
          aria-label="Versión beta"
        >
          <FlaskConical
            className="size-3.5 shrink-0 text-emerald-600"
            strokeWidth={2.25}
            aria-hidden
          />
          <span>Beta</span>
        </div>
        <div className="relative min-h-dvh w-full font-sans">
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(125% 125% at 50% 90%, #fafafa 45%, #e4e4e7 100%)",
            }}
          />
          <main className="relative z-10 flex min-h-dvh w-full flex-col items-stretch font-sans">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
