import React from 'react'

type ClarityMoment={
  quote?:string
  kind?:'unclear'|'mumbled'|'possible_mispronunciation'|'recognition_uncertain'
  observation?:string
  suggestion?:string
  confidence?:'medium'|'high'
}

export type SessionDashboardResult={
  metrics:{
    words:number
    durationSec:number
    wpm:number
    fillers:number
    fillersPerMin:number
    fillerBreakdown:Record<string,number>
    uniqueRatio:number
    pauseCount:number
    longestPauseSec:number
  }
  scores:{
    fluency:number
    grammar:number
    vocabulary:number
    coherence:number
    message?:number
    overall:number
  }
  analysis:{
    grammar?:Array<{quote?:string;issue?:string;fix?:string}>
    l1_patterns?:Array<{quote?:string;pattern?:string;fix?:string}>
    vocabulary?:{score?:number;note?:string}
    coherence?:{score?:number;note?:string}
    message?:{
      score?:number
      note?:string
      understood_message?:string
      key_points?:string[]
      stronger_structure?:string[]
      paraphrase?:string
    }
    delivery?:{
      score?:number
      note?:string
      clarity_moments?:ClarityMoment[]
      tonal_variation?:{score?:number;note?:string}
      volume_projection?:{score?:number;note?:string}
      enunciation?:{score?:number;note?:string}
    }
    top_fixes?:Array<{title?:string;you_said?:string;try?:string}>
    encouragement?:string
  }
  performanceReport?:{
    score:number
    categories:Array<{
      key:string
      label:string
      score:number|null
      note:string
      basis:'measured'|'voice'
    }>
  }
  sessionId?:string|null
  sessionSaved?:boolean
  reviewMode?:'full'|'lite'
  practicePlan?:Array<{key:string;label:string;score:number;target:string;drill:string}>
  degraded?:boolean
}

