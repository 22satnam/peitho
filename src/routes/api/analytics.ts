import {createFileRoute} from '@tanstack/react-router'
import {createClient} from '@supabase/supabase-js'
import {createHash} from 'node:crypto'

const SUPABASE_URL=process.env.SUPABASE_URL?.trim()||process.env.VITE_SUPABASE_URL?.trim()||'https://kunbvgqzrowodkpxvmit.supabase.co'
const SUPABASE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY?.trim()||process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()||'sb_publishable_UnvhF1QSxuQwQGFFwzwy7A_aJP3mBfV'
const client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})

function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function hash(value:string,prefix:string){
 const salt=process.env.ANALYTICS_HASH_SALT?.trim()||'peitho-first-party-analytics-v1'
 return createHash('sha256').update(`${salt}:${prefix}:${value}`).digest('hex')
}
function countryName(code:string){
 if(!code||code==='UNKNOWN')return'Unknown'
 try{return new Intl.DisplayNames(['en'],{type:'region'}).of(code)||code}catch{return code}
}
function dimensions(request:Request){
 const ua=(request.headers.get('user-agent')||'').toLowerCase()
 const platform=(request.headers.get('sec-ch-ua-platform')||'').toLowerCase()
 let device='Desktop'
 if(/mobile|android|iphone|ipod/.test(ua))device='Mobile'
 else if(/ipad|tablet/.test(ua))device='Tablet'
 else if(/bot|spider|crawl/.test(ua))device='Bot/Other'
 let os='Other'
 if(platform.includes('windows')||/windows/.test(ua))os='Windows'
 else if(platform.includes('macos')||/mac os|macintosh/.test(ua))os='macOS'
 else if(platform.includes('android')||/android/.test(ua))os='Android'
 else if(platform.includes('ios')||/iphone|ipad|ios/.test(ua))os='iOS'
 else if(platform.includes('chrome os')||/cros/.test(ua))os='ChromeOS'
 else if(platform.includes('linux')||/ubuntu|linux/.test(ua))os=/ubuntu/.test(ua)?'Ubuntu':'Linux'
 const countryCode=String(request.headers.get('x-vercel-ip-country')||'Unknown').toUpperCase()
 return{country:countryName(countryCode),device,os}
}
function cleanPath(raw:string){
 try{
   const path=new URL(raw,'https://peitho.local').pathname
   if(/^\/review\/[^/]+$/.test(path))return'/review/session'
   return path.slice(0,140)||'/'
 }catch{return'/'}
}

export const Route=createFileRoute('/api/analytics')({server:{handlers:{
 GET:async()=>{
   try{
     const{data,error}=await client.rpc('read_peitho_analytics')
     if(error)throw error
     return json({configured:true,...(data||{})})
   }catch(error){
     console.error('[Peitho] analytics read failed',error instanceof Error?error.message:String(error))
     return json({error:'Insights are temporarily unavailable.'},503)
   }
 },
 POST:async({request})=>{
   try{
     const body:any=await request.json().catch(()=>({}))
     const event=body?.type==='heartbeat'?'heartbeat':'pageview'
     const visitorId=String(body?.visitorId||'').slice(0,180)
     const sessionId=String(body?.sessionId||'').slice(0,180)
     if(!visitorId||!sessionId)return json({error:'Analytics identity missing.'},400)
     const path=cleanPath(String(body?.path||'/'))
     const {country,device,os}=dimensions(request)
     const{error}=await client.rpc('record_peitho_analytics',{
       p_visitor_hash:hash(visitorId,'visitor'),
       p_session_hash:hash(sessionId,'session'),
       p_event:event,
       p_path:path,
       p_country:country,
       p_device:device,
       p_os:os,
     })
     if(error)throw error
     return json({ok:true})
   }catch(error){
     console.error('[Peitho] analytics write failed',error instanceof Error?error.message:String(error))
     return json({error:'Analytics are temporarily unavailable.'},503)
   }
 }
}}})
