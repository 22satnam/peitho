import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '../components/LegalPage'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })
