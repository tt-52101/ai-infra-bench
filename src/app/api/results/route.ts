import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    const where: Record<string, unknown> = {}
    if (taskId) where.taskId = taskId

    const results = await db.benchmarkResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            scenario: true,
            model: { select: { id: true, name: true, engine: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch results' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      )
    }

    const result = await db.benchmarkResult.create({
      data: {
        taskId: body.taskId,
        throughputTokensPerSec: body.throughputTokensPerSec ?? 0,
        throughputRequestsPerSec: body.throughputRequestsPerSec ?? 0,
        latencyMeanMs: body.latencyMeanMs ?? 0,
        latencyP50Ms: body.latencyP50Ms ?? 0,
        latencyP90Ms: body.latencyP90Ms ?? 0,
        latencyP99Ms: body.latencyP99Ms ?? 0,
        timeToFirstTokenMs: body.timeToFirstTokenMs ?? 0,
        timePerOutputTokenMs: body.timePerOutputTokenMs ?? 0,
        gpuMemoryUsedGb: body.gpuMemoryUsedGb ?? 0,
        gpuUtilization: body.gpuUtilization ?? 0,
        cpuUtilization: body.cpuUtilization ?? 0,
        errorRate: body.errorRate ?? 0,
        totalRequests: body.totalRequests ?? 0,
        successRequests: body.successRequests ?? 0,
        failedRequests: body.failedRequests ?? 0,
        detailJson: body.detailJson ?? '{}',
      },
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating result:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create result' },
      { status: 500 }
    )
  }
}
