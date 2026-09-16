// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react'
import SessionDashboard from './components/SessionDashboard'

const TOPICS = [
  { id: 'proud-project', cat: 'Interviews', title: "Walk me through a project you're proud of", points: ['What the project was, in one plain sentence', 'The hardest problem you hit, and how you approached it', 'One decision you made that changed the outcome', "What you'd do differently next time"] },
  { id: 'about-yourself', cat: 'Interviews', title: 'Tell me about yourself, in two minutes', points: ['Where you are today and what you actually do', 'The turn that got you here — one story, not a timeline', "What you're best at, with one proof point", "What you're looking for next"] },
  { id: 'explain-simply', cat: 'Work', title: 'Explain your current project to a non-technical person', points: ['Who it helps and what annoys them today', 'What your system does, without naming a single tool', 'One example of it working, start to finish', 'Why it matters to the business'] },
  { id: 'disagree', cat: 'Work', title: 'Disagree with a teammate — make your case', points: ['State their position fairly before you argue', 'Your concern, backed by one concrete example', 'What you propose instead', 'What would change your mind'] },
  { id: 'ideal-weekend', cat: 'Everyday', title: 'Describe your ideal weekend', points: ['How it starts — the first hour', 'One thing you do alone, one with people', 'A meal that has to be in it', 'Why this weekend and not a fancier one'] },
  { id: 'teach-something', cat: 'Everyday', title: 'Teach something you know well', points: ['Why a beginner should care', 'The one idea everything else hangs on', 'A mistake every beginner makes', 'How to practice it this week'] },
  { id: 'remote-work', cat: 'Opinions', title: 'Remote work: better or worse for careers?', points: ['Your position, stated in the first sentence', 'The strongest argument for the other side', 'Why your side still wins — one example', 'Who this advice does not apply to'] },
  { id: 'ai-languages', cat: 'Opinions', title: 'Will AI change how we learn languages?', points: ['What is broken about how people learn now', 'One thing AI genuinely does better', 'One thing it cannot replace', 'Your prediction for five years out'] },
]

