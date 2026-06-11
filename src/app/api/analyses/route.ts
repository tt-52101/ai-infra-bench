import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const dimension = searchParams.get('dimension')

    const where: Record<string, unknown> = {}
    if (modelId) where.modelId = modelId
    if (dimension) where.dimension = dimension

    const analyses = await db.inflectionAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: analyses })
  } catch (error) {
    console.error('Error fetching analyses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.modelId || !body.engine || !body.dimension) {
      return NextResponse.json(
        { success: false, error: 'modelId, engine, and dimension are required' },
        { status: 400 }
      )
    }

    const analysis = await db.inflectionAnalysis.create({
      data: {
        modelId: body.modelId,
        engine: body.engine,
        dimension: body.dimension,
        inflectionPoint: body.inflectionPoint ?? 0,
        optimalValue: body.optimalValue ?? 0,
        performanceGain: body.performanceGain ?? 0,
        analysisJson: body.analysisJson ?? '{}',
        status: body.status ?? 'pending',
      },
    })

    return NextResponse.json({ success: true, data: analysis }, { status: 201 })
  } catch (error) {
    console.error('Error creating analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create analysis' },
      { status: 500 }
    )
  }
}
