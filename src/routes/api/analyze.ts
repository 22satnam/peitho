import { createFileRoute } from '@tanstack/react-router'
import { analyzeWithGemini, analyzeWithGroqFallback, transcribeWithGroq } from '../../lib/peitho/ai.server'
import { computeMetrics, scoreSession } from '../../lib/peitho/metrics'
import { deterministicOnlyAnalysis, validateAnalysis } from '../../lib/peitho/validation'

function normalizedAudioMime(fileName: string, reportedType: string) {
  const extension = fileName.toLowerCase().split('.').pop() || ''
  const byExtension: Record<string, string> = {
    m4a: 'audio/m4a',
    mp3: 'audio/mp3',
    mpeg: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
    aiff: 'audio/aiff',
    aif: 'audio/aiff',
  }
  const cleanReportedType = reportedType.toLowerCase().split(';')[0].trim()
  const supportedReportedTypes = new Set(Object.values(byExtension))
  if (supportedReportedTypes.has(cleanReportedType)) return cleanReportedType
  return byExtension[extension] || 'audio/webm'
}

function isTransientGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /\((408|429|500|502|503|504)\)/.test(message) || /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(message)
}

async function analyzeWithGeminiRetry(input: Parameters<typeof analyzeWithGemini>[0]) {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await analyzeWithGemini(input)
    } catch (error) {
      lastError = error
      if (!isTransientGeminiError(error) || attempt === maxAttempts) throw error

      // Short exponential backoff with jitter. Keep the total retry window small so
      // an interactive speaking session can still fall back to Groq quickly.
      const baseDelayMs = attempt === 1 ? 800 : 1800
      const jitterMs = Math.floor(Math.random() * 350)
      await new Promise(resolve => setTimeout(resolve, baseDelayMs + jitterMs))
    }
  }

  throw lastError
}

export const Route = createFileRoute('/api/analyze')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData()
          const fileName = String(form.get('fileName') || 'session.webm')
          const audioEntry = form.get('audio')
          const rawAudio = audioEntry instanceof Blob && audioEntry.size > 0 ? audioEntry : null
          const audio = rawAudio
            ? new Blob([await rawAudio.arrayBuffer()], { type: normalizedAudioMime(fileName, rawAudio.type) })
            : null
          const browserTranscript = String(form.get('transcript') || '').trim()
          const topicTitle = String(form.get('topicTitle') || 'Speaking practice').trim()
          const durationSec = Math.max(1, Number(form.get('durationSec')) || 1)

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
          let whisperSegments = 0

          if (audio) {
            try {
              const transcription = await transcribeWithGroq(audio, fileName)
              if (transcription.text) {
                transcript = transcription.text
                authoritativeDuration = transcription.duration || durationSec
                wordTimestamps = transcription.words
                whisperSegments = transcription.segments.length
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
            rawAnalysis = await analyzeWithGeminiRetry({ transcript, topicTitle, points, metrics, audio })
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
          let largestRawWordGapSec = 0
          for (let index = 1; index < wordTimestamps.length; index += 1) {
            largestRawWordGapSec = Math.max(
              largestRawWordGapSec,
              Math.max(0, wordTimestamps[index].start - wordTimestamps[index - 1].end),
            )
          }

          return Response.json(
            {
              transcript,
              metrics,
              analysis,
              scores,
              providers: { transcription: transcriptionProvider, analysis: analysisProvider },
              degraded: transcriptionProvider !== 'groq-whisper' || analysisProvider !== 'gemini-audio',
              warnings: process.env.NODE_ENV === 'production' ? [] : warnings,
              ...(process.env.NODE_ENV !== 'production'
                ? {
                    diagnostics: {
                      audioMimeType: audio?.type || null,
                      timestampedWords: wordTimestamps.length,
                      whisperSegments,
                      largestRawWordGapSec: Number(largestRawWordGapSec.toFixed(3)),
                    },
                  }
                : {}),
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
