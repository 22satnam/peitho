import type { AnalysisShape, PeithoMetrics, WordTimestamp } from './metrics'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo'
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b'
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const GEMINI_API_REVISION = '2026-05-20'

export type TranscriptionResult = {
  text: string
  duration?: number
  words: WordTimestamp[]
  segments: Array<{ start?: number; end?: number; text?: string }>
}

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    grammar: {
      type: 'array', maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { quote: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } },
        required: ['quote', 'issue', 'fix'],
      },
    },
    l1_patterns: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { quote: { type: 'string' }, pattern: { type: 'string' }, fix: { type: 'string' } },
        required: ['quote', 'pattern', 'fix'],
      },
    },
    vocabulary: {
      type: 'object',
      additionalProperties: false,
      properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } },
      required: ['score', 'note'],
    },
    coherence: {
      type: 'object',
      additionalProperties: false,
      properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } },
      required: ['score', 'note'],
    },
    delivery: {
      type: 'object',
      additionalProperties: false,
      properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } },
      required: ['score', 'note'],
    },
    top_fixes: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, you_said: { type: 'string' }, try: { type: 'string' } },
        required: ['title', 'you_said', 'try'],
      },
    },
    encouragement: { type: 'string' },
  },
  required: ['grammar', 'l1_patterns', 'vocabulary', 'coherence', 'delivery', 'top_fixes', 'encouragement'],
} as const

function env(name: 'GROQ_API_KEY' | 'GEMINI_API_KEY') {
  return process.env[name]?.trim() || ''
}

function extractGeminiText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim()
  const steps = Array.isArray(payload?.steps) ? payload.steps : []
  const modelSteps = steps.filter((step: any) => step?.type === 'model_output')
  const texts: string[] = []
  for (const step of modelSteps) {
    for (const content of step?.content ?? []) {
      if (content?.type === 'text' && typeof content.text === 'string') texts.push(content.text)
    }
  }
  return texts.join('\n').trim()
}

function parseJsonText(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

function analysisPrompt(input: {
  transcript: string
  topicTitle: string
  points: string[]
  metrics: PeithoMetrics
  hasAudio: boolean
}) {
  const deliveryInstruction = input.hasAudio
    ? 'You can hear the recording. Evaluate delivery from what you actually hear: pace, hesitation, clarity and pronunciation. Do not infer an accent defect. delivery.score must reflect the actual audio.'
    : 'No audio is available in this degraded path. Set delivery.score to 0 and delivery.note to "Audio unavailable — delivery was not scored."'

  return `You are Peitho, a precise and respectful spoken-English coach. Review only evidence that is actually present in the speech. The transcript was produced by automatic speech recognition and can contain punctuation errors or occasional misheard words.

${deliveryInstruction}

TOPIC: ${input.topicTitle}
SUGGESTED POINTS: ${input.points.join('; ')}
LOCAL METRICS: ${input.metrics.wpm} wpm, ${input.metrics.fillersPerMin} fillers/min, ${input.metrics.pauseCount} long pauses, longest ${input.metrics.longestPauseSec}s, ${input.metrics.uniqueRatio}% unique words.

TRANSCRIPT:
"""${input.transcript}"""

Rules:
- Every grammar quote and L1-pattern quote must be copied verbatim from the transcript, including exact words and word order.
- Keep categories separate. Fillers, hesitation, repetition, pace and pauses are FLUENCY issues, not grammar or L1-transfer issues.
- Grammar means a defensible spoken-English construction error. Do not report run-on sentences, comma splices, punctuation, capitalization, or sentence-boundary issues because ASR punctuation is not reliable.
- Do not call a phrase a tense error when its verbs are grammatically compatible in context.
- grammar: at most 5 high-value issues. Prefer fewer high-confidence findings over speculative ones. Use [] when there is no defensible correction.
- L1 transfer must be a defensible structural or lexical transfer pattern. Never infer L1 transfer merely from nationality, accent, fillers such as "um", "uh" or "like", hesitation, repetition, pace, or one ambiguous awkward phrase. If uncertain, omit it. Prefer recurring evidence over a one-off phrase.
- Do not say that generic English filler use is "typical Hindi-English transfer" or equivalent.
- l1_patterns: at most 3, and [] is a good result when there is no high-confidence transfer evidence.
- vocabulary: always include score and a specific note grounded in actual word choices. Do not double-penalize filler frequency here; fillers are already measured under fluency. You may mention repetition only when it materially limits lexical variety.
- coherence: always include score and a specific note explaining whether the speaker answered the topic and connected claims, evidence and outcome.
- top_fixes: exactly 3. Each you_said must be copied verbatim from the transcript. Prioritize the three most useful changes across fluency, grammar, vocabulary and coherence without presenting one problem as multiple categories.
- encouragement: one honest, specific sentence, no generic praise.
- Do not invent words the speaker did not say. If a phrase appears likely to be an ASR mistake or is semantically bizarre, do not build grammar/L1 criticism around it.`
}

function geminiHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': key,
    'Api-Revision': GEMINI_API_REVISION,
  }
}

async function geminiPost(key: string, body: Record<string, unknown>) {
  return fetch(GEMINI_INTERACTIONS_URL, {
    method: 'POST',
    headers: geminiHeaders(key),
    body: JSON.stringify({ store: false, ...body }),
  })
}