const CSS=`
.pd{margin-top:22px;min-width:0;scroll-behavior:smooth}.pd *{box-sizing:border-box;min-width:0}
.pd-mode{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:.06em;margin-bottom:12px}.pd-mode.pro{background:var(--aegean-soft);color:var(--aegean)}.pd-mode.lite{background:var(--wash);color:var(--dim)}
.pd-hero{display:grid;grid-template-columns:minmax(190px,.72fr) minmax(0,1.55fr);gap:14px}
.pd-scorehero,.pd-summary,.pd-bucket,.pd-section,.pd-card,.pd-practice-card,.pd-focus{background:var(--panel);border:1px solid var(--line);border-radius:14px}
.pd-scorehero{padding:25px}.pd-eyebrow{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);font-weight:600}.pd-big{font:400 86px/1 var(--didot);margin:7px 0 2px}.pd-band{font:italic 22px var(--didot);color:var(--aegean)}.pd-sub{font-size:12px;color:var(--faint);margin-top:7px}.pd-saved{display:inline-block;margin-top:13px;color:var(--laurel);font-size:12px;text-decoration:none}
.pd-summary{padding:23px}.pd-summary h2{font:400 29px/1.15 var(--didot);margin:5px 0 10px}.pd-summary p{font-size:13.5px;line-height:1.65;color:var(--dim);margin:0;max-width:68ch}.pd-verdict{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.pd-verdict div{padding:12px 13px;border-radius:10px;background:var(--wash)}.pd-verdict small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--faint)}.pd-verdict b{display:block;font-size:13px;margin-top:4px}.pd-verdict .weak b{color:var(--clay)}.pd-verdict .strong b{color:var(--laurel)}
.pd-buckets{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.pd-bucket{display:block;padding:17px;color:var(--ink);text-decoration:none;transition:transform .16s,border-color .16s}.pd-bucket:hover{transform:translateY(-2px);border-color:var(--line2)}.pd-bucket-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.pd-bucket h3{font:400 18px var(--didot);margin:0}.pd-bucket b{font-size:25px}.pd-bucket p{font-size:11.5px;color:var(--faint);line-height:1.45;margin:8px 0 0}.pd-track{height:5px;background:var(--wash);border-radius:99px;overflow:hidden;margin-top:12px}.pd-track i{display:block;height:100%;background:var(--aegean);border-radius:99px}
.pd-jump{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 0}.pd-jump a{font-size:11px;color:var(--dim);text-decoration:none;border:1px solid var(--line);background:rgba(255,255,255,.65);border-radius:999px;padding:6px 9px}.pd-jump a:hover{color:var(--aegean);border-color:var(--line2)}
.pd-detail{scroll-margin-top:92px;margin-top:34px}.pd-detailhead{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:11px}.pd-detailhead h3{font:400 27px var(--didot);margin:3px 0 0}.pd-detailhead p{font-size:12px;color:var(--faint);margin:0;text-align:right}.pd-section{padding:20px}
.pd-messagegrid{display:grid;grid-template-columns:.92fr 1.08fr;gap:10px}.pd-card{padding:19px}.pd-card h4{font:400 20px var(--didot);margin:0 0 8px}.pd-card p{font-size:13px;line-height:1.65;color:var(--dim);margin:0}.pd-scoreline{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}.pd-scoreline b{font:400 39px/1 var(--didot);color:var(--aegean)}.pd-list{padding-left:19px;margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--dim)}.pd-list li+li{margin-top:5px}.pd-rewrite{margin-top:10px;border-left:4px solid var(--aegean)}.pd-rewrite p{font:400 18px/1.55 var(--didot);color:var(--ink)}
.pd-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pd-language-item+.pd-language-item{margin-top:15px;padding-top:15px;border-top:1px solid var(--line)}.pd-language-item strong{display:block;font-size:13px}.pd-language-item p{margin-top:5px}.pd-evidence{display:grid;gap:8px;margin-top:13px}.pd-pattern{padding:12px 13px;border-radius:10px;background:var(--wash);font-size:12.5px;color:var(--dim);line-height:1.5}.pd-pattern span{display:block;color:var(--laurel);margin-top:4px}
.pd-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.pd-kpi{padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px}.pd-kpi b{font-size:24px;font-variant-numeric:tabular-nums}.pd-kpi small{display:block;font-size:10.5px;color:var(--faint);margin-top:3px}.pd-kpi em{display:block;font-size:11px;color:var(--dim);font-style:normal;margin-top:6px;line-height:1.4}.pd-bad{color:var(--clay)}.pd-good{color:var(--laurel)}
.pd-report{overflow:hidden;padding:0}.pd-rhead,.pd-rrow{display:grid;grid-template-columns:minmax(130px,.72fr) 110px minmax(0,1.8fr);gap:16px;align-items:center;padding:14px 17px}.pd-rhead{background:#FBFAF7;border-bottom:1px solid var(--line);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint)}.pd-rrow{border-bottom:1px solid var(--line)}.pd-rrow:last-child{border-bottom:0}.pd-rname b{font-size:13px}.pd-rname small{display:block;font-size:10px;color:var(--faint);margin-top:2px}.pd-rscore{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:center}.pd-rscore b{font-size:14px}.pd-rscore .pd-track{margin-top:0}.pd-ranalysis{font-size:12px;line-height:1.55;color:var(--dim)}.pd-unscored{margin:0 17px 17px;padding:12px 13px;border-radius:10px;background:var(--wash);font-size:11.5px;line-height:1.55;color:var(--dim)}
.pd-clarities{display:grid;gap:8px;margin-top:10px}.pd-clarity{padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.pd-claritytop{display:flex;justify-content:space-between;gap:10px}.pd-claritytag{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--gold)}.pd-clarity p{font-size:12px;line-height:1.5;color:var(--dim);margin:6px 0 0}.pd-clarity .try{color:var(--laurel)}
.pd-fillers{display:grid;gap:8px}.pd-frow{display:grid;grid-template-columns:80px 1fr 28px;gap:10px;align-items:center;font-size:12px}.pd-frow span:first-child{color:var(--dim)}.pd-frow b{text-align:right}
.pd-practice{display:grid;gap:9px}.pd-practice-card{padding:17px}.pd-practice-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.pd-practice-card h4{font:400 19px var(--didot);margin:0}.pd-practice-score{font-size:12px;font-weight:600;color:var(--clay)}.pd-target{font-size:10.5px;color:var(--laurel);margin-top:5px}.pd-drill{font-size:12.5px;line-height:1.6;color:var(--dim);margin:9px 0 0}.pd-focus{padding:20px;border-left:4px solid var(--gold);margin-top:10px}.pd-focus h4{font:400 22px var(--didot);margin:4px 0}.pd-focus .metric{font-size:12px;color:var(--clay)}.pd-focus p{font-size:13px;color:var(--dim);line-height:1.6;margin:8px 0 0}
.pd-fixes{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.pd-fix{padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.pd-fix h4{font:400 18px var(--didot);margin:0}.pd-fix p{font-size:12px;line-height:1.55;color:var(--laurel);margin:8px 0 0}
.pd-note{font-size:11px;color:var(--faint);line-height:1.5;margin:8px 2px 0}
@media(max-width:820px){.pd-buckets{grid-template-columns:1fr 1fr}.pd-kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:700px){.pd-hero,.pd-messagegrid,.pd-two{grid-template-columns:1fr}.pd-big{font-size:72px}.pd-summary h2{font-size:26px}.pd-detail{margin-top:28px}.pd-detailhead{align-items:flex-start;flex-direction:column;gap:3px}.pd-detailhead p{text-align:left}.pd-rhead{display:none}.pd-rrow{grid-template-columns:1fr 105px;gap:8px 12px;padding:14px}.pd-ranalysis{grid-column:1/-1}.pd-fixes{grid-template-columns:1fr}.pd-kpis{grid-template-columns:1fr 1fr}}
@media(max-width:430px){.pd-buckets{grid-template-columns:1fr 1fr}.pd-bucket{padding:14px}.pd-bucket b{font-size:21px}.pd-verdict{grid-template-columns:1fr}.pd-kpis{grid-template-columns:1fr 1fr}.pd-scorehero,.pd-summary,.pd-section,.pd-card{padding:16px}}
`

