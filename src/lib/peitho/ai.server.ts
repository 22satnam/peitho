import type { AnalysisShape, PeithoMetrics, WordTimestamp } from './metrics'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GROQ_FINAL_STT_MODEL = process.env.GROQ_FINAL_STT_MODEL?.trim() || 'whisper-large-v3'
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b'

export type TranscriptionResult = {
  text: string
  duration?: number
  words: WordTimestamp[]
  segments: Array<{ start?: number; end?: number; text?: string }>
}

const VOICE_DIMENSION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    note: { type: 'string' },
  },
  required: ['score','note'],
} as const

const CLARITY_MOMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    quote: { type: 'string' },
    kind: { type: 'string', enum: ['unclear','mumbled','possible_mispronunciation','recognition_uncertain'] },
    observation: { type: 'string' },
    suggestion: { type: 'string' },
    confidence: { type: 'string', enum: ['medium','high'] },
  },
  required: ['quote','kind','observation','suggestion','confidence'],
} as const

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    grammar: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, properties: { quote: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['quote', 'issue', 'fix'] } },
    l1_patterns: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { quote: { type: 'string' }, pattern: { type: 'string' }, fix: { type: 'string' } }, required: ['quote', 'pattern', 'fix'] } },
    vocabulary: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } }, required: ['score', 'note'] },
    coherence: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } }, required: ['score', 'note'] },
    delivery: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' }, clarity_moments: { type:'array', maxItems:3, items:CLARITY_MOMENT_SCHEMA }, tonal_variation: VOICE_DIMENSION_SCHEMA, volume_projection: VOICE_DIMENSION_SCHEMA, enunciation: VOICE_DIMENSION_SCHEMA }, required: ['score', 'note', 'clarity_moments', 'tonal_variation', 'volume_projection', 'enunciation'] },
    top_fixes: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, you_said: { type: 'string' }, try: { type: 'string' } }, required: ['title', 'you_said', 'try'] } },
    encouragement: { type: 'string' },
  },
  required: ['grammar', 'l1_patterns', 'vocabulary', 'coherence', 'delivery', 'top_fixes', 'encouragement'],
} as const

function env(name: 'GROQ_API_KEY' | 'GEMINI_API_KEY') { return process.env[name]?.trim() || '' }
function parseJsonText(text: string) { return JSON.parse(text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()) }
function extractGenerateContentText(payload: any) { const candidates=Array.isArray(payload?.candidates)?payload.candidates:[];const texts:string[]=[];for(const candidate of candidates){const parts=Array.isArray(candidate?.content?.parts)?candidate.content.parts:[];for(const part of parts)if(typeof part?.text==='string')texts.push(part.text)}return texts.join('\n').trim() }

