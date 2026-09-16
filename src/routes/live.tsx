import { createFileRoute } from '@tanstack/react-router'
import LivePractice from '../LivePracticeV2'

export const Route = createFileRoute('/live')({
  component: LivePractice,
})
