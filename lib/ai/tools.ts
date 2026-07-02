/**
 * API Proxy — Dynamic tool executor with Zod validation.
 * Supports read tools (dashboard, health, status) and write tools (pause, resume).
 */

import { createLogger } from '@/lib/logger'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { z } from 'zod'
import { validateToolInput } from './guard'

const logger = createLogger('ai-tools')

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ApiToolParam {
  type: string
  description?: string
  required?: boolean
  default?: any
  enum?: string[]
}

export interface ApiToolDef {
  name: string
  description: string
  endpoint: string
  parameters: Record<string, ApiToolParam>
}

export interface ApiSchema {
  tools: ApiToolDef[]
}

// ─── Zod schemas for tool parameters ─────────────────────────────────────────
const endpointIdParam = z.string().uuid()

const baseToolSchemas: Record<string, z.ZodObject<any>> = {
  get_endpoint_status: z.object({ id: endpointIdParam }),
  get_endpoint_pings: z.object({ id: endpointIdParam }),
  pause_endpoint: z.object({ id: endpointIdParam }),
  resume_endpoint: z.object({ id: endpointIdParam }),
}

// ─── Schema loading ──────────────────────────────────────────────────────────
let _schemaCache: ApiSchema | null = null
let _schemaLoadAttempted = false

const SCHEMA_FILE_NAMES = ['api-schema.json', 'public/api-schema.json']

export async function loadApiSchema(env: Record<string, string | undefined>): Promise<ApiSchema | null> {
  if (_schemaLoadAttempted) return _schemaCache
  _schemaLoadAttempted = true

  if (env.DATA_API_SCHEMA) {
    try {
      _schemaCache = JSON.parse(env.DATA_API_SCHEMA)
      logger.info({ event: 'schema_loaded', source: 'env_var', toolCount: _schemaCache!.tools.length })
      return _schemaCache
    } catch (e) {
      logger.error({ event: 'schema_parse_error', source: 'DATA_API_SCHEMA', error: (e as Error).message })
      return null
    }
  }

  if (env.DATA_API_SCHEMA_URL) {
    try {
      const res = await fetch(env.DATA_API_SCHEMA_URL, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      _schemaCache = await res.json() as ApiSchema
      logger.info({ event: 'schema_loaded', source: 'url', toolCount: _schemaCache!.tools.length })
      return _schemaCache
    } catch (e) {
      logger.error({ event: 'schema_fetch_error', source: 'DATA_API_SCHEMA_URL', error: (e as Error).message })
      return null
    }
  }

  for (const fileName of SCHEMA_FILE_NAMES) {
    try {
      const filePath = resolve(process.cwd(), fileName)
      const content = await readFile(filePath, 'utf-8')
      _schemaCache = JSON.parse(content)
      logger.info({ event: 'schema_loaded', source: fileName, toolCount: _schemaCache!.tools.length })
      return _schemaCache
    } catch {}
  }

  return null
}

// ─── Execute a tool call ─────────────────────────────────────────────────────
export async function callTool(
  schema: ApiSchema,
  baseUrl: string,
  apiKey: string | undefined,
  toolName: string,
  input: Record<string, any>,
): Promise<any> {
  const toolDef = schema.tools.find((t) => t.name === toolName)
  if (!toolDef) {
    return { error: `Unknown tool: ${toolName}` }
  }

  // Zod validation for known tools
  const toolSchema = baseToolSchemas[toolName]
  if (toolSchema) {
    const validation = validateToolInput(toolSchema, input)
    if (!validation.success) {
      return { error: 'Invalid parameters', detail: (validation as { success: false; error: string }).error }
    }
    input = (validation as { success: true; data: any }).data
  }

  // Validate required parameters
  for (const [name, param] of Object.entries(toolDef.parameters)) {
    if (param.required && (input[name] === undefined || input[name] === null || input[name] === '')) {
      return {
        error: `Missing required parameter: ${name}`,
        hint: `The "${name}" parameter is required for tool "${toolName}". ${param.description || ''}`,
      }
    }
  }

  const [method, pathTemplate] = toolDef.endpoint.split(' ', 2)
  const httpMethod = (method || 'GET').toUpperCase()

  let path = pathTemplate || '/'
  const queryParams: Record<string, string> = {}
  const usedParams = new Set<string>()

  path = path.replace(/\{(\w+)\}/g, (_, key) => {
    usedParams.add(key)
    return encodeURIComponent(String(input[key] ?? ''))
  })

  for (const [key, value] of Object.entries(input)) {
    if (!usedParams.has(key) && value !== undefined && value !== null) {
      queryParams[key] = String(value)
    }
  }

  let url = baseUrl.replace(/\/$/, '') + path
  if (httpMethod === 'GET' && Object.keys(queryParams).length > 0) {
    url += '?' + new URLSearchParams(queryParams).toString()
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const fetchOpts: RequestInit = {
    method: httpMethod,
    headers,
    signal: AbortSignal.timeout(15000),
  }
  if (httpMethod !== 'GET' && Object.keys(queryParams).length > 0) {
    headers['Content-Type'] = 'application/json'
    fetchOpts.body = JSON.stringify(queryParams)
  }

  logger.info({ event: 'tool_execute', tool: toolName, method: httpMethod, url })

  try {
    const res = await fetch(url, fetchOpts)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { error: `API returned ${res.status}`, detail: text.slice(0, 500) }
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      return await res.json()
    }
    return await res.text()
  } catch (e) {
    return { error: `Request failed: ${(e as Error).message}` }
  }
}

// ─── Convert API schema to OpenAI tool format ────────────────────────────────
export function schemaToOpenAITools(schema: ApiSchema): any[] {
  return schema.tools.map((tool) => {
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const [name, param] of Object.entries(tool.parameters)) {
      properties[name] = {
        type: param.type || 'string',
        description: param.description || name,
        ...(param.enum ? { enum: param.enum } : {}),
      }
      if (param.required) required.push(name)
    }

    let enhancedDesc = tool.description
    const paramEntries = Object.entries(tool.parameters)
    if (paramEntries.length > 0) {
      const paramHints = paramEntries.map(([name, param]) => {
        const req = param.required ? ', REQUIRED' : ''
        return `${name} (${param.type || 'string'}${req}): ${param.description || name}`
      })
      enhancedDesc += `\nParameters:\n- ${paramHints.join('\n- ')}`
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: enhancedDesc,
        parameters: {
          type: 'object',
          properties,
          ...(required.length > 0 ? { required } : {}),
        },
      },
    }
  })
}
