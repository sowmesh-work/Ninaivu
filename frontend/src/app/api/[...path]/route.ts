import { NextRequest, NextResponse } from "next/server"

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/")
  const upstream = `${API_URL}/api/${path}${req.nextUrl.search}`

  // Build headers — drop host so Render doesn't reject the request
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower !== "host" && lower !== "connection" && lower !== "transfer-encoding") {
      headers[key] = value
    }
  })

  // Read body as text to avoid streaming issues on Vercel
  let body: string | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text()
  }

  const res = await fetch(upstream, {
    method: req.method,
    headers,
    body,
  })

  const text = await res.text()

  const responseHeaders = new Headers()
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower !== "transfer-encoding" && lower !== "connection") {
      responseHeaders.set(key, value)
    }
  })

  return new NextResponse(text, {
    status: res.status,
    headers: responseHeaders,
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}
