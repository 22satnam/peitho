import React,{useEffect,useState}from'react'
import type{Session,User}from'@supabase/supabase-js'
import UnifiedPractice from './UnifiedPractice'
import MarketingLanding from './components/MarketingLanding'
import CreatorSignature from './components/CreatorSignature'
import{ supabase }from'./lib/supabase.client'

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=GFS+Didot&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
:root{--paper:#F6F4EF;--panel:#fff;--wash:#EFECE3;--line:#E1DDD0;--line2:#C9C3B2;--ink:#1D1B16;--dim:#6E6A5C;--faint:#98937F;--aegean:#1A56A8;--aegean-deep:#123E7C;--aegean-soft:rgba(26,86,168,.10);--gold:#A87C24;--gold-soft:rgba(168,124,36,.12);--clay:#C2492B;--clay-soft:rgba(194,73,43,.12);--laurel:#587947;--laurel-soft:rgba(88,121,71,.12);--didot:'GFS Didot',Georgia,serif;--sans:'Instrument Sans',-apple-system,'Segoe UI',sans-serif}
.pg-loading{min-height:100vh;display:grid;place-items:center;background:#F6F4EF;color:#6E6A5C;font:400 14px var(--sans)}
.ps{min-height:calc(100vh - 70px);background:#F6F4EF;color:#1D1B16;font-family:var(--sans);background-image:linear-gradient(rgba(29,27,22,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(29,27,22,.03) 1px,transparent 1px);background-size:88px 88px;display:grid;place-items:center;padding:52px 22px}.ps-card{width:min(620px,100%);background:rgba(255,255,255,.9);border:1px solid #E1DDD0;border-radius:18px;padding:34px;box-shadow:0 22px 60px rgba(29,27,22,.07)}.ps-brand{display:flex;align-items:center;gap:9px;color:#1D1B16;text-decoration:none}.ps-brand img{width:32px;height:32px;border-radius:8px}.ps-brand span{font:400 26px var(--didot)}.ps-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:#1A56A8;font-weight:600;margin-top:34px}.ps h1{font:400 42px/1.05 var(--didot);margin:9px 0 8px}.ps p{font-size:14px;line-height:1.65;color:#6E6A5C}.ps-form{display:grid;gap:17px;margin-top:26px}.ps-label{display:grid;gap:6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:#98937F}.ps-input{width:100%;border:0;border-bottom:1px solid #C9C3B2;background:transparent;padding:9px 0 11px;font:400 14px var(--sans);outline:none}.ps-input:focus{border-color:#1A56A8}.ps-two{display:grid;grid-template-columns:1fr 1fr;gap:22px}.ps-submit{height:50px;border:0;border-radius:9px;background:#1A56A8;color:#fff;font-weight:600;cursor:pointer}.ps-error{font-size:12px;color:#C2492B;background:rgba(194,73,43,.08);padding:10px 12px;border-radius:8px;margin-top:12px}@media(max-width:600px){.ps{padding:34px 15px}.ps-card{padding:24px}.ps h1{font-size:36px}.ps-two{grid-template-columns:1fr}}
`

type Profile={id:string;email?:string|null;full_name?:string|null;speaking_goal?:string|null;english_level?:string|null}

function ProfileSetup({user,onDone}:{user:User;onDone:(p:Profile)=>void}){
 const[name,setName]=useState(String(user.user_metadata?.full_name||user.user_metadata?.name||'')),[goal,setGoal]=useState('work'),[level,setLevel]=useState('intermediate'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');const row={id:user.id,email:user.email||'',full_name:name.trim(),speaking_goal:goal,english_level:level,updated_at:new Date().toISOString()};const{error}=await supabase.from('profiles').upsert(row);setBusy(false);if(error)setError(error.message);else onDone(row)}
 return <main className="ps"><style>{CSS}</style><section className="ps-card"><a className="ps-brand" href="/"><img src="/favicon.svg" alt=""/><span>Peitho</span></a><div className="ps-kicker">One quick setup</div><h1>Make the practice yours.</h1><p>Tell Peitho what you're practicing for so prompts, progress and future coaching can stay relevant to you.</p><form className="ps-form" onSubmit={save}><label className="ps-label">Your name<input className="ps-input" value={name} onChange={e=>setName(e.target.value)} required/></label><div className="ps-two"><label className="ps-label">Main speaking goal<select className="ps-input" value={goal} onChange={e=>setGoal(e.target.value)}><option value="work">Work & meetings</option><option value="interviews">Job interviews</option><option value="confidence">Everyday confidence</option><option value="presentations">Presentations</option></select></label><label className="ps-label">Current level<select className="ps-input" value={level} onChange={e=>setLevel(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div><button className="ps-submit" disabled={busy}>{busy?'Saving…':'Continue to practice'}</button></form>{error&&<div className="ps-error">{error}</div>}</section></main>
}

export default function PeithoGate(){
 const[session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[profile,setProfile]=useState<Profile|null>(null),[profileChecked,setProfileChecked]=useState(false)
 const loadProfile=async(user:User)=>{setProfileChecked(false);const{data,error}=await supabase.from('profiles').select('id,email,full_name,speaking_goal,english_level').eq('id',user.id).maybeSingle();if(error)console.warn('Profile load failed',error.message);setProfile(data||null);setProfileChecked(true)}
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);if(data.session?.user)loadProfile(data.session.user)});const{data:sub}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);if(next?.user)setTimeout(()=>loadProfile(next.user),0);else{setProfile(null);setProfileChecked(false)}});return()=>sub.subscription.unsubscribe()},[])
 if(loading)return <div className="pg-loading">Opening Peitho…</div>
 if(!session)return <MarketingLanding/>
 if(!profileChecked)return <div className="pg-loading">Opening your practice space…</div>
 if(!profile?.speaking_goal||!profile?.english_level)return <ProfileSetup user={session.user} onDone={setProfile}/>
 return <><UnifiedPractice/><CreatorSignature/></>
}
