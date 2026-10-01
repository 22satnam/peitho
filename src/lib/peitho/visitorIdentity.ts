export function getOrCreatePeithoVisitorId(){
 if(typeof window==='undefined')return'server'
 const key='peitho-visitor-id'
 let id=window.localStorage.getItem(key)
 if(!id){
   id=typeof crypto?.randomUUID==='function'?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`
   window.localStorage.setItem(key,id)
 }
 return id
}

export function getOrCreatePeithoSessionId(){
 if(typeof window==='undefined')return'server'
 const key='peitho-analytics-session-id'
 let id=window.sessionStorage.getItem(key)
 if(!id){
   id=typeof crypto?.randomUUID==='function'?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`
   window.sessionStorage.setItem(key,id)
 }
 return id
}
