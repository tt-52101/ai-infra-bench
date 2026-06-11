import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const engine = searchParams.get('engine')

    const where: Record<string, unknown> = {}
    if (modelId) where.modelId = modelId
    if (engine) where.engine = engine

    const profiles = await db.parameterProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, engine: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: profiles })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.modelId || !body.engine) {
      return NextResponse.json(
        { success: false, error: 'name, modelId, and engine are required' },
        { status: 400 }
      )
    }

    const profile = await db.parameterProfile.create({
      data: {
        name: body.name,
        modelId: body.modelId,
        engine: body.engine,
        maxModelLen: body.maxModelLen ?? 4096,
        gpuMemoryUtil: body.gpuMemoryUtil ?? 0.9,
        maxNumSeqs: body.maxNumSeqs ?? 256,
        maxNumBatchedTokens: body.maxNumBatchedTokens ?? 8192,
        swapSpace: body.swapSpace ?? 4,
        blockSize: body.blockSize ?? 16,
        quantization: body.quantization ?? '',
        enforceEager: body.enforceEager ?? false,
        enablePrefixCaching: body.enablePrefixCaching ?? false,
        enableChunkedPrefill: body.enableChunkedPrefill ?? false,
        memFractionStatic: body.memFractionStatic ?? 0.88,
        chunkPrefillSize: body.chunkPrefillSize ?? 8192,
        temperature: body.temperature ?? 0.7,
        topP: body.topP ?? 0.9,
        topK: body.topK ?? -1,
        repetitionPenalty: body.repetitionPenalty ?? 1.0,
        isPreset: body.isPreset ?? false,
        description: body.description ?? '',
      },
    })

    return NextResponse.json({ success: true, data: profile }, { status: 201 })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
