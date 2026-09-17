import { createFileRoute } from '@tanstack/react-router'
import Leaderboard from '../components/Leaderboard'
import SignedInNav from '../components/SignedInNav'
import CreatorSignature from '../components/CreatorSignature'

function LeaderboardPage(){return <><SignedInNav/><Leaderboard/><CreatorSignature/></>}
export const Route=createFileRoute('/leaderboard')({component:LeaderboardPage})
