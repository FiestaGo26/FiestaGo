'use client'

import { useMemo, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { startOutreach, sendManualMessage, draftOpeningMessage } from './actions'

export type InboxProvider = {
  id: string
  name: string | null
  category: string | null
  city: string | null
  phone: string | null
  outreach_whatsapp: string | null
  outreach_sent: boolean | null
  contacted_via: string | null
  agent_fit_score: number | null
}

export type InboxMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string | null
  type: string | null
  status: string | null
  created_at: string
  provider_id: string | null
}

export default function WhatsappInbox({
  providers,
  messages,
}: {
  providers: InboxProvider[]
  messages: InboxMessage[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(providers[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  // Mensajes agrupados por proveedor.
  const byProvider = useMemo(() => {
    const map = new Map<string, InboxMessage[]>()
    for (const m of messages) {
      if (!m.provider_id) continue
      const arr = map.get(m.provider_id) ?? []
      arr.push(m)
      map.set(m.provider_id, arr)
    }
    return map
  }, [messages])

  const selected = providers.find((p) => p.id === selectedId) ?? null
  const thread = selectedId ? byProvider.get(selectedId) ?? [] : []
  const lastInboundAt = lastInboundTime(thread)
  const within24h = lastInboundAt != null && Date.now() - lastInboundAt < 24 * 60 * 60 * 1000

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) toast.success(okMsg)
      else toast.error(res.error || 'Error')
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-ink mb-1">WhatsApp · Captación de proveedores</h1>
      <p className="text-sm text-ink/60 mb-6">
        Inicia la conversación con la plantilla de captación. Cuando el proveedor responda, el
        agente continúa solo.
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Lista de proveedores */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white max-h-[70vh] overflow-y-auto">
          {providers.length === 0 && (
            <div className="p-4 text-sm text-ink/50">No hay proveedores con número.</div>
          )}
          {providers.map((p) => {
            const t = byProvider.get(p.id) ?? []
            const last = t[t.length - 1]
            const isSel = p.id === selectedId
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id)
                  setDraft('')
                }}
                className={`w-full text-left px-4 py-3 border-b border-stone-100 transition-colors ${
                  isSel ? 'bg-coral-light' : 'hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-ink truncate">
                    {p.name || 'Sin nombre'}
                  </span>
                  {p.contacted_via === 'whatsapp' || t.length > 0 ? (
                    <span className="text-[10px] uppercase tracking-wide text-sage font-bold">
                      {t.length > 0 ? `${t.length} msg` : 'enviado'}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-ink/50 truncate">
                  {[p.category, p.city].filter(Boolean).join(' · ') || '—'}
                </div>
                {last?.body && (
                  <div className="text-xs text-ink/40 truncate mt-0.5">{last.body}</div>
                )}
              </button>
            )
          })}
        </div>

        {/* Conversación */}
        <div className="border border-stone-200 rounded-2xl bg-white flex flex-col min-h-[70vh]">
          {!selected ? (
            <div className="flex-1 grid place-items-center text-ink/40 text-sm">
              Selecciona un proveedor.
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-stone-100">
                <div className="font-bold text-ink">{selected.name || 'Sin nombre'}</div>
                <div className="text-xs text-ink/50">
                  {[selected.category, selected.city].filter(Boolean).join(' · ')} ·{' '}
                  {selected.outreach_whatsapp || selected.phone || 'sin número'}
                </div>
              </div>

              {/* Hilo */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {thread.length === 0 && (
                  <div className="text-sm text-ink/40">
                    Sin mensajes todavía. Envía la plantilla de captación para empezar.
                  </div>
                )}
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.direction === 'outbound'
                        ? 'ml-auto bg-coral text-white'
                        : 'bg-stone-100 text-ink'
                    }`}
                  >
                    {m.body}
                    <div
                      className={`text-[10px] mt-1 ${
                        m.direction === 'outbound' ? 'text-white/70' : 'text-ink/40'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div className="border-t border-stone-100 p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={pending}
                    onClick={() =>
                      run(() => startOutreach(selected.id), 'Plantilla de captación enviada')
                    }
                    className="text-sm font-bold bg-coral text-white px-4 py-2 rounded-xl hover:bg-coral-dark disabled:opacity-50"
                  >
                    Enviar plantilla de captación
                  </button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await draftOpeningMessage(selected.id)
                        if (res.ok) setDraft(res.text || '')
                        else toast.error(res.error || 'Error')
                      })
                    }
                    className="text-sm font-semibold border border-stone-200 text-ink px-4 py-2 rounded-xl hover:border-coral hover:text-coral disabled:opacity-50"
                  >
                    Borrador con IA
                  </button>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder={
                      within24h
                        ? 'Escribe un mensaje…'
                        : 'Texto libre solo disponible si el proveedor ha respondido en las últimas 24h (regla de WhatsApp).'
                    }
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-coral"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink/40">
                      {within24h
                        ? 'Ventana de 24h abierta: puedes enviar texto libre.'
                        : 'Fuera de la ventana de 24h: usa la plantilla.'}
                    </span>
                    <button
                      disabled={pending || !within24h || !draft.trim()}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await sendManualMessage(selected.id, draft)
                          if (res.ok) {
                            toast.success('Mensaje enviado')
                            setDraft('')
                          } else toast.error(res.error || 'Error')
                        })
                      }
                      className="text-sm font-bold bg-ink text-white px-4 py-2 rounded-xl disabled:opacity-40"
                    >
                      Enviar texto
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function lastInboundTime(thread: InboxMessage[]): number | null {
  let t: number | null = null
  for (const m of thread) {
    if (m.direction === 'inbound') {
      const ts = new Date(m.created_at).getTime()
      if (t == null || ts > t) t = ts
    }
  }
  return t
}
