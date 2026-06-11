import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const analysis = await db.inflectionAnalysis.findUnique({
      where: { id },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis' },
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

    const existing = await db.inflectionAnalysis.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    const analysis = await db.inflectionAnalysis.update({
      where: { id },
      data: {
        ...(body.engine !== undefined && { engine: body.engine }),
        ...(body.dimension !== undefined && { dimension: body.dimension }),
        ...(body.inflectionPoint !== undefined && { inflectionPoint: body.inflectionPoint }),
        ...(body.optimalValue !== undefined && { optimalValue: body.optimalValue }),
        ...(body.performanceGain !== undefined && { performanceGain: body.performanceGain }),
        ...(body.analysisJson !== undefined && { analysisJson: body.analysisJson }),
        ...(body.status !== undefined && { status: body.status }),
      },
    })

    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error('Error updating analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update analysis' },
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

    const existing = await db.inflectionAnalysis.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      )
    }

    await db.inflectionAnalysis.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete analysis' },
      { status: 500 }
    )
  }
}
