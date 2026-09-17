import { useEffect } from 'react'

const stages=[
 ['Peitho is listening back…','Catching the rhythm of your voice, the pauses you chose, and the moments that carried your point.'],
 ['Peitho is understanding your context…','Following your ideas from opening thought to supporting detail and conclusion.'],
 ['Peitho is finding the patterns that matter…','Separating one-off slips from habits worth working on in your next attempt.'],
 ['Adding a little soul to your feedback…','Turning the session into a few clear insights you can actually use.'],
]

export default function ExperiencePolish(){
 useEffect(()=>{
   let stage=0
   const polish=()=>{
     const privacy=document.querySelector('.brief .privacy') as HTMLElement|null
     if(privacy)privacy.textContent='Peitho keeps a lightweight live preview while you speak. Your completed session gets a deeper review when you finish.'

     document.querySelectorAll('.statusbar .pill').forEach(node=>{
       const el=node as HTMLElement,txt=el.textContent||''
       if(/Whisper/i.test(txt))el.textContent='live captions · ~3s'
       else if(/transcribing/i.test(txt))el.textContent='Peitho is catching up…'
       else if(/live captions error/i.test(txt))el.textContent='live preview paused'
     })

     const captionError=document.querySelector('.caption-error') as HTMLElement|null
     if(captionError)captionError.textContent='The live preview is taking a break. Peitho is still recording your session, so you can keep speaking and finish normally.'

     const error=document.querySelector('.brief .error') as HTMLElement|null
     if(error&&/Gemini|Groq|Whisper|transcription|analysis failed|unauthorized|quota|429|503/i.test(error.textContent||''))error.textContent='Peitho could not finish that review just now. Please try the session once more.'

     const notice=document.querySelector('.results>.notice') as HTMLElement|null
     if(notice)notice.innerHTML='<strong>Peitho Lite completed this review.</strong> Your core coaching and measurable speaking insights are ready.'

     const box=document.querySelector('.analyzing') as HTMLElement|null
     if(box){const h=box.querySelector('h2'),p=box.querySelector('p');if(h)h.textContent=stages[stage%stages.length][0];if(p)p.textContent=stages[stage%stages.length][1]}
   }
   polish()
   const observer=new MutationObserver(polish);observer.observe(document.body,{childList:true,subtree:true,characterData:true})
   const timer=window.setInterval(()=>{if(document.querySelector('.analyzing')){stage++;const h=document.querySelector('.analyzing h2'),p=document.querySelector('.analyzing p');if(h)h.textContent=stages[stage%stages.length][0];if(p)p.textContent=stages[stage%stages.length][1]}},1800)
   return()=>{observer.disconnect();window.clearInterval(timer)}
 },[])
 return null
}
