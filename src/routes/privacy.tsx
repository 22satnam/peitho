import {createFileRoute} from '@tanstack/react-router'
import PrivacyPage from '../components/PrivacyPage'
import PublicNav from '../components/PublicNav'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><PublicNav/><PrivacyPage/><CreatorSignature/></>}
export const Route=createFileRoute('/privacy')({component:Page})
