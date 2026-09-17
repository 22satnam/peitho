import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import AuthenticatedApiBridge from '../components/AuthenticatedApiBridge'
import CreatorSignature from '../components/CreatorSignature'
import SignedInNav from '../components/SignedInNav'
import ExperiencePolish from '../components/ExperiencePolish'

function PeithoLivePage(){return <><AuthenticatedApiBridge/><SignedInNav/><ExperiencePolish/><PeithoGate/><CreatorSignature/></>}
export const Route=createFileRoute('/live')({component:PeithoLivePage})
