/**
 * Mock Provider Server
 *
 * A simple HTTP server simulating LLM provider responses for integration testing.
 * Supports configurable status codes, delays, and headers.
 *
 * Usage:
 *   bun run tests/mock-provider-server.ts --status=429 --delay=100 --port=9999
 *
 * Endpoints:
 *   POST /v1/chat/completions - Simulates LLM chat completion responses
 *   GET  /health              - Server health check
 *   POST /configure           - Dynamically reconfigure response behaviour
 */

export interface MockServerConfig {
  port: number
  status: number
  delayMs: number
  retryAfterSeconds?: number
  customHeaders?: Record<string, string>
  responseBody?: string
}

const DEFAULT_CONFIG: MockServerConfig = {
  port: 0, // random available port
  status: 200,
  delayMs: 0,
}

/**
 * Build response body based on status code
 */
function buildResponseBody(config: MockServerConfig): string {
  if (config.responseBody) return config.responseBody

  switch (config.status) {
    case 200:
      return JSON.stringify({
        id: 'chatcmpl-mock-001',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mock-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Mock response from test server',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      })

    case 429:
      return JSON.stringify({
        error: {
          message: 'Rate limit exceeded. Please retry after the specified time.',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      })

    case 503:
      return JSON.stringify({
        error: {
          message: 'Service temporarily unavailable. Please try again later.',
          type: 'service_unavailable',
          code: 'overloaded',
        },
      })

    case 500:
      return JSON.stringify({
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      })

    default:
      return JSON.stringify({
        error: {
          message: `Mock error with status ${config.status}`,
          type: 'error',
          code: 'mock_error',
        },
      })
  }
}

/**
 * Build response headers based on config
 */
function buildResponseHeaders(config: MockServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Mock-Server': 'true',
  }

  // Add Retry-After header for 429 responses
  if (config.status === 429) {
    headers['Retry-After'] = String(config.retryAfterSeconds ?? 60)
  }

  // Merge custom headers
  if (config.customHeaders) {
    Object.assign(headers, config.customHeaders)
  }

  return headers
}

/**
 * Delay utility using setTimeout
 */
function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create and start a mock provider server.
 * Returns server instance and actual port (useful when port=0).
 */
export function createMockServer(initialConfig?: Partial<MockServerConfig>): {
  server: ReturnType<typeof Bun.serve>
  config: MockServerConfig
  getPort: () => number
  updateConfig: (update: Partial<MockServerConfig>) => void
  stop: () => void
} {
  const config: MockServerConfig = { ...DEFAULT_CONFIG, ...initialConfig }

  const state = { currentConfig: config }

  const server = Bun.serve({
    port: config.port,
    fetch: async (req) => {
      const url = new URL(req.url)
      const activeConfig = state.currentConfig

      // Health check endpoint
      if (url.pathname === '/health' && req.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', config: activeConfig }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Dynamic reconfiguration endpoint
      if (url.pathname === '/configure' && req.method === 'POST') {
        const body = await req.json()
        Object.assign(state.currentConfig, body)
        return new Response(JSON.stringify({ status: 'updated', config: state.currentConfig }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Chat completions endpoint
      if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
        // Apply configured delay (simulate latency or timeout)
        if (activeConfig.delayMs > 0) {
          await delay(activeConfig.delayMs)
        }

        const responseBody = buildResponseBody(activeConfig)
        const responseHeaders = buildResponseHeaders(activeConfig)

        return new Response(responseBody, {
          status: activeConfig.status,
          headers: responseHeaders,
        })
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  return {
    server,
    config: state.currentConfig,
    getPort: () => server.port,
    updateConfig: (update: Partial<MockServerConfig>) => {
      Object.assign(state.currentConfig, update)
    },
    stop: () => server.stop(),
  }
}

// --- CLI entrypoint ---

if (import.meta.main) {
  const args = process.argv.slice(2)

  const cliConfig: Partial<MockServerConfig> = {}

  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, '').split('=')
    switch (key) {
      case 'status':
        cliConfig.status = parseInt(value, 10)
        break
      case 'delay':
        cliConfig.delayMs = parseInt(value, 10)
        break
      case 'port':
        cliConfig.port = parseInt(value, 10)
        break
      case 'retry-after':
        cliConfig.retryAfterSeconds = parseInt(value, 10)
        break
    }
  }

  const { getPort, config } = createMockServer(cliConfig)
  console.log(`Mock provider server started on port ${getPort()}`)
  console.log(`Config: status=${config.status}, delay=${config.delayMs}ms`)
  console.log(`Endpoints:`)
  console.log(`  POST http://localhost:${getPort()}/v1/chat/completions`)
  console.log(`  GET  http://localhost:${getPort()}/health`)
  console.log(`  POST http://localhost:${getPort()}/configure`)
}
