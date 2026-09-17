import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import AuthenticatedApiBridge from '../components/AuthenticatedApiBridge'
import CreatorSignature from '../components/CreatorSignature'

function PeithoPage() {
  return <><AuthenticatedApiBridge/><PeithoGate/><CreatorSignature/></>
}

export const Route = createFileRoute('/')({
  component: PeithoPage,
})
