import {createFileRoute} from '@tanstack/react-router'
import {ForgotPassword} from '../components/PasswordRecovery'
import PublicNav from '../components/PublicNav'
import CreatorSignature from '../components/CreatorSignature'

function Page(){return <><PublicNav/><ForgotPassword/><CreatorSignature/></>}
export const Route=createFileRoute('/forgot-password')({component:Page})
