import React, { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.client'

const CSS=`
.pn{position:sticky;top:0;z-index:80;background:rgba(246,244,239,.95);backdrop-filter:blur(12px);border-bottom:1px solid #E1DDD0;font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif}.pn *{box-sizing:border-box}.pn-inner{max-width:1180px;margin:0 auto;height:70px;padding:0 28px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px}.pn-brand{display:inline-flex;align-items:center;gap:9px;width:max-content;font:400 27px 'GFS Didot',Georgia,serif;color:#1D1B16;text-decoration:none}.pn-mark{width:28px;height:28px;border-radius:7px;display:block}.pn-motto{font-size:12px;color:#6E6A5C;letter-spacing:.04em;white-space:nowrap}.pn-actions{display:flex;justify-content:flex-end;align-items:center;gap:7px}.pn-link,.pn-account summary{border:1px solid transparent;background:transparent;color:#5F5B4F;text-decoration:none;border-radius:999px;padding:8px 11px;font:500 12px 'Instrument Sans',sans-serif;white-space:nowrap;cursor:pointer;list-style:none}.pn-account summary::-webkit-details-marker{display:none}.pn-link:hover,.pn-account summary:hover{background:#fff;border-color:#E1DDD0;color:#1A56A8}.pn-link.board{background:#fff;border-color:#E1DDD0;color:#1A56A8}.pn-account{position:relative}.pn-account[open] summary{background:#fff;border-color:#E1DDD0;color:#1D1B16}.pn-menu{position:absolute;right:0;top:44px;width:190px;padding:7px;background:#fff;border:1px solid #E1DDD0;border-radius:12px;box-shadow:0 14px 34px rgba(29,27,22,.12)}.pn-menu a,.pn-menu button{display:block;width:100%;border:0;background:transparent;color:#5F5B4F;text-decoration:none;text-align:left;padding:10px 11px;border-radius:7px;font:500 12px 'Instrument Sans',sans-serif;cursor:pointer}.pn-menu a:hover,.pn-menu button:hover{background:#F6F4EF;color:#1A56A8}.pn-menu .danger:hover{color:#C2492B}.pn-menu-name{padding:8px 11px 10px;border-bottom:1px solid #EEEAE0;margin-bottom:4px}.pn-menu-name b{display:block;color:#1D1B16;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-menu-name span{display:block;color:#98937F;font-size:10.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pg-account{display:none!important}.pu .mast{display:none!important}
@media(max-width:700px){.pn-inner{height:62px;padding:0 16px;grid-template-columns:auto 1fr}.pn-brand{font-size:24px;gap:7px}.pn-mark{width:25px;height:25px}.pn-motto{display:none}.pn-actions{gap:4px}.pn-link,.pn-account summary{padding:8px 9px;font-size:11px}.pn-menu{position:fixed;left:12px;right:12px;top:66px;width:auto}.pn-menu a,.pn-menu button{padding:12px}.pn-menu-name{padding:9px 11px 11px}}
@media(max-width:390px){.pn-inner{padding:0 12px}.pn-link,.pn-account summary{padding:7px 8px}}
`

export default function SignedInNav(){
 const[session,setSession]=useState<Session|null>(null)
 const accountRef=useRef<HTMLDetailsElement|null>(null)
 useEffect(()=>{
   if(window.location.hash==='#/'||window.location.hash==='#') history.replaceState(null,'',window.location.pathname+window.location.search)
   window.scrollTo(0,0)
   supabase.auth.getSession().then(({data})=>setSession(data.session))
   const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
   const reset=(event:MouseEvent)=>{
     const el=event.target as HTMLElement|null
     if(el?.closest('.topic-row,.crumb button,.actions button,.start'))setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),25)
     if(accountRef.current?.open&&!el?.closest('.pn-account'))accountRef.current.open=false
   }
   document.addEventListener('click',reset,true)
   return()=>{sub.subscription.unsubscribe();document.removeEventListener('click',reset,true)}
 },[])
 if(!session)return null
 const fullName=String(session.user.user_metadata?.full_name||session.user.user_metadata?.name||'Your account')
 return <nav className="pn"><style>{CSS}</style><div className="pn-inner">
   <a className="pn-brand" href="/"><img className="pn-mark" src="/favicon.svg" alt=""/>Peitho</a>
   <div className="pn-motto">Speak · Measure · Improve</div>
   <div className="pn-actions"><a className="pn-link board" href="/leaderboard">Leaderboard</a><details className="pn-account" ref={accountRef}><summary>Account ▾</summary><div className="pn-menu"><div className="pn-menu-name"><b>{fullName}</b><span>{session.user.email}</span></div><a href="/history">My progress</a><a href="/forgot-password">Reset password</a><button className="danger" onClick={()=>supabase.auth.signOut()}>Sign out</button></div></details></div>
 </div></nav>
}
