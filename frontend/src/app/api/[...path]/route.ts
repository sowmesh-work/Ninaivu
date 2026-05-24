import { NextRequest, NextResponse } from "next/server"

const RENDER_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const upstream = `${RENDER_URL}/api/${path.join("/")}${req.nextUrl.search}`

  // Forward all headers except host
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") headers.set(key, value)
  })

  const hasBody = req.method !== "GET" && req.method !== "HEAD"

  const res = await fetch(upstream, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-ignore — needed for streaming body in Node.js fetch
    duplex: hasBody ? "half" : undefined,
  })

  // Forward response headers (including Set-Cookie)
  const responseHeaders = new Headers()
  res.headers.forEach((value, key) => {
    responseHeaders.set(key, value)
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
