import {createFileRoute} from '@tanstack/react-router'
import AuthWorkspace from '../components/AuthWorkspace'
import CreatorSignature from '../components/CreatorSignature'
function Page(){return <><AuthWorkspace mode="signup"/><CreatorSignature/></>}
export const Route=createFileRoute('/auth/signup')({component:Page})
