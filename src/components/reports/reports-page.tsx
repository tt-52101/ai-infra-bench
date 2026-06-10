'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ScatterChart, Scatter, Cell, ComposedChart, Line, ReferenceLine,
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
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp, TrendingDown, Zap, Clock, BarChart3, Download,
  ArrowUp, ArrowDown, Cpu, HardDrive, Activity, Search,
  ChevronDown, ChevronUp, Trophy, FileText, FileJson, Clipboard,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { EngineType, BenchmarkScenario } from '@/lib/types'

// ─── Color Constants ─────────────────────────────────────────────
const VLLM_COLOR = '#10b981'   // emerald-500
const SGLANG_COLOR = '#f59e0b' // amber-500
const VLLM_COLOR_LIGHT = '#d1fae5'
const SGLANG_COLOR_LIGHT = '#fef3c7'

// ─── Mock Data ───────────────────────────────────────────────────
interface MockResult {
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
  createdAt: string
}

const MODELS = ['Qwen2.5-72B', 'Llama-3.1-70B', 'DeepSeek-V2', 'Mistral-7B', 'Yi-1.5-34B']

const MOCK_RESULTS: MockResult[] = [
  // Qwen2.5-72B
  { id: 'r1', model: 'Qwen2.5-72B', engine: 'vllm', scenario: 'serving', throughputTokensPerSec: 2840, throughputRequestsPerSec: 14.2, latencyMeanMs: 78, latencyP50Ms: 65, latencyP90Ms: 120, latencyP99Ms: 185, ttftMs: 42, tpotMs: 18, gpuMemGb: 72.4, gpuUtil: 92, cpuUtil: 45, errorRate: 0.2, concurrency: 32, createdAt: '2025-01-15T10:30:00Z' },
  { id: 'r2', model: 'Qwen2.5-72B', engine: 'sglang', scenario: 'serving', throughputTokensPerSec: 2580, throughputRequestsPerSec: 12.9, latencyMeanMs: 68, latencyP50Ms: 55, latencyP90Ms: 105, latencyP99Ms: 162, ttftMs: 35, tpotMs: 15, gpuMemGb: 70.1, gpuUtil: 88, cpuUtil: 42, errorRate: 0.1, concurrency: 32, createdAt: '2025-01-15T11:00:00Z' },
  // Llama-3.1-70B
  { id: 'r3', model: 'Llama-3.1-70B', engine: 'vllm', scenario: 'multi_stream', throughputTokensPerSec: 3120, throughputRequestsPerSec: 15.6, latencyMeanMs: 72, latencyP50Ms: 60, latencyP90Ms: 112, latencyP99Ms: 178, ttftMs: 38, tpotMs: 16, gpuMemGb: 68.5, gpuUtil: 94, cpuUtil: 48, errorRate: 0.3, concurrency: 64, createdAt: '2025-01-16T09:00:00Z' },
  { id: 'r4', model: 'Llama-3.1-70B', engine: 'sglang', scenario: 'multi_stream', throughputTokensPerSec: 2890, throughputRequestsPerSec: 14.5, latencyMeanMs: 62, latencyP50Ms: 50, latencyP90Ms: 98, latencyP99Ms: 155, ttftMs: 30, tpotMs: 14, gpuMemGb: 66.2, gpuUtil: 89, cpuUtil: 44, errorRate: 0.1, concurrency: 64, createdAt: '2025-01-16T09:30:00Z' },
  // DeepSeek-V2
  { id: 'r5', model: 'DeepSeek-V2', engine: 'vllm', scenario: 'single_stream', throughputTokensPerSec: 1920, throughputRequestsPerSec: 9.6, latencyMeanMs: 95, latencyP50Ms: 82, latencyP90Ms: 145, latencyP99Ms: 210, ttftMs: 52, tpotMs: 22, gpuMemGb: 78.3, gpuUtil: 87, cpuUtil: 52, errorRate: 0.5, concurrency: 16, createdAt: '2025-01-17T14:00:00Z' },
  { id: 'r6', model: 'DeepSeek-V2', engine: 'sglang', scenario: 'single_stream', throughputTokensPerSec: 1750, throughputRequestsPerSec: 8.8, latencyMeanMs: 82, latencyP50Ms: 70, latencyP90Ms: 128, latencyP99Ms: 190, ttftMs: 44, tpotMs: 19, gpuMemGb: 75.8, gpuUtil: 84, cpuUtil: 48, errorRate: 0.2, concurrency: 16, createdAt: '2025-01-17T14:30:00Z' },
  // Mistral-7B
  { id: 'r7', model: 'Mistral-7B', engine: 'vllm', scenario: 'burst', throughputTokensPerSec: 8950, throughputRequestsPerSec: 44.8, latencyMeanMs: 28, latencyP50Ms: 22, latencyP90Ms: 42, latencyP99Ms: 68, ttftMs: 12, tpotMs: 6, gpuMemGb: 14.2, gpuUtil: 96, cpuUtil: 35, errorRate: 0.0, concurrency: 128, createdAt: '2025-01-18T08:00:00Z' },
  { id: 'r8', model: 'Mistral-7B', engine: 'sglang', scenario: 'burst', throughputTokensPerSec: 8320, throughputRequestsPerSec: 41.6, latencyMeanMs: 24, latencyP50Ms: 18, latencyP90Ms: 36, latencyP99Ms: 58, ttftMs: 10, tpotMs: 5, gpuMemGb: 13.8, gpuUtil: 93, cpuUtil: 32, errorRate: 0.0, concurrency: 128, createdAt: '2025-01-18T08:30:00Z' },
  // Yi-1.5-34B
  { id: 'r9', model: 'Yi-1.5-34B', engine: 'vllm', scenario: 'serving', throughputTokensPerSec: 4680, throughputRequestsPerSec: 23.4, latencyMeanMs: 48, latencyP50Ms: 40, latencyP90Ms: 72, latencyP99Ms: 112, ttftMs: 25, tpotMs: 10, gpuMemGb: 38.6, gpuUtil: 91, cpuUtil: 40, errorRate: 0.1, concurrency: 64, createdAt: '2025-01-19T11:00:00Z' },
  { id: 'r10', model: 'Yi-1.5-34B', engine: 'sglang', scenario: 'serving', throughputTokensPerSec: 4350, throughputRequestsPerSec: 21.8, latencyMeanMs: 42, latencyP50Ms: 34, latencyP90Ms: 65, latencyP99Ms: 98, ttftMs: 20, tpotMs: 8, gpuMemGb: 37.2, gpuUtil: 88, cpuUtil: 38, errorRate: 0.0, concurrency: 64, createdAt: '2025-01-19T11:30:00Z' },
  // Additional scenarios
  { id: 'r11', model: 'Qwen2.5-72B', engine: 'vllm', scenario: 'burst', throughputTokensPerSec: 3200, throughputRequestsPerSec: 16.0, latencyMeanMs: 85, latencyP50Ms: 72, latencyP90Ms: 130, latencyP99Ms: 198, ttftMs: 48, tpotMs: 20, gpuMemGb: 74.1, gpuUtil: 95, cpuUtil: 50, errorRate: 0.4, concurrency: 64, createdAt: '2025-01-20T09:00:00Z' },
  { id: 'r12', model: 'Llama-3.1-70B', engine: 'sglang', scenario: 'single_stream', throughputTokensPerSec: 2650, throughputRequestsPerSec: 13.3, latencyMeanMs: 58, latencyP50Ms: 46, latencyP90Ms: 92, latencyP99Ms: 148, ttftMs: 28, tpotMs: 13, gpuMemGb: 65.0, gpuUtil: 86, cpuUtil: 40, errorRate: 0.1, concurrency: 8, createdAt: '2025-01-20T10:00:00Z' },
  { id: 'r13', model: 'DeepSeek-V2', engine: 'vllm', scenario: 'serving', throughputTokensPerSec: 2100, throughputRequestsPerSec: 10.5, latencyMeanMs: 88, latencyP50Ms: 75, latencyP90Ms: 138, latencyP99Ms: 202, ttftMs: 48, tpotMs: 21, gpuMemGb: 80.1, gpuUtil: 90, cpuUtil: 55, errorRate: 0.3, concurrency: 32, createdAt: '2025-01-21T13:00:00Z' },
  { id: 'r14', model: 'Mistral-7B', engine: 'vllm', scenario: 'serving', throughputTokensPerSec: 9500, throughputRequestsPerSec: 47.5, latencyMeanMs: 25, latencyP50Ms: 20, latencyP90Ms: 38, latencyP99Ms: 62, ttftMs: 11, tpotMs: 5, gpuMemGb: 14.8, gpuUtil: 97, cpuUtil: 36, errorRate: 0.0, concurrency: 256, createdAt: '2025-01-21T14:00:00Z' },
]

