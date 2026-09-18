import {createFileRoute} from '@tanstack/react-router'
import PrivacyPage from '../components/PrivacyPage'
import CreatorSignature from '../components/CreatorSignature'

function PrivacyRoute(){return <><PrivacyPage/><CreatorSignature/></>}
export const Route=createFileRoute('/privacy')({component:PrivacyRoute})
