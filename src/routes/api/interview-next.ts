import { createFileRoute } from '@tanstack/react-router'
import { generateTextJson } from '../../lib/peitho/ai.server'

const schema = {
  type: 'object',
  properties: { question: { type: 'string' } },
  required: ['question'],
}

export const Route = createFileRoute('/api/interview-next')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const answer = String(body?.answer || '').trim()
          const topic = String(body?.topic || 'Interview practice').trim()
          if (answer.split(/\s+/).filter(Boolean).length < 3) {
            return Response.json({ error: 'A longer answer is required before generating a follow-up.' }, { status: 400 })
          }
          const { data, provider } = await generateTextJson<{ question: string }>({
            schema,
            prompt: `You are a friendly interviewer. The interview topic is "${topic}". The candidate just said:\n\n"""${answer}"""\n\nAsk ONE natural follow-up question that digs into something specific they actually said. Do not ask a generic question and do not give feedback yet. JSON only.`,
          })
          return Response.json({ question: String(data?.question || '').trim(), provider }, { headers: { 'Cache-Control': 'no-store' } })
        } catch (error) {
          console.error('interview-next failed', error)
          return Response.json({ error: error instanceof Error ? error.message : 'Could not generate follow-up' }, { status: 500 })
        }
      },
    },
  },
})
