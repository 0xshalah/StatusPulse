import { NextRequest, NextResponse } from 'next/server'
import * as M from '@/lib/monitor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpointId = searchParams.get('endpointId')
    const url = searchParams.get('url')

    if (!endpointId || !url) {
      return NextResponse.json({ error: 'endpointId and url required' }, { status: 400 })
    }

    const db = await M.connect()
    const ep = await db.collection('endpoints').findOne({ id: endpointId })
    if (!ep) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }

    // Return TestSprite project context — ready for CLI verification
    return NextResponse.json({
      verified: false,
      projectId: 'dc688ee6-3d53-4cd9-a8a2-21229ef20a01',
      endpoint: { name: ep.name, url: ep.url },
      dashboardUrl: `https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01`,
      cliCommand: `testsprite test create --project dc688ee6-3d53-4cd9-a8a2-21229ef20a01 --type frontend --name "Verify ${ep.name}" --plan-from plan.json --run --wait --output json`,
      planTemplate: {
        projectId: 'dc688ee6-3d53-4cd9-a8a2-21229ef20a01',
        type: 'frontend',
        name: `Deep Verify: ${ep.name}`,
        planSteps: [
          { type: 'action', action: 'navigate', url, description: `Navigate to ${url}` },
          { type: 'assertion', assertion: 'visible', selector: 'body', description: 'Page body is rendered' },
        ],
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
