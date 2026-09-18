import {createFileRoute} from '@tanstack/react-router'
import SessionReview from '../components/SessionReview'
import SignedInNav from '../components/SignedInNav'
import CreatorSignature from '../components/CreatorSignature'

function SavedReviewPage(){
 const{sessionId}=Route.useParams()
 return <><SignedInNav/><SessionReview sessionId={sessionId}/><CreatorSignature/></>
}
export const Route=createFileRoute('/review/$sessionId')({component:SavedReviewPage})
