export type WordTimestamp = {
  word: string
  start: number
  end: number
}

export type VoiceClarityMoment = {
  quote?: string
  kind?: 'unclear' | 'mumbled' | 'possible_mispronunciation' | 'recognition_uncertain'
  observation?: string
  suggestion?: string
  confidence?: 'medium' | 'high'
}

export type VoiceDimension = {
  score?: number
  note?: string
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
  delivery?: {
    score?: number
    note?: string
    clarity_moments?: VoiceClarityMoment[]
    tonal_variation?: VoiceDimension
    volume_projection?: VoiceDimension
    enunciation?: VoiceDimension
  }
  top_fixes?: Array<{ title?: string; you_said?: string; try?: string }>
  encouragement?: string
}

export type PerformanceCategory = {
  key: 'pacing' | 'filler_control' | 'pause_control' | 'tonal_variation' | 'volume_projection' | 'enunciation'
  label: string
  score: number | null
  note: string
  basis: 'measured' | 'voice'
}

export type PerformanceReport = {
  score: number
  categories: PerformanceCategory[]
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
  const normalizedWords = tokens.map((word) => word.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean)
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
  score -= Math.min(65, metrics.fillersPerMin * 2.4)
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

function optionalScore(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return Math.max(0, Math.min(100, Math.round(number)))
}

function pacingPerformance(metrics: PeithoMetrics) {
  const wpm = metrics.wpm
  let score = 96
  if (wpm < 110) score -= Math.min(60, (110 - wpm) * 1.1)
  else if (wpm < 125) score -= (125 - wpm) * 0.45
  else if (wpm > 175) score -= Math.min(60, (wpm - 175) * 1.15)
  else if (wpm > 165) score -= (wpm - 165) * 0.55
  const note = wpm < 110
    ? `${wpm} WPM. The response leaves more space than most conversational delivery; carrying the sentence forward would add momentum.`
    : wpm > 175
      ? `${wpm} WPM. The pace is quick enough that complex points may be harder to absorb; give key claims more room.`
      : `${wpm} WPM. The pace sits in a comfortable conversational range for this recording.`
  return { score: clampScore(score), note }
}

function fillerPerformance(metrics: PeithoMetrics) {
  const score = clampScore(100 - metrics.fillersPerMin * 3.7, 100)
  const note = metrics.fillers === 0
    ? 'No tracked filler words were detected in the final transcript.'
    : `${metrics.fillersPerMin} fillers/min · ${metrics.fillers} total. ${metrics.fillersPerMin > 8 ? 'Fillers are frequent enough to interrupt the flow of thought.' : metrics.fillersPerMin > 4 ? 'Some filler pressure is audible; replacing a few with short silent beats would make the delivery cleaner.' : 'Filler pressure is relatively light in this session.'}`
  return { score, note }
}

function pausePerformance(metrics: PeithoMetrics) {
  const mins = Math.max(metrics.durationSec / 60, 0.25)
  const pausesPerMin = metrics.pauseCount / mins
  const excessLongest = Math.max(0, metrics.longestPauseSec - 3)
  const score = clampScore(100 - pausesPerMin * 12 - excessLongest * 6, 100)
  const note = metrics.pauseCount === 0
    ? 'No pauses longer than two seconds were detected. The delivery stayed continuous.'
    : `${metrics.pauseCount} long pause${metrics.pauseCount === 1 ? '' : 's'} · longest ${metrics.longestPauseSec}s. ${pausesPerMin > 2 ? 'The longer gaps break continuity; plan the next clause before finishing the current one.' : 'The longer pauses are occasional rather than dominant.'}`
  return { score, note }
}

export function buildPerformanceReport(metrics: PeithoMetrics, analysis: AnalysisShape): PerformanceReport {
  const pacing = pacingPerformance(metrics)
  const filler = fillerPerformance(metrics)
  const pause = pausePerformance(metrics)
  const tonal = optionalScore(analysis.delivery?.tonal_variation?.score)
  const volume = optionalScore(analysis.delivery?.volume_projection?.score)
  const enunciation = optionalScore(analysis.delivery?.enunciation?.score)

  const categories: PerformanceCategory[] = [
    { key: 'pacing', label: 'Pacing', score: pacing.score, note: pacing.note, basis: 'measured' },
    { key: 'filler_control', label: 'Filler control', score: filler.score, note: filler.note, basis: 'measured' },
    { key: 'pause_control', label: 'Pause control', score: pause.score, note: pause.note, basis: 'measured' },
    { key: 'tonal_variation', label: 'Tonal variation', score: tonal, note: String(analysis.delivery?.tonal_variation?.note || 'Voice variation was not scored in this review.'), basis: 'voice' },
    { key: 'volume_projection', label: 'Volume & projection', score: volume, note: String(analysis.delivery?.volume_projection?.note || 'Voice projection was not scored in this review.'), basis: 'voice' },
    { key: 'enunciation', label: 'Enunciation', score: enunciation, note: String(analysis.delivery?.enunciation?.note || 'Enunciation was not scored in this review.'), basis: 'voice' },
  ]
  const available = categories.map((item) => item.score).filter((value): value is number => value != null)
  return { score: available.length ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length) : 0, categories }
}

export function scoreSession(metrics: PeithoMetrics, analysis: AnalysisShape) {
  const grammarIssueCount = analysis.grammar?.length ?? 0
  const fluency = fluencyScore(metrics)
  const grammar = grammarScore(metrics, grammarIssueCount)
  const vocabulary = clampScore(analysis.vocabulary?.score)
  const coherence = clampScore(analysis.coherence?.score)
  const overall = Math.round(fluency * 0.35 + grammar * 0.3 + vocabulary * 0.15 + coherence * 0.2)
  return { fluency, grammar, vocabulary, coherence, overall }
}
