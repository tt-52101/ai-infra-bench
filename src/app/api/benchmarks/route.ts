import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const modelId = searchParams.get('modelId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (modelId) where.modelId = modelId

    const benchmarks = await db.benchmarkTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, engine: true },
        },
        profile: {
          select: { id: true, name: true, engine: true },
        },
        results: true,
      },
    })

    return NextResponse.json({ success: true, data: benchmarks })
  } catch (error) {
    console.error('Error fetching benchmarks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch benchmarks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.modelId || !body.profileId || !body.scenario) {
      return NextResponse.json(
        { success: false, error: 'name, modelId, profileId, and scenario are required' },
        { status: 400 }
      )
    }

    const benchmark = await db.benchmarkTask.create({
      data: {
        name: body.name,
        modelId: body.modelId,
        profileId: body.profileId,
        scenario: body.scenario,
        numRequests: body.numRequests ?? 100,
        inputTokens: body.inputTokens ?? 128,
        outputTokens: body.outputTokens ?? 128,
        concurrency: body.concurrency ?? 1,
        duration: body.duration ?? 60,
        status: body.status ?? 'pending',
        progress: body.progress ?? 0,
        startedAt: body.startedAt ?? null,
        completedAt: body.completedAt ?? null,
      },
    })

    return NextResponse.json({ success: true, data: benchmark }, { status: 201 })
  } catch (error) {
    console.error('Error creating benchmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create benchmark' },
      { status: 500 }
    )
  }
}
