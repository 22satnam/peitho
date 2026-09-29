import { createFileRoute } from '@tanstack/react-router'
import PeithoGate from '../PeithoGate'
import AuthenticatedApiBridge from '../components/AuthenticatedApiBridge'
import SignedInNav from '../components/SignedInNav'
import ExperiencePolish from '../components/ExperiencePolish'

function PeithoPage(){return <><AuthenticatedApiBridge/><SignedInNav/><ExperiencePolish/><PeithoGate/></>}
export const Route=createFileRoute('/')({component:PeithoPage})
