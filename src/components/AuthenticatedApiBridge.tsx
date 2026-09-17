import { useEffect } from 'react'
import { supabase } from '../lib/supabase.client'

async function persistAnalyzedSession(response: Response, form: FormData | null, userId: string) {
  if (!response.ok || !userId) return
  try {
    const payload: any = await response.clone().json()
    if (!payload?.scores || !payload?.metrics || !payload?.analysis) return

    const topicTitle = String(form?.get('topicTitle') || 'Speaking practice')
    const duration = Math.max(0, Math.min(300, Math.round(Number(payload.metrics.durationSec) || Number(form?.get('durationSec')) || 0)))
    const { data: sessionRow, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        topic_title: topicTitle,
        mode: 'mic',
        duration_sec: duration,
        transcript: String(payload.transcript || ''),
        wpm: Number(payload.metrics.wpm) || 0,
        fillers: Number(payload.metrics.fillers) || 0,
        fillers_per_min: Number(payload.metrics.fillersPerMin) || 0,
        long_pauses: Number(payload.metrics.pauseCount) || 0,
        longest_pause_sec: Number(payload.metrics.longestPauseSec) || 0,
        unique_ratio: Number(payload.metrics.uniqueRatio) || 0,
        fluency: Number(payload.scores.fluency) || 0,
        grammar: Number(payload.scores.grammar) || 0,
        vocabulary: Number(payload.scores.vocabulary) || 0,
        coherence: Number(payload.scores.coherence) || 0,
        overall: Number(payload.scores.overall) || 0,
      })
      .select('id')
      .single()

    if (sessionError || !sessionRow?.id) {
      console.warn('Peitho could not save this session', sessionError?.message || 'Missing session id')
      return
    }

    const { error: analysisError } = await supabase.from('analyses').insert({
      session_id: sessionRow.id,
      grammar: payload.analysis.grammar || [],
      l1_patterns: payload.analysis.l1_patterns || [],
      vocabulary: payload.analysis.vocabulary || {},
      coherence: payload.analysis.coherence || {},
      top_fixes: payload.analysis.top_fixes || [],
      delivery: payload.analysis.delivery || {},
      encouragement: String(payload.analysis.encouragement || ''),
    })
    if (analysisError) console.warn('Peitho could not save session analysis', analysisError.message)
  } catch (error) {
    console.warn('Peitho session persistence failed', error)
  }
}

/** Adds the signed-in user's token to Peitho APIs and persists successful sessions. */
export default function AuthenticatedApiBridge() {
  useEffect(() => {
    let accessToken = ''
    let userId = ''
    const originalFetch = window.fetch.bind(window)

    const refreshAuth = async () => {
      const { data } = await supabase.auth.getSession()
      accessToken = data.session?.access_token || ''
      userId = data.session?.user?.id || ''
      return accessToken
    }

    void refreshAuth()
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token || ''
      userId = session?.user?.id || ''
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

      const response = input instanceof Request
        ? await originalFetch(new Request(input, { ...init, headers }))
        : await originalFetch(input, { ...init, headers })

      if (url.pathname === '/api/analyze' && response.ok) {
        const form = init?.body instanceof FormData ? init.body : null
        await persistAnalyzedSession(response, form, userId)
      }
      return response
    }) as typeof window.fetch

    return () => {
      authSub.subscription.unsubscribe()
      window.fetch = originalFetch
    }
  }, [])

  return null
}
