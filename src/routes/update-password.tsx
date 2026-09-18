import {createFileRoute} from '@tanstack/react-router'
import {UpdatePassword} from '../components/PasswordRecovery'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><UpdatePassword/><CreatorSignature/></>}
export const Route=createFileRoute('/update-password')({component:Page})
