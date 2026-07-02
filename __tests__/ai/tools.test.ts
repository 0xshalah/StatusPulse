/**
 * Unit tests: AI Tools — schema loading, validation, tool execution.
 */

import { describe, it, expect, beforeEach } from 'vitest'

describe('Tool Schema Conversion', () => {
  let schemaToOpenAITools: Function

  beforeEach(async () => {
    const mod = await import('../../lib/ai/tools')
    schemaToOpenAITools = mod.schemaToOpenAITools
  })

  it('converts empty schema', () => {
    const result = schemaToOpenAITools({ tools: [] })
    expect(result).toEqual([])
  })

  it('converts tool with no parameters', () => {
    const result = schemaToOpenAITools({
      tools: [{
        name: 'get_dashboard',
        description: 'Get all endpoints',
        endpoint: 'GET /api/dashboard',
        parameters: {},
      }],
    })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('function')
    expect(result[0].function.name).toBe('get_dashboard')
    expect(result[0].function.parameters.required).toBeUndefined()
  })

  it('converts tool with required parameters', () => {
    const result = schemaToOpenAITools({
      tools: [{
        name: 'get_endpoint',
        description: 'Get endpoint',
        endpoint: 'GET /api/endpoints/{id}',
        parameters: {
          id: { type: 'string', description: 'The ID', required: true },
        },
      }],
    })
    expect(result[0].function.parameters.required).toEqual(['id'])
  })

  it('enhances description with parameter hints', () => {
    const result = schemaToOpenAITools({
      tools: [{
        name: 'get_endpoint',
        description: 'Get endpoint',
        endpoint: 'GET /api/endpoints/{id}',
        parameters: {
          id: { type: 'string', description: 'The ID', required: true },
          format: { type: 'string', description: 'Output format' },
        },
      }],
    })
    const desc = result[0].function.description
    expect(desc).toContain('Parameters:')
    expect(desc).toContain('id (string, REQUIRED): The ID')
    expect(desc).toContain('format (string): Output format')
  })

  it('handles enum parameters', () => {
    const result = schemaToOpenAITools({
      tools: [{
        name: 'get_status',
        description: 'Get by status',
        endpoint: 'GET /api/status',
        parameters: {
          filter: { type: 'string', description: 'Filter', enum: ['up', 'down'] },
        },
      }],
    })
    expect(result[0].function.parameters.properties.filter.enum).toEqual(['up', 'down'])
  })

  it('handles multiple tools', () => {
    const result = schemaToOpenAITools({
      tools: [
        { name: 'a', description: 'A', endpoint: 'GET /a', parameters: {} },
        { name: 'b', description: 'B', endpoint: 'GET /b', parameters: {} },
        { name: 'c', description: 'C', endpoint: 'GET /c', parameters: {} },
      ],
    })
    expect(result).toHaveLength(3)
  })
})

describe('Tool Validation', () => {
  let validateToolInput: Function

  beforeEach(async () => {
    const mod = await import('../../lib/ai/guard')
    validateToolInput = mod.validateToolInput
  })

  it('validates valid UUID', () => {
    const { z } = require('zod')
    const schema = z.object({ id: z.string().uuid() })
    const result = validateToolInput(schema, { id: 'd66bbde2-d239-48ff-9064-25a24e171459' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const { z } = require('zod')
    const schema = z.object({ id: z.string().uuid() })
    const result = validateToolInput(schema, { id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required field', () => {
    const { z } = require('zod')
    const schema = z.object({ id: z.string().uuid() })
    const result = validateToolInput(schema, {})
    expect(result.success).toBe(false)
  })

  it('validates enum values', () => {
    const { z } = require('zod')
    const schema = z.object({ range: z.enum(['1h', '24h', '7d']) })
    const result = validateToolInput(schema, { range: '24h' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid enum values', () => {
    const { z } = require('zod')
    const schema = z.object({ range: z.enum(['1h', '24h', '7d']) })
    const result = validateToolInput(schema, { range: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('Content Filter', () => {
  let filterSearchResult: Function

  beforeEach(async () => {
    const mod = await import('../../lib/ai/content-filter')
    filterSearchResult = mod.filterSearchResult
  })

  it('passes clean content', () => {
    const result = filterSearchResult({
      title: 'How to fix 502 Bad Gateway',
      url: 'https://stackoverflow.com/questions/123',
      content: 'Check your upstream server configuration...',
    })
    expect(result.passed).toBe(true)
  })

  it('blocks NSFW content', () => {
    const result = filterSearchResult({
      title: 'Free porn videos',
      url: 'https://example.com',
      content: 'Watch adult content here...',
    })
    expect(result.passed).toBe(false)
  })

  it('blocks gambling content', () => {
    const result = filterSearchResult({
      title: 'Best online casino',
      url: 'https://casino.example.com',
      content: 'Sports betting odds...',
    })
    expect(result.passed).toBe(false)
  })

  it('blocks URL shorteners', () => {
    const result = filterSearchResult({
      title: 'Check this out',
      url: 'https://bit.ly/abc123',
      content: 'Interesting article...',
    })
    expect(result.passed).toBe(false)
  })

  it('blocks malware references', () => {
    const result = filterSearchResult({
      title: 'Download malware',
      url: 'https://example.com',
      content: 'Free malware download here...',
    })
    expect(result.passed).toBe(false)
  })
})
