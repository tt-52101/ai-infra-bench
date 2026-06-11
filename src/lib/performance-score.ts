// Performance grades based on industry-standard benchmarks for inference engines
// Scores are based on throughput (tokens/s), latency P99 (ms), TTFT (ms), TPOT (ms), error rate

export interface PerformanceScore {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  score: number // 0-100
  label: string
  color: string // tailwind text color class
  bgColor: string // tailwind bg color class
  description: string
}

export interface ScoreBreakdown {
  overall: PerformanceScore
  throughput: PerformanceScore
  latency: PerformanceScore
  ttft: PerformanceScore
  tpot: PerformanceScore
  reliability: PerformanceScore
}

// ─── Grade Definitions ──────────────────────────────────────────────

const GRADE_MAP: Record<PerformanceScore['grade'], Omit<PerformanceScore, 'grade' | 'score'>> = {
  'A+': {
    label: 'Exceptional',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    description: 'Industry-leading performance across all metrics',
  },
  'A': {
    label: 'Excellent',
    color: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Outstanding performance with minor room for improvement',
  },
  'B': {
    label: 'Good',
    color: 'text-sky-500 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    description: 'Solid performance meeting most production requirements',
  },
  'C': {
    label: 'Fair',
    color: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    description: 'Acceptable performance but optimization recommended',
  },
  'D': {
    label: 'Poor',
    color: 'text-orange-500 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    description: 'Below-average performance requiring attention',
  },
  'F': {
    label: 'Critical',
    color: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    description: 'Unacceptable performance requiring immediate action',
  },
}

// ─── Scoring Helpers ────────────────────────────────────────────────

function makeScore(grade: PerformanceScore['grade'], score: number): PerformanceScore {
  return {
    grade,
    score,
    ...GRADE_MAP[grade],
  }
}

// Convert a grade to a numeric score for weighted averaging
function gradeToScore(grade: PerformanceScore['grade']): number {
  switch (grade) {
    case 'A+': return 97
    case 'A': return 88
    case 'B': return 75
    case 'C': return 60
    case 'D': return 40
    case 'F': return 20
  }
}

function scoreToGrade(score: number): PerformanceScore['grade'] {
  if (score >= 93) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

// ─── Individual Metric Scoring ──────────────────────────────────────

function scoreThroughput(throughput: number): PerformanceScore {
  if (throughput > 5000) return makeScore('A+', 97)
  if (throughput > 3000) return makeScore('A', 85 + (throughput - 3000) / 2000 * 12)
  if (throughput > 1500) return makeScore('B', 65 + (throughput - 1500) / 1500 * 20)
  if (throughput > 800) return makeScore('C', 50 + (throughput - 800) / 700 * 15)
  if (throughput > 400) return makeScore('D', 30 + (throughput - 400) / 400 * 20)
  return makeScore('F', Math.max(5, 30 * throughput / 400))
}

function scoreLatency(latencyP99: number): PerformanceScore {
  if (latencyP99 < 200) return makeScore('A+', 97)
  if (latencyP99 < 500) return makeScore('A', 85 + (500 - latencyP99) / 300 * 12)
  if (latencyP99 < 1000) return makeScore('B', 65 + (1000 - latencyP99) / 500 * 20)
  if (latencyP99 < 2000) return makeScore('C', 50 + (2000 - latencyP99) / 1000 * 15)
  if (latencyP99 < 5000) return makeScore('D', 30 + (5000 - latencyP99) / 3000 * 20)
  return makeScore('F', Math.max(5, 30 * Math.max(0, 10000 - latencyP99) / 5000))
}

function scoreTTFT(ttft: number): PerformanceScore {
  if (ttft < 50) return makeScore('A+', 97)
  if (ttft < 100) return makeScore('A', 85 + (100 - ttft) / 50 * 12)
  if (ttft < 200) return makeScore('B', 65 + (200 - ttft) / 100 * 20)
  if (ttft < 500) return makeScore('C', 50 + (500 - ttft) / 300 * 15)
  if (ttft < 1000) return makeScore('D', 30 + (1000 - ttft) / 500 * 20)
  return makeScore('F', Math.max(5, 30 * Math.max(0, 2000 - ttft) / 1000))
}

function scoreTPOT(tpot: number): PerformanceScore {
  if (tpot < 10) return makeScore('A+', 97)
  if (tpot < 20) return makeScore('A', 85 + (20 - tpot) / 10 * 12)
  if (tpot < 40) return makeScore('B', 65 + (40 - tpot) / 20 * 20)
  if (tpot < 80) return makeScore('C', 50 + (80 - tpot) / 40 * 15)
  if (tpot < 150) return makeScore('D', 30 + (150 - tpot) / 70 * 20)
  return makeScore('F', Math.max(5, 30 * Math.max(0, 300 - tpot) / 150))
}

function scoreReliability(errorRate: number): PerformanceScore {
  // errorRate is a percentage (e.g., 0.5 means 0.5%)
  if (errorRate < 0.1) return makeScore('A+', 97)
  if (errorRate < 0.5) return makeScore('A', 85 + (0.5 - errorRate) / 0.4 * 12)
  if (errorRate < 1) return makeScore('B', 65 + (1 - errorRate) / 0.5 * 20)
  if (errorRate < 3) return makeScore('C', 50 + (3 - errorRate) / 2 * 15)
  if (errorRate < 5) return makeScore('D', 30 + (5 - errorRate) / 2 * 20)
  return makeScore('F', Math.max(5, 30 * Math.max(0, 10 - errorRate) / 5))
}

// ─── Main Calculation ───────────────────────────────────────────────

export function calculateScore(metrics: {
  throughput: number
  latencyP99: number
  ttft: number
  tpot: number
  errorRate: number
}): ScoreBreakdown {
  const throughput = scoreThroughput(metrics.throughput)
  const latency = scoreLatency(metrics.latencyP99)
  const ttft = scoreTTFT(metrics.ttft)
  const tpot = scoreTPOT(metrics.tpot)
  const reliability = scoreReliability(metrics.errorRate)

  // Weighted average: throughput 30%, latency 25%, TTFT 20%, TPOT 15%, reliability 10%
  const overallScore =
    gradeToScore(throughput.grade) * 0.30 +
    gradeToScore(latency.grade) * 0.25 +
    gradeToScore(ttft.grade) * 0.20 +
    gradeToScore(tpot.grade) * 0.15 +
    gradeToScore(reliability.grade) * 0.10

  const overallGrade = scoreToGrade(overallScore)

  return {
    overall: makeScore(overallGrade, Math.round(overallScore * 10) / 10),
    throughput,
    latency,
    ttft,
    tpot,
    reliability,
  }
}

// ─── Utility: Get grade color for a single grade string ─────────────

export function getGradeStyle(grade: PerformanceScore['grade']): { color: string; bgColor: string } {
  const info = GRADE_MAP[grade]
  return { color: info.color, bgColor: info.bgColor }
}
