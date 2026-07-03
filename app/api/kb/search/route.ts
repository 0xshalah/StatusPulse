/**
 * Knowledge Base Search API — GET /api/kb/search?query=xxx
 */

import { NextRequest } from 'next/server'
import { search, getDocumentCount } from '@/lib/ai/knowledge-base'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || ''

  if (!query || query.length < 2) {
    return Response.json({ error: 'Query must be at least 2 characters', documentCount: getDocumentCount() }, { status: 400 })
  }

  const results = search(query, 5)

  return Response.json({
    query,
    documentCount: getDocumentCount(),
    results,
    formatted: results.length > 0
      ? `📚 **Knowledge Base Results** (${results.length} found)\n\n${results.map((r, i) =>
          `**${i + 1}. ${r.title}**\n_Source: ${r.source}_\n\`\`\`\n${r.snippet}\n\`\`\``).join('\n\n')}`
      : 'No matching runbooks found. Try different keywords.',
  })
}