export async function transcribeWithGroq(audio: Blob, fileName = 'session.webm'): Promise<TranscriptionResult> {
  const key = env('GROQ_API_KEY')
  if (!key) throw new Error('GROQ_API_KEY is not configured')

  const form = new FormData()
  form.append('file', audio, fileName)
  form.append('model', GROQ_STT_MODEL)
  form.append('language', 'en')
  form.append('temperature', '0')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  form.append('timestamp_granularities[]', 'segment')
  form.append('prompt', 'Um, uh, hmm, er, you know, I mean, basically, like, so yeah. Keep natural disfluencies and filler words exactly as spoken.')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Groq transcription failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const data: any = await response.json()
  const words = (Array.isArray(data.words) ? data.words : [])
    .filter((word: any) => typeof word?.word === 'string')
    .map((word: any) => ({ word: word.word, start: Number(word.start) || 0, end: Number(word.end) || 0 }))

  return {
    text: String(data.text || '').trim(),
    duration: Number(data.duration) || undefined,
    words,
    segments: Array.isArray(data.segments) ? data.segments : [],
  }
}

export async function analyzeWithGemini(input: {
  transcript: string
  topicTitle: string
  points: string[]
  metrics: PeithoMetrics
  audio?: Blob | null
}): Promise<AnalysisShape> {
  const key = env('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY is not configured')

  const prompt = analysisPrompt({ ...input, hasAudio: Boolean(input.audio) })
  const interactionInput: any[] = [{ type: 'text', text: prompt }]

  if (input.audio) {
    const buffer = Buffer.from(await input.audio.arrayBuffer())
    interactionInput.push({
      type: 'audio',
      data: buffer.toString('base64'),
      mime_type: input.audio.type || 'audio/webm',
    })
  }

  const structuredResponse = await geminiPost(key, {
    model: GEMINI_MODEL,
    input: interactionInput,
    response_format: { type: 'text', mime_type: 'application/json', schema: ANALYSIS_SCHEMA },
  })

  if (structuredResponse.ok) {
    const payload = await structuredResponse.json()
    const text = extractGeminiText(payload)
    if (!text) throw new Error('Gemini structured analysis returned no text output')
    return parseJsonText(text)
  }

  const structuredDetail = await structuredResponse.text()

  // Some Gemini projects/models reject a sufficiently complex response schema even
  // though the same model accepts the audio input. Retry the exact audio without
  // schema enforcement; Peitho still validates all evidence after this call.
  const plainJsonPrompt = `${prompt}\n\nReturn ONLY a valid JSON object with these top-level keys: grammar, l1_patterns, vocabulary, coherence, delivery, top_fixes, encouragement. grammar and l1_patterns are arrays. vocabulary, coherence and delivery each have score (0-100) and note. top_fixes is exactly three objects with title, you_said and try. Do not wrap the JSON in markdown.`
  const plainInput = [{ type: 'text', text: plainJsonPrompt }, ...interactionInput.slice(1)]
  const plainResponse = await geminiPost(key, {
    model: GEMINI_MODEL,
    input: plainInput,
  })

  if (!plainResponse.ok) {
    const plainDetail = await plainResponse.text()
    throw new Error(
      `Gemini structured analysis failed (${structuredResponse.status}): ${structuredDetail.slice(0, 240)}; ` +
      `plain audio retry failed (${plainResponse.status}): ${plainDetail.slice(0, 240)}`,
    )
  }

  const plainPayload = await plainResponse.json()
  const plainText = extractGeminiText(plainPayload)
  if (!plainText) throw new Error('Gemini plain audio retry returned no text output')
  return parseJsonText(plainText)
}

export async function analyzeWithGroqFallback(input: {
  transcript: string
  topicTitle: string
  points: string[]
  metrics: PeithoMetrics
}): Promise<AnalysisShape> {
  const key = env('GROQ_API_KEY')
  if (!key) throw new Error('GROQ_API_KEY is not configured')

  const prompt = analysisPrompt({ ...input, hasAudio: false })
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_FALLBACK_MODEL,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'peitho_speech_analysis',
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
      messages: [
        { role: 'system', content: 'Return evidence-backed spoken-English coaching that conforms exactly to the supplied JSON schema.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Groq fallback failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const data: any = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('Groq fallback returned no content')
  return parseJsonText(text)
}

export async function generateTextJson<T>(input: {
  prompt: string
  schema: Record<string, unknown>
}): Promise<{ data: T; provider: 'gemini' | 'groq' }> {
  const geminiKey = env('GEMINI_API_KEY')
  if (geminiKey) {
    try {
      const response = await geminiPost(geminiKey, {
        model: GEMINI_MODEL,
        input: input.prompt,
        response_format: { type: 'text', mime_type: 'application/json', schema: input.schema },
      })
      if (!response.ok) throw new Error(await response.text())
      const payload = await response.json()
      return { data: parseJsonText(extractGeminiText(payload)) as T, provider: 'gemini' }
    } catch (error) {
      console.error('Gemini text generation failed; falling back to Groq', error)
    }
  }

  const groqKey = env('GROQ_API_KEY')
  if (!groqKey) throw new Error('No AI provider is configured')
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_FALLBACK_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON matching the requested shape.' },
        { role: 'user', content: input.prompt },
      ],
    }),
  })
  if (!response.ok) throw new Error(`Groq generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`)
  const payload: any = await response.json()
  return { data: parseJsonText(payload?.choices?.[0]?.message?.content || '') as T, provider: 'groq' }
}