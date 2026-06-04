import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Admin client (server-only, uses service_role key — NEVER expose to client) ─
//
// Bypasses Row Level Security. Only import this from server code:
// API routes, Server Actions, Server Components. Never from a Client Component.

let _admin: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno'
    )
  }

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}
