import { setupWorker } from 'msw/browser'
import { approvalHandlers } from './handlers/approval'
import { authOrgHandlers } from './handlers/auth-org'
import { boardHandlers } from './handlers/board'

export const worker = setupWorker(...authOrgHandlers, ...boardHandlers, ...approvalHandlers)

export function startMock() {
  return worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}
