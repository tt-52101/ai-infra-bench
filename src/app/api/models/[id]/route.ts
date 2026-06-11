import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const model = await db.model.findUnique({
      where: { id },
      include: {
        parameterProfiles: true,
        benchmarks: {
          include: { results: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { benchmarks: true, parameterProfiles: true },
        },
      },
    })

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: model })
  } catch (error) {
    console.error('Error fetching model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model' },
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

    const existing = await db.model.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      )
    }

    const model = await db.model.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.engine !== undefined && { engine: body.engine }),
        ...(body.modelPath !== undefined && { modelPath: body.modelPath }),
        ...(body.version !== undefined && { version: body.version }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.gpuType !== undefined && { gpuType: body.gpuType }),
        ...(body.gpuCount !== undefined && { gpuCount: body.gpuCount }),
        ...(body.maxSeqLen !== undefined && { maxSeqLen: body.maxSeqLen }),
        ...(body.dtype !== undefined && { dtype: body.dtype }),
        ...(body.tensorParallelSize !== undefined && { tensorParallelSize: body.tensorParallelSize }),
        ...(body.pipelineParallelSize !== undefined && { pipelineParallelSize: body.pipelineParallelSize }),
      },
    })

    return NextResponse.json({ success: true, data: model })
  } catch (error) {
    console.error('Error updating model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update model' },
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

    const existing = await db.model.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      )
    }

    await db.model.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete model' },
      { status: 500 }
    )
  }
}
