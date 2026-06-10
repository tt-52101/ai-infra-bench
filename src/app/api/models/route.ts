import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const engine = searchParams.get('engine')
    const status = searchParams.get('status')

    const where: Record<string, string> = {}
    if (engine) where.engine = engine
    if (status) where.status = status

    const models = await db.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { benchmarks: true, parameterProfiles: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: models })
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.engine || !body.modelPath) {
      return NextResponse.json(
        { success: false, error: 'name, engine, and modelPath are required' },
        { status: 400 }
      )
    }

    const model = await db.model.create({
      data: {
        name: body.name,
        engine: body.engine,
        modelPath: body.modelPath,
        version: body.version ?? '1.0.0',
        status: body.status ?? 'inactive',
        description: body.description ?? '',
        gpuType: body.gpuType ?? '',
        gpuCount: body.gpuCount ?? 1,
        maxSeqLen: body.maxSeqLen ?? 4096,
        dtype: body.dtype ?? 'auto',
        tensorParallelSize: body.tensorParallelSize ?? 1,
        pipelineParallelSize: body.pipelineParallelSize ?? 1,
      },
    })

    return NextResponse.json({ success: true, data: model }, { status: 201 })
  } catch (error) {
    console.error('Error creating model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create model' },
      { status: 500 }
    )
  }
}
