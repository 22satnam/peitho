import {createFileRoute} from '@tanstack/react-router'
import {ForgotPassword} from '../components/PasswordRecovery'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><ForgotPassword/><CreatorSignature/></>}
export const Route=createFileRoute('/forgot-password')({component:Page})
