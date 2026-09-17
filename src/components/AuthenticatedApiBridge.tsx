import { useEffect } from 'react'
import { supabase } from '../lib/supabase.client'

/**
 * Adds the current Supabase access token only to Peitho's same-origin API calls.
 * External fetches (including Supabase itself) are left untouched.
 */
export default function AuthenticatedApiBridge() {
  useEffect(() => {
    let accessToken = ''
    let disposed = false
    const originalFetch = window.fetch.bind(window)

    const refreshToken = async () => {
      const { data } = await supabase.auth.getSession()
      accessToken = data.session?.access_token || ''
      return accessToken
    }

    void refreshToken()
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token || ''
    })

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
      const url = new URL(rawUrl, window.location.origin)
      const isPeithoApi = url.origin === window.location.origin && url.pathname.startsWith('/api/')
      if (!isPeithoApi) return originalFetch(input, init)

      if (!accessToken) await refreshToken()
      const headers = new Headers(input instanceof Request ? input.headers : undefined)
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

      if (input instanceof Request) {
        return originalFetch(new Request(input, { ...init, headers }))
      }
      return originalFetch(input, { ...init, headers })
    }) as typeof window.fetch

    return () => {
      disposed = true
      authSub.subscription.unsubscribe()
      if (!disposed || window.fetch !== originalFetch) window.fetch = originalFetch
    }
  }, [])

  return null
}