function analysisPrompt(input:{transcript:string;topicTitle:string;points:string[];metrics:PeithoMetrics;hasAudio:boolean}) {
  const deliveryInstruction=input.hasAudio
    ? `You can hear the recording. Evaluate delivery from what you actually hear: pace, hesitation, intelligibility, clarity and pronunciation. Do not infer an accent defect. delivery.score must reflect the actual audio.
For delivery.clarity_moments, return at most 3 moments and [] when there is no strong evidence. A clarity moment is for coaching intelligibility, not judging accent:
- recognition_uncertain: the transcript phrase sounds inconsistent with the audio or context and may be an ASR mishearing. Do not turn it into grammar/L1 criticism.
- unclear: words are genuinely hard to make out in the audio.
- mumbled: articulation/volume causes syllables or word boundaries to blur.
- possible_mispronunciation: use ONLY with high confidence when the intended word is evident and its spoken form materially harms intelligibility. Never use this for accent/dialect variation, names, technical terms, or a guess.
Every clarity_moment.quote must be copied verbatim from the transcript. Use confidence=high for possible_mispronunciation. Prefer recognition_uncertain over accusing the speaker when the transcript itself may simply be wrong.
Also score these three audio-only dimensions independently:
- delivery.tonal_variation: 0-100 for purposeful variation in pitch/energy/emphasis. A calm voice is not automatically weak; penalize monotony only when emphasis stays too flat to help the listener.
- delivery.volume_projection: 0-100 for audible, steady vocal energy at the microphone. Do not claim to know absolute room loudness or physical projection because microphone gain and distance can distort that. Judge consistency/audibility in this recording.
- delivery.enunciation: 0-100 for intelligibility and articulation. Be accent-neutral. Do not penalize dialect or accent; score whether words are sufficiently distinct and understandable.
Each note must explain the audible evidence in one concise sentence.`
    : 'No audio is available in this path. Set delivery.score to 0, delivery.note to "Audio unavailable — delivery was not scored.", delivery.clarity_moments to [], and set delivery.tonal_variation, delivery.volume_projection and delivery.enunciation to {score:0,note:"Not scored in this review."}.'

  return `You are Peitho, a precise and respectful spoken-English coach. Review only evidence actually present in the speech. The transcript was produced by automatic speech recognition and can contain punctuation errors or occasional misheard words.

${deliveryInstruction}

TOPIC: ${input.topicTitle}
SUGGESTED POINTS: ${input.points.join('; ')}
LOCAL METRICS: ${input.metrics.wpm} wpm, ${input.metrics.fillersPerMin} fillers/min, ${input.metrics.pauseCount} long pauses, longest ${input.metrics.longestPauseSec}s, ${input.metrics.uniqueRatio}% unique words.

TRANSCRIPT:
"""${input.transcript}"""

Rules:
- Every grammar quote, L1-pattern quote, clarity-moment quote and top-fix you_said must be copied verbatim from the transcript.
- Keep categories separate. Fillers, hesitation, repetition, pace and pauses are FLUENCY issues, not grammar or L1-transfer issues.
- Grammar means a defensible spoken-English construction error. Do not report run-on sentences, comma splices, punctuation, capitalization, or sentence-boundary issues because ASR punctuation is not reliable.
- Do not call a phrase a tense error when its verbs are grammatically compatible in context.
- grammar: at most 5 high-value issues. Prefer fewer high-confidence findings over speculative ones. Use [] when there is no defensible correction.
- L1 transfer must be a defensible structural or lexical transfer pattern. Never infer L1 transfer merely from nationality, accent, fillers, hesitation, repetition, pace, or one ambiguous awkward phrase. If uncertain, omit it.
- Never say generic filler use is evidence of Hindi-English or another L1 transfer.
- l1_patterns: at most 3, and [] is a good result when there is no high-confidence evidence.
- vocabulary: always include score and a specific note grounded in actual word choices. Do not double-penalize filler frequency here.
- coherence: always include score and a specific note explaining whether the speaker answered the topic and connected claims, evidence and outcome.
- top_fixes: exactly 3. Prioritize the three most useful changes across fluency, grammar, vocabulary, coherence and high-confidence delivery evidence without duplicating one problem across categories.
- encouragement: one honest, specific sentence, no generic praise.
- Do not invent words the speaker did not say. If a phrase appears semantically bizarre or likely to be an ASR mistake, mark it only as recognition_uncertain when audio supports that, and do not build grammar/L1 criticism around it.`
}

