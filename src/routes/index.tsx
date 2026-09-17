import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import AuthenticatedApiBridge from '../components/AuthenticatedApiBridge'
import CreatorSignature from '../components/CreatorSignature'
import SignedInNav from '../components/SignedInNav'
import ExperiencePolish from '../components/ExperiencePolish'

function PeithoPage(){return <><AuthenticatedApiBridge/><SignedInNav/><ExperiencePolish/><PeithoGate/><CreatorSignature/></>}
export const Route=createFileRoute('/')({component:PeithoPage})
