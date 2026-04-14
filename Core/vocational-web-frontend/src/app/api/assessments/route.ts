import { NextResponse } from "next/server"

import { vocationalAssessmentsPostUrl } from "@/lib/vocationalApi"

function upstreamAssessmentsUrl(): string {
  return vocationalAssessmentsPostUrl(
    process.env.VOCATIONAL_API_URL ?? process.env.NEXT_PUBLIC_VOCATIONAL_API_URL
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const res = await fetch(upstreamAssessmentsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("Content-Type") ?? "application/json; charset=utf-8",
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export const maxDuration = 120
