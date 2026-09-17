import { useEffect } from 'react'

const stages=[
 ['Peitho is listening back…','Catching the rhythm of your voice, the pauses you chose, and the moments that carried your point.'],
 ['Peitho is understanding your context…','Following your ideas from opening thought to supporting detail and conclusion.'],
 ['Peitho is finding the patterns that matter…','Separating one-off slips from habits worth working on in your next attempt.'],
 ['Adding a little soul to your feedback…','Turning the session into a few clear insights you can actually use.'],
]
const text=(el:Element|null,value:string)=>{if(el&&el.textContent!==value)el.textContent=value}

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
   polish();const observer=new MutationObserver(polish);observer.observe(document.body,{childList:true,subtree:true,characterData:true})
   const timer=window.setInterval(()=>{if(document.querySelector('.analyzing')){stage++;const box=document.querySelector('.analyzing');text(box?.querySelector('h2')||null,stages[stage%stages.length][0]);text(box?.querySelector('p')||null,stages[stage%stages.length][1])}},1800)
   return()=>{observer.disconnect();window.clearInterval(timer)}
 },[])
 return null
}