const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(Number.isFinite(n)?n:0)))
const band=(s:number)=>s>=90?'Excellent control':s>=80?'Strong':s>=70?'Competent — still improvable':s>=60?'Developing':s>=40?'Needs focused practice':'Rebuild the fundamentals'
const label=(s:number)=>s>=90?'Excellent':s>=80?'Strong':s>=70?'Competent':s>=60?'Developing':s>=40?'Weak':'Needs rebuilding'
const clarityLabel=(kind?:string)=>kind==='mumbled'?'Blurred articulation':kind==='possible_mispronunciation'?'Pronunciation check':kind==='recognition_uncertain'?'Recognition uncertain':'Hard to make out'

export default function SessionDashboard({result}:{result:SessionDashboardResult}){
  const {metrics:m,scores:s,analysis:a}=result
  const meaning=Number.isFinite(Number(s.message))?clamp(Number(s.message)):clamp(Number(a.message?.score??s.coherence??0))
  const report=result.performanceReport
  const voiceCategories=report?.categories.filter(item=>item.basis==='voice')||[]
  const voiceNotScored=voiceCategories.length>0&&voiceCategories.every(item=>item.score==null)
  const visiblePerformance=voiceNotScored?report?.categories.filter(item=>item.basis==='measured')||[]:report?.categories||[]
  const weakBlend=(values:number[])=>{
    const clean=values.filter(Number.isFinite)
    if(!clean.length)return 0
    const average=clean.reduce((sum,value)=>sum+value,0)/clean.length
    return clamp(average*.72+Math.min(...clean)*.28)
  }

  const messageBucket=weakBlend([meaning,s.coherence])
  const languageBucket=weakBlend([s.grammar,s.vocabulary])
  const fluencyBucket=clamp(s.fluency)
  const deliveryBucket=clamp(report?.score??a.delivery?.score??0)
  const buckets=[
    {key:'message',title:'Message',score:messageBucket,note:'Meaning, relevance and structure',href:'#message-detail'},
    {key:'language',title:'Language',score:languageBucket,note:'Grammar and word choice',href:'#language-detail'},
    {key:'fluency',title:'Fluency',score:fluencyBucket,note:'Pace, fillers and pauses',href:'#fluency-detail'},
    {key:'delivery',title:'Delivery',score:deliveryBucket,note:voiceNotScored?'Measured rhythm only':'Tone, projection and enunciation',href:'#delivery-detail'},
  ]
  const ordered=[...buckets].sort((x,y)=>x.score-y.score)
  const weakest=ordered[0],strongest=ordered[ordered.length-1]
  const fillerEntries=Object.entries(m.fillerBreakdown||{}).sort((x,y)=>y[1]-x[1])
  const maxFiller=Math.max(1,...fillerEntries.map(([,value])=>value))
  const firstPriority=result.practicePlan?.[0]
  const focus=firstPriority
    ? {title:firstPriority.label,metric:`${firstPriority.score}/100 · target ${firstPriority.target}`,body:firstPriority.drill}
    : {title:weakest.title,metric:`${weakest.score}/100`,body:'Repeat the same prompt once and focus only on improving this one area.'}
  const summary=a.message?.note||a.coherence?.note||a.encouragement||'Peitho scored the answer across message quality, language, fluency and delivery.'

  return <section className="pd"><style>{CSS}</style>
    <span className={"pd-mode "+(result.reviewMode==='full'?'pro':'lite')}>{result.reviewMode==='full'?'Peitho Pro':'Peitho Light'}</span>

    <section className="pd-hero">
      <div className="pd-scorehero">
        <div className="pd-eyebrow">Your Peitho result</div>
        <div className="pd-big">{s.overall}</div>
        <div className="pd-band">{band(s.overall)}</div>
        <div className="pd-sub">overall score · out of 100</div>
        {result.sessionSaved&&result.sessionId&&<a className="pd-saved" href="/history">✓ Saved to My progress</a>}
      </div>
      <div className="pd-summary">
        <div className="pd-eyebrow">Why you got this score</div>
        <h2>{weakest.score<60?'One area is holding the answer back.':'The answer is working — now make it more controlled.'}</h2>
        <p>{summary}</p>
        <div className="pd-verdict">
          <div className="strong"><small>Strongest bucket</small><b>{strongest.title} · {strongest.score}/100</b></div>
          <div className="weak"><small>Needs most attention</small><b>{weakest.title} · {weakest.score}/100</b></div>
        </div>
      </div>
    </section>

    <div className="pd-buckets">
      {buckets.map(bucket=><a className="pd-bucket" href={bucket.href} key={bucket.key}>
        <div className="pd-bucket-top"><h3>{bucket.title}</h3><b>{bucket.score}</b></div>
        <div className="pd-track"><i style={{width:`${bucket.score}%`}}/></div>
        <p>{label(bucket.score)} · {bucket.note}</p>
      </a>)}
    </div>
    <nav className="pd-jump" aria-label="Result sections">
      <a href="#message-detail">Message</a><a href="#language-detail">Language</a><a href="#fluency-detail">Fluency</a><a href="#delivery-detail">Delivery</a><a href="#next-detail">Next practice</a>
    </nav>

    <section className="pd-detail" id="message-detail">
      <div className="pd-detailhead"><div><div className="pd-eyebrow">01 · Content</div><h3>Did your answer actually land?</h3></div><p>{messageBucket}/100 · {label(messageBucket)}</p></div>
      <div className="pd-messagegrid">
        <div className="pd-card">
          <div className="pd-scoreline"><div><div className="pd-eyebrow">Meaning & relevance</div><h4>What Peitho understood</h4></div><b>{meaning}</b></div>
          <p>{a.message?.understood_message||a.message?.note||'Peitho could not recover a clear central message from this review.'}</p>
          <h4 style={{marginTop:18}}>Key points</h4>
          {(a.message?.key_points||[]).length?<ul className="pd-list">{(a.message?.key_points||[]).map((point,i)=><li key={i}>{point}</li>)}</ul>:<p>There were not enough clear, substantive points to extract confidently.</p>}
        </div>
        <div className="pd-card">
          <div className="pd-scoreline"><div><div className="pd-eyebrow">Structure</div><h4>Make the idea easier to follow</h4></div><b>{s.coherence}</b></div>
          <p>{a.coherence?.note}</p>
          {(a.message?.stronger_structure||[]).length>0&&<ol className="pd-list">{(a.message?.stronger_structure||[]).map((point,i)=><li key={i}>{point}</li>)}</ol>}
        </div>
      </div>
      {a.message?.paraphrase&&<div className="pd-card pd-rewrite"><div className="pd-eyebrow">One stronger version</div><p>{a.message.paraphrase}</p></div>}
    </section>

    <section className="pd-detail" id="language-detail">
      <div className="pd-detailhead"><div><div className="pd-eyebrow">02 · Language</div><h3>How clean was the language?</h3></div><p>{languageBucket}/100 · {label(languageBucket)}</p></div>
      <div className="pd-two">
        <div className="pd-card">
          <div className="pd-scoreline"><h4>Grammar control</h4><b>{s.grammar}</b></div>
          <p>{(a.grammar?.length||0)===0?'No high-confidence grammar finding was surfaced in this review.':`${a.grammar?.length||0} high-confidence grammar pattern${(a.grammar?.length||0)===1?'':'s'} were identified.`}</p>
          {(a.grammar?.length||0)>0&&<div className="pd-evidence">{(a.grammar||[]).slice(0,5).map((item,i)=><div className="pd-pattern" key={i}>{item.issue}<span>Try: {item.fix}</span></div>)}</div>}
        </div>
        <div className="pd-card">
          <div className="pd-scoreline"><h4>Word choice</h4><b>{s.vocabulary}</b></div>
          <p>{a.vocabulary?.note}</p>
          {(a.l1_patterns?.length||0)>0&&<div className="pd-language-item"><strong>Language patterns</strong><div className="pd-evidence">{(a.l1_patterns||[]).map((item,i)=><div className="pd-pattern" key={i}>{item.pattern}<span>Try: {item.fix}</span></div>)}</div></div>}
        </div>
      </div>
    </section>

    <section className="pd-detail" id="fluency-detail">
      <div className="pd-detailhead"><div><div className="pd-eyebrow">03 · Fluency</div><h3>How smoothly did the answer move?</h3></div><p>{fluencyBucket}/100 · {label(fluencyBucket)}</p></div>
      <div className="pd-kpis">
        <div className="pd-kpi"><b>{m.wpm}</b><small>words / min</small><em>{m.wpm<110?'Needs more momentum':m.wpm>175?'Too rushed':'Conversational range'}</em></div>
        <div className="pd-kpi"><b className={m.fillersPerMin>5?'pd-bad':''}>{m.fillersPerMin}</b><small>fillers / min</small><em>{m.fillers} total</em></div>
        <div className="pd-kpi"><b className={m.pauseCount>2?'pd-bad':''}>{m.pauseCount}</b><small>long pauses</small><em>{m.longestPauseSec}s longest</em></div>
        <div className="pd-kpi"><b>{m.uniqueRatio}%</b><small>word variety</small><em>lexical variety</em></div>
        <div className="pd-kpi"><b>{Math.round(m.durationSec)}s</b><small>answer length</small><em>{m.words} words</em></div>
      </div>
      {fillerEntries.length>0&&<div className="pd-card" style={{marginTop:10}}><h4>Your filler pattern</h4><div className="pd-fillers">{fillerEntries.map(([name,count])=><div className="pd-frow" key={name}><span>{name}</span><span className="pd-track"><i style={{width:`${(count/maxFiller)*100}%`}}/></span><b>{count}</b></div>)}</div></div>}
    </section>

    <section className="pd-detail" id="delivery-detail">
      <div className="pd-detailhead"><div><div className="pd-eyebrow">04 · Delivery</div><h3>How did the voice carry the message?</h3></div><p>{deliveryBucket}/100 · {voiceNotScored?'measured rhythm only':label(deliveryBucket)}</p></div>
      {report?<div className="pd-section pd-report">
        <div className="pd-rhead"><span>Category</span><span>Score</span><span>What Peitho noticed</span></div>
        {visiblePerformance.map(item=><div className="pd-rrow" key={item.key}><div className="pd-rname"><b>{item.label}</b><small>{item.basis==='voice'?'heard in the recording':'measured from the session'}</small></div><div className="pd-rscore"><b>{item.score==null?'—':item.score}</b><span className="pd-track"><i style={{width:`${item.score??0}%`}}/></span></div><div className="pd-ranalysis">{item.note}</div></div>)}
        {voiceNotScored&&<div className="pd-unscored"><strong>Peitho Light:</strong> pacing, fillers and pauses were measured. Tonal variation, projection and enunciation were not estimated without a successful audio review.</div>}
      </div>:<div className="pd-card"><p>Detailed delivery scoring was not available for this review.</p></div>}
      {(a.delivery?.clarity_moments||[]).length>0&&<div className="pd-clarities">{(a.delivery?.clarity_moments||[]).map((moment,i)=><div className="pd-clarity" key={i}><div className="pd-claritytop"><span className="pd-claritytag">{clarityLabel(moment.kind)}</span><span className="pd-note">{moment.confidence} confidence</span></div><p>{moment.observation}</p><p className="try">Try: {moment.suggestion}</p></div>)}</div>}
      <p className="pd-note">Delivery scores describe this recording. Microphone distance and recording quality can affect projection-related signals; accent or dialect is not treated as an error.</p>
    </section>

    <section className="pd-detail" id="next-detail">
      <div className="pd-detailhead"><div><div className="pd-eyebrow">05 · Next practice</div><h3>What should you improve first?</h3></div><p>Focus on the lowest gaps first</p></div>
      <div className="pd-focus"><div className="pd-eyebrow">Highest-impact next step</div><h4>{focus.title}</h4><div className="metric">{focus.metric}</div><p>{focus.body}</p></div>
      {(result.practicePlan||[]).length>0&&<><h4 style={{margin:'20px 0 9px',font:'400 21px var(--didot)'}}>Your next-session plan</h4><div className="pd-practice">{(result.practicePlan||[]).map((item,i)=><div className="pd-practice-card" key={item.key}><div className="pd-practice-top"><h4>{i+1}. {item.label}</h4><span className="pd-practice-score">{item.score}/100</span></div><div className="pd-target">Ideal target · {item.target}</div><p className="pd-drill">{item.drill}</p></div>)}</div></>}
      {(a.top_fixes||[]).length>0&&<><h4 style={{margin:'20px 0 9px',font:'400 21px var(--didot)'}}>Three useful changes</h4><div className="pd-fixes">{(a.top_fixes||[]).slice(0,3).map((item,i)=><div className="pd-fix" key={i}><h4>{item.title}</h4><p>{item.try}</p></div>)}</div></>}
    </section>
  </section>
}
