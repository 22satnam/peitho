import React, { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.client'

const CSS=`
.pn{position:sticky;top:0;z-index:80;background:rgba(246,244,239,.94);backdrop-filter:blur(12px);border-bottom:1px solid #E1DDD0;font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif}.pn *{box-sizing:border-box}.pn-inner{max-width:1180px;margin:0 auto;height:70px;padding:0 28px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px}.pn-brand{font:400 27px 'GFS Didot',Georgia,serif;color:#1D1B16;text-decoration:none}.pn-motto{font-size:12px;color:#6E6A5C;letter-spacing:.04em;white-space:nowrap}.pn-actions{display:flex;justify-content:flex-end;align-items:center;gap:7px}.pn-link,.pn-out{border:1px solid transparent;background:transparent;color:#5F5B4F;text-decoration:none;border-radius:999px;padding:8px 11px;font:500 12px 'Instrument Sans',sans-serif;white-space:nowrap}.pn-link:hover{background:#fff;border-color:#E1DDD0;color:#1A56A8}.pn-link.board{background:#fff;border-color:#E1DDD0;color:#1A56A8}.pn-out{cursor:pointer}.pn-out:hover{background:#EFECE3}.pn-user{max-width:105px;overflow:hidden;text-overflow:ellipsis}.pg-account{display:none!important}.pu .mast{display:none!important}
@media(max-width:700px){.pn-inner{height:62px;padding:0 16px;grid-template-columns:auto 1fr}.pn-brand{font-size:24px}.pn-motto{display:none}.pn-actions{gap:3px;overflow-x:auto;scrollbar-width:none}.pn-actions::-webkit-scrollbar{display:none}.pn-link,.pn-out{padding:8px 9px;font-size:11px}.pn-user{display:none}}
@media(max-width:390px){.pn-inner{padding:0 12px}.pn-link{padding:7px 8px}.pn-out{padding:7px 6px}}
`

export default function SignedInNav(){
 const[session,setSession]=useState<Session|null>(null)
 useEffect(()=>{
   if(window.location.hash==='#/'||window.location.hash==='#') history.replaceState(null,'',window.location.pathname+window.location.search)
   window.scrollTo(0,0)
   supabase.auth.getSession().then(({data})=>setSession(data.session))
   const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
   const reset=(event:MouseEvent)=>{const el=event.target as HTMLElement|null;if(el?.closest('.topic-row,.crumb button,.actions button,.start'))setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),25)}
   document.addEventListener('click',reset,true)
   return()=>{sub.subscription.unsubscribe();document.removeEventListener('click',reset,true)}
 },[])
 if(!session)return null
 const name=String(session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email||'Account').split(' ')[0]
 return <nav className="pn"><style>{CSS}</style><div className="pn-inner"><a className="pn-brand" href="/">Peitho</a><div className="pn-motto">Speak · Measure · Improve</div><div className="pn-actions"><a className="pn-link board" href="/leaderboard">Leaderboard</a><a className="pn-link" href="/history">My progress</a><span className="pn-user pn-link">{name}</span><button className="pn-out" onClick={()=>supabase.auth.signOut()}>Sign out</button></div></div></nav>
}
