import { createFileRoute } from '@tanstack/react-router'
import { authenticatedUser, consumeAiQuota, quotaResponse, unauthorizedResponse } from '../../lib/peitho/auth.server'

function liveMime(fileName: string, reported: string) {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = { webm:'audio/webm', m4a:'audio/m4a', mp4:'audio/mp4', ogg:'audio/ogg', wav:'audio/wav', mp3:'audio/mpeg' }
  const clean = reported.toLowerCase().split(';')[0].trim()
  return clean.startsWith('audio/') ? clean : (map[ext] || 'audio/webm')
}
function cookieValue(request: Request, name: string) { const raw=request.headers.get('cookie')||''; const item=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`)); return item?item.slice(name.length+1):'' }
function readContext(request: Request) { try { const raw=cookieValue(request,'peitho_live_ctx'); if(!raw)return''; const parsed=JSON.parse(decodeURIComponent(raw)); if(!parsed?.text||!parsed?.ts||Date.now()-Number(parsed.ts)>12_000)return''; return String(parsed.text).slice(-900) } catch{return''} }
function contextCookie(text: string) { const value=encodeURIComponent(JSON.stringify({ts:Date.now(),text:text.slice(-900)})); return `peitho_live_ctx=${value}; Path=/; Max-Age=900; SameSite=Lax; Secure` }
function wavRms(buffer: ArrayBuffer) { if(buffer.byteLength<48)return 1; const view=new DataView(buffer); let sum=0,count=0; for(let i=44;i+1<buffer.byteLength;i+=2){const sample=view.getInt16(i,true)/32768;sum+=sample*sample;count+=1} return count?Math.sqrt(sum/count):0 }

export const Route = createFileRoute('/api/live-transcribe')({
  server: { handlers: { POST: async ({ request }) => {
    try {
      if (!(await authenticatedUser(request))) return unauthorizedResponse()
      const quota = await consumeAiQuota(request, 'live_transcribe')
      if (!quota.allowed) return quotaResponse('live_transcribe', quota.reason === 'unavailable' ? 'unavailable' : 'limit')

      const key=process.env.GROQ_API_KEY?.trim(); if(!key)return Response.json({error:'GROQ_API_KEY is not configured.'},{status:500})
      const form=await request.formData(); const fileName=String(form.get('fileName')||'live.webm'); const entry=form.get('audio')
      if(!(entry instanceof Blob)||!entry.size)return Response.json({error:'Audio chunk required.'},{status:400})
      if(entry.size>6*1024*1024)return Response.json({error:'Live audio chunk too large.'},{status:413})
      const bytes=await entry.arrayBuffer(); const mime=liveMime(fileName,entry.type)
      if(mime==='audio/wav'&&wavRms(bytes)<0.0045)return Response.json({transcript:''},{headers:{'Cache-Control':'no-store'}})
      const previous=readContext(request); const audio=new Blob([bytes],{type:mime}); const groq=new FormData()
      groq.append('file',audio,fileName);groq.append('model',process.env.GROQ_LIVE_STT_MODEL?.trim()||'whisper-large-v3');groq.append('language','en');groq.append('temperature','0');groq.append('response_format','json');if(previous)groq.append('prompt',previous)
      const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:groq})
      if(!response.ok){const detail=await response.text();return Response.json({error:`Groq live transcription failed (${response.status}): ${detail.slice(0,350)}`},{status:response.status,headers:{'Cache-Control':'no-store'}})}
      const payload:any=await response.json();const transcript=String(payload?.text||'').trim();const nextContext=`${previous} ${transcript}`.trim().slice(-900)
      return Response.json({transcript},{headers:{'Cache-Control':'no-store','Set-Cookie':contextCookie(nextContext)}})
    } catch(error) { return Response.json({error:error instanceof Error?error.message:'Live transcription failed.'},{status:500,headers:{'Cache-Control':'no-store'}}) }
  } } },
})
