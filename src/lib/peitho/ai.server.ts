import type { AnalysisShape, PeithoMetrics, WordTimestamp } from './metrics'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo'
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b'

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
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
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
    ? 'You can hear the recording. Evaluate delivery from what you actually hear: pace, hesitation and pronunciation. Do not infer an accent defect.'
    : 'No audio is available in this degraded path. Set delivery.score to 0 and delivery.note to "Audio unavailable — delivery was not scored."'

  return `You are Peitho, a precise and respectful spoken-English coach reviewing a practice answer by an Indian professional who may be Hindi-first.

${deliveryInstruction}

TOPIC: ${input.topicTitle}
SUGGESTED POINTS: ${input.points.join('; ')}
LOCAL METRICS: ${input.metrics.wpm} wpm, ${input.metrics.fillersPerMin} fillers/min, ${input.metrics.pauseCount} long pauses, longest ${input.metrics.longestPauseSec}s, ${input.metrics.uniqueRatio}% unique words.

TRANSCRIPT:
"""${input.transcript}"""

Rules:
- Every grammar quote and L1-pattern quote must be copied verbatim from the transcript, including the exact words and word order.
- L1 transfer is a pattern, not a flaw. Name it respectfully and only when genuinely present.
- grammar: at most 5 high-value issues; do not nitpick transcription punctuation. Use an empty array only when there is genuinely no useful grammatical correction.
- l1_patterns: at most 3. Use an empty array when there is no defensible transfer pattern.
- vocabulary: always include both score and a specific note grounded in actual word choices.
- coherence: always include both score and a specific note explaining how well the answer addresses the topic and develops its point.
- top_fixes: exactly 3. Each you_said must be copied verbatim from the transcript. Each fix must be concrete and rehearsal-ready.
- encouragement: one honest, specific sentence, no generic praise.
- Do not invent words the speaker did not say.`
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

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: interactionInput,
      response_format: { type: 'text', mime_type: 'application/json', schema: ANALYSIS_SCHEMA },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gemini analysis failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const data = await response.json()
  const text = extractGeminiText(data)
  if (!text) throw new Error('Gemini returned no text output')
  return parseJsonText(text)
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
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: input.prompt,
          response_format: { type: 'text', mime_type: 'application/json', schema: input.schema },
        }),
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