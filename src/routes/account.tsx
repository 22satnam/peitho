import {createFileRoute} from '@tanstack/react-router'
import AccountData from '../components/AccountData'
import SignedInNav from '../components/SignedInNav'
import CreatorSignature from '../components/CreatorSignature'
function AccountPage(){return <><SignedInNav/><AccountData/><CreatorSignature/></>}
export const Route=createFileRoute('/account')({component:AccountPage})
