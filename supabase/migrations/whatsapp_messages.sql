-- ═══════════════════════════════════════════════════════════════════════════
-- WHATSAPP_MESSAGES — historial de mensajes de WhatsApp (entrantes y salientes)
-- de la captación de proveedores.
--
-- NOTA: en el proyecto de FiestaGo esta tabla YA EXISTE en Supabase. Este
-- archivo documenta su esquema y es idempotente (no rompe si ya está creada).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists whatsapp_messages (
  id            uuid primary key default gen_random_uuid(),
  wa_message_id text unique,                          -- id del mensaje en WhatsApp
  direction     text not null check (direction in ('inbound','outbound')),
  from_number   text,
  to_number     text,
  type          text,                                 -- 'text' | 'template' | 'button' | ...
  body          text,
  payload       jsonb,                                -- payload crudo del webhook
  status        text,                                 -- 'received' | 'sent' | ...
  provider_id   uuid references providers(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists whatsapp_messages_provider_idx on whatsapp_messages(provider_id);
create index if not exists whatsapp_messages_created_idx   on whatsapp_messages(created_at);

-- RLS activada: el acceso es siempre vía service_role (servidor), que la omite.
alter table whatsapp_messages enable row level security;
