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
  grammar_score?: number
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

export type PracticePriority = {
  key: string
  label: string
  score: number
  target: string
  drill: string
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
    if (gapSeconds >= 1.5) pauses.push(Math.round(gapSeconds * 1000))
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
  const clientPauses = (input.clientPausesMs ?? []).filter((value) => Number.isFinite(value) && value >= 1500)
  // Browser audio-level pauses are preferred because ASR word timestamps can collapse
  // or omit silence. Fall back to word gaps when client silence tracking is unavailable.
  const pauses = clientPauses.length ? clientPauses : timestampPauses

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
  const mins=Math.max(metrics.durationSec/60,0.2)
  const pausesPerMin=metrics.pauseCount/mins
  let score=100
  score-=Math.min(55,metrics.fillersPerMin*3.4)
  score-=Math.min(38,pausesPerMin*8.5)
  score-=Math.min(28,Math.max(0,metrics.longestPauseSec-2)*4.5)
  if(metrics.wpm<110)score-=Math.min(28,(110-metrics.wpm)*.55)
  if(metrics.wpm>175)score-=Math.min(24,(metrics.wpm-175)*.45)
  return Math.max(0,Math.round(score))
}

export function grammarScore(metrics: PeithoMetrics, issueCount: number, modelScore?: number) {
  if(!metrics.words)return 40
  const per100=(issueCount/metrics.words)*100
  const evidenceScore=Math.max(5,Math.round(100-per100*15))
  const ai=Number(modelScore)
  if(!Number.isFinite(ai))return evidenceScore
  return Math.max(0,Math.min(100,Math.min(evidenceScore,Math.round(ai))))
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
  const score = clampScore(100 - metrics.fillersPerMin * 5.2, 100)
  const note = metrics.fillers === 0
    ? 'No tracked filler words were detected in the final transcript.'
    : `${metrics.fillersPerMin} fillers/min · ${metrics.fillers} total. ${metrics.fillersPerMin > 8 ? 'Fillers are frequent enough to interrupt the flow of thought.' : metrics.fillersPerMin > 4 ? 'Some filler pressure is audible; replacing a few with short silent beats would make the delivery cleaner.' : 'Filler pressure is relatively light in this session.'}`
  return { score, note }
}

function pausePerformance(metrics: PeithoMetrics) {
  const mins=Math.max(metrics.durationSec/60,.2)
  const pausesPerMin=metrics.pauseCount/mins
  const durationPenalty=(metrics.pauses||[]).reduce((sum,ms)=>sum+Math.max(0,ms/1000-1.5)*5.5,0)
  const longestPenalty=Math.max(0,metrics.longestPauseSec-3)*8
  const score=clampScore(100-pausesPerMin*17-durationPenalty-longestPenalty,100)
  const note=metrics.pauseCount===0
    ? 'No silence gap of 1.5 seconds or longer was detected between spoken phrases.'
    : `${metrics.pauseCount} long pause${metrics.pauseCount===1?'':'s'} · longest ${metrics.longestPauseSec}s. ${metrics.longestPauseSec>=5?'A very long gap materially interrupted the answer.':pausesPerMin>1.5?'Frequent longer gaps interrupt continuity and make the answer feel less prepared.':'The longer gaps were occasional but still measurable.'}`
  return{score,note}
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
  const available=categories.map(item=>item.score).filter((value):value is number=>value!=null)
  if(!available.length)return{score:0,categories}
  const average=available.reduce((sum,value)=>sum+value,0)/available.length
  const weakest=Math.min(...available)
  return{score:Math.round(average*.75+weakest*.25),categories}
}

