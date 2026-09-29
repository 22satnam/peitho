import {createFileRoute} from '@tanstack/react-router'
import {TermsPage} from '../components/LegalPage'
import PublicNav from '../components/PublicNav'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><PublicNav/><TermsPage/><CreatorSignature/></>}
export const Route=createFileRoute('/terms')({component:Page})