const FILLER_RE = /\b(um+|uh+|umm+|hmm+|erm*|you know|i mean|basically|like|so yeah)\b/gi

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=GFS+Didot&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
:root{--paper:#F6F4EF;--panel:#FFFFFF;--wash:#EFECE3;--line:#E1DDD0;--line2:#C9C3B2;--ink:#1D1B16;--dim:#6E6A5C;--faint:#98937F;--aegean:#1A56A8;--aegean-deep:#123E7C;--aegean-soft:rgba(26,86,168,.10);--gold:#A87C24;--gold-soft:rgba(168,124,36,.12);--clay:#C2492B;--clay-soft:rgba(194,73,43,.12);--laurel:#587947;--laurel-soft:rgba(88,121,71,.12);--didot:'GFS Didot',Didot,'Bodoni MT',Georgia,serif;--sans:'Instrument Sans',-apple-system,'Segoe UI',Roboto,sans-serif}
html,body{margin:0;background:var(--paper)}.plive *{box-sizing:border-box}.plive{min-height:100vh;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}.plive button,.plive select{font-family:var(--sans)}.plive button{cursor:pointer}.wrap{max-width:920px;margin:0 auto;padding:0 28px}.mast{display:flex;align-items:center;justify-content:space-between;padding:22px 0;border-bottom:1px solid var(--line)}.brand{font-family:var(--didot);font-size:27px}.brand small{font:400 13px var(--sans);color:var(--faint);margin-left:10px}.badge{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--laurel);background:var(--laurel-soft);border-radius:999px;padding:5px 10px}.hero{padding:54px 0 22px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--aegean);margin-bottom:8px}.hero h1{font:400 clamp(34px,5vw,50px)/1.08 var(--didot);max-width:18ch;margin:0}.hero p{color:var(--dim);max-width:58ch;margin:12px 0 0}.topic-box{margin-top:26px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px}.topic-box label{display:block;font-size:12px;color:var(--faint);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}.topic-box select{width:100%;border:1px solid var(--line2);background:#fff;border-radius:8px;padding:12px 13px;color:var(--ink);font-size:15px}.points{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:9px}.points li{display:flex;gap:10px;color:var(--dim);font-size:14px}.points i{font-style:normal;color:var(--aegean)}.start{margin-top:22px;border:0;border-radius:8px;background:var(--aegean);color:white;font-size:16px;font-weight:600;padding:14px 24px}.start:hover{background:var(--aegean-deep)}.privacy{margin-left:14px;color:var(--faint);font-size:12.5px}.session{padding:42px 0 50px}.session-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.session-title{font:400 20px var(--didot);font-style:italic;color:var(--dim);max-width:560px}.listening{display:flex;align-items:center;gap:8px;color:var(--clay);font-size:13px}.dot{width:9px;height:9px;border-radius:50%;background:var(--clay);animation:pulse 1.5s ease-in-out infinite}@keyframes pulse{50%{opacity:.25}}.timer{font-size:clamp(60px,10vw,88px);font-weight:600;font-variant-numeric:tabular-nums;line-height:1;margin-top:26px;letter-spacing:-.03em}.timer small{font-size:14px;font-weight:400;color:var(--faint);margin-left:12px}.ticks{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:22px}.tick{padding:15px 14px 15px 0}.tick+.tick{border-left:1px solid var(--line);padding-left:18px}.tick b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.tick b.bad{color:var(--clay)}.tick span{color:var(--faint);font-size:12.5px}.live{min-height:190px;padding:22px 0;color:var(--ink);font-size:17px;line-height:1.85}.live .interim{color:var(--faint)}.live .hint{color:var(--faint);font-style:italic}.browser-note{font-size:12.5px;color:var(--gold);margin-top:-8px;margin-bottom:15px}.sess-foot{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--line);padding-top:18px}.prompt{color:var(--faint);font-size:13px;max-width:600px}.stop{border:1px solid var(--clay);background:var(--panel);color:var(--clay);border-radius:8px;padding:11px 20px;font-weight:600;white-space:nowrap}.analyzing{padding:130px 0}.analyzing h2{font:400 clamp(27px,4vw,37px) var(--didot);font-style:italic;margin:0}.analyzing p{color:var(--dim);margin-top:9px}.abar{height:2px;width:240px;background:var(--line);overflow:hidden;margin-top:30px}.abar i{display:block;width:40%;height:100%;background:var(--aegean);animation:slide 1.3s ease-in-out infinite}@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(350%)}}.results{padding:42px 0 70px}.res-meta{display:flex;gap:9px;flex-wrap:wrap;color:var(--faint);font-size:13.5px}.provider-note{margin-top:12px;color:var(--gold);font-size:13px;background:var(--gold-soft);border-radius:8px;padding:10px 12px;max-width:720px}.actions{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}.primary,.secondary{border-radius:8px;padding:12px 20px;font-weight:600;font-size:14px}.primary{border:0;background:var(--aegean);color:#fff}.secondary{border:1px solid var(--line2);background:var(--panel);color:var(--dim)}.error{margin-top:20px;border:1px solid rgba(194,73,43,.3);background:var(--clay-soft);color:var(--clay);padding:14px 16px;border-radius:9px;font-size:14px}.footer{padding:36px 0;color:var(--faint);font-size:12.5px;border-top:1px solid var(--line);margin-top:40px}@media(max-width:620px){.ticks{grid-template-columns:1fr}.tick+.tick{border-left:0;border-top:1px solid var(--line);padding-left:0}.sess-foot{align-items:flex-start;flex-direction:column}.privacy{display:block;margin:10px 0 0}.mast{align-items:flex-start}.brand small{display:block;margin:2px 0 0}}
`

function preferredRecorderType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function fileNameForType(type: string) {
  if (type.includes('mp4')) return 'peitho-session.m4a'
  if (type.includes('ogg')) return 'peitho-session.ogg'
  return 'peitho-session.webm'
}

function fmt(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function LivePractice() {
  const [topic, setTopic] = useState(TOPICS[0])
  const [phase, setPhase] = useState<'ready'|'recording'|'analyzing'|'results'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const finalText = useRef('')
  const startedAt = useRef(0)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const recognition = useRef<any>(null)
  const finishing = useRef(false)

  const cleanupCapture = useCallback(() => {
    try { recognition.current?.stop?.() } catch {}
    recognition.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => cleanupCapture(), [cleanupCapture])

  useEffect(() => {
    if (phase !== 'recording') return
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
      setElapsed(next)
    }, 250)
    return () => window.clearInterval(timer)
  }, [phase])

  const analyze = useCallback(async (audio: Blob, fileName: string, durationSec: number) => {
    setPhase('analyzing')
    setError('')
    try {
      const form = new FormData()
      form.append('audio', audio, fileName)
      form.append('fileName', fileName)
      form.append('transcript', finalText.current.trim())
      form.append('topicTitle', topic.title)
      form.append('durationSec', String(Math.max(1, durationSec)))
      form.append('points', JSON.stringify(topic.points))
      form.append('clientPausesMs', '[]')

      const response = await fetch('/api/analyze', { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || `Analysis failed (${response.status})`)
      setResult(payload)
      setPhase('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed unexpectedly.')
      setPhase('ready')
    }
  }, [topic])

  const finish = useCallback(async () => {
    if (finishing.current || phase !== 'recording') return
    finishing.current = true
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    try { recognition.current?.stop?.() } catch {}

    const recorder = mediaRecorder.current
    if (!recorder) {
      cleanupCapture()
      finishing.current = false
      setError('No audio recorder was active. Please allow microphone access and try again.')
      setPhase('ready')
      return
    }

    const blob = await new Promise<Blob>((resolve) => {
      const complete = () => resolve(new Blob(chunks.current, { type: recorder.mimeType || preferredRecorderType() || 'audio/webm' }))
      if (recorder.state === 'inactive') complete()
      else {
        recorder.addEventListener('stop', complete, { once: true })
        recorder.stop()
      }
    })
    cleanupCapture()
    mediaRecorder.current = null
    finishing.current = false

    if (!blob.size) {
      setError('The microphone recording was empty. Please try again and keep this tab active while speaking.')
      setPhase('ready')
      return
    }
    await analyze(blob, fileNameForType(blob.type), durationSec)
  }, [analyze, cleanupCapture, phase])

  const start = useCallback(async () => {
    setError('')
    setResult(null)
    setText('')
    setInterim('')
    setElapsed(0)
    finalText.current = ''
    chunks.current = []
    finishing.current = false

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support microphone recording. Use the latest Chrome, Edge, or Safari.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      streamRef.current = stream
      const mimeType = preferredRecorderType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.current.push(event.data) }
      recorder.start(1000)
      mediaRecorder.current = recorder

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setSpeechRecognitionAvailable(Boolean(SR))
      if (SR) {
        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = 'en-IN'
        rec.onresult = (event: any) => {
          let live = ''
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const phrase = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalText.current += `${phrase} `
              setText(finalText.current)
            } else live += phrase
          }
          setInterim(live)
        }
        rec.onerror = () => setSpeechRecognitionAvailable(false)
        try { rec.start() } catch { setSpeechRecognitionAvailable(false) }
        recognition.current = rec
      }

      startedAt.current = Date.now()
      setPhase('recording')
    } catch (err) {
      cleanupCapture()
      setError(err instanceof Error ? `Microphone could not start: ${err.message}` : 'Microphone permission was not granted.')
    }
  }, [cleanupCapture])

  const reset = () => {
    cleanupCapture()
    setResult(null)
    setText('')
    setInterim('')
    setElapsed(0)
    setError('')
    setPhase('ready')
  }

  const liveWords = text.trim().split(/\s+/).filter(Boolean).length
  const fillers = (text.match(FILLER_RE) || []).length
  const liveWpm = elapsed > 5 ? Math.round(liveWords / (elapsed / 60)) : 0

  return <div className="plive"><style>{CSS}</style><div className="wrap"><header className="mast"><div className="brand">Peitho <small>πειθώ · persuasion</small></div><span className="badge">Live backend</span></header>
    {phase === 'ready' && <main><section className="hero"><div className="eyebrow">Live practice</div><h1>Speak. Get evidence. Practice the next thing.</h1><p>This test route records your microphone, sends the finished recording securely to Peitho's server, transcribes it with Whisper, computes speaking metrics, and returns the real coaching dashboard.</p></section><section className="topic-box"><label htmlFor="topic">Practice topic</label><select id="topic" value={topic.id} onChange={(e) => setTopic(TOPICS.find((t) => t.id === e.target.value) || TOPICS[0])}>{TOPICS.map((t) => <option key={t.id} value={t.id}>{t.cat} · {t.title}</option>)}</select><ul className="points">{topic.points.map((point, i) => <li key={point}><i>—</i><span>{point}</span></li>)}</ul><button className="start" onClick={start}>Start speaking</button><span className="privacy">Allow microphone access when your browser asks.</span>{error && <div className="error">{error}</div>}</section></main>}
    {phase === 'recording' && <main className="session"><div className="session-head"><div className="session-title">{topic.title}</div><div className="listening"><span className="dot"/> recording</div></div><div className="timer">{fmt(elapsed)}<small>/ 05:00 suggested</small></div><div className="ticks"><div className="tick"><b className={fillers > 8 ? 'bad' : ''}>{fillers}</b><span>fillers caught live</span></div><div className="tick"><b>{liveWpm}</b><span>live words / min</span></div><div className="tick"><b>{liveWords}</b><span>words captured live</span></div></div><div className="live">{text || interim ? <><span>{text}</span><span className="interim">{interim}</span></> : <span className="hint">Start talking — the live transcript will appear here when your browser supports speech recognition.</span>}</div>{!speechRecognitionAvailable && <p className="browser-note">Live browser transcription isn't available here. Keep speaking — the audio is still recording and Whisper will create the authoritative transcript after you end the session.</p>}<div className="sess-foot"><span className="prompt">{topic.points[0]} · {topic.points[1]} · …</span><button className="stop" onClick={finish}>End session</button></div></main>}
    {phase === 'analyzing' && <main className="analyzing"><h2>Listening back to your session…</h2><p>Whisper is transcribing, Peitho is calculating your speaking KPIs, and the audio coach is reviewing delivery.</p><div className="abar"><i/></div></main>}
    {phase === 'results' && result && <main className="results"><div className="res-meta"><span>{topic.title}</span><span>·</span><span>{Math.round(result.metrics?.durationSec || 0)}s</span><span>·</span><span>{result.metrics?.words || 0} words</span></div>{result.degraded && <div className="provider-note">Audio delivery scoring was temporarily unavailable, so Peitho kept your session and used the text-analysis fallback. Delivery is shown as not scored rather than as a zero.</div>}<SessionDashboard result={result}/><div className="actions"><button className="primary" onClick={reset}>Practice again</button><button className="secondary" onClick={() => { reset(); setTopic(TOPICS[(TOPICS.findIndex((t) => t.id === topic.id) + 1) % TOPICS.length]) }}>Try another topic</button></div></main>}
    <footer className="footer">Peitho live test · API keys stay server-side. Audio is sent only after you end the session for transcription and analysis.</footer></div></div>
}
