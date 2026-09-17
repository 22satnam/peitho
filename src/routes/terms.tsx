import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '../components/LegalPage'

export const Route = createFileRoute('/terms')({ component: TermsPage })
