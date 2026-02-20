import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync, writeFileSync } from "fs"

const LOG_FILE = "/tmp/opencode-events.log"

// Initialise log file with header on plugin load
const initLog = () => {
  writeFileSync(LOG_FILE, `# OpenCode Event Log\n# Started: ${new Date().toISOString()}\n# Plugin: event-logger.ts\n---\n`)
}

const logEvent = (event: { type: string; properties: unknown }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    type: event.type,
    properties: event.properties,
  }
  appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n")
}

const EventLoggerPlugin: Plugin = async () => {
  initLog()

  return {
    event: async ({ event }) => {
      logEvent(event)

      // Highlight rate-limit and error events for investigation
      if (event.type === "session.error") {
        const props = event.properties as {
          sessionID?: string
          error?: { name: string; data: Record<string, unknown> }
        }
        if (props.error?.name === "APIError") {
          const apiData = props.error.data as {
            statusCode?: number
            isRetryable?: boolean
            responseHeaders?: Record<string, string>
            message?: string
          }
          const marker = {
            timestamp: new Date().toISOString(),
            marker: "RATE_LIMIT_CHECK",
            statusCode: apiData.statusCode,
            isRetryable: apiData.isRetryable,
            retryAfter: apiData.responseHeaders?.["retry-after"],
            message: apiData.message,
          }
          appendFileSync(LOG_FILE, `### API_ERROR: ${JSON.stringify(marker)}\n`)
        }
      }

      // Log session retry status (OpenCode's internal retry mechanism)
      if (event.type === "session.status") {
        const props = event.properties as {
          sessionID: string
          status: { type: string; attempt?: number; message?: string; next?: number }
        }
        if (props.status.type === "retry") {
          const marker = {
            timestamp: new Date().toISOString(),
            marker: "SESSION_RETRY",
            attempt: props.status.attempt,
            message: props.status.message,
            nextRetryAt: props.status.next,
          }
          appendFileSync(LOG_FILE, `### SESSION_RETRY: ${JSON.stringify(marker)}\n`)
        }
      }

      // Log RetryPart from message parts (per-message retry with full ApiError)
      if (event.type === "message.part.updated") {
        const props = event.properties as {
          part: { type: string; attempt?: number; error?: Record<string, unknown> }
        }
        if (props.part.type === "retry") {
          const marker = {
            timestamp: new Date().toISOString(),
            marker: "MESSAGE_RETRY_PART",
            attempt: props.part.attempt,
            error: props.part.error,
          }
          appendFileSync(LOG_FILE, `### MESSAGE_RETRY: ${JSON.stringify(marker)}\n`)
        }
      }
    },
  }
}

export default EventLoggerPlugin
