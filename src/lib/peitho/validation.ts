import type { AnalysisShape, PeithoMetrics, VoiceClarityMoment } from './metrics'

function hasVerbatimQuote(transcript: string, quote: unknown) {
  return typeof quote === 'string' && quote.trim().length > 0 && transcript.toLowerCase().includes(quote.trim().toLowerCase())
}

function isDefensibleSpokenGrammarIssue(issue: unknown) {
  const text = String(issue || '').toLowerCase()
  if (!text) return false
  return !/(run[- ]?on|comma splice|punctuat|capitaliz|filler|hesitat|disfluenc)/i.test(text)
}

function isDefensibleL1Pattern(pattern: unknown) {
  const text = String(pattern || '').toLowerCase()
  if (!text) return false
  return !/(filler|hesitat|disfluenc|pause|repetition|\bum\b|\buh\b|\blike\b)/i.test(text)
}

function validClarityMoment(item: VoiceClarityMoment, transcript: string) {
  if (!hasVerbatimQuote(transcript, item?.quote)) return false
  const kinds = new Set(['unclear','mumbled','possible_mispronunciation','recognition_uncertain'])
  if (!kinds.has(String(item?.kind || ''))) return false
  if (!item?.observation || !item?.suggestion) return false
  if (item.kind === 'possible_mispronunciation' && item.confidence !== 'high') return false
  return item.confidence === 'high' || item.confidence === 'medium'
}

function voiceDimension(value:any, fallbackNote:string) {
  const score=Number(value?.score)
  return {
    score:Number.isFinite(score)?Math.max(0,Math.min(100,Math.round(score))):0,
    note:String(value?.note||fallbackNote),
  }
}

function sentenceSamples(transcript: string) {
  const samples = transcript.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean)
  if (samples.length >= 3) return samples.slice(0, 3)
  const words = transcript.split(/\s+/).filter(Boolean)
  const chunk = Math.max(5, Math.ceil(words.length / 3))
  return [0, 1, 2].map((index) => words.slice(index * chunk, (index + 1) * chunk).join(' ').trim()).filter(Boolean)
}

function metricFixes(transcript: string, metrics: PeithoMetrics) {
  const samples = sentenceSamples(transcript)
  const ranked = [
    { severity: metrics.fillersPerMin > 5 ? 3 : 0, title: 'Trade a filler for a silent beat', try: `You averaged ${metrics.fillersPerMin} fillers per minute. When you feel a filler coming, stop for one beat and start the next clause cleanly.` },
    { severity: metrics.wpm > 175 || metrics.wpm < 110 ? 2 : 0, title: metrics.wpm > 175 ? 'Give the listener more space' : 'Carry the sentence forward', try: metrics.wpm > 175 ? `You averaged ${metrics.wpm} WPM. Aim for 130–165 WPM on the next run and put a short pause after each main claim.` : `You averaged ${metrics.wpm} WPM. Rehearse the idea once, then say it again without restarting the sentence.` },
    { severity: metrics.pauseCount >= 3 ? 2 : 1, title: 'Land the point before expanding it', try: metrics.pauseCount >= 3 ? `There were ${metrics.pauseCount} pauses longer than two seconds. State the claim first, then explain it.` : 'Lead each section with one plain sentence that states the point, then add the detail.' },
  ].sort((a, b) => b.severity - a.severity)
  return ranked.map((fix, index) => ({ ...fix, you_said: samples[index] || transcript.slice(0, 120) }))
}

export function validateAnalysis(raw: AnalysisShape, transcript: string, metrics: PeithoMetrics): AnalysisShape {
  const grammar = (Array.isArray(raw.grammar) ? raw.grammar : []).filter((item) => hasVerbatimQuote(transcript, item?.quote) && isDefensibleSpokenGrammarIssue(item?.issue)).slice(0, 5).map((item) => ({ quote: String(item.quote), issue: String(item.issue || ''), fix: String(item.fix || '') }))
  const l1Patterns = (Array.isArray(raw.l1_patterns) ? raw.l1_patterns : []).filter((item) => hasVerbatimQuote(transcript, item?.quote) && isDefensibleL1Pattern(item?.pattern)).slice(0, 3).map((item) => ({ quote: String(item.quote), pattern: String(item.pattern || ''), fix: String(item.fix || '') }))
  const clarityMoments = (Array.isArray(raw.delivery?.clarity_moments) ? raw.delivery?.clarity_moments : []).filter((item) => validClarityMoment(item, transcript)).slice(0, 3).map((item) => ({ quote:String(item.quote), kind:item.kind, observation:String(item.observation||''), suggestion:String(item.suggestion||''), confidence:item.confidence }))
  const validFixes = (Array.isArray(raw.top_fixes) ? raw.top_fixes : []).filter((item) => hasVerbatimQuote(transcript, item?.you_said) && item?.title && item?.try).slice(0, 3).map((item) => ({ title: String(item.title), you_said: String(item.you_said), try: String(item.try) }))
  const fallbackFixes = metricFixes(transcript, metrics)
  for (const fix of fallbackFixes) { if (validFixes.length >= 3) break; if (fix.you_said && hasVerbatimQuote(transcript, fix.you_said)) validFixes.push(fix) }

  return {
    grammar,
    l1_patterns: l1Patterns,
    vocabulary: { score: Number.isFinite(Number(raw.vocabulary?.score)) ? Number(raw.vocabulary?.score) : 60, note: String(raw.vocabulary?.note || 'Vocabulary analysis was unavailable for this run.') },
    coherence: { score: Number.isFinite(Number(raw.coherence?.score)) ? Number(raw.coherence?.score) : 60, note: String(raw.coherence?.note || 'Coherence analysis was unavailable for this run.') },
    delivery: { score: Number.isFinite(Number(raw.delivery?.score)) ? Number(raw.delivery?.score) : 0, note: String(raw.delivery?.note || 'Audio unavailable — delivery was not scored.'), clarity_moments: clarityMoments, tonal_variation: voiceDimension(raw.delivery?.tonal_variation,'Tonal variation was not scored in this review.'), volume_projection: voiceDimension(raw.delivery?.volume_projection,'Voice projection was not scored in this review.'), enunciation: voiceDimension(raw.delivery?.enunciation,'Enunciation was not scored in this review.') },
    top_fixes: validFixes.slice(0, 3),
    encouragement: String(raw.encouragement || 'Run the same topic once more and make the first sentence of each point more direct.'),
  }
}

export function deterministicOnlyAnalysis(transcript: string, metrics: PeithoMetrics): AnalysisShape {
  return {
    grammar: [], l1_patterns: [],
    vocabulary: { score: 60, note: 'Vocabulary analysis was unavailable for this review.' },
    coherence: { score: 60, note: 'Idea-flow analysis was unavailable for this review.' },
    delivery: { score: 0, note: 'Voice delivery was not scored in this review.', clarity_moments: [], tonal_variation:{score:0,note:'Tonal variation was not scored in this review.'}, volume_projection:{score:0,note:'Voice projection was not scored in this review.'}, enunciation:{score:0,note:'Enunciation was not scored in this review.'} },
    top_fixes: metricFixes(transcript, metrics),
    encouragement: 'Try the same topic once more and make the first sentence of each point more direct.',
  }
}
