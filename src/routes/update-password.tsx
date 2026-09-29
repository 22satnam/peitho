import {createFileRoute} from '@tanstack/react-router'
import {UpdatePassword} from '../components/PasswordRecovery'
import PublicNav from '../components/PublicNav'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><PublicNav/><UpdatePassword/><CreatorSignature/></>}
export const Route=createFileRoute('/update-password')({component:Page})
