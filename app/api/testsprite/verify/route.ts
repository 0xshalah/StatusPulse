import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as M from '@/lib/monitor'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { endpointId, url } = await request.json()
    if (!endpointId || !url) {
      return NextResponse.json({ error: 'endpointId and url required' }, { status: 400 })
    }

    // Verify endpoint exists
    const db = await M.connect()
    const ep = await db.collection('endpoints').findOne({ id: endpointId })
    if (!ep) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    const plan = {
      projectId: 'dc688ee6-3d53-4cd9-a8a2-21229ef20a01',
      type: 'frontend',
      name: `Deep Verify: ${ep.name}`,
      description: `Auto-generated deep verification for ${url}`,
      planSteps: [
        { type: 'action', action: 'navigate', url, description: `Navigate to ${url}` },
        { type: 'assertion', assertion: 'visible', selector: 'body', description: 'Page body is rendered' },
      ],
    }

    const planPath = `/tmp/plan-${endpointId.slice(0, 8)}.json`
    const { writeFileSync, unlinkSync } = await import('fs')
    writeFileSync(planPath, JSON.stringify(plan))

    try {
      const { stdout, stderr } = await execAsync(
        `testsprite test create --plan-from "${planPath}" --run --wait --output json`,
        { timeout: 120000, env: { ...process.env, TESTSPRITE_API_KEY: process.env.TESTSPRITE_API_KEY || '' } }
      )

      unlinkSync(planPath)
      const result = JSON.parse(stdout)

      return NextResponse.json({
        verified: true,
        testId: result.testId,
        status: result.run?.status || 'unknown',
        failedStepIndex: result.run?.failedStepIndex,
        failureKind: result.run?.failureKind,
        dashboardUrl: result.run?.dashboardUrl || result.dashboardUrl,
        stepSummary: result.run?.stepSummary,
      })
    } catch (execError) {
      try { unlinkSync(planPath) } catch {}
      // If CLI not available, return graceful degradation
      return NextResponse.json({
        verified: false,
        reason: 'CLI unavailable',
        hint: 'Run manually: testsprite test create --plan-from plan.json --run --wait',
        dashboardUrl: `https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01`,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
