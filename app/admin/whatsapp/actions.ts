'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizePhone, sendTemplate, sendText } from '@/lib/whatsapp'
import { generateOpeningMessage } from '@/lib/fiestago-agent'

type ActionResult = { ok: boolean; error?: string }

async function loadProvider(id: string) {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('providers')
    .select('id, name, category, city, social_handle, phone, outreach_whatsapp')
    .eq('id', id)
    .single()
  if (error || !data) throw new Error('Proveedor no encontrado')
  return data
}

function providerNumber(p: { phone: string | null; outreach_whatsapp: string | null }) {
  return normalizePhone(p.outreach_whatsapp) || normalizePhone(p.phone)
}

// ─── Iniciar la captación: envía la plantilla aprobada (conversación en frío) ─
// Es la ÚNICA forma compatible con WhatsApp de escribir primero a un proveedor
// que no nos ha contestado en las últimas 24h.
export async function startOutreach(providerId: string): Promise<ActionResult> {
  try {
    const provider = await loadProvider(providerId)
    const to = providerNumber(provider)
    if (!to) return { ok: false, error: 'El proveedor no tiene número de WhatsApp/teléfono' }

    const supabase = supabaseAdmin()
    // Parámetro {{1}} de la plantilla = nombre del proveedor.
    const waId = await sendTemplate(to, { bodyParams: [provider.name || 'hola'] })

    await supabase.from('whatsapp_messages').insert({
      wa_message_id: waId || null,
      direction: 'outbound',
      from_number: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
      to_number: to,
      type: 'template',
      body: `[plantilla de captación enviada a ${provider.name}]`,
      status: 'sent',
      provider_id: provider.id,
    })

    await supabase
      .from('providers')
      .update({
        outreach_sent: true,
        outreach_at: new Date().toISOString(),
        contacted_via: 'whatsapp',
      })
      .eq('id', provider.id)

    revalidatePath('/admin/whatsapp')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error desconocido' }
  }
}

// ─── Enviar un mensaje de texto a mano ───────────────────────────────────────
// Solo se entrega dentro de la ventana de 24h (cuando el proveedor ya respondió).
export async function sendManualMessage(
  providerId: string,
  text: string
): Promise<ActionResult> {
  try {
    const clean = text.trim()
    if (!clean) return { ok: false, error: 'El mensaje está vacío' }

    const provider = await loadProvider(providerId)
    const to = providerNumber(provider)
    if (!to) return { ok: false, error: 'El proveedor no tiene número de WhatsApp/teléfono' }

    const supabase = supabaseAdmin()
    const waId = await sendText(to, clean)

    await supabase.from('whatsapp_messages').insert({
      wa_message_id: waId || null,
      direction: 'outbound',
      from_number: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
      to_number: to,
      type: 'text',
      body: clean,
      status: 'sent',
      provider_id: provider.id,
    })

    revalidatePath('/admin/whatsapp')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error desconocido' }
  }
}

// ─── Generar un borrador de primer mensaje con el agente (sin enviar) ────────
export async function draftOpeningMessage(
  providerId: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const provider = await loadProvider(providerId)
    const text = await generateOpeningMessage({
      name: provider.name,
      category: provider.category,
      city: provider.city,
      social_handle: provider.social_handle,
    })
    return { ok: true, text }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error desconocido' }
  }
}
