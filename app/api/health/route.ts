import { NextResponse } from 'next/server'

// F12-ben bővül: DB-kapcsolat és az utolsó sikeres feed-futás kora (ARCHITECTURE.md 9. pont).
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { ok: true, service: 'jovetel', time: new Date().toISOString() },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
