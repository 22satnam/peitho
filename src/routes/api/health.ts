import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => Response.json({
        ok: true,
        service: 'peitho-api',
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      }),
    },
  },
})
