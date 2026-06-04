import { supabaseAdmin } from '@/lib/supabase-admin'
import WhatsappInbox, { type InboxProvider, type InboxMessage } from './WhatsappInbox'

// Esta página usa la service_role key (servidor) → siempre dinámica.
// NOTA: /admin debe estar protegido por la autenticación de admin del proyecto
// (middleware / ADMIN_PASSWORD). Esta página no añade su propia capa de auth.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'WhatsApp · Captación de proveedores' }

export default async function WhatsappAdminPage() {
  const supabase = supabaseAdmin()

  // 1) Todos los mensajes de WhatsApp (la tabla suele ser pequeña).
  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('id, direction, body, type, status, created_at, provider_id')
    .order('created_at', { ascending: true })
    .limit(2000)

  // 2) Proveedores candidatos: tienen número y los ordenamos por encaje del agente.
  const { data: candidates } = await supabase
    .from('providers')
    .select(
      'id, name, category, city, phone, outreach_whatsapp, outreach_sent, contacted_via, agent_fit_score'
    )
    .or('phone.not.is.null,outreach_whatsapp.not.is.null')
    .order('agent_fit_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(60)

  // 3) Proveedores referenciados por mensajes pero que no estén en la lista de
  //    candidatos (para que toda conversación tenga su ficha).
  const candidateIds = new Set((candidates ?? []).map((c) => c.id))
  const msgProviderIds = Array.from(
    new Set((messages ?? []).map((m) => m.provider_id).filter(Boolean))
  ).filter((id) => !candidateIds.has(id as string)) as string[]

  let extra: InboxProvider[] = []
  if (msgProviderIds.length) {
    const { data } = await supabase
      .from('providers')
      .select(
        'id, name, category, city, phone, outreach_whatsapp, outreach_sent, contacted_via, agent_fit_score'
      )
      .in('id', msgProviderIds)
    extra = (data ?? []) as InboxProvider[]
  }

  const providers: InboxProvider[] = [...(candidates ?? []), ...extra] as InboxProvider[]

  return (
    <WhatsappInbox
      providers={providers}
      messages={(messages ?? []) as InboxMessage[]}
    />
  )
}
