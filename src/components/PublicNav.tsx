import React,{useEffect,useState}from'react'
import{supabase}from'../lib/supabase.client'

const CSS=`
.pbn{position:relative;z-index:40;padding:20px 24px 0;font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif}
.pbn-inner{width:min(1180px,100%);height:70px;margin:0 auto;background:rgba(255,255,255,.72);border:1px solid rgba(225,221,208,.9);border-radius:999px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 18px 0 16px;box-shadow:0 10px 34px rgba(29,27,22,.045);backdrop-filter:blur(16px)}
.pbn-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#1D1B16;width:max-content}.pbn-mark{width:34px;height:34px;border-radius:9px}.pbn-name{font:400 27px 'GFS Didot',Georgia,serif}
.pbn-links{display:flex;align-items:center;gap:30px}.pbn-links a{font-size:13px;color:#6E6A5C;text-decoration:none}.pbn-links a:hover{color:#1A56A8}
.pbn-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.pbn-login,.pbn-cta{font-size:13px;text-decoration:none;border-radius:10px;padding:10px 14px;white-space:nowrap}.pbn-login{color:#1D1B16}.pbn-login:hover{color:#1A56A8}.pbn-cta{background:#1A56A8;color:white;border:1px solid #1A56A8}.pbn-cta:hover{background:#123E7C}
@media(max-width:760px){.pbn{padding:12px 14px 0}.pbn-inner{height:60px;padding:0 10px 0 11px;grid-template-columns:1fr auto}.pbn-name{font-size:24px}.pbn-mark{width:30px;height:30px}.pbn-links{display:none}.pbn-login{display:none}.pbn-cta{padding:9px 12px;font-size:12px}}
`

export default function PublicNav(){
 const[signedIn,setSignedIn]=useState(false)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSignedIn(Boolean(data.session)));const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSignedIn(Boolean(s)));return()=>sub.subscription.unsubscribe()},[])
 return <nav className="pbn"><style>{CSS}</style><div className="pbn-inner">
  <a className="pbn-brand" href="/"><img className="pbn-mark" src="/favicon.svg" alt=""/><span className="pbn-name">Peitho</span></a>
  <div className="pbn-links"><a href="/#how">How it works</a><a href="/#insights">What you get</a><a href="/#progress">Progress</a></div>
  <div className="pbn-actions">{signedIn?<><a className="pbn-login" href="/history">My progress</a><a className="pbn-cta" href="/">Back to practice</a></>:<><a className="pbn-login" href="/auth/login">Sign in</a><a className="pbn-cta" href="/auth/signup">Get started</a></>}</div>
 </div></nav>
}
