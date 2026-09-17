import { createFileRoute } from '@tanstack/react-router'
import { ForgotPassword } from '../components/PasswordRecovery'
export const Route=createFileRoute('/forgot-password')({component:ForgotPassword})