export function scoreSession(metrics: PeithoMetrics, analysis: AnalysisShape) {
  const grammarIssueCount=analysis.grammar?.length??0
  const fluency=fluencyScore(metrics)
  const grammar=grammarScore(metrics,grammarIssueCount,analysis.grammar_score)
  const vocabulary=clampScore(analysis.vocabulary?.score,50)
  const coherence=clampScore(analysis.coherence?.score,50)
  const delivery=optionalScore(analysis.delivery?.score)
  const overall=delivery==null
    ? Math.round(fluency*.32+grammar*.33+vocabulary*.15+coherence*.20)
    : Math.round(fluency*.22+grammar*.25+vocabulary*.13+coherence*.15+delivery*.25)
  return{fluency,grammar,vocabulary,coherence,overall}
}


export function buildPracticePlan(
  metrics:PeithoMetrics,
  scores:{fluency:number;grammar:number;vocabulary:number;coherence:number;overall:number},
  report:PerformanceReport,
):PracticePriority[]{
  const perf=new Map(report.categories.filter(x=>x.score!=null).map(x=>[x.key,Number(x.score)]))
  const candidates:PracticePriority[]=[
    {key:'grammar',label:'Grammar control',score:scores.grammar,target:'85+ with only occasional construction errors',drill:'Repeat a 60-second answer using shorter complete clauses. Fix the specific grammar patterns Peitho flagged, then answer the same prompt again without scripting.'},
    {key:'fluency',label:'Fluency',score:scores.fluency,target:'85+ with controlled pace, fillers and silence',drill:'Do one 60-second run where you keep moving through the thought without restarting sentences. Use a short silent beat instead of a filler.'},
    {key:'coherence',label:'Structure & coherence',score:scores.coherence,target:'85+ with point → evidence → outcome',drill:'Answer each prompt in three moves: state the point in one sentence, give one concrete example, then land why it matters.'},
    {key:'vocabulary',label:'Word choice',score:scores.vocabulary,target:'80+ with precise, varied wording',drill:'Repeat the same answer and replace three vague or repeated words with more precise nouns and verbs while keeping the sentence natural.'},
    {key:'pacing',label:'Pacing',score:perf.get('pacing')??100,target:'125–165 WPM for most conversational answers',drill:`Run the same answer again at a steady conversational tempo. Your last measured pace was ${metrics.wpm} WPM; slow down only at important claims, not between every phrase.`},
    {key:'filler_control',label:'Filler control',score:perf.get('filler_control')??100,target:'90+ · ideally ≤2 tracked fillers/min',drill:`Replace fillers with one silent beat. Your last session had ${metrics.fillersPerMin} fillers/min; aim to cut that by at least one third on the next run.`},
    {key:'pause_control',label:'Pause control',score:perf.get('pause_control')??100,target:'85+ · few gaps ≥1.5s and none above ~3s',drill:`Plan the next clause before the current one ends. You had ${metrics.pauseCount} long pause${metrics.pauseCount===1?'':'s'}; keep the next run moving without a silence longer than 3 seconds.`},
    {key:'tonal_variation',label:'Tonal variation',score:perf.get('tonal_variation')??100,target:'85+ with purposeful emphasis on key words',drill:'Mark three words in the idea that deserve emphasis. Repeat the answer and deliberately vary energy and pitch on those words while keeping the rest natural.'},
    {key:'volume_projection',label:'Volume & projection',score:perf.get('volume_projection')??100,target:'85+ with steady, clearly audible vocal energy',drill:'Record one short answer at a consistent mic distance. Keep vocal energy steady through sentence endings instead of fading out.'},
    {key:'enunciation',label:'Enunciation',score:perf.get('enunciation')??100,target:'85+ with consistently distinct word boundaries',drill:'Choose two difficult sentences from the transcript. Say them slowly once, then again at normal pace while keeping consonants and word endings distinct.'},
  ]
  const targets:Record<string,number>={grammar:85,fluency:85,coherence:85,vocabulary:80,pacing:85,filler_control:90,pause_control:85,tonal_variation:85,volume_projection:85,enunciation:85}
  return candidates
    .map(item=>({...item,gap:(targets[item.key]??85)-item.score}))
    .filter(item=>item.gap>0)
    .sort((a,b)=>b.gap-a.gap||a.score-b.score)
    .slice(0,3)
    .map(({gap,...item})=>item)
}
