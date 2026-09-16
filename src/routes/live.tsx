import { createFileRoute } from '@tanstack/react-router'
import UnifiedPractice from '../UnifiedPractice'

export const Route = createFileRoute('/live')({
  component: UnifiedPractice,
})
