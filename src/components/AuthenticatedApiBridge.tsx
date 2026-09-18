import { useEffect } from 'react'
import { supabase } from '../lib/supabase.client'

/** Adds the signed-in user's access token to same-origin Peitho API requests. */
export default function AuthenticatedApiBridge() {
  useEffect(() => {
    let accessToken = ''
    const originalFetch = window.fetch.bind(window)

    const refreshAuth = async () => {
      const { data } = await supabase.auth.getSession()
      accessToken = data.session?.access_token || ''
      return accessToken
    }

    void refreshAuth()
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token || ''
    })

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(rawUrl, window.location.origin)
      const isPeithoApi = url.origin === window.location.origin && url.pathname.startsWith('/api/')
      if (!isPeithoApi) return originalFetch(input, init)

      if (!accessToken) await refreshAuth()
      const headers = new Headers(input instanceof Request ? input.headers : undefined)
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

      return input instanceof Request
        ? originalFetch(new Request(input, { ...init, headers }))
        : originalFetch(input, { ...init, headers })
    }) as typeof window.fetch

    return () => {
      authSub.subscription.unsubscribe()
      window.fetch = originalFetch
    }
  }, [])

  return null
}
