import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, engine, scenario } = body as {
      modelId?: string
      engine?: string
      scenario?: string
    }

    // Build filter conditions for benchmark tasks
    const taskWhere: Record<string, unknown> = { status: 'completed' }
    if (modelId) {
      taskWhere.modelId = modelId
    }
    if (engine) {
      taskWhere.model = { engine }
    }
    if (scenario) {
      taskWhere.scenario = scenario
    }

    // Query benchmark results with filters
    const results = await db.benchmarkResult.findMany({
      where: {
        task: taskWhere,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            scenario: true,
            concurrency: true,
            model: {
              select: {
                id: true,
                name: true,
                engine: true,
              },
            },
          },
        },
      },
    })

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalTests: 0,
            avgThroughput: 0,
            avgLatency: 0,
            bestThroughput: 0,
            bestLatency: 0,
            gradeDistribution: { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
          },
          results: [],
          comparison: {
            vllm: { avgThroughput: 0, avgLatency: 0, count: 0 },
            sglang: { avgThroughput: 0, avgLatency: 0, count: 0 },
          },
          generatedAt: new Date().toISOString(),
          filters: { modelId: modelId ?? null, engine: engine ?? null, scenario: scenario ?? null },
        },
      })
    }

    // ─── Summary Calculations ────────────────────────────────────────

    const totalTests = results.length
    const avgThroughput =
      results.reduce((sum, r) => sum + r.throughputTokensPerSec, 0) / totalTests
    const avgLatency =
      results.reduce((sum, r) => sum + r.latencyP99Ms, 0) / totalTests
    const bestThroughput = Math.max(...results.map((r) => r.throughputTokensPerSec))
    const bestLatency = Math.min(...results.map((r) => r.latencyP99Ms))

    // ─── Grade Distribution ──────────────────────────────────────────
    // Simple grading logic matching the performance-score module

    function scoreToGrade(
      throughput: number,
      latencyP99: number,
      ttft: number,
      tpot: number,
      errorRate: number
    ): string {
      function throughputGrade(t: number): number {
        if (t > 5000) return 97
        if (t > 3000) return 85
        if (t > 1500) return 75
        if (t > 800) return 60
        if (t > 400) return 40
        return 20
      }
      function latencyGrade(l: number): number {
        if (l < 200) return 97
        if (l < 500) return 85
        if (l < 1000) return 75
        if (l < 2000) return 60
        if (l < 5000) return 40
        return 20
      }
      function ttftGrade(t: number): number {
        if (t < 50) return 97
        if (t < 100) return 85
        if (t < 200) return 75
        if (t < 500) return 60
        if (t < 1000) return 40
        return 20
      }
      function tpotGrade(t: number): number {
        if (t < 10) return 97
        if (t < 20) return 85
        if (t < 40) return 75
        if (t < 80) return 60
        if (t < 150) return 40
        return 20
      }
      function reliabilityGrade(e: number): number {
        if (e < 0.1) return 97
        if (e < 0.5) return 85
        if (e < 1) return 75
        if (e < 3) return 60
        if (e < 5) return 40
        return 20
      }

      const overallScore =
        throughputGrade(throughput) * 0.3 +
        latencyGrade(latencyP99) * 0.25 +
        ttftGrade(ttft) * 0.2 +
        tpotGrade(tpot) * 0.15 +
        reliabilityGrade(errorRate) * 0.1

      if (overallScore >= 93) return 'A+'
      if (overallScore >= 80) return 'A'
      if (overallScore >= 65) return 'B'
      if (overallScore >= 50) return 'C'
      if (overallScore >= 30) return 'D'
      return 'F'
    }

    const gradeDistribution: Record<string, number> = {
      'A+': 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    }

    for (const r of results) {
      const grade = scoreToGrade(
        r.throughputTokensPerSec,
        r.latencyP99Ms,
        r.timeToFirstTokenMs,
        r.timePerOutputTokenMs,
        r.errorRate
      )
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1
    }

    // ─── Results Array ───────────────────────────────────────────────

    const resultsSummary = results.map((r) => {
      const modelName = r.task?.model?.name ?? 'Unknown'
      const modelEngine = (r.task?.model?.engine ?? 'vllm') as string
      const taskScenario = (r.task?.scenario ?? 'serving') as string

      return {
        model: modelName,
        engine: modelEngine,
        scenario: taskScenario,
        throughput: r.throughputTokensPerSec,
        latency: r.latencyP99Ms,
        ttft: r.timeToFirstTokenMs,
        tpot: r.timePerOutputTokenMs,
        grade: scoreToGrade(
          r.throughputTokensPerSec,
          r.latencyP99Ms,
          r.timeToFirstTokenMs,
          r.timePerOutputTokenMs,
          r.errorRate
        ),
      }
    })

    // ─── Engine Comparison ───────────────────────────────────────────

    const vllmResults = results.filter((r) => r.task?.model?.engine === 'vllm')
    const sglangResults = results.filter((r) => r.task?.model?.engine === 'sglang')

    const vllmAvgThroughput =
      vllmResults.length > 0
        ? vllmResults.reduce((s, r) => s + r.throughputTokensPerSec, 0) / vllmResults.length
        : 0
    const vllmAvgLatency =
      vllmResults.length > 0
        ? vllmResults.reduce((s, r) => s + r.latencyP99Ms, 0) / vllmResults.length
        : 0
    const sglangAvgThroughput =
      sglangResults.length > 0
        ? sglangResults.reduce((s, r) => s + r.throughputTokensPerSec, 0) / sglangResults.length
        : 0
    const sglangAvgLatency =
      sglangResults.length > 0
        ? sglangResults.reduce((s, r) => s + r.latencyP99Ms, 0) / sglangResults.length
        : 0

    // ─── Response ────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTests,
          avgThroughput: Math.round(avgThroughput * 100) / 100,
          avgLatency: Math.round(avgLatency * 100) / 100,
          bestThroughput: Math.round(bestThroughput * 100) / 100,
          bestLatency: Math.round(bestLatency * 100) / 100,
          gradeDistribution,
        },
        results: resultsSummary,
        comparison: {
          vllm: {
            avgThroughput: Math.round(vllmAvgThroughput * 100) / 100,
            avgLatency: Math.round(vllmAvgLatency * 100) / 100,
            count: vllmResults.length,
          },
          sglang: {
            avgThroughput: Math.round(sglangAvgThroughput * 100) / 100,
            avgLatency: Math.round(sglangAvgLatency * 100) / 100,
            count: sglangResults.length,
          },
        },
        generatedAt: new Date().toISOString(),
        filters: {
          modelId: modelId ?? null,
          engine: engine ?? null,
          scenario: scenario ?? null,
        },
      },
    })
  } catch (error) {
    console.error('Error generating report export:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report export' },
      { status: 500 }
    )
  }
}
