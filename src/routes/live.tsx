import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'

export const Route = createFileRoute('/live')({
  component: PeithoGate,
})