async function geminiGenerateContent(key:string,parts:Array<Record<string,unknown>>,schema?:Record<string,unknown>){
 const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`
 const body:Record<string,unknown>={contents:[{role:'user',parts}]}
 if(schema)body.generationConfig={responseMimeType:'application/json',responseJsonSchema:schema,temperature:.2}
 return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)})
}

type GeminiUploadedFile={name:string;uri:string;mimeType:string;state?:string}
async function uploadAudioToGemini(key:string,audio:Blob):Promise<GeminiUploadedFile>{
 const mimeType=audio.type||'audio/webm'
 const start=await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files',{method:'POST',headers:{'x-goog-api-key':key,'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':String(audio.size),'X-Goog-Upload-Header-Content-Type':mimeType,'Content-Type':'application/json'},body:JSON.stringify({file:{display_name:'peitho-session-audio'}})})
 if(!start.ok)throw new Error(`Gemini file upload start failed (${start.status}): ${(await start.text()).slice(0,500)}`)
 const uploadUrl=start.headers.get('x-goog-upload-url');if(!uploadUrl)throw new Error('Gemini file upload did not return an upload URL')
 const bytes=await audio.arrayBuffer();const upload=await fetch(uploadUrl,{method:'POST',headers:{'Content-Length':String(audio.size),'Content-Type':mimeType,'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize'},body:bytes})
 if(!upload.ok)throw new Error(`Gemini file upload failed (${upload.status}): ${(await upload.text()).slice(0,500)}`)
 const payload:any=await upload.json();let file=payload?.file;if(!file?.name||!file?.uri)throw new Error('Gemini file upload returned no usable file URI')
 for(let attempt=0;String(file.state||'').toUpperCase()==='PROCESSING'&&attempt<10;attempt+=1){await new Promise(resolve=>setTimeout(resolve,500));const metadata=await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`,{headers:{'x-goog-api-key':key}});if(!metadata.ok)break;const metadataPayload:any=await metadata.json();if(metadataPayload?.file)file=metadataPayload.file}
 if(String(file.state||'').toUpperCase()==='FAILED')throw new Error('Gemini reported that the uploaded audio could not be processed')
 return{name:String(file.name),uri:String(file.uri),mimeType:String(file.mimeType||file.mime_type||mimeType),state:file.state?String(file.state):undefined}
}
async function deleteGeminiFile(key:string,name:string){if(!name.startsWith('files/'))return;try{await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`,{method:'DELETE',headers:{'x-goog-api-key':key}})}catch{}}

export async function transcribeWithGroq(audio:Blob,fileName='session.webm',context=''):Promise<TranscriptionResult>{
 const key=env('GROQ_API_KEY');if(!key)throw new Error('GROQ_API_KEY is not configured')
 const form=new FormData()
 form.append('file',audio,fileName)
 form.append('model',GROQ_FINAL_STT_MODEL)
 form.append('language','en')
 form.append('temperature','0')
 form.append('response_format','verbose_json')
 form.append('timestamp_granularities[]','word')
 form.append('timestamp_granularities[]','segment')
 const contextHint=String(context||'').replace(/\s+/g,' ').trim().slice(0,700)
 form.append('prompt',[
   'Professional English speaking practice. Preserve um, uh, hmm, er, you know, I mean, basically, like, and so yeah exactly when spoken.',
   contextHint?`Topic context and likely terminology: ${contextHint}`:'',
 ].filter(Boolean).join(' '))
 const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form})
 if(!response.ok)throw new Error(`Groq transcription failed (${response.status}): ${(await response.text()).slice(0,500)}`)
 const data:any=await response.json()
 const words=(Array.isArray(data.words)?data.words:[]).filter((w:any)=>typeof w?.word==='string').map((w:any)=>({word:w.word,start:Number(w.start)||0,end:Number(w.end)||0}))
 return{text:String(data.text||'').trim(),duration:Number(data.duration)||undefined,words,segments:Array.isArray(data.segments)?data.segments:[]}
}

export async function analyzeWithGemini(input:{transcript:string;topicTitle:string;points:string[];metrics:PeithoMetrics;audio?:Blob|null}):Promise<AnalysisShape>{
 const key=env('GEMINI_API_KEY');if(!key)throw new Error('GEMINI_API_KEY is not configured')
 const prompt=analysisPrompt({...input,hasAudio:Boolean(input.audio)});let uploaded:GeminiUploadedFile|null=null
 try{const parts:Array<Record<string,unknown>>=[{text:prompt}];if(input.audio){uploaded=await uploadAudioToGemini(key,input.audio);parts.push({fileData:{mimeType:uploaded.mimeType,fileUri:uploaded.uri}})}const response=await geminiGenerateContent(key,parts,ANALYSIS_SCHEMA as unknown as Record<string,unknown>);if(!response.ok)throw new Error(`Gemini GenerateContent failed (${response.status}): ${(await response.text()).slice(0,700)}`);const payload=await response.json();const text=extractGenerateContentText(payload);if(!text)throw new Error('Gemini GenerateContent returned no text output');return parseJsonText(text)}finally{if(uploaded)await deleteGeminiFile(key,uploaded.name)}
}

export async function analyzeWithGroqFallback(input:{transcript:string;topicTitle:string;points:string[];metrics:PeithoMetrics}):Promise<AnalysisShape>{
 const key=env('GROQ_API_KEY');if(!key)throw new Error('GROQ_API_KEY is not configured')
 const prompt=analysisPrompt({...input,hasAudio:false});const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_FALLBACK_MODEL,temperature:.2,response_format:{type:'json_schema',json_schema:{name:'peitho_speech_analysis',strict:true,schema:ANALYSIS_SCHEMA}},messages:[{role:'system',content:'Return evidence-backed spoken-English coaching that conforms exactly to the supplied JSON schema.'},{role:'user',content:prompt}]})})
 if(!response.ok)throw new Error(`Groq fallback failed (${response.status}): ${(await response.text()).slice(0,500)}`)
 const data:any=await response.json();const text=data?.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim())throw new Error('Groq fallback returned no content');return parseJsonText(text)
}

export async function generateTextJson<T>(input:{prompt:string;schema:Record<string,unknown>}):Promise<{data:T;provider:'gemini'|'groq'}>{
 const geminiKey=env('GEMINI_API_KEY');if(geminiKey){try{const response=await geminiGenerateContent(geminiKey,[{text:input.prompt}],input.schema);if(!response.ok)throw new Error(await response.text());const payload=await response.json();return{data:parseJsonText(extractGenerateContentText(payload)) as T,provider:'gemini'}}catch(error){console.error('Gemini text generation failed; falling back to Groq',error)}}
 const groqKey=env('GROQ_API_KEY');if(!groqKey)throw new Error('No AI provider is configured')
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_FALLBACK_MODEL,temperature:.4,response_format:{type:'json_object'},messages:[{role:'system',content:'Return only valid JSON matching the requested shape.'},{role:'user',content:input.prompt}]})})
 if(!response.ok)throw new Error(`Groq generation failed (${response.status}): ${(await response.text()).slice(0,500)}`)
 const payload:any=await response.json();return{data:parseJsonText(payload?.choices?.[0]?.message?.content||'') as T,provider:'groq'}
}
