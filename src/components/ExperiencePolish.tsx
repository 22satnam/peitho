import { useEffect } from 'react'

const stages=[
 ['Peitho is listening back…','Catching the rhythm of your voice, the pauses you chose, and the moments that carried your point.'],
 ['Peitho is understanding your context…','Following your ideas from opening thought to supporting detail and conclusion.'],
 ['Peitho is shaping your coaching…','Separating one-off slips from the patterns most useful for your next attempt.'],
]
const text=(el:Element|null,value:string)=>{if(el&&el.textContent!==value)el.textContent=value}
const CSS=`
.analyzing{min-height:58vh;display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:70px 0!important}
.analyzing h2{max-width:620px}.analyzing p{max-width:560px;min-height:44px;line-height:1.65}
.analyzing .abar{position:relative!important;width:64px!important;height:64px!important;margin:30px auto 0!important;border-radius:50%!important;overflow:visible!important;background:rgba(26,86,168,.07)!important;border:1px solid rgba(26,86,168,.16)!important}
.analyzing .abar:before{content:'';position:absolute;inset:7px;border-radius:50%;border:3px solid rgba(26,86,168,.13);border-top-color:#1A56A8;border-right-color:#1A56A8;animation:peithoSpin 1.8s linear infinite}
.analyzing .abar:after{content:'';position:absolute;inset:22px;border-radius:50%;background:#C2492B;box-shadow:0 0 0 7px rgba(194,73,43,.09);animation:peithoBreathe 2.2s ease-in-out infinite}
.analyzing .abar i{display:none!important}
@keyframes peithoSpin{to{transform:rotate(360deg)}}
@keyframes peithoBreathe{0%,100%{transform:scale(.82);opacity:.65}50%{transform:scale(1);opacity:1}}
@media(max-width:650px){.analyzing{min-height:62vh;padding:50px 12px!important}.analyzing .abar{width:58px!important;height:58px!important}.analyzing .abar:after{inset:20px}}
`

export default function ExperiencePolish(){
 useEffect(()=>{
   let stage=0
   const polish=()=>{
     text(document.querySelector('.brief .privacy'),'Peitho keeps a lightweight live preview while you speak. Your completed session gets a deeper review when you finish.')
     document.querySelectorAll('.statusbar .pill').forEach(node=>{const s=node.textContent||'';if(/Whisper/i.test(s))text(node,'live captions · ~3s');else if(/transcribing/i.test(s))text(node,'Peitho is catching up…');else if(/live captions error/i.test(s))text(node,'live preview paused')})
     text(document.querySelector('.caption-error'),'The live preview is taking a break. Peitho is still recording your session, so you can keep speaking and finish normally.')
     const error=document.querySelector('.brief .error');if(error&&/Gemini|Groq|Whisper|transcription|analysis failed|unauthorized|quota|429|503/i.test(error.textContent||''))text(error,'Peitho could not finish that review just now. Please try the session once more.')
     const notice=document.querySelector('.results>.notice');if(notice)text(notice,'Peitho Lite completed this review. Your core coaching and measurable speaking insights are ready.')
     const box=document.querySelector('.analyzing');if(box){text(box.querySelector('h2'),stages[stage%stages.length][0]);text(box.querySelector('p'),stages[stage%stages.length][1])}
   }
   polish()
   const observer=new MutationObserver(polish);observer.observe(document.body,{childList:true,subtree:true,characterData:true})
   const timer=window.setInterval(()=>{if(document.querySelector('.analyzing')){stage=(stage+1)%stages.length;const box=document.querySelector('.analyzing');text(box?.querySelector('h2')||null,stages[stage][0]);text(box?.querySelector('p')||null,stages[stage][1])}},5200)
   return()=>{observer.disconnect();window.clearInterval(timer)}
 },[])
 return <style>{CSS}</style>
}
