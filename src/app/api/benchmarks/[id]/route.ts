import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const benchmark = await db.benchmarkTask.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, name: true, engine: true },
        },
        profile: {
          select: { id: true, name: true, engine: true },
        },
        results: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!benchmark) {
      return NextResponse.json(
        { success: false, error: 'Benchmark not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: benchmark })
  } catch (error) {
    console.error('Error fetching benchmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch benchmark' },
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

    const existing = await db.benchmarkTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Benchmark not found' },
        { status: 404 }
      )
    }

    const benchmark = await db.benchmarkTask.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.scenario !== undefined && { scenario: body.scenario }),
        ...(body.numRequests !== undefined && { numRequests: body.numRequests }),
        ...(body.inputTokens !== undefined && { inputTokens: body.inputTokens }),
        ...(body.outputTokens !== undefined && { outputTokens: body.outputTokens }),
        ...(body.concurrency !== undefined && { concurrency: body.concurrency }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.progress !== undefined && { progress: body.progress }),
        ...(body.startedAt !== undefined && { startedAt: body.startedAt }),
        ...(body.completedAt !== undefined && { completedAt: body.completedAt }),
      },
    })

    return NextResponse.json({ success: true, data: benchmark })
  } catch (error) {
    console.error('Error updating benchmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update benchmark' },
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

    const existing = await db.benchmarkTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Benchmark not found' },
        { status: 404 }
      )
    }

    await db.benchmarkTask.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting benchmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete benchmark' },
      { status: 500 }
    )
  }
}