// ─── Custom Tooltip Components ───────────────────────────────────
function ThroughputTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.dataKey === 'vllm' ? 'VLLM' : 'SGLang'}:</span>
          <span className="font-mono font-medium">{p.value.toLocaleString()} tok/s</span>
        </div>
      ))}
    </div>
  )
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MockResult }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold mb-1">{d.model}</p>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.engine === 'vllm' ? VLLM_COLOR : SGLANG_COLOR }} />
        <span className="text-muted-foreground">{d.engine === 'vllm' ? 'VLLM' : 'SGLang'}</span>
      </div>
      <div className="text-muted-foreground">Throughput: <span className="text-foreground font-mono">{d.throughputTokensPerSec.toLocaleString()} tok/s</span></div>
      <div className="text-muted-foreground">Latency P99: <span className="text-foreground font-mono">{d.latencyP99Ms} ms</span></div>
      <div className="text-muted-foreground">Concurrency: <span className="text-foreground font-mono">{d.concurrency}</span></div>
    </div>
  )
}

// ─── Performance Color Helper ────────────────────────────────────
function getPerformanceColor(value: number, metric: 'throughput' | 'latency' | 'gpu' | 'error', engine?: EngineType): string {
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

// ─── Main Component ──────────────────────────────────────────────
export default function ReportsPage() {
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [engineFilter, setEngineFilter] = useState<string>('all')
  const [scenarioFilter, setScenarioFilter] = useState<string>('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string>('throughputTokensPerSec')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Filtered data
  const filtered = useMemo(() => {
    return MOCK_RESULTS.filter((r) => {
      if (modelFilter !== 'all' && r.model !== modelFilter) return false
      if (engineFilter !== 'all' && r.engine !== engineFilter) return false
      if (scenarioFilter !== 'all' && r.scenario !== scenarioFilter) return false
      return true
    })
  }, [modelFilter, engineFilter, scenarioFilter])

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
  const bestThroughput = useMemo(() => Math.max(...filtered.map((r) => r.throughputTokensPerSec)), [filtered])
  const bestLatency = useMemo(() => Math.min(...filtered.map((r) => r.latencyP99Ms)), [filtered])
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

  // ─── Comparison Data ──────────────────────────────────────────
  const comparisonMetrics = [
    { name: 'Avg Throughput', vllm: vllmAvgThroughput, sglang: sglangAvgThroughput, unit: 'tok/s', higher: true },
    { name: 'Avg Latency P99', vllm: vllmAvgLatency, sglang: sglangAvgLatency, unit: 'ms', higher: false },
    { name: 'Best Throughput', vllm: Math.max(...filtered.filter(r => r.engine === 'vllm').map(r => r.throughputTokensPerSec), 0), sglang: Math.max(...filtered.filter(r => r.engine === 'sglang').map(r => r.throughputTokensPerSec), 0), unit: 'tok/s', higher: true },
    { name: 'Best Latency P99', vllm: Math.min(...filtered.filter(r => r.engine === 'vllm').map(r => r.latencyP99Ms), Infinity), sglang: Math.min(...filtered.filter(r => r.engine === 'sglang').map(r => r.latencyP99Ms), Infinity), unit: 'ms', higher: false },
    { name: 'Avg GPU Util', vllm: filtered.filter(r => r.engine === 'vllm').reduce((s, r) => s + r.gpuUtil, 0) / (filtered.filter(r => r.engine === 'vllm').length || 1), sglang: filtered.filter(r => r.engine === 'sglang').reduce((s, r) => s + r.gpuUtil, 0) / (filtered.filter(r => r.engine === 'sglang').length || 1), unit: '%', higher: true },
  ]

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
              {MODELS.map((m) => (
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
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                <p className="text-2xl font-bold tabular-nums">{bestThroughput.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">tok/s</span></p>
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
                <p className="text-2xl font-bold tabular-nums">{bestLatency} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
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

      {/* ─── Charts Section ──────────────────────────────────── */}
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={throughputComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Tokens/s', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                    <Tooltip content={<ThroughputTooltip />} />
                    <Legend
                      formatter={(value: string) => (value === 'vllm' ? 'VLLM' : 'SGLang')}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="vllm" fill={VLLM_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="sglang" fill={SGLANG_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={latencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [`${value} ms`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="p50" name="P50" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={10} />
                    <Bar dataKey="p90" name="P90" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={10} />
                    <Bar dataKey="p99" name="P99" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={10} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    <Tooltip content={<ScatterTooltip />} />
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
              </div>
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
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ttftTpotData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="VLLM TTFT" fill={VLLM_COLOR} radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey="SGLang TTFT" fill={SGLANG_COLOR} radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey="VLLM TPOT" fill="#6ee7b7" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey="SGLang TPOT" fill="#fcd34d" radius={[3, 3, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── VLLM vs SGLang Comparison ───────────────────────── */}
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
                        {typeof m.vllm === 'number' && isFinite(m.vllm) ? m.vllm.toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                      {vllmWins && (
                        <Badge variant="secondary" className="mt-1 text-[10px] bg-emerald-100 text-emerald-700 border-0">
                          <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> Winner
                        </Badge>
                      )}
                    </div>
                    <div className={`text-center p-2 rounded-md ${sglangWins ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-muted/50'}`}>
                      <p className="text-[10px] text-muted-foreground mb-1">SGLang</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: SGLANG_COLOR }}>
                        {typeof m.sglang === 'number' && isFinite(m.sglang) ? m.sglang.toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                      {sglangWins && (
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

      {/* ─── Detailed Results Table ──────────────────────────── */}
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
                        <TableCell colSpan={8} className="p-4">
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
    </div>
  )
}
