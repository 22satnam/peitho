export type WordTimestamp = {
  word: string
  start: number
  end: number
}

export type PeithoMetrics = {
  words: number
  durationSec: number
  wpm: number
  fillers: number
  fillersPerMin: number
  fillerBreakdown: Record<string, number>
  uniqueRatio: number
  pauseCount: number
  longestPauseSec: number
  pauses: number[]
}

export type AnalysisShape = {
  grammar?: Array<{ quote?: string; issue?: string; fix?: string }>
  l1_patterns?: Array<{ quote?: string; pattern?: string; fix?: string }>
  vocabulary?: { score?: number; note?: string }
  coherence?: { score?: number; note?: string }
  delivery?: { score?: number; note?: string }
  top_fixes?: Array<{ title?: string; you_said?: string; try?: string }>
  encouragement?: string
}

export const FILLER_PATTERN = String.raw`\b(um+|uh+|umm+|hmm+|erm*|you know|i mean|basically|like|so yeah)\b`

function fillerRegex() {
  return new RegExp(FILLER_PATTERN, 'gi')
}

function normalizeFiller(value: string) {
  const word = value.toLowerCase().trim()
  if (/^um+$/.test(word) || /^umm+$/.test(word)) return 'um'
  if (/^uh+$/.test(word)) return 'uh'
  if (/^hmm+$/.test(word)) return 'hmm'
  if (/^erm*$/.test(word)) return 'er'
  return word
}

export function fillerBreakdown(text: string) {
  const result: Record<string, number> = {}
  const matches = text.match(fillerRegex()) ?? []
  for (const match of matches) {
    const key = normalizeFiller(match)
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

export function countFillers(text: string) {
  return Object.values(fillerBreakdown(text)).reduce((sum, count) => sum + count, 0)
}

export function pausesFromWords(words: WordTimestamp[]) {
  const pauses: number[] = []
  for (let i = 1; i < words.length; i += 1) {
    const gapSeconds = Math.max(0, Number(words[i].start) - Number(words[i - 1].end))
    if (gapSeconds >= 2) pauses.push(Math.round(gapSeconds * 1000))
  }
  return pauses
}

export function computeMetrics(input: {
  transcript: string
  durationSec: number
  wordTimestamps?: WordTimestamp[]
  clientPausesMs?: number[]
}): PeithoMetrics {
  const transcript = input.transcript.trim()
  const tokens = transcript.split(/\s+/).filter(Boolean)
  const durationSec = Math.max(1, Number(input.durationSec) || 1)
  const mins = Math.max(durationSec / 60, 0.15)
  const breakdown = fillerBreakdown(transcript)
  const fillers = Object.values(breakdown).reduce((sum, count) => sum + count, 0)
  const normalizedWords = tokens
    .map((word) => word.toLowerCase().replace(/[^a-z']/g, ''))
    .filter(Boolean)
  const unique = new Set(normalizedWords).size
  const timestampPauses = pausesFromWords(input.wordTimestamps ?? [])
  const clientPauses = (input.clientPausesMs ?? []).filter((value) => Number.isFinite(value) && value >= 2000)
  const pauses = timestampPauses.length ? timestampPauses : clientPauses

  return {
    words: tokens.length,
    durationSec,
    wpm: Math.round(tokens.length / mins),
    fillers,
    fillersPerMin: Number((fillers / mins).toFixed(1)),
    fillerBreakdown: breakdown,
    uniqueRatio: tokens.length ? Math.round((unique / tokens.length) * 100) : 0,
    pauseCount: pauses.length,
    longestPauseSec: pauses.length ? Number((Math.max(...pauses) / 1000).toFixed(1)) : 0,
    pauses,
  }
}

export function fluencyScore(metrics: PeithoMetrics) {
  let score = 100
  score -= Math.min(40, metrics.fillersPerMin * 4.5)
  score -= Math.min(15, metrics.pauseCount * 3)
  if (metrics.wpm < 110) score -= Math.min(15, (110 - metrics.wpm) * 0.4)
  if (metrics.wpm > 175) score -= Math.min(12, (metrics.wpm - 175) * 0.3)
  return Math.max(5, Math.round(score))
}

export function grammarScore(metrics: PeithoMetrics, issueCount: number) {
  if (!metrics.words) return 50
  return Math.max(10, Math.round(100 - (issueCount / metrics.words) * 100 * 11))
}

function clampScore(value: unknown, fallback = 60) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.min(100, Math.round(number)))
}

export function scoreSession(metrics: PeithoMetrics, analysis: AnalysisShape) {
  const issueCount = (analysis.grammar?.length ?? 0) + (analysis.l1_patterns?.length ?? 0)
  const fluency = fluencyScore(metrics)
  const grammar = grammarScore(metrics, issueCount)
  const vocabulary = clampScore(analysis.vocabulary?.score)
  const coherence = clampScore(analysis.coherence?.score)
  const overall = Math.round(fluency * 0.35 + grammar * 0.3 + vocabulary * 0.15 + coherence * 0.2)

  return { fluency, grammar, vocabulary, coherence, overall }
}
