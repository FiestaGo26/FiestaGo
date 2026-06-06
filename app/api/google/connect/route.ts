import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/google/connect?provider_id=...
// Manda al proveedor a autorizar su Google Calendar.
//
// SEGURIDAD: en producción, provider_id debe salir de la SESIÓN autenticada del
// proveedor, no de un query param. Aquí se acepta como param para simplificar el
// porte; protégelo con tu auth de proveedor en FiestaGo2026.
export async function GET(req: NextRequest) {
  const providerId = new URL(req.url).searchParams.get('provider_id')
  if (!providerId) {
    return NextResponse.json({ error: 'Falta provider_id' }, { status: 400 })
  }
  return NextResponse.redirect(getAuthUrl(providerId))
}
