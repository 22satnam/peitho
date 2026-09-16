import { createFileRoute } from '@tanstack/react-router'
import { generateTextJson } from '../../lib/peitho/ai.server'

const schema = {
  type: 'object',
  properties: {
    drills: {
      type: 'array', minItems: 5, maxItems: 5,
      items: {
        type: 'object',
        properties: { say: { type: 'string' }, correct: { type: 'string' } },
        required: ['say', 'correct'],
      },
    },
  },
  required: ['drills'],
}

export const Route = createFileRoute('/api/drills')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const patterns = Array.isArray(body?.patterns) ? body.patterns.map(String).filter(Boolean).slice(0, 8) : []
          if (!patterns.length) return Response.json({ error: 'patterns are required' }, { status: 400 })

          const { data, provider } = await generateTextJson<{ drills: Array<{ say: string; correct: string }> }>({
            schema,
            prompt: `This English learner repeatedly produces these patterns:\n- ${patterns.join('\n- ')}\n\nCreate exactly five short spoken-practice drills that force the correct forms. "say" should be the practice cue or sentence to attempt; "correct" should be the natural target version. Keep them useful for an Indian professional at work or in interviews. JSON only.`,
          })
          const drills = Array.isArray(data?.drills) ? data.drills.slice(0, 5) : []
          if (drills.length !== 5) throw new Error('AI did not return exactly five drills')
          return Response.json({ drills, provider }, { headers: { 'Cache-Control': 'no-store' } })
        } catch (error) {
          console.error('drills failed', error)
          return Response.json({ error: error instanceof Error ? error.message : 'Could not generate drills' }, { status: 500 })
        }
      },
    },
  },
})
