import { createFileRoute } from '@tanstack/react-router'
import SessionHistory from '../components/SessionHistory'
import SignedInNav from '../components/SignedInNav'
import CreatorSignature from '../components/CreatorSignature'

function HistoryPage(){return <><SignedInNav/><SessionHistory/><CreatorSignature/></>}
export const Route=createFileRoute('/history')({component:HistoryPage})
