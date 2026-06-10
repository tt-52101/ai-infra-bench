'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ScatterChart, Scatter, Cell, ComposedChart,
} from 'recharts'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp, Clock, BarChart3, Download,
  ArrowUp, Activity, Search,
  ChevronDown, ChevronUp, Trophy, FileText, FileJson, Clipboard,
  Loader2, AlertCircle, Scale, Cpu, HardDrive, Zap, FileDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip as UITooltip, TooltipTrigger as UITooltipTrigger, TooltipContent as UITooltipContent } from '@/components/ui/tooltip'
import { useResults, useBenchmarks, useModels } from '@/hooks/use-api'
import type { EngineType, BenchmarkScenario, BenchmarkResultInfo, BenchmarkTaskInfo } from '@/lib/types'
import { CustomChartTooltip, type TooltipEntry } from '@/components/ui/custom-chart-tooltip'
import { EnhancedReportsThroughputTooltip, EnhancedScatterTooltip, EnhancedReportsLatencyTooltip, EnhancedReportsTtftTpotTooltip, useChartHighlight, HighlightCard } from '@/components/ui/enhanced-chart-tooltip'
import { calculateScore, getGradeStyle, type ScoreBreakdown } from '@/lib/performance-score'
import { generateReportHTML, fetchReportData, openReportPrintWindow } from '@/lib/generate-report-html'

// ─── Color Constants ─────────────────────────────────────────────
const VLLM_COLOR = '#10b981'   // emerald-500
const SGLANG_COLOR = '#f59e0b' // amber-500

// ─── Extended API Types ──────────────────────────────────────────
// The benchmarks API returns nested model/profile/results objects
interface BenchmarkWithRelations extends BenchmarkTaskInfo {
  model: { id: string; name: string; engine: EngineType }
  profile: { id: string; name: string; engine: EngineType }
  results: BenchmarkResultInfo[]
}

// The results API returns nested task with model
interface ResultWithTask extends BenchmarkResultInfo {
  task: {
    id: string
    name: string
    scenario: BenchmarkScenario
    concurrency: number
    model: { id: string; name: string; engine: EngineType }
  }
}

// Flat report result used by charts and tables (replaces MockResult)
interface ReportResult {
  id: string
  model: string
  engine: EngineType
  scenario: BenchmarkScenario
  throughputTokensPerSec: number
  throughputRequestsPerSec: number
  latencyMeanMs: number
  latencyP50Ms: number
  latencyP90Ms: number
  latencyP99Ms: number
  ttftMs: number
  tpotMs: number
  gpuMemGb: number
  gpuUtil: number
  cpuUtil: number
  errorRate: number
  concurrency: number
  totalRequests: number
  createdAt: string
}

