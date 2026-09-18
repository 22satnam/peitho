import { createClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
  || process.env.VITE_SUPABASE_URL?.trim()
  || 'https://kunbvgqzrowodkpxvmit.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || 'sb_publishable_UnvhF1QSxuQwQGFFwzwy7A_aJP3mBfV'

const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

function bearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

export function userScopedClient(request: Request) {
  const token = bearerToken(request)
  if (!token) return null
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function authenticatedUser(request: Request): Promise<User | null> {
  const token = bearerToken(request)
  if (!token) return null
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function consumeAiQuota(request: Request, kind: 'live_transcribe' | 'analysis') {
  const token = bearerToken(request)
  if (!token) return { allowed: false, reason: 'unauthorized' as const }

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.rpc('consume_ai_quota', { p_kind: kind })
  if (error) {
    console.error('Peitho quota check failed', error.message)
    return { allowed: false, reason: 'unavailable' as const }
  }
  return { allowed: data === true, reason: data === true ? 'ok' as const : 'limit' as const }
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Sign in to use Peitho speaking analysis.' }, {
    status: 401, headers: { 'Cache-Control': 'no-store' },
  })
}

export function quotaResponse(kind: 'live_transcribe' | 'analysis', reason: 'limit' | 'unavailable') {
  if (reason === 'unavailable') {
    return Response.json({ error: 'Usage protection is temporarily unavailable. Please try again shortly.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' },
    })
  }
  const message = kind === 'live_transcribe'
    ? 'Live captions are moving too quickly. Wait a moment and continue speaking.'
    : 'You have reached the current analysis limit. Please try again later.'
  return Response.json({ error: message }, {
    status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': kind === 'live_transcribe' ? '10' : '300' },
  })
}
