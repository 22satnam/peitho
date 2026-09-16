import { createFileRoute } from '@tanstack/react-router'
import { analyzeWithGemini, analyzeWithGroqFallback, transcribeWithGroq } from '../../lib/peitho/ai.server'
import { computeMetrics, scoreSession } from '../../lib/peitho/metrics'
import { deterministicOnlyAnalysis, validateAnalysis } from '../../lib/peitho/validation'

export const Route = createFileRoute('/api/analyze')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData()
          const audioEntry = form.get('audio')
          const audio = audioEntry instanceof Blob && audioEntry.size > 0 ? audioEntry : null
          const browserTranscript = String(form.get('transcript') || '').trim()
          const topicTitle = String(form.get('topicTitle') || 'Speaking practice').trim()
          const durationSec = Math.max(1, Number(form.get('durationSec')) || 1)
          const fileName = String(form.get('fileName') || 'session.webm')

          let points: string[] = []
          let clientPausesMs: number[] = []
          try {
            const parsed = JSON.parse(String(form.get('points') || '[]'))
            if (Array.isArray(parsed)) points = parsed.map(String).slice(0, 8)
          } catch {}
          try {
            const parsed = JSON.parse(String(form.get('clientPausesMs') || '[]'))
            if (Array.isArray(parsed)) clientPausesMs = parsed.map(Number).filter(Number.isFinite)
          } catch {}

          if (!audio && browserTranscript.split(/\s+/).filter(Boolean).length < 5) {
            return Response.json({ error: 'At least five words of transcript or an audio recording are required.' }, { status: 400 })
          }

          if (audio && audio.size > 18 * 1024 * 1024) {
            return Response.json({ error: 'Audio is too large. Keep the recording under 18 MB.' }, { status: 413 })
          }

          const warnings: string[] = []
          let transcript = browserTranscript
          let authoritativeDuration = durationSec
          let wordTimestamps: Array<{ word: string; start: number; end: number }> = []
          let transcriptionProvider: 'groq-whisper' | 'browser' = 'browser'

          if (audio) {
            try {
              const transcription = await transcribeWithGroq(audio, fileName)
              if (transcription.text) {
                transcript = transcription.text
                authoritativeDuration = transcription.duration || durationSec
                wordTimestamps = transcription.words
                transcriptionProvider = 'groq-whisper'
              }
            } catch (error) {
              warnings.push(error instanceof Error ? error.message : 'Whisper transcription failed')
              if (!browserTranscript) throw error
            }
          }

          if (transcript.split(/\s+/).filter(Boolean).length < 5) {
            return Response.json({ error: 'Too little speech was captured to analyze.' }, { status: 422 })
          }

          const metrics = computeMetrics({
            transcript,
            durationSec: authoritativeDuration,
            wordTimestamps,
            clientPausesMs,
          })

          let rawAnalysis
          let analysisProvider: 'gemini-audio' | 'gemini-text' | 'groq-text' | 'deterministic-only'
          try {
            rawAnalysis = await analyzeWithGemini({ transcript, topicTitle, points, metrics, audio })
            analysisProvider = audio ? 'gemini-audio' : 'gemini-text'
          } catch (geminiError) {
            warnings.push(geminiError instanceof Error ? geminiError.message : 'Gemini analysis failed')
            try {
              rawAnalysis = await analyzeWithGroqFallback({ transcript, topicTitle, points, metrics })
              analysisProvider = 'groq-text'
            } catch (groqError) {
              warnings.push(groqError instanceof Error ? groqError.message : 'Groq analysis fallback failed')
              rawAnalysis = deterministicOnlyAnalysis(transcript, metrics)
              analysisProvider = 'deterministic-only'
            }
          }

          const analysis = validateAnalysis(rawAnalysis, transcript, metrics)
          const scores = scoreSession(metrics, analysis)

          return Response.json(
            {
              transcript,
              metrics,
              analysis,
              scores,
              providers: { transcription: transcriptionProvider, analysis: analysisProvider },
              degraded: transcriptionProvider !== 'groq-whisper' || analysisProvider !== 'gemini-audio',
              warnings: process.env.NODE_ENV === 'production' ? [] : warnings,
            },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        } catch (error) {
          console.error('Peitho analyze route failed', error)
          return Response.json(
            { error: error instanceof Error ? error.message : 'Analysis failed unexpectedly.' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      },
    },
  },
})
