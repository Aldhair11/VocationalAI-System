import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

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