// ─── Custom Tooltip Components ───────────────────────────────────
function ThroughputTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const entries: TooltipEntry[] = payload.map((p) => ({
    label: p.dataKey === 'vllm' ? 'VLLM' : 'SGLang',
    color: p.dataKey === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
    value: p.value.toLocaleString(),
    unit: 'tok/s',
  }))
  return (
    <CustomChartTooltip
      active={active}
      payload={payload as Array<{ value: number; dataKey: string; color: string; name: string; payload: Record<string, unknown> }>}
      label={label}
      entries={entries}
      showClickHint
    />
  )
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ReportResult }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const entries: TooltipEntry[] = [
    { label: d.engine === 'vllm' ? 'VLLM' : 'SGLang', color: d.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR, value: d.throughputTokensPerSec.toLocaleString(), unit: 'tok/s' },
    { label: 'Latency P99', color: '#ef4444', value: String(d.latencyP99Ms), unit: 'ms' },
    { label: 'Concurrency', color: '#94a3b8', value: String(d.concurrency) },
  ]
  return (
    <CustomChartTooltip
      active={active}
      payload={[]}
      label={d.model}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Performance Color Helper ────────────────────────────────────
function getPerformanceColor(value: number, metric: 'throughput' | 'latency' | 'gpu' | 'error'): string {
  if (metric === 'throughput') {
    if (value > 5000) return 'text-emerald-600'
    if (value > 2000) return 'text-yellow-600'
    return 'text-red-500'
  }
  if (metric === 'latency') {
    if (value < 50) return 'text-emerald-600'
    if (value < 120) return 'text-yellow-600'
    return 'text-red-500'
  }
  if (metric === 'gpu') {
    if (value > 90) return 'text-emerald-600'
    if (value > 70) return 'text-yellow-600'
    return 'text-red-500'
  }
  if (metric === 'error') {
    if (value === 0) return 'text-emerald-600'
    if (value < 0.3) return 'text-yellow-600'
    return 'text-red-500'
  }
  return ''
}

// ─── Loading Skeleton ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg animate-shimmer w-9 h-9" />
          <div className="space-y-2 flex-1">
            <div className="h-3 animate-shimmer rounded w-20" />
            <div className="h-6 animate-shimmer rounded w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 animate-shimmer rounded w-40" />
        <div className="h-4 animate-shimmer rounded w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-[400px] animate-shimmer rounded flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export default function ReportsPage() {
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [engineFilter, setEngineFilter] = useState<string>('all')
  const [scenarioFilter, setScenarioFilter] = useState<string>('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string>('throughputTokensPerSec')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')

  // Click-to-highlight state for charts
  const throughputHighlight = useChartHighlight()
  const latencyHighlight = useChartHighlight()
  const scatterHighlight = useChartHighlight()
  const ttftHighlight = useChartHighlight()

  // ─── API Data ────────────────────────────────────────────────
  const { data: resultsRaw, loading: resultsLoading, error: resultsError } = useResults()
  const { data: benchmarksRaw, loading: benchmarksLoading } = useBenchmarks()
  const { data: models } = useModels()

  const isLoading = resultsLoading || benchmarksLoading

  // Build a map from taskId → task info (for concurrency, scenario, model name, engine)
  const taskMap = useMemo(() => {
    const map = new Map<string, {
      scenario: BenchmarkScenario
      concurrency: number
      modelName: string
      engine: EngineType
    }>()
    if (!benchmarksRaw) return map
    for (const task of benchmarksRaw as BenchmarkWithRelations[]) {
      const modelName = task.model?.name ?? task.modelName ?? 'Unknown'
      const engine = task.model?.engine ?? task.engine ?? 'vllm'
      map.set(task.id, {
        scenario: task.scenario,
        concurrency: task.concurrency,
        modelName,
        engine,
      })
    }
    return map
  }, [benchmarksRaw])

  // Transform API results to flat ReportResult structure
  const reportResults: ReportResult[] = useMemo(() => {
    if (!resultsRaw) return []
    const mapped: ReportResult[] = []
    for (const r of resultsRaw as ResultWithTask[]) {
      // Try to get task info from the nested task object in the result response first
      const taskInfo = r.task
        ? {
            scenario: r.task.scenario ?? 'serving',
            concurrency: r.task.concurrency ?? 1,
            modelName: r.task.model?.name ?? 'Unknown',
            engine: r.task.model?.engine ?? 'vllm' as EngineType,
          }
        : taskMap.get(r.taskId)

      // If no task info from either source, use defaults
      const scenario = taskInfo?.scenario ?? 'serving'
      const concurrency = taskInfo?.concurrency ?? 1
      const modelName = taskInfo?.modelName ?? 'Unknown'
      const engine = taskInfo?.engine ?? 'vllm'

      mapped.push({
        id: r.id,
        model: modelName,
        engine,
        scenario,
        throughputTokensPerSec: r.throughputTokensPerSec,
        throughputRequestsPerSec: r.throughputRequestsPerSec,
        latencyMeanMs: r.latencyMeanMs,
        latencyP50Ms: r.latencyP50Ms,
        latencyP90Ms: r.latencyP90Ms,
        latencyP99Ms: r.latencyP99Ms,
        ttftMs: r.timeToFirstTokenMs,
        tpotMs: r.timePerOutputTokenMs,
        gpuMemGb: r.gpuMemoryUsedGb,
        gpuUtil: r.gpuUtilization,
        cpuUtil: r.cpuUtilization,
        errorRate: r.errorRate,
        concurrency,
        totalRequests: r.totalRequests,
        createdAt: r.createdAt,
      })
    }
    return mapped
  }, [resultsRaw, taskMap])

  // Unique model names from API data for filter dropdown
  const modelNames = useMemo(() => {
    const names = new Set<string>()
    if (models) {
      for (const m of models) names.add(m.name)
    }
    // Also add from results in case models list is empty
    for (const r of reportResults) names.add(r.model)
    return Array.from(names).sort()
  }, [models, reportResults])

  // Filtered data
  const filtered = useMemo(() => {
    return reportResults.filter((r) => {
      if (modelFilter !== 'all' && r.model !== modelFilter) return false
      if (engineFilter !== 'all' && r.engine !== engineFilter) return false
      if (scenarioFilter !== 'all' && r.scenario !== scenarioFilter) return false
      return true
    })
  }, [reportResults, modelFilter, engineFilter, scenarioFilter])

  // Sorted data for table
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortCol] as number
      const bVal = (b as Record<string, unknown>)[sortCol] as number
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [filtered, sortCol, sortDir])

  // ─── Chart Data ───────────────────────────────────────────────
  const throughputComparisonData = useMemo(() => {
    const modelMap = new Map<string, { vllm: number; sglang: number }>()
    filtered.forEach((r) => {
      if (!modelMap.has(r.model)) modelMap.set(r.model, { vllm: 0, sglang: 0 })
      const entry = modelMap.get(r.model)!
      if (r.engine === 'vllm' && r.throughputTokensPerSec > entry.vllm) entry.vllm = r.throughputTokensPerSec
      if (r.engine === 'sglang' && r.throughputTokensPerSec > entry.sglang) entry.sglang = r.throughputTokensPerSec
    })
    return Array.from(modelMap.entries()).map(([name, vals]) => ({
      model: name.length > 14 ? name.slice(0, 12) + '…' : name,
      fullName: name,
      vllm: vals.vllm,
      sglang: vals.sglang,
    }))
  }, [filtered])

  const latencyData = useMemo(() => {
    const entries: Array<{
      label: string; model: string; engine: EngineType; p50: number; p90: number; p99: number
    }> = []
    // Pick best result per model/engine for latency display
    const seen = new Set<string>()
    filtered.forEach((r) => {
      const key = `${r.model}-${r.engine}`
      if (seen.has(key)) return
      seen.add(key)
      const prefix = r.engine === 'vllm' ? 'V:' : 'S:'
      entries.push({
        label: `${prefix} ${r.model.length > 10 ? r.model.slice(0, 8) + '…' : r.model}`,
        model: r.model,
        engine: r.engine,
        p50: r.latencyP50Ms,
        p90: r.latencyP90Ms,
        p99: r.latencyP99Ms,
      })
    })
    return entries
  }, [filtered])

  const scatterData = useMemo(() => {
    return filtered.map((r) => ({
      ...r,
      x: r.throughputTokensPerSec,
      y: r.latencyP99Ms,
      z: r.concurrency,
    }))
  }, [filtered])

  const ttftTpotData = useMemo(() => {
    const modelMap = new Map<string, { vllmTtft: number; sglangTtft: number; vllmTpot: number; sglangTpot: number }>()
    filtered.forEach((r) => {
      if (!modelMap.has(r.model)) modelMap.set(r.model, { vllmTtft: 0, sglangTtft: 0, vllmTpot: 0, sglangTpot: 0 })
      const entry = modelMap.get(r.model)!
      if (r.engine === 'vllm') {
        if (r.ttftMs > entry.vllmTtft || entry.vllmTtft === 0) entry.vllmTtft = r.ttftMs
        if (r.tpotMs > entry.vllmTpot || entry.vllmTpot === 0) entry.vllmTpot = r.tpotMs
      } else {
        if (r.ttftMs > entry.sglangTtft || entry.sglangTtft === 0) entry.sglangTtft = r.ttftMs
        if (r.tpotMs > entry.sglangTpot || entry.sglangTpot === 0) entry.sglangTpot = r.tpotMs
      }
    })
    return Array.from(modelMap.entries()).map(([name, vals]) => ({
      model: name.length > 14 ? name.slice(0, 12) + '…' : name,
      fullName: name,
      'VLLM TTFT': vals.vllmTtft,
      'SGLang TTFT': vals.sglangTtft,
      'VLLM TPOT': vals.vllmTpot,
      'SGLang TPOT': vals.sglangTpot,
    }))
  }, [filtered])

  // ─── Summary Stats ────────────────────────────────────────────
  const bestThroughput = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.max(...filtered.map((r) => r.throughputTokensPerSec))
  }, [filtered])
  const bestLatency = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.min(...filtered.map((r) => r.latencyP99Ms))
  }, [filtered])
  const totalTests = filtered.length

  const vllmAvgThroughput = useMemo(() => {
    const v = filtered.filter((r) => r.engine === 'vllm')
    return v.length ? v.reduce((s, r) => s + r.throughputTokensPerSec, 0) / v.length : 0
  }, [filtered])
  const sglangAvgThroughput = useMemo(() => {
    const s = filtered.filter((r) => r.engine === 'sglang')
    return s.length ? s.reduce((s, r) => s + r.throughputTokensPerSec, 0) / s.length : 0
  }, [filtered])
  const vllmAvgLatency = useMemo(() => {
    const v = filtered.filter((r) => r.engine === 'vllm')
    return v.length ? v.reduce((s, r) => s + r.latencyP99Ms, 0) / v.length : 0
  }, [filtered])
  const sglangAvgLatency = useMemo(() => {
    const s = filtered.filter((r) => r.engine === 'sglang')
    return s.length ? s.reduce((s, r) => s + r.latencyP99Ms, 0) / s.length : 0
  }, [filtered])

  // ─── Grade Calculations ────────────────────────────────────────
  const gradeBreakdowns = useMemo(() => {
    const map = new Map<string, ScoreBreakdown>()
    for (const r of reportResults) {
      map.set(r.id, calculateScore({
        throughput: r.throughputTokensPerSec,
        latencyP99: r.latencyP99Ms,
        ttft: r.ttftMs,
        tpot: r.tpotMs,
        errorRate: r.errorRate,
      }))
    }
    return map
  }, [reportResults])

  const gradeDistribution = useMemo(() => {
    const dist = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 } as Record<string, number>
    for (const r of filtered) {
      const breakdown = gradeBreakdowns.get(r.id)
      if (breakdown) {
        dist[breakdown.overall.grade] = (dist[breakdown.overall.grade] || 0) + 1
      }
    }
    return dist
  }, [filtered, gradeBreakdowns])

  // ─── Sort Handler ─────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const renderSortIcon = (col: string) => {
    if (sortCol !== col) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  // ─── Export Functions ─────────────────────────────────────────
  const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const csvHeaders = [
    'Model', 'Engine', 'Scenario', 'Throughput (tok/s)', 'Throughput (req/s)',
    'Latency Mean (ms)', 'Latency P50 (ms)', 'Latency P90 (ms)', 'Latency P99 (ms)',
    'TTFT (ms)', 'TPOT (ms)', 'GPU Memory (GB)', 'GPU Util (%)',
    'CPU Util (%)', 'Error Rate (%)', 'Concurrency',
  ]

  const exportAsCSV = () => {
    if (filtered.length === 0) {
      toast.error('No data to export')
      return
    }
    const headerRow = csvHeaders.join(',')
    const dataRows = filtered.map((r) =>
      [
        r.model,
        r.engine,
        r.scenario,
        r.throughputTokensPerSec,
        r.throughputRequestsPerSec,
        r.latencyMeanMs,
        r.latencyP50Ms,
        r.latencyP90Ms,
        r.latencyP99Ms,
        r.ttftMs,
        r.tpotMs,
        r.gpuMemGb,
        r.gpuUtil,
        r.cpuUtil,
        r.errorRate,
        r.concurrency,
      ].join(',')
    )
    const csv = [headerRow, ...dataRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inferbench-report-${getTimestamp()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV exported', { description: `${filtered.length} records downloaded` })
  }

  const exportAsJSON = () => {
    if (filtered.length === 0) {
      toast.error('No data to export')
      return
    }
    const payload = {
      metadata: {
        exportDate: new Date().toISOString(),
        filters: { model: modelFilter, engine: engineFilter, scenario: scenarioFilter },
        totalRecords: filtered.length,
      },
      results: filtered,
    }
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inferbench-report-${getTimestamp()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('JSON exported', { description: `${filtered.length} records downloaded` })
  }

  const copyToClipboard = async () => {
    if (filtered.length === 0) {
      toast.error('No data to copy')
      return
    }
    const headerRow = csvHeaders.join('\t')
    const dataRows = filtered.map((r) =>
      [
        r.model,
        r.engine,
        r.scenario,
        r.throughputTokensPerSec,
        r.throughputRequestsPerSec,
        r.latencyMeanMs,
        r.latencyP50Ms,
        r.latencyP90Ms,
        r.latencyP99Ms,
        r.ttftMs,
        r.tpotMs,
        r.gpuMemGb,
        r.gpuUtil,
        r.cpuUtil,
        r.errorRate,
        r.concurrency,
      ].join('\t')
    )
    const text = [headerRow, ...dataRows].join('\n')
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard', { description: `${filtered.length} records copied` })
  }

  const exportAsPDF = async () => {
    if (filtered.length === 0) {
      toast.error('No data to export')
      return
    }
    const loadingToast = toast.loading('Generating PDF report...')
    try {
      const data = await fetchReportData({
        model: modelFilter,
        engine: engineFilter,
        scenario: scenarioFilter,
      })
      const html = generateReportHTML(data)
      const printWindow = openReportPrintWindow(html)
      if (!printWindow) {
        toast.error('Popup blocked', { description: 'Please allow popups to generate the PDF report' })
        return
      }
      toast.success('PDF report ready', {
        description: 'Use "Save as PDF" in the print dialog to download',
      })
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to generate PDF', { description: 'An error occurred while generating the report' })
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  // ─── Comparison Data ──────────────────────────────────────────
  const comparisonMetrics = [
    { name: 'Avg Throughput', vllm: vllmAvgThroughput, sglang: sglangAvgThroughput, unit: 'tok/s', higher: true },
    { name: 'Avg Latency P99', vllm: vllmAvgLatency, sglang: sglangAvgLatency, unit: 'ms', higher: false },
    { name: 'Best Throughput', vllm: Math.max(...filtered.filter(r => r.engine === 'vllm').map(r => r.throughputTokensPerSec), 0), sglang: Math.max(...filtered.filter(r => r.engine === 'sglang').map(r => r.throughputTokensPerSec), 0), unit: 'tok/s', higher: true },
    { name: 'Best Latency P99', vllm: Math.min(...filtered.filter(r => r.engine === 'vllm').map(r => r.latencyP99Ms), Infinity), sglang: Math.min(...filtered.filter(r => r.engine === 'sglang').map(r => r.latencyP99Ms), Infinity), unit: 'ms', higher: false },
    { name: 'Avg GPU Util', vllm: filtered.filter(r => r.engine === 'vllm').reduce((s, r) => s + r.gpuUtil, 0) / (filtered.filter(r => r.engine === 'vllm').length || 1), sglang: filtered.filter(r => r.engine === 'sglang').reduce((s, r) => s + r.gpuUtil, 0) / (filtered.filter(r => r.engine === 'sglang').length || 1), unit: '%', higher: true },
  ]

  // ─── Benchmark Comparison ──────────────────────────────────────
  const getResultLabel = useCallback((r: ReportResult) => {
    const engineTag = r.engine === 'vllm' ? 'VLLM' : 'SGLang'
    const scenario = r.scenario.replace(/_/g, ' ')
    return `${r.model} · ${engineTag} · ${scenario} · ${r.throughputTokensPerSec.toLocaleString()} tok/s`
  }, [])

  const selectedA = useMemo(() => reportResults.find((r) => r.id === compareA) ?? null, [reportResults, compareA])
  const selectedB = useMemo(() => reportResults.find((r) => r.id === compareB) ?? null, [reportResults, compareB])

  const isSameResult = compareA !== '' && compareA === compareB

  // Comparison metrics for side-by-side
  const compareMetrics = useMemo(() => {
    if (!selectedA || !selectedB) return []
    return [
      {
        label: 'Throughput (tok/s)',
        icon: <TrendingUp className="w-4 h-4" />,
        a: selectedA.throughputTokensPerSec,
        b: selectedB.throughputTokensPerSec,
        unit: 'tok/s',
        higher: true,
        format: (v: number) => v.toLocaleString(),
      },
      {
        label: 'Latency P50 (ms)',
        icon: <Clock className="w-4 h-4" />,
        a: selectedA.latencyP50Ms,
        b: selectedB.latencyP50Ms,
        unit: 'ms',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'Latency P90 (ms)',
        icon: <Clock className="w-4 h-4" />,
        a: selectedA.latencyP90Ms,
        b: selectedB.latencyP90Ms,
        unit: 'ms',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'Latency P99 (ms)',
        icon: <Clock className="w-4 h-4" />,
        a: selectedA.latencyP99Ms,
        b: selectedB.latencyP99Ms,
        unit: 'ms',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'TTFT (ms)',
        icon: <Zap className="w-4 h-4" />,
        a: selectedA.ttftMs,
        b: selectedB.ttftMs,
        unit: 'ms',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'TPOT (ms)',
        icon: <Zap className="w-4 h-4" />,
        a: selectedA.tpotMs,
        b: selectedB.tpotMs,
        unit: 'ms',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'GPU Memory (GB)',
        icon: <HardDrive className="w-4 h-4" />,
        a: selectedA.gpuMemGb,
        b: selectedB.gpuMemGb,
        unit: 'GB',
        higher: false,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'GPU Utilization (%)',
        icon: <Cpu className="w-4 h-4" />,
        a: selectedA.gpuUtil,
        b: selectedB.gpuUtil,
        unit: '%',
        higher: true,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'CPU Utilization (%)',
        icon: <Cpu className="w-4 h-4" />,
        a: selectedA.cpuUtil,
        b: selectedB.cpuUtil,
        unit: '%',
        higher: true,
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'Error Rate (%)',
        icon: <AlertCircle className="w-4 h-4" />,
        a: selectedA.errorRate,
        b: selectedB.errorRate,
        unit: '%',
        higher: false,
        format: (v: number) => v.toFixed(2),
      },
    ]
  }, [selectedA, selectedB])

  // Overall score
  const overallScore = useMemo(() => {
    if (compareMetrics.length === 0) return { aWins: 0, bWins: 0, total: 0, aPct: 0, bPct: 0 }
    let aWins = 0
    let bWins = 0
    for (const m of compareMetrics) {
      const aWinsMetric = m.higher ? m.a > m.b : m.a < m.b
      const bWinsMetric = m.higher ? m.b > m.a : m.b < m.a
      if (aWinsMetric) aWins++
      if (bWinsMetric) bWins++
    }
    const total = compareMetrics.length
    return {
      aWins,
      bWins,
      total,
      aPct: Math.round((aWins / total) * 100),
      bPct: Math.round((bWins / total) * 100),
    }
  }, [compareMetrics])

  // ─── Loading State ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Comprehensive benchmark analysis across models and inference engines
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
      </div>
    )
  }

  // ─── Error State ──────────────────────────────────────────────
  if (resultsError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Comprehensive benchmark analysis across models and inference engines
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Data</h3>
            <p className="text-muted-foreground text-sm">{resultsError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive benchmark analysis across models and inference engines
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {modelNames.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={engineFilter} onValueChange={setEngineFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Engines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engines</SelectItem>
              <SelectItem value="vllm">VLLM</SelectItem>
              <SelectItem value="sglang">SGLang</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Scenarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scenarios</SelectItem>
              <SelectItem value="single_stream">Single Stream</SelectItem>
              <SelectItem value="multi_stream">Multi Stream</SelectItem>
              <SelectItem value="burst">Burst</SelectItem>
              <SelectItem value="serving">Serving</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCompareOpen(true)}
            disabled={reportResults.length < 2}
          >
            <Scale className="w-4 h-4" />
            Compare
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsPDF}>
                <FileDown className="w-4 h-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsCSV}>
                <FileText className="w-4 h-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsJSON}>
                <FileJson className="w-4 h-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyToClipboard}>
                <Clipboard className="w-4 h-4" />
                Copy to Clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Throughput</p>
                <p className="text-2xl font-bold tabular-nums">{bestThroughput > 0 ? bestThroughput.toLocaleString() : 'N/A'} <span className="text-sm font-normal text-muted-foreground">tok/s</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Latency P99</p>
                <p className="text-2xl font-bold tabular-nums">{bestLatency > 0 ? bestLatency : 'N/A'} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tests Analyzed</p>
                <p className="text-2xl font-bold tabular-nums">{totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Engine Comparison</p>
                <div className="flex items-center gap-2 text-sm">
                  <span style={{ color: VLLM_COLOR }} className="font-semibold">VLLM</span>
                  <span className="text-muted-foreground">vs</span>
                  <span style={{ color: SGLANG_COLOR }} className="font-semibold">SGLang</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Grade Distribution Card ───────────────────────────── */}
      {reportResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Grade Distribution
            </CardTitle>
            <CardDescription>Performance grade breakdown across {filtered.length} filtered results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                const count = gradeDistribution[grade] || 0
                const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0
                const style = getGradeStyle(grade)
                return (
                  <div key={grade} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
                    <div className="w-full h-24 bg-muted/40 rounded-md relative overflow-hidden flex items-end">
                      <div
                        className={`w-full rounded-md transition-all duration-500 ${style.bgColor} ${style.color} flex items-center justify-center font-bold text-sm`}
                        style={{ height: `${Math.max(pct > 0 ? 12 : 0, pct)}%` }}
                      >
                        {pct > 15 && grade}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${style.color}`}>{grade}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Weighted: Throughput 30% · Latency 25% · TTFT 20% · TPOT 15% · Reliability 10%</span>
              <span>{filtered.length} results</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Empty State ─────────────────────────────────────── */}
      {reportResults.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Benchmark Results</h3>
            <p className="text-muted-foreground text-sm">
              Run some benchmarks first to see performance reports and comparisons here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Charts Section ──────────────────────────────────── */}
      {reportResults.length > 0 && (
        <Tabs defaultValue="throughput" className="space-y-4">
          <TabsList>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="latency">Latency</TabsTrigger>
            <TabsTrigger value="scatter">Throughput vs Latency</TabsTrigger>
            <TabsTrigger value="ttft">TTFT & TPOT</TabsTrigger>
          </TabsList>

          {/* ─── Throughput Comparison ──────────────────────────── */}
          <TabsContent value="throughput">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Throughput Comparison</CardTitle>
                <CardDescription>Peak throughput (tokens/s) by model — VLLM vs SGLang</CardDescription>
              </CardHeader>
              <CardContent>
                {throughputComparisonData.length > 0 ? (
                  <div className="relative h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={throughputComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={(state) => throughputHighlight.handleChartClick(state as unknown as Parameters<typeof throughputHighlight.handleChartClick>[0])}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Tokens/s', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                        <Tooltip content={<EnhancedReportsThroughputTooltip />} />
                        <Legend
                          formatter={(value: string) => (value === 'vllm' ? 'VLLM' : 'SGLang')}
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="vllm" fill={VLLM_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="sglang" fill={SGLANG_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                    {throughputHighlight.highlighted && (
                      <HighlightCard
                        point={throughputHighlight.highlighted}
                        seriesConfig={{
                          vllm: { label: 'VLLM', color: VLLM_COLOR, unit: 'tokens/s' },
                          sglang: { label: 'SGLang', color: SGLANG_COLOR, unit: 'tokens/s' },
                        }}
                        onClose={throughputHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for the selected filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Latency Distribution ───────────────────────────── */}
          <TabsContent value="latency">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latency Distribution</CardTitle>
                <CardDescription>P50, P90, P99 latency (ms) per model and engine</CardDescription>
              </CardHeader>
              <CardContent>
                {latencyData.length > 0 ? (
                  <div className="relative h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={latencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={(state) => latencyHighlight.handleChartClick(state as unknown as Parameters<typeof latencyHighlight.handleChartClick>[0])}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                        <Tooltip
                          content={<EnhancedReportsLatencyTooltip />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="p50" name="P50" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={10} />
                        <Bar dataKey="p90" name="P90" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={10} />
                        <Bar dataKey="p99" name="P99" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={10} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {latencyHighlight.highlighted && (
                      <HighlightCard
                        point={latencyHighlight.highlighted}
                        seriesConfig={{
                          p50: { label: 'P50', color: '#94a3b8', unit: 'ms' },
                          p90: { label: 'P90', color: '#f59e0b', unit: 'ms' },
                          p99: { label: 'P99', color: '#ef4444', unit: 'ms' },
                        }}
                        onClose={latencyHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for the selected filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Throughput vs Latency Scatter ──────────────────── */}
          <TabsContent value="scatter">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Throughput vs Latency (P99)</CardTitle>
                <CardDescription>Bubble size indicates concurrency level. Color indicates engine type.</CardDescription>
              </CardHeader>
              <CardContent>
                {scatterData.length > 0 ? (
                  <div className="relative h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={(state) => scatterHighlight.handleChartClick(state as unknown as Parameters<typeof scatterHighlight.handleChartClick>[0])}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Throughput"
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Throughput (tok/s)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Latency P99"
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Latency P99 (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                        />
                        <Tooltip content={<EnhancedScatterTooltip />} />
                        <Legend
                          formatter={(value: string) => (value === 'vllm' ? 'VLLM' : 'SGLang')}
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        <Scatter name="vllm" data={scatterData.filter((d) => d.engine === 'vllm')} fill={VLLM_COLOR}>
                          {scatterData.filter((d) => d.engine === 'vllm').map((entry, idx) => (
                            <Cell key={`v-${idx}`} fill={VLLM_COLOR} fillOpacity={0.7} r={Math.max(4, Math.sqrt(entry.z) * 1.5)} />
                          ))}
                        </Scatter>
                        <Scatter name="sglang" data={scatterData.filter((d) => d.engine === 'sglang')} fill={SGLANG_COLOR}>
                          {scatterData.filter((d) => d.engine === 'sglang').map((entry, idx) => (
                            <Cell key={`s-${idx}`} fill={SGLANG_COLOR} fillOpacity={0.7} r={Math.max(4, Math.sqrt(entry.z) * 1.5)} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    {scatterHighlight.highlighted && (
                      <HighlightCard
                        point={scatterHighlight.highlighted}
                        seriesConfig={{
                          x: { label: 'Throughput', color: VLLM_COLOR, unit: 'tok/s' },
                          y: { label: 'Latency P99', color: '#ef4444', unit: 'ms' },
                        }}
                        onClose={scatterHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for the selected filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TTFT & TPOT ────────────────────────────────────── */}
          <TabsContent value="ttft">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">TTFT & TPOT Comparison</CardTitle>
                <CardDescription>Time to First Token (ms) and Time per Output Token (ms) by model</CardDescription>
              </CardHeader>
              <CardContent>
                {ttftTpotData.length > 0 ? (
                  <div className="relative h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ttftTpotData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={(state) => ttftHighlight.handleChartClick(state as unknown as Parameters<typeof ttftHighlight.handleChartClick>[0])}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                        <Tooltip content={<EnhancedReportsTtftTpotTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="VLLM TTFT" fill={VLLM_COLOR} radius={[3, 3, 0, 0]} barSize={14} />
                        <Bar dataKey="SGLang TTFT" fill={SGLANG_COLOR} radius={[3, 3, 0, 0]} barSize={14} />
                        <Bar dataKey="VLLM TPOT" fill="#6ee7b7" radius={[3, 3, 0, 0]} barSize={14} />
                        <Bar dataKey="SGLang TPOT" fill="#fcd34d" radius={[3, 3, 0, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                    {ttftHighlight.highlighted && (
                      <HighlightCard
                        point={ttftHighlight.highlighted}
                        seriesConfig={{
                          'VLLM TTFT': { label: 'VLLM TTFT', color: VLLM_COLOR, unit: 'ms' },
                          'SGLang TTFT': { label: 'SGLang TTFT', color: SGLANG_COLOR, unit: 'ms' },
                          'VLLM TPOT': { label: 'VLLM TPOT', color: '#6ee7b7', unit: 'ms' },
                          'SGLang TPOT': { label: 'SGLang TPOT', color: '#fcd34d', unit: 'ms' },
                        }}
                        onClose={ttftHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available for the selected filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ─── VLLM vs SGLang Comparison ───────────────────────── */}
      {reportResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              VLLM vs SGLang Engine Comparison
            </CardTitle>
            <CardDescription>Side-by-side performance comparison across key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {comparisonMetrics.map((m) => {
                const vllmWins = m.higher ? m.vllm > m.sglang : m.vllm < m.sglang
                const sglangWins = m.higher ? m.sglang > m.vllm : m.sglang < m.vllm
                return (
                  <div key={m.name} className="border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground text-center">{m.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`text-center p-2 rounded-md ${vllmWins ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-muted/50'}`}>
                        <p className="text-[10px] text-muted-foreground mb-1">VLLM</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: VLLM_COLOR }}>
                          {typeof m.vllm === 'number' && isFinite(m.vllm) && m.vllm > 0 ? m.vllm.toFixed(1) : 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                        {vllmWins && m.vllm > 0 && (
                          <Badge variant="secondary" className="mt-1 text-[10px] bg-emerald-100 text-emerald-700 border-0">
                            <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                          </Badge>
                        )}
                      </div>
                      <div className={`text-center p-2 rounded-md ${sglangWins ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-muted/50'}`}>
                        <p className="text-[10px] text-muted-foreground mb-1">SGLang</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: SGLANG_COLOR }}>
                          {typeof m.sglang === 'number' && isFinite(m.sglang) && m.sglang > 0 ? m.sglang.toFixed(1) : 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                        {sglangWins && m.sglang > 0 && (
                          <Badge variant="secondary" className="mt-1 text-[10px] bg-amber-100 text-amber-700 border-0">
                            <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Detailed Results Table ──────────────────────────── */}
      {reportResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-5 h-5" />
              Detailed Benchmark Results
            </CardTitle>
            <CardDescription>
              Click any row to expand full details. Sorted by {sortCol.replace(/([A-Z])/g, ' $1').toLowerCase()} ({sortDir === 'desc' ? 'descending' : 'ascending'}).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('model')}>
                      <span className="flex items-center gap-1">Model {renderSortIcon('model')}</span>
                    </TableHead>
                    <TableHead>Engine</TableHead>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('throughputTokensPerSec')}>
                      <span className="flex items-center gap-1">Throughput (tok/s) {renderSortIcon('throughputTokensPerSec')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('latencyP99Ms')}>
                      <span className="flex items-center gap-1">Latency P99 (ms) {renderSortIcon('latencyP99Ms')}</span>
                    </TableHead>
                    <TableHead>TTFT (ms)</TableHead>
                    <TableHead>GPU Mem (GB)</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('gpuUtil')}>
                      <span className="flex items-center gap-1">GPU Util (%) {renderSortIcon('gpuUtil')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => (
                    <React.Fragment key={r.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                      >
                        <TableCell className="font-medium text-sm">{r.model}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ color: r.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR, borderColor: r.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }}
                          >
                            {r.engine === 'vllm' ? 'VLLM' : 'SGLang'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{r.scenario.replace('_', ' ')}</TableCell>
                        <TableCell>
                          {(() => {
                            const breakdown = gradeBreakdowns.get(r.id)
                            if (!breakdown) return <span className="text-muted-foreground">—</span>
                            const { overall, throughput, latency, ttft, tpot, reliability } = breakdown
                            const style = getGradeStyle(overall.grade)
                            return (
                              <UITooltip>
                                <UITooltipTrigger asChild>
                                  <Badge className={`cursor-default text-xs font-bold border-0 ${style.bgColor} ${style.color}`}>
                                    {overall.grade}
                                  </Badge>
                                </UITooltipTrigger>
                                <UITooltipContent side="top" className="bg-popover text-popover-foreground border shadow-lg p-3 max-w-xs">
                                  <p className="font-semibold mb-2">Performance Breakdown</p>
                                  <div className="space-y-1.5">
                                    {[
                                      { label: 'Throughput', grade: throughput.grade, detail: `${r.throughputTokensPerSec.toLocaleString()} tok/s` },
                                      { label: 'Latency P99', grade: latency.grade, detail: `${r.latencyP99Ms} ms` },
                                      { label: 'TTFT', grade: ttft.grade, detail: `${r.ttftMs} ms` },
                                      { label: 'TPOT', grade: tpot.grade, detail: `${r.tpotMs} ms` },
                                      { label: 'Reliability', grade: reliability.grade, detail: `${r.errorRate}% error` },
                                    ].map((item) => {
                                      const s = getGradeStyle(item.grade)
                                      return (
                                        <div key={item.label} className="flex items-center justify-between gap-3">
                                          <span className="text-xs text-muted-foreground">{item.label}</span>
                                          <span className="text-xs text-muted-foreground">{item.detail}</span>
                                          <span className={`text-xs font-bold ${s.color}`}>{item.grade}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-2">Overall: {overall.label} ({overall.score}/100)</p>
                                </UITooltipContent>
                              </UITooltip>
                            )
                          })()}
                        </TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${getPerformanceColor(r.throughputTokensPerSec, 'throughput')}`}>
                          {r.throughputTokensPerSec.toLocaleString()}
                        </TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${getPerformanceColor(r.latencyP99Ms, 'latency')}`}>
                          {r.latencyP99Ms}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.ttftMs}</TableCell>
                        <TableCell className="font-mono text-sm">{r.gpuMemGb}</TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${getPerformanceColor(r.gpuUtil, 'gpu')}`}>
                          {r.gpuUtil}
                        </TableCell>
                      </TableRow>
                      {expandedRow === r.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                              <div><span className="text-muted-foreground">Throughput (req/s):</span><br /><span className="font-mono font-medium">{r.throughputRequestsPerSec}</span></div>
                              <div><span className="text-muted-foreground">Latency Mean:</span><br /><span className="font-mono font-medium">{r.latencyMeanMs} ms</span></div>
                              <div><span className="text-muted-foreground">Latency P50:</span><br /><span className="font-mono font-medium">{r.latencyP50Ms} ms</span></div>
                              <div><span className="text-muted-foreground">Latency P90:</span><br /><span className="font-mono font-medium">{r.latencyP90Ms} ms</span></div>
                              <div><span className="text-muted-foreground">TPOT:</span><br /><span className="font-mono font-medium">{r.tpotMs} ms</span></div>
                              <div><span className="text-muted-foreground">CPU Util:</span><br /><span className="font-mono font-medium">{r.cpuUtil}%</span></div>
                              <div><span className="text-muted-foreground">Error Rate:</span><br /><span className={`font-mono font-medium ${getPerformanceColor(r.errorRate, 'error')}`}>{r.errorRate}%</span></div>
                              <div><span className="text-muted-foreground">Concurrency:</span><br /><span className="font-mono font-medium">{r.concurrency}</span></div>
                              <div><span className="text-muted-foreground">Total Requests:</span><br /><span className="font-mono font-medium">{r.totalRequests}</span></div>
                              <div><span className="text-muted-foreground">Created:</span><br /><span className="font-mono font-medium text-xs">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Benchmark Comparison Sheet ─────────────────────────── */}
      <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Benchmark Comparison
            </SheetTitle>
            <SheetDescription>
              Select two benchmark results to compare side-by-side
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-6">
            {/* ─── Selectors ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedA?.engine === 'sglang' ? SGLANG_COLOR : VLLM_COLOR }} />
                  Result A
                </label>
                <Select value={compareA} onValueChange={setCompareA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select result A..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reportResults.map((r) => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === compareB}>
                        {getResultLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedB?.engine === 'sglang' ? SGLANG_COLOR : VLLM_COLOR }} />
                  Result B
                </label>
                <Select value={compareB} onValueChange={setCompareB}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select result B..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reportResults.map((r) => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === compareA}>
                        {getResultLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ─── Same Result Warning ────────────────────────── */}
            {isSameResult && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">Same result selected for both. Please choose different results to compare.</p>
                </CardContent>
              </Card>
            )}

            {/* ─── Missing Selection ──────────────────────────── */}
            {!selectedA && !selectedB && !isSameResult && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Select two benchmark results above to start comparing.</p>
                </CardContent>
              </Card>
            )}

            {/* ─── Only One Selected ──────────────────────────── */}
            {((selectedA && !selectedB) || (!selectedA && selectedB)) && !isSameResult && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Scale className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Select one more result to start the comparison.</p>
                </CardContent>
              </Card>
            )}

            {/* ─── Comparison Results ─────────────────────────── */}
            {selectedA && selectedB && !isSameResult && (
              <>
                {/* ─── Info Cards ────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className={`border-2 transition-all ${overallScore.aWins > overallScore.bWins ? 'border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'border-border'}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedA.engine === 'sglang' ? SGLANG_COLOR : VLLM_COLOR }} />
                          <span className="font-semibold text-sm">{selectedA.model}</span>
                        </div>
                        <Badge variant="outline" className="text-xs" style={{ color: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR, borderColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }}>
                          {selectedA.engine === 'vllm' ? 'VLLM' : 'SGLang'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{selectedA.scenario.replace(/_/g, ' ')} · Concurrency: {selectedA.concurrency}</p>
                      {overallScore.aWins > overallScore.bWins && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                          <Trophy className="w-3 h-3 mr-1" /> Overall Winner
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                  <Card className={`border-2 transition-all ${overallScore.bWins > overallScore.aWins ? 'border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'border-border'}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedB.engine === 'sglang' ? SGLANG_COLOR : VLLM_COLOR }} />
                          <span className="font-semibold text-sm">{selectedB.model}</span>
                        </div>
                        <Badge variant="outline" className="text-xs" style={{ color: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR, borderColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }}>
                          {selectedB.engine === 'vllm' ? 'VLLM' : 'SGLang'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{selectedB.scenario.replace(/_/g, ' ')} · Concurrency: {selectedB.concurrency}</p>
                      {overallScore.bWins > overallScore.aWins && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                          <Trophy className="w-3 h-3 mr-1" /> Overall Winner
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ─── Overall Score ─────────────────────────── */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3 text-center">Overall Score</p>
                    <div className="flex items-center gap-3">
                      <div className="text-right flex-1">
                        <p className="text-lg font-bold tabular-nums" style={{ color: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }}>
                          {overallScore.aPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">{overallScore.aWins}/{overallScore.total} metrics</p>
                      </div>
                      <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden flex">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${overallScore.aPct}%`,
                            backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                          }}
                        />
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${overallScore.bPct}%`,
                            backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                          }}
                        />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-lg font-bold tabular-nums" style={{ color: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }}>
                          {overallScore.bPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">{overallScore.bWins}/{overallScore.total} metrics</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* ─── Throughput Comparison ──────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Throughput
                  </h3>
                  {compareMetrics.filter((m) => m.label.includes('Throughput')).map((m) => {
                    const maxVal = Math.max(m.a, m.b, 1)
                    const aWins = m.higher ? m.a > m.b : m.a < m.b
                    const bWins = m.higher ? m.b > m.a : m.b < m.a
                    return (
                      <Card key={m.label} className={`transition-all ${aWins ? 'ring-1 ring-emerald-200' : bWins ? 'ring-1 ring-amber-200' : ''}`}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.a / maxVal) * 100}%`,
                                      backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.a)}</span>
                              {aWins && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.b / maxVal) * 100}%`,
                                      backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.b)}</span>
                              {bWins && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Separator />

                {/* ─── Latency Comparison ─────────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Latency
                  </h3>
                  {compareMetrics.filter((m) => m.label.includes('Latency')).map((m) => {
                    const maxVal = Math.max(m.a, m.b, 1)
                    const aWins = m.higher ? m.a > m.b : m.a < m.b
                    const bWins = m.higher ? m.b > m.a : m.b < m.a
                    return (
                      <Card key={m.label} className={`transition-all ${aWins ? 'ring-1 ring-emerald-200' : bWins ? 'ring-1 ring-amber-200' : ''}`}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.a / maxVal) * 100}%`,
                                      backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.a)}</span>
                              {aWins && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.b / maxVal) * 100}%`,
                                      backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.b)}</span>
                              {bWins && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Separator />

                {/* ─── TTFT & TPOT Comparison ─────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    TTFT &amp; TPOT
                  </h3>
                  {compareMetrics.filter((m) => m.label.includes('TTFT') || m.label.includes('TPOT')).map((m) => {
                    const maxVal = Math.max(m.a, m.b, 1)
                    const aWins = m.higher ? m.a > m.b : m.a < m.b
                    const bWins = m.higher ? m.b > m.a : m.b < m.a
                    return (
                      <Card key={m.label} className={`transition-all ${aWins ? 'ring-1 ring-emerald-200' : bWins ? 'ring-1 ring-amber-200' : ''}`}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.a / maxVal) * 100}%`,
                                      backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.a)}</span>
                              {aWins && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(m.b / maxVal) * 100}%`,
                                      backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.b)}</span>
                              {bWins && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Separator />

                {/* ─── GPU Resources Comparison ───────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    GPU Resources
                  </h3>
                  {compareMetrics.filter((m) => m.label.includes('GPU') || m.label.includes('CPU')).map((m) => {
                    const maxVal = Math.max(m.a, m.b, 1)
                    const aWins = m.higher ? m.a > m.b : m.a < m.b
                    const bWins = m.higher ? m.b > m.a : m.b < m.a
                    return (
                      <Card key={m.label} className={`transition-all ${aWins ? 'ring-1 ring-emerald-200' : bWins ? 'ring-1 ring-amber-200' : ''}`}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <Progress value={(m.a / maxVal) * 100} className="h-2.5 [&>div]:transition-all [&>div]:duration-500" style={{ '--progress-color': selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR } as React.CSSProperties} />
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.a)}</span>
                              {aWins && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <Progress value={(m.b / maxVal) * 100} className="h-2.5 [&>div]:transition-all [&>div]:duration-500" style={{ '--progress-color': selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR } as React.CSSProperties} />
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.b)}</span>
                              {bWins && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Separator />

                {/* ─── Error Rate Comparison ──────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Error Rate
                  </h3>
                  {compareMetrics.filter((m) => m.label.includes('Error')).map((m) => {
                    const maxVal = Math.max(m.a, m.b, 0.1)
                    const aWins = m.higher ? m.a > m.b : m.a < m.b
                    const bWins = m.higher ? m.b > m.a : m.b < m.a
                    return (
                      <Card key={m.label} className={`transition-all ${aWins ? 'ring-1 ring-emerald-200' : bWins ? 'ring-1 ring-amber-200' : ''}`}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min((m.a / maxVal) * 100, 100)}%`,
                                      backgroundColor: selectedA.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.a)}</span>
                              {aWins && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
                              <div className="flex-1">
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min((m.b / maxVal) * 100, 100)}%`,
                                      backgroundColor: selectedB.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-mono font-medium w-20 text-right tabular-nums">{m.format(m.b)}</span>
                              {bWins && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
