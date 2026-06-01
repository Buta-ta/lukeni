// lib/supabase.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ── Réexporter le client browser unifié (cookies SSR) ──
export { supabase, createClient } from './supabase-browser';

// ── Client ADMIN (server-side uniquement) ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey
  ? createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (process.env.NODE_ENV === 'development') {
  console.log('🔑 Supabase initialized — client unifié (SSR cookies)');
  console.log('🔑 Service Role:', serviceRoleKey ? '✅' : '❌');
}