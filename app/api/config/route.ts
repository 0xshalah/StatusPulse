import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

let _cache: any = null

export async function GET() {
  if (!_cache) {
    let config: any = {}
    try {
      const content = await readFile(resolve(process.cwd(), 'ai-chat-assistant.config.json'), 'utf-8')
      config = JSON.parse(content)
    } catch {}

    let suggestedQuestions = config.suggestedQuestions || []

    if (suggestedQuestions.length === 0) {
      try {
        const schemaContent = await readFile(resolve(process.cwd(), 'api-schema.json'), 'utf-8')
        const schema = JSON.parse(schemaContent)
        if (schema.tools && Array.isArray(schema.tools)) {
          suggestedQuestions = schema.tools.slice(0, 4).map((tool: any) => {
            const desc = (tool.description || tool.name).toLowerCase()
            if (desc.includes('search')) return 'Search my API endpoints'
            if (desc.includes('dashboard') || desc.includes('overview')) return 'Show me my API health overview'
            if (desc.includes('uptime')) return 'What\'s my overall uptime?'
            if (desc.includes('status') || desc.includes('get')) return 'Check the status of a specific endpoint'
            return 'What can you help me with?'
          })
          suggestedQuestions = [...new Set(suggestedQuestions)]
        }
      } catch {}
    }

    if (suggestedQuestions.length === 0) {
      suggestedQuestions = [
        'Which APIs are currently down?',
        'What\'s the slowest endpoint?',
        'Any recent incidents or error spikes?',
      ]
    }

    _cache = {
      name: config.name || 'StatusPulse AI',
      welcome: config.welcome || '',
      suggestedQuestions,
    }
  }

  return NextResponse.json(_cache, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
