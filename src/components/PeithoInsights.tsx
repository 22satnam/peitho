import React,{useEffect,useMemo,useState}from'react'
import{getOrCreatePeithoSessionId,getOrCreatePeithoVisitorId}from'../lib/peitho/visitorIdentity'

type Row={label:string;value:number}
type Insights={
 configured?:boolean
 allTime:number
 month:number
 uniqueVisitors:number
 liveVisitors:number
 completedSessions:number
 countries:Row[]
 devices:Row[]
 operatingSystems:Row[]
 pages:Row[]
}
const EMPTY:Insights={allTime:0,month:0,uniqueVisitors:0,liveVisitors:0,completedSessions:0,countries:[],devices:[],operatingSystems:[],pages:[]}

const CSS=`
.pi-overlay{position:fixed;inset:0;z-index:9990;background:rgba(29,27,22,.38);backdrop-filter:blur(6px);font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif}
.pi-drawer{position:absolute;right:0;top:0;width:min(560px,100%);height:100dvh;display:flex;flex-direction:column;background:#F6F4EF;color:#1D1B16;border-left:1px solid #D8D2C3;box-shadow:-28px 0 90px rgba(29,27,22,.2);background-image:linear-gradient(rgba(29,27,22,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(29,27,22,.026) 1px,transparent 1px);background-size:72px 72px;animation:piIn .26s cubic-bezier(.22,1,.36,1)}
@keyframes piIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.pi-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #E1DDD0;background:rgba(246,244,239,.92);backdrop-filter:blur(14px)}.pi-titlebox{display:flex;align-items:center;gap:12px}.pi-mark{width:42px;height:42px;border-radius:12px}.pi-head h2{font:400 25px 'GFS Didot',Georgia,serif;margin:0}.pi-head p{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#98937F;margin:3px 0 0}.pi-head-actions{display:flex;gap:7px}.pi-iconbtn{width:38px;height:38px;border:1px solid #D8D2C3;border-radius:10px;background:#fff;color:#6E6A5C;display:grid;place-items:center;cursor:pointer;font-size:16px}.pi-iconbtn:hover{color:#1A56A8;border-color:#9AB5D7}.pi-body{overflow:auto;padding:20px 22px 32px}.pi-live{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:6px 10px;background:rgba(88,121,71,.10);color:#587947;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}.pi-live i{width:7px;height:7px;border-radius:50%;background:#587947;box-shadow:0 0 0 4px rgba(88,121,71,.08);animation:piPulse 1.8s ease-in-out infinite}@keyframes piPulse{50%{opacity:.45}}.pi-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.pi-metric{background:rgba(255,255,255,.82);border:1px solid #E1DDD0;border-radius:16px;padding:17px}.pi-metric small{display:block;color:#98937F;text-transform:uppercase;letter-spacing:.09em;font-size:9.5px;font-weight:600}.pi-metric b{display:block;font:400 34px 'GFS Didot',Georgia,serif;margin-top:7px;color:#1A56A8}.pi-metric span{display:block;color:#98937F;font-size:10.5px;margin-top:2px}.pi-section{margin-top:26px}.pi-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid #E1DDD0}.pi-section h3{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#6E6A5C}.pi-section-head span{font-size:10px;color:#98937F}.pi-bars{display:grid;gap:12px;margin-top:14px}.pi-row{display:grid;grid-template-columns:minmax(86px,1fr) 126px 38px;gap:10px;align-items:center}.pi-row-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#4C493F}.pi-track{height:6px;border-radius:99px;background:#E8E4DA;overflow:hidden}.pi-track i{display:block;height:100%;background:#1A56A8;border-radius:inherit}.pi-pct{font-size:10px;color:#98937F;text-align:right;font-variant-numeric:tabular-nums}.pi-empty{font-size:12px;color:#98937F;margin:13px 0 0}.pi-note{margin-top:24px;padding:14px 15px;border:1px solid #E1DDD0;border-radius:12px;background:rgba(255,255,255,.55);font-size:11px;line-height:1.6;color:#6E6A5C}.pi-error{padding:16px;border-radius:12px;background:rgba(194,73,43,.08);color:#A33D25;font-size:12px}.pi-loading{opacity:.55}
@media(max-width:600px){.pi-head{padding:15px 15px}.pi-body{padding:16px 15px calc(28px + env(safe-area-inset-bottom))}.pi-metrics{gap:8px}.pi-metric{padding:14px}.pi-metric b{font-size:29px}.pi-row{grid-template-columns:minmax(78px,1fr) 96px 34px;gap:8px}.pi-head h2{font-size:22px}.pi-mark{width:36px;height:36px}}
`

