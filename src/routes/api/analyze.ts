import { createFileRoute } from '@tanstack/react-router'
import { analyzeWithGemini, analyzeWithGroqFallback, transcribeWithGroq } from '../../lib/peitho/ai.server'
import { authenticatedUser, consumeAiQuota, quotaResponse, unauthorizedResponse, userScopedClient } from '../../lib/peitho/auth.server'
import { buildPerformanceReport, buildPracticePlan, computeMetrics, scoreSession } from '../../lib/peitho/metrics'
import { deterministicOnlyAnalysis, validateAnalysis } from '../../lib/peitho/validation'

function normalizedAudioMime(fileName:string,reportedType:string){const ext=fileName.toLowerCase().split('.').pop()||'';const map:Record<string,string>={m4a:'audio/m4a',mp3:'audio/mp3',mpeg:'audio/mpeg',wav:'audio/wav',webm:'audio/webm',ogg:'audio/ogg',opus:'audio/opus',aac:'audio/aac',flac:'audio/flac',aiff:'audio/aiff',aif:'audio/aiff'};const clean=reportedType.toLowerCase().split(';')[0].trim();if(new Set(Object.values(map)).has(clean))return clean;return map[ext]||'audio/webm'}
function transient(e:unknown){const m=e instanceof Error?e.message:String(e||'');return /\((408|429|500|502|503|504)\)/.test(m)||/UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(m)}
function safeError(e:unknown){return (e instanceof Error?e.message:String(e||'unknown')).replace(/[\r\n]+/g,' ').slice(0,280)}
async function richReview(input:Parameters<typeof analyzeWithGemini>[0]){let last:unknown;for(let attempt=1;attempt<=2;attempt++){try{return await analyzeWithGemini(input)}catch(e){last=e;const message=e instanceof Error?e.message:String(e);if(/exhausted models|authorization failed/i.test(message)||!transient(e)||attempt===2)throw e;await new Promise(r=>setTimeout(r,1400+Math.floor(Math.random()*550)))}}throw last}

