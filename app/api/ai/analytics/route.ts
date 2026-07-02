/**
 * AI Analytics — GET /api/ai/analytics
 * Returns real-time AI usage metrics for the analytics dashboard.
 */

import { NextResponse } from 'next/server'
import { getDailyUsage } from '@/lib/ai/redis-store'
import { getRuntimeInfo } from '@/lib/ai/env'
import { getPoolStats } from '@/lib/ai/fetch-pool'
import { getCircuitState } from '@/lib/ai/circuit-breaker'

export async function GET() {
  try {
    const usage = await getDailyUsage()
    const runtime = getRuntimeInfo()
    const pool = getPoolStats()
    const deepseek = getCircuitState('deepseek')

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime,
      daily: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalRequests: usage.totalRequests,
        estimatedCost: estimateCost(usage.promptTokens, usage.completionTokens),
      },
      circuit: {
        deepseek: deepseek,
      },
      pool,
    }, {
      headers: { 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return NextResponse.json({ status: 'error', message: 'Analytics unavailable' }, { status: 500 })
  }
}

function estimateCost(promptTokens: number, completionTokens: number): string {
  // DeepSeek V4 Pro pricing (approx)
  const promptCost = (promptTokens / 1_000_000) * 0.55
  const completionCost = (completionTokens / 1_000_000) * 2.19
  return `$${(promptCost + completionCost).toFixed(4)}`
}
