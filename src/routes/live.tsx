import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import CreatorSignature from '../components/CreatorSignature'

function PeithoLivePage() {
  return <><PeithoGate/><CreatorSignature/></>
}

export const Route = createFileRoute('/live')({
  component: PeithoLivePage,
})
