import {createFileRoute} from '@tanstack/react-router'
import {TermsPage} from '../components/LegalPage'
import CreatorSignature from '../components/CreatorSignature'

function TermsRoute(){return <><TermsPage/><CreatorSignature/></>}
export const Route=createFileRoute('/terms')({component:TermsRoute})
