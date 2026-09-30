import { createFileRoute } from '@tanstack/react-router'
import { authenticatedUser, consumeAiQuota, quotaResponse, unauthorizedResponse, userScopedClient } from '../../lib/peitho/auth.server'
import { transcribeWithGroq } from '../../lib/peitho/ai.server'

const allowed:Record<string,string>={webm:'audio/webm',m4a:'audio/m4a',mp4:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',mp3:'audio/mpeg'}
function audioMime(name:string,mime:string){
 const clean=mime.toLowerCase().split(';')[0].trim()
 return Object.values(allowed).includes(clean)?clean:allowed[name.toLowerCase().split('.').pop()||'']||'audio/webm'
}
function publicError(error:unknown){
 const msg=error instanceof Error?error.message:String(error)
 // Do not expose provider keys, response bodies or internal details to clients.
 if(/429|rate.limit|quota/i.test(msg))return 'Transcription is temporarily rate-limited. Please try again shortly.'
 return 'The final recording could not be transcribed. Your audio is still on this device; please retry.'
}

export const Route=createFileRoute('/api/transcribe-final')({server:{handlers:{POST:async({request})=>{
 const user=await authenticatedUser(request)
 if(!user)return unauthorizedResponse()
 try{
   const form=await request.formData()
   const entry=form.get('audio'),fileName=String(form.get('fileName')||'session.webm')
   const glossary=String(form.get('glossary')||'').replace(/[\r\n]/g,' ').slice(0,190)
   const duration=Math.max(1,Math.min(300,Number(form.get('durationSec'))||1))
   if(!(entry instanceof Blob)||!entry.size)return Response.json({error:'Please record some speech first.'},{status:400})
   if(entry.size>18*1024*1024)return Response.json({error:'Recording exceeds 18 MB.'},{status:413})
   const quota=await consumeAiQuota(request,'analysis')
   if(!quota.allowed)return quotaResponse('analysis',quota.reason==='unavailable'?'unavailable':'limit')
   const audio=new Blob([await entry.arrayBuffer()],{type:audioMime(fileName,entry.type)})
   const transcription=await transcribeWithGroq(audio,fileName,glossary)
   if(transcription.text.split(/\s+/).filter(Boolean).length<5){
     return Response.json({error:'Not enough recognizable speech was captured. Please record again.'},{status:422})
   }
   const db=userScopedClient(request)
   if(!db) return unauthorizedResponse()
   const{data:draftId,error}=await db.rpc('create_transcription_draft',{
     p_transcript:transcription.text,
     p_words:transcription.words,
     p_duration:transcription.duration||duration,
     p_provider:'groq-whisper'
   })
   if(error||!draftId){
     console.error('[Peitho] transcription draft save failed',error?.message)
     throw new Error('Failed to save the temporary transcript')
   }
   return Response.json({
     draftId,transcript:transcription.text,
     durationSec:transcription.duration||duration,
     wordCount:transcription.text.trim().split(/\s+/).length
   },{headers:{'Cache-Control':'no-store'}})
 }catch(error){
   const failure=error instanceof Error?error.message:String(error)
   console.error('[Peitho] final transcription failed',failure)
   try{const diag=userScopedClient(request);if(diag)await diag.rpc('log_provider_event',{p_provider:'groq',p_stage:'final_transcription',p_message:failure.replace(/[\r\n]+/g,' ').slice(0,350)})}catch{}
   return Response.json({error:publicError(error)},{status:502,headers:{'Cache-Control':'no-store'}})
 }
}}}})
