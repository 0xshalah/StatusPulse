import { NextResponse } from 'next/server'

const PROJECT_ID = 'dc688ee6-3d53-4cd9-a8a2-21229ef20a01'
const API_KEY = process.env.TESTSPRITE_API_KEY || ''

export async function GET() {
  try {
    const res = await fetch(
      `https://api.testsprite.com/v1/tests?projectId=${PROJECT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'TestSprite API unavailable', detail: text.slice(0, 200) }, { status: 502 })
    }

    const data = await res.json()
    const tests = data.items || data.tests || []
    const passed = tests.filter((t: Record<string, unknown>) => t.status === 'passed').length
    const failed = tests.filter((t: Record<string, unknown>) => t.status === 'failed').length
    const running = tests.filter((t: Record<string, unknown>) => t.status === 'running').length
    const blocked = tests.filter((t: Record<string, unknown>) => t.status === 'blocked').length
    const total = tests.length

    return NextResponse.json({
      total,
      passed,
      failed,
      running,
      blocked,
      health: total > 0 ? Math.round((passed / total) * 100) : 0,
      dashboardUrl: `https://www.testsprite.com/dashboard/tests/${PROJECT_ID}`,
      tests: tests.slice(0, 5).map((t: Record<string, unknown>) => ({
        name: t.name,
        status: t.status,
        steps: t.planStepCount,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'TestSprite API unreachable', health: 0, total: 0, passed: 0, failed: 0, running: 0, blocked: 0 },
      { status: 200 }
    )
  }
}
