import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import CreatorSignature from '../components/CreatorSignature'

function PeithoPage() {
  return <><PeithoGate/><CreatorSignature/></>
}

export const Route = createFileRoute('/')({
  component: PeithoPage,
})
