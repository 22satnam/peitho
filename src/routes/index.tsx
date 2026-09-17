import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import AuthenticatedApiBridge from '../components/AuthenticatedApiBridge'
import CreatorSignature from '../components/CreatorSignature'
import SignedInNav from '../components/SignedInNav'

function PeithoPage() {
  return <><AuthenticatedApiBridge/><SignedInNav/><PeithoGate/><CreatorSignature/></>
}

export const Route = createFileRoute('/')({ component: PeithoPage })
