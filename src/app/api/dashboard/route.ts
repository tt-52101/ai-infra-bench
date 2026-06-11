import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalModels,
      activeModels,
      totalBenchmarks,
      runningBenchmarks,
      completedBenchmarks,
      failedBenchmarks,
      allResults,
    ] = await Promise.all([
      db.model.count(),
      db.model.count({ where: { status: 'active' } }),
      db.benchmarkTask.count(),
      db.benchmarkTask.count({ where: { status: 'running' } }),
      db.benchmarkTask.count({ where: { status: 'completed' } }),
      db.benchmarkTask.count({ where: { status: 'failed' } }),
      db.benchmarkResult.findMany({
        where: { task: { status: 'completed' } },
        select: {
          throughputTokensPerSec: true,
          latencyMeanMs: true,
        },
      }),
    ])

    const avgThroughput =
      allResults.length > 0
        ? allResults.reduce((sum, r) => sum + r.throughputTokensPerSec, 0) / allResults.length
        : 0

    const avgLatency =
      allResults.length > 0
        ? allResults.reduce((sum, r) => sum + r.latencyMeanMs, 0) / allResults.length
        : 0

    return NextResponse.json({
      success: true,
      data: {
        totalModels,
        activeModels,
        totalBenchmarks,
        runningBenchmarks,
        completedBenchmarks,
        failedBenchmarks,
        avgThroughput: Math.round(avgThroughput * 100) / 100,
        avgLatency: Math.round(avgLatency * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
