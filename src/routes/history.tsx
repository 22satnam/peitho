import { createFileRoute } from '@tanstack/react-router'
import SessionHistory from '../components/SessionHistory'
import CreatorSignature from '../components/CreatorSignature'

function HistoryPage(){return <><SessionHistory/><CreatorSignature/></>}
export const Route=createFileRoute('/history')({component:HistoryPage})
