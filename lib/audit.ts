import { logger } from './logger'

export function auditLog(action: string, details: Record<string, unknown> = {}) {
  logger.info({ action, ...details, audit: true }, `AUDIT: ${action}`)
}

export function auditError(action: string, error: unknown, details: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error)
  logger.error({ action, error: message, ...details, audit: true }, `AUDIT ERROR: ${action}`)
}