function Bars({rows,empty,page=false}:{rows:Row[];empty:string;page?:boolean}){
 const total=Math.max(1,rows.reduce((s,r)=>s+Number(r.value||0),0))
 if(!rows.length)return <p className="pi-empty">{empty}</p>
 const pretty=(x:string)=>page?({'/':'Home / Practice','/history':'My progress','/leaderboard':'Leaderboard','/account':'Account','/auth/login':'Sign in','/auth/signup':'Sign up','/privacy':'Privacy','/terms':'Terms','/review/session':'Saved review'}[x]||x):x
 return <div className="pi-bars">{rows.slice(0,page?8:6).map(row=>{const pct=Math.max(1,Math.round((row.value/total)*100));return <div className="pi-row" key={row.label}><span className="pi-row-label" title={row.label}>{pretty(row.label)}</span><span className="pi-track"><i style={{width:pct+'%'}}/></span><span className="pi-pct">{pct}%</span></div>})}</div>
}

export default function PeithoInsights(){
 const[open,setOpen]=useState(false),[data,setData]=useState<Insights>(EMPTY),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const visitorId=useMemo(()=>typeof window==='undefined'?'server':getOrCreatePeithoVisitorId(),[])
 const sessionId=useMemo(()=>typeof window==='undefined'?'server':getOrCreatePeithoSessionId(),[])

 async function send(type:'pageview'|'heartbeat'){
   if(typeof window==='undefined')return
   await fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,visitorId,sessionId,path:window.location.pathname}),keepalive:true}).catch(()=>null)
 }
 async function load(){
   setLoading(true);setError('')
   try{
     const r=await fetch('/api/analytics',{headers:{'Cache-Control':'no-store'}}),p=await r.json().catch(()=>({}))
     if(!r.ok)throw new Error(p?.error||'Insights unavailable')
     setData({...EMPTY,...p})
   }catch(e){setError(e instanceof Error?e.message:'Insights unavailable')}finally{setLoading(false)}
 }

 useEffect(()=>{
   if(typeof window==='undefined')return
   const path=window.location.pathname
   const key='peitho-pageview:'+path
   if(sessionStorage.getItem(key)!=='1'){sessionStorage.setItem(key,'1');void send('pageview')}else void send('heartbeat')
   const heartbeat=window.setInterval(()=>{if(document.visibilityState==='visible')void send('heartbeat')},60_000)
   const onOpen=()=>{setOpen(true);void load()}
   window.addEventListener('peitho:open-insights',onOpen)
   return()=>{window.clearInterval(heartbeat);window.removeEventListener('peitho:open-insights',onOpen)}
 },[])

 useEffect(()=>{if(!open)return;const id=window.setInterval(()=>void load(),30_000);return()=>window.clearInterval(id)},[open])
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open])
 if(!open)return <style>{CSS}</style>
 return <><style>{CSS}</style><div className="pi-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><aside className="pi-drawer" role="dialog" aria-modal="true" aria-label="Peitho live insights"><header className="pi-head"><div className="pi-titlebox"><img className="pi-mark" src="/favicon.svg" alt=""/><div><h2>Live Insights</h2><p>Peitho · first-party usage</p></div></div><div className="pi-head-actions"><button className="pi-iconbtn" onClick={()=>void load()} aria-label="Refresh insights">↻</button><button className="pi-iconbtn" onClick={()=>setOpen(false)} aria-label="Close insights">×</button></div></header><div className={"pi-body"+(loading?' pi-loading':'')}>{error?<div className="pi-error">{error}</div>:<><div className="pi-live"><i/>{data.liveVisitors} live now</div><div className="pi-metrics"><div className="pi-metric"><small>This month</small><b>{data.month}</b><span>page views</span></div><div className="pi-metric"><small>All time</small><b>{data.allTime}</b><span>page views</span></div><div className="pi-metric"><small>Unique visitors</small><b>{data.uniqueVisitors}</b><span>anonymous browsers</span></div><div className="pi-metric"><small>Practice completed</small><b>{data.completedSessions}</b><span>saved sessions</span></div></div><section className="pi-section"><div className="pi-section-head"><h3>Page insights</h3><span>where people spend visits</span></div><Bars rows={data.pages} page empty="Page data will appear as Peitho gets visits."/></section><section className="pi-section"><div className="pi-section-head"><h3>Audience · countries</h3></div><Bars rows={data.countries} empty="Country data will appear as visitors arrive."/></section><section className="pi-section"><div className="pi-section-head"><h3>Devices</h3></div><Bars rows={data.devices} empty="Device data will appear as visitors arrive."/></section><section className="pi-section"><div className="pi-section-head"><h3>Operating systems</h3></div><Bars rows={data.operatingSystems} empty="OS data will appear as visitors arrive."/></section><div className="pi-note">Privacy-light analytics: Peitho stores an anonymized visitor hash, page path, country and broad device/OS category. Raw IP addresses are not stored.</div></>}</div></aside></div></>
}
