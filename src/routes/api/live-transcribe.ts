import { createFileRoute } from '@tanstack/react-router'
import { transcribeWithGroq } from '../../lib/peitho/ai.server'

function liveMime(fileName: string, reported: string) {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = { webm:'audio/webm', m4a:'audio/m4a', mp4:'audio/mp4', ogg:'audio/ogg', wav:'audio/wav', mp3:'audio/mpeg' }
  const clean = reported.toLowerCase().split(';')[0].trim()
  return clean.startsWith('audio/') ? clean : (map[ext] || 'audio/webm')
}

export const Route = createFileRoute('/api/live-transcribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData()
          const fileName = String(form.get('fileName') || 'live.webm')
          const entry = form.get('audio')
          if (!(entry instanceof Blob) || !entry.size) return Response.json({ error: 'Audio chunk required.' }, { status: 400 })
          if (entry.size > 6 * 1024 * 1024) return Response.json({ error: 'Live audio chunk too large.' }, { status: 413 })
          const audio = new Blob([await entry.arrayBuffer()], { type: liveMime(fileName, entry.type) })
          const result = await transcribeWithGroq(audio, fileName)
          return Response.json({ transcript: result.text }, { headers: { 'Cache-Control': 'no-store' } })
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : 'Live transcription failed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
        }
      },
    },
  },
})
