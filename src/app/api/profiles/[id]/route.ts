import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await db.parameterProfile.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, name: true, engine: true },
        },
        benchmarks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.parameterProfile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profile = await db.parameterProfile.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.engine !== undefined && { engine: body.engine }),
        ...(body.maxModelLen !== undefined && { maxModelLen: body.maxModelLen }),
        ...(body.gpuMemoryUtil !== undefined && { gpuMemoryUtil: body.gpuMemoryUtil }),
        ...(body.maxNumSeqs !== undefined && { maxNumSeqs: body.maxNumSeqs }),
        ...(body.maxNumBatchedTokens !== undefined && { maxNumBatchedTokens: body.maxNumBatchedTokens }),
        ...(body.swapSpace !== undefined && { swapSpace: body.swapSpace }),
        ...(body.blockSize !== undefined && { blockSize: body.blockSize }),
        ...(body.quantization !== undefined && { quantization: body.quantization }),
        ...(body.enforceEager !== undefined && { enforceEager: body.enforceEager }),
        ...(body.enablePrefixCaching !== undefined && { enablePrefixCaching: body.enablePrefixCaching }),
        ...(body.enableChunkedPrefill !== undefined && { enableChunkedPrefill: body.enableChunkedPrefill }),
        ...(body.memFractionStatic !== undefined && { memFractionStatic: body.memFractionStatic }),
        ...(body.chunkPrefillSize !== undefined && { chunkPrefillSize: body.chunkPrefillSize }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        ...(body.topP !== undefined && { topP: body.topP }),
        ...(body.topK !== undefined && { topK: body.topK }),
        ...(body.repetitionPenalty !== undefined && { repetitionPenalty: body.repetitionPenalty }),
        ...(body.isPreset !== undefined && { isPreset: body.isPreset }),
        ...(body.description !== undefined && { description: body.description }),
      },
    })

    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.parameterProfile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    await db.parameterProfile.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}
