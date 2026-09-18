import React,{useEffect,useState} from 'react'
import {supabase} from '../lib/supabase.client'
import SessionDashboard,{type SessionDashboardResult} from './SessionDashboard'

const CSS=`
.sr{--paper:#F6F4EF;--panel:#fff;--wash:#EFECE3;--line:#E1DDD0;--line2:#C9C3B2;--ink:#1D1B16;--dim:#6E6A5C;--faint:#98937F;--aegean:#1A56A8;--gold:#A87C24;--gold-soft:rgba(168,124,36,.12);--clay:#C2492B;--clay-soft:rgba(194,73,43,.12);--laurel:#587947;--laurel-soft:rgba(88,121,71,.12);--didot:'GFS Didot',Georgia,serif;--sans:'Instrument Sans',-apple-system,'Segoe UI',sans-serif;min-height:70vh;background:var(--paper);color:var(--ink);font-family:var(--sans)}
.sr *{box-sizing:border-box}.sr-wrap{max-width:920px;margin:0 auto;padding:44px 28px 78px}.sr-back{color:var(--aegean);text-decoration:none;font-size:13px}.sr-head{margin:28px 0 8px}.sr-head h1{font:400 38px/1.08 var(--didot);margin:0}.sr-meta{color:var(--faint);font-size:13px;margin-top:7px}.sr-state{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px;color:var(--dim);margin-top:28px}.sr-actions{display:flex;gap:10px;margin-top:28px}.sr-actions a{padding:11px 15px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px}.sr-primary{background:var(--aegean);color:#fff}.sr-secondary{background:#fff;color:var(--dim);border:1px solid var(--line2)}
@media(max-width:600px){.sr-wrap{padding:30px 16px 64px}.sr-head h1{font-size:31px}.sr-actions{position:sticky;bottom:0;padding:24px 0 10px;background:linear-gradient(180deg,rgba(246,244,239,0),#F6F4EF 25%);flex-direction:column}.sr-actions a{text-align:center}}
`

type Saved={topic_title:string;created_at:string;result_snapshot:SessionDashboardResult|null}
export default function SessionReview({sessionId}:{sessionId:string}){
 const[loading,setLoading]=useState(true),[row,setRow]=useState<Saved|null>(null),[error,setError]=useState('')
 useEffect(()=>{(async()=>{const{data:{session}}=await supabase.auth.getSession();if(!session){setError('Sign in to open this saved review.');setLoading(false);return}const{data,error}=await supabase.from('sessions').select('topic_title,created_at,result_snapshot').eq('id',sessionId).maybeSingle();if(error)setError(error.message);else if(!data)setError('This saved session could not be found.');else setRow(data as Saved);setLoading(false)})()},[sessionId])
 return <main className="sr"><style>{CSS}</style><div className="sr-wrap"><a className="sr-back" href="/history">← My progress</a>{loading?<div className="sr-state">Opening your saved review…</div>:error?<div className="sr-state">{error}</div>:row?.result_snapshot?<><header className="sr-head"><h1>{row.topic_title}</h1><div className="sr-meta">{new Date(row.created_at).toLocaleString()} · Saved Peitho review</div></header><SessionDashboard result={row.result_snapshot}/><div className="sr-actions"><a className="sr-primary" href="/">Practice again</a><a className="sr-secondary" href="/history">Back to progress</a></div></>:<div className="sr-state">This older session does not have a full saved review. New sessions will preserve the complete result dashboard here.</div>}</div></main>
}
