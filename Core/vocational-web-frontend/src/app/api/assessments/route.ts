import { NextResponse } from "next/server"

const UPSTREAM =
  process.env.VOCATIONAL_API_URL ?? "http://127.0.0.1:8080/api/v1/assessments"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const res = await fetch(UPSTREAM, {
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
