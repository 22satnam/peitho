import React,{useEffect,useState}from'react'
import{supabase}from'../lib/supabase.client'

const CSS=`
.pbn{position:sticky;top:0;z-index:80;padding:22px 24px 0;font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif;transition:padding .28s ease,background .28s ease}
.pbn:before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(246,244,239,.98),rgba(246,244,239,0));opacity:0;transition:opacity .28s ease;pointer-events:none}
.pbn-inner{width:min(1180px,100%);height:72px;margin:0 auto;background:rgba(239,236,228,.76);border:1px solid rgba(225,221,208,.86);border-radius:24px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 22px;box-shadow:none;backdrop-filter:blur(10px);transition:width .3s ease,height .3s ease,border-radius .3s ease,box-shadow .3s ease,background .3s ease,padding .3s ease}
.pbn.scrolled{padding:10px 20px 6px}.pbn.scrolled:before{opacity:1}.pbn.scrolled .pbn-inner{width:min(980px,100%);height:58px;border-radius:999px;background:rgba(255,255,255,.86);box-shadow:0 12px 36px rgba(29,27,22,.09);backdrop-filter:blur(16px);padding:0 14px}
.pbn-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#1D1B16;width:max-content}.pbn-mark{width:34px;height:34px;border-radius:9px;transition:width .25s ease,height .25s ease}.pbn.scrolled .pbn-mark{width:29px;height:29px}.pbn-name{font:400 27px 'GFS Didot',Georgia,serif;transition:font-size .25s ease}.pbn.scrolled .pbn-name{font-size:24px}
.pbn-links{display:flex;align-items:center;gap:30px}.pbn-links a{font-size:13px;color:#6E6A5C;text-decoration:none}.pbn-links a:hover{color:#1A56A8}
.pbn-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.pbn-login,.pbn-cta{font-size:13px;text-decoration:none;border-radius:10px;padding:10px 14px;white-space:nowrap;transition:padding .25s ease,border-radius .25s ease}.pbn-login{color:#1D1B16}.pbn-login:hover{color:#1A56A8}.pbn-cta{background:#1A56A8;color:white;border:1px solid #1A56A8}.pbn-cta:hover{background:#123E7C}.pbn.scrolled .pbn-login,.pbn.scrolled .pbn-cta{padding:8px 12px;border-radius:999px;font-size:12px}
@media(max-width:760px){.pbn{padding:12px 14px 0}.pbn-inner{height:60px;padding:0 10px 0 11px;grid-template-columns:1fr auto;border-radius:18px}.pbn.scrolled{padding:8px 10px 4px}.pbn.scrolled .pbn-inner{height:54px;width:100%;padding:0 9px;border-radius:999px}.pbn-name{font-size:24px}.pbn-mark{width:30px;height:30px}.pbn.scrolled .pbn-name{font-size:22px}.pbn.scrolled .pbn-mark{width:27px;height:27px}.pbn-links{display:none}.pbn-login{display:none}.pbn-cta{padding:9px 12px;font-size:12px}}
`

export default function PublicNav(){
 const[signedIn,setSignedIn]=useState(false),[scrolled,setScrolled]=useState(false)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSignedIn(Boolean(data.session)));const{data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSignedIn(Boolean(s)));const onScroll=()=>setScrolled(window.scrollY>46);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>{sub.subscription.unsubscribe();window.removeEventListener('scroll',onScroll)}},[])
 return <nav className={"pbn"+(scrolled?" scrolled":"")}><style>{CSS}</style><div className="pbn-inner">
  <a className="pbn-brand" href="/"><img className="pbn-mark" src="/favicon.svg" alt=""/><span className="pbn-name">Peitho</span></a>
  <div className="pbn-links"><a href="/#how">How it works</a><a href="/#insights">What you get</a><a href="/#progress">Progress</a></div>
  <div className="pbn-actions">{signedIn?<><a className="pbn-login" href="/history">My progress</a><a className="pbn-cta" href="/">Back to practice</a></>:<><a className="pbn-login" href="/auth/login">Sign in</a><a className="pbn-cta" href="/auth/signup">Get started</a></>}</div>
 </div></nav>
}
