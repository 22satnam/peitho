import { createFileRoute } from '@tanstack/react-router'
import LivePractice from '../LivePractice'

export const Route = createFileRoute('/live')({
  component: LivePractice,
})
