import { createFileRoute } from '@tanstack/react-router'
import { generateTextJson } from '../../lib/peitho/ai.server'

const schema = {
  type: 'object',
  properties: { points: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } } },
  required: ['points'],
}

export const Route = createFileRoute('/api/topic-points')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const topic = String(body?.topic || '').trim()
          const duration = Math.max(2, Math.min(10, Number(body?.durationMinutes) || 5))
          if (!topic) return Response.json({ error: 'topic is required' }, { status: 400 })

          const { data, provider } = await generateTextJson<{ points: string[] }>({
            schema,
            prompt: `Generate exactly four talking points for a ${duration}-minute spoken answer on "${topic}" for an Indian professional practicing English. The points must be short prompts, not sentences to memorize. Make them concrete, distinct, and ordered into a natural speaking arc. JSON only.`,
          })
          const points = Array.isArray(data?.points) ? data.points.map(String).filter(Boolean).slice(0, 4) : []
          if (points.length !== 4) throw new Error('AI did not return exactly four topic points')
          return Response.json({ points, provider }, { headers: { 'Cache-Control': 'private, max-age=300' } })
        } catch (error) {
          console.error('topic-points failed', error)
          return Response.json({ error: error instanceof Error ? error.message : 'Could not generate topic points' }, { status: 500 })
        }
      },
    },
  },
})
