import { createClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
  || process.env.VITE_SUPABASE_URL?.trim()
  || 'https://kunbvgqzrowodkpxvmit.supabase.co'

// This is a publishable browser key, not a privileged service-role secret. It is
// sufficient for asking Supabase Auth to validate the user's access token.
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || 'sb_publishable_UnvhF1QSxuQwQGFFwzwy7A_aJP3mBfV'

const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export async function authenticatedUser(request: Request): Promise<User | null> {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) return null

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const user = await authenticatedUser(request)
  if (!user) throw new Error('PEITHO_UNAUTHORIZED')
  return user
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Sign in to use Peitho speaking analysis.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  )
}