export const Route=createFileRoute('/api/analyze')({server:{handlers:{POST:async({request})=>{try{
 const user=await authenticatedUser(request);if(!user)return unauthorizedResponse()
 const form=await request.formData(),draftId=String(form.get('draftId')||'').trim()
 if(!draftId){const quota=await consumeAiQuota(request,'analysis');if(!quota.allowed)return quotaResponse('analysis',quota.reason==='unavailable'?'unavailable':'limit')}
 const fileName=String(form.get('fileName')||'session.webm'),entry=form.get('audio'),raw=entry instanceof Blob&&entry.size>0?entry:null,audio=raw?new Blob([await raw.arrayBuffer()],{type:normalizedAudioMime(fileName,raw.type)}):null,browserTranscript=String(form.get('transcript')||'').trim().slice(0,40000),topicId=String(form.get('topicId')||'').trim()||null,topicTitle=String(form.get('topicTitle')||'Speaking practice').trim(),durationSec=Math.max(1,Number(form.get('durationSec'))||1),glossary=String(form.get('glossary')||'').replace(/\s+/g,' ').trim().slice(0,650)
 let confirmedDraft:any=null
 if(draftId){
   if(!audio)return Response.json({error:'Please include your original audio recording with the confirmed transcript.'},{status:400})
   if(audio.size>18*1024*1024)return Response.json({error:'Audio is too large. Keep the recording under 18 MB.'},{status:413})
   if(browserTranscript.split(/\s+/).filter(Boolean).length<5)return Response.json({error:'Please confirm at least five spoken words.'},{status:422})
   const verifiedDb=userScopedClient(request)
   if(!verifiedDb)return unauthorizedResponse()
   const{data,error}=await verifiedDb.rpc('claim_transcription_draft',{p_draft_id:draftId})
   if(error||!data)return Response.json({error:'The transcription review expired or was already used. Please transcribe again.'},{status:409})
   confirmedDraft=data
 }
 let points:string[]=[],clientPausesMs:number[]=[];try{const p=JSON.parse(String(form.get('points')||'[]'));if(Array.isArray(p))points=p.map(String).slice(0,8)}catch{}try{const p=JSON.parse(String(form.get('clientPausesMs')||'[]'));if(Array.isArray(p))clientPausesMs=p.map(Number).filter(Number.isFinite)}catch{}
 if(!audio&&browserTranscript.split(/\s+/).filter(Boolean).length<5)return Response.json({error:'At least five words of transcript or an audio recording are required.'},{status:400});if(audio&&audio.size>18*1024*1024)return Response.json({error:'Audio is too large. Keep the recording under 18 MB.'},{status:413})
 const warnings:string[]=[]
 let transcript=browserTranscript
 let authoritativeDuration=confirmedDraft?Math.max(1,Math.min(300,Number(confirmedDraft.durationSec)||durationSec)):durationSec
 let wordTimestamps:Array<{word:string;start:number;end:number}>=confirmedDraft&&Array.isArray(confirmedDraft.words)?confirmedDraft.words.filter((w:any)=>Number.isFinite(Number(w.start))&&Number.isFinite(Number(w.end))).map((w:any)=>({word:String(w.word||''),start:Number(w.start),end:Number(w.end)})):[]
 let transcriptionProvider:'groq-whisper'|'browser'=confirmedDraft?.provider==='groq-whisper'?'groq-whisper':'browser',whisperSegments=0
 // A confirmed transcript must never be overwritten by another transcription pass.
 // Word timings still come from the audio, so pauses remain based on what was recorded.
 if(audio&&!confirmedDraft){try{const context=[glossary,topicTitle,...points].filter(Boolean).join('. ').slice(0,700);const t=await transcribeWithGroq(audio,fileName,context);if(t.text){transcript=t.text;authoritativeDuration=t.duration||durationSec;wordTimestamps=t.words;whisperSegments=t.segments.length;transcriptionProvider='groq-whisper'}}catch(e){console.warn('[Peitho] final voice transcript fallback:',safeError(e));warnings.push(e instanceof Error?e.message:'Speech transcription failed');if(!browserTranscript)throw e}}
 if(transcript.split(/\s+/).filter(Boolean).length<5)return Response.json({error:'Too little speech was captured to analyze.'},{status:422})
 const metrics=computeMetrics({transcript,durationSec:authoritativeDuration,wordTimestamps,clientPausesMs});let rawAnalysis;let analysisProvider:'gemini-audio'|'gemini-text'|'groq-text'|'deterministic-only'
 try{rawAnalysis=await richReview({transcript,topicTitle,points,metrics,audio,confirmed:Boolean(confirmedDraft)});analysisProvider=audio?'gemini-audio':'gemini-text'}catch(e){const richError=safeError(e);console.warn('[Peitho] rich audio review fallback:',richError);warnings.push(e instanceof Error?e.message:'Rich audio review failed');try{const diag=userScopedClient(request);if(diag)await diag.rpc('log_provider_event',{p_provider:'gemini',p_stage:'rich_audio_review',p_message:richError})}catch{}try{rawAnalysis=await analyzeWithGroqFallback({transcript,topicTitle,points,metrics,confirmed:Boolean(confirmedDraft)});analysisProvider='groq-text'}catch(f){console.warn('[Peitho] lite review fallback:',safeError(f));warnings.push(f instanceof Error?f.message:'Lite review failed');rawAnalysis=deterministicOnlyAnalysis(transcript,metrics);analysisProvider='deterministic-only'}}
 const analysis=validateAnalysis(rawAnalysis,transcript,metrics),scores=scoreSession(metrics,analysis),performanceReport=buildPerformanceReport(metrics,analysis),practicePlan=buildPracticePlan(metrics,scores,performanceReport);let largestRawWordGapSec=0;for(let i=1;i<wordTimestamps.length;i++)largestRawWordGapSec=Math.max(largestRawWordGapSec,Math.max(0,wordTimestamps[i].start-wordTimestamps[i-1].end))
 const resultPayload={transcript,metrics,analysis,scores,performanceReport,practicePlan,providers:{transcription:transcriptionProvider,analysis:analysisProvider},degraded:transcriptionProvider!=='groq-whisper'||analysisProvider!=='gemini-audio',reviewMode:transcriptionProvider==='groq-whisper'&&analysisProvider==='gemini-audio'?'full':'lite',warnings:process.env.NODE_ENV==='production'?[]:warnings,...(process.env.NODE_ENV!=='production'?{diagnostics:{audioMimeType:audio?.type||null,timestampedWords:wordTimestamps.length,whisperSegments,largestRawWordGapSec:Number(largestRawWordGapSec.toFixed(3))}}:{})}
 const db=userScopedClient(request);let savedSessionId:string|null=null
 if(db){
   const sessionForSave={topic_id:topicId,topic_title:topicTitle,mode:'mic',duration_sec:Math.max(0,Math.min(300,Math.round(metrics.durationSec||durationSec))),transcript,wpm:metrics.wpm,fillers:metrics.fillers,fillers_per_min:metrics.fillersPerMin,long_pauses:metrics.pauseCount,longest_pause_sec:metrics.longestPauseSec,unique_ratio:metrics.uniqueRatio,fluency:scores.fluency,grammar:scores.grammar,vocabulary:scores.vocabulary,coherence:scores.coherence,overall:scores.overall,result_snapshot:resultPayload}
   const analysisForSave={grammar:analysis.grammar||[],l1_patterns:analysis.l1_patterns||[],vocabulary:analysis.vocabulary||{},coherence:analysis.coherence||{},top_fixes:analysis.top_fixes||[],delivery:analysis.delivery||{},encouragement:String(analysis.encouragement||'')}
   const{data:saved,error:saveError}=await db.rpc('save_practice_session',{p_session:sessionForSave,p_analysis:analysisForSave})
   if(saveError)console.error('[Peitho] session save RPC failed:',safeError(saveError));else if(saved)savedSessionId=String(saved)
 }
 return Response.json({...resultPayload,sessionId:savedSessionId,sessionSaved:Boolean(savedSessionId)},{headers:{'Cache-Control':'no-store'}})
}catch(e){console.error('Peitho analyze route failed',e);return Response.json({error:e instanceof Error?e.message:'Analysis failed unexpectedly.'},{status:500,headers:{'Cache-Control':'no-store'}})}}}}})
