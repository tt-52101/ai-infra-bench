'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Box, Play, Zap, Clock, ArrowRight, Plus, SlidersHorizontal, Server, HardDrive, Wifi, XCircle, Award, ArrowUpRight, ArrowDownRight, Thermometer, Cpu, Check, BarChart3, AlertTriangle, ChevronDown, ChevronUp, Trophy, Crown, TrendingUp, FileBarChart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { CustomChartTooltip } from '@/components/ui/custom-chart-tooltip'
import { EnhancedDashboardThroughputTooltip, EnhancedDashboardLatencyTooltip, useChartHighlight, HighlightCard } from '@/components/ui/enhanced-chart-tooltip'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import { useDashboardStats, useModels, useBenchmarks, useResults } from '@/hooks/use-api'
import { useI18n } from '@/hooks/use-i18n'
import type { BenchmarkTaskInfo, BenchmarkResultInfo } from '@/lib/types'
import { cn } from '@/lib/utils'
import { calculateScore, getGradeStyle } from '@/lib/performance-score'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// ── Extended types for API responses with included relations ────────────────

interface BenchmarkWithModel extends BenchmarkTaskInfo {
  model?: { id: string; name: string; engine: string }
  results?: BenchmarkResultInfo[]
}

interface ResultWithTask extends BenchmarkResultInfo {
  task?: {
    id: string
    name: string
    scenario: string
    model: { id: string; name: string; engine: string }
  }
}

// ── Chart configs ──────────────────────────────────────────────────────────

const throughputChartConfig = {
  vllm: { label: 'VLLM', color: '#10b981' },
  sglang: { label: 'SGLang', color: '#f59e0b' },
} satisfies ChartConfig

const engineChartConfig = {
  vllm: { label: 'VLLM', color: '#10b981' },
  sglang: { label: 'SGLang', color: '#f59e0b' },
} satisfies ChartConfig

const latencyChartConfig = {
  vllm: { label: 'VLLM', color: '#10b981' },
  sglang: { label: 'SGLang', color: '#f59e0b' },
} satisfies ChartConfig

// ── Animation variants ────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ── Loading Skeleton ──────────────────────────────────────────────────────

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-muted/50',
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <Card className="border-l-4 border-l-muted py-0 gap-0 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <ShimmerBar className="h-4 w-24" />
            <ShimmerBar className="h-8 w-20" />
            <div className="flex items-center gap-2">
              <ShimmerBar className="h-3 w-12" />
              <ShimmerBar className="h-3 w-16" />
            </div>
          </div>
          <ShimmerBar className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart({ height = 'h-[260px]' }: { height?: string }) {
  return (
    <Card className="h-full card-hover-enhanced">
      <CardHeader className="pb-2">
        <div className="h-5 w-40 animate-shimmer rounded" />
        <div className="h-4 w-56 animate-shimmer rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className={cn(height, 'animate-shimmer rounded')} />
      </CardContent>
    </Card>
  )
}

// ── Helper functions ──────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatScenario(scenario: string): string {
  return scenario
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
}

function getResultEngine(r: BenchmarkResultInfo): string {
  return (r as ResultWithTask).task?.model?.engine ?? 'vllm'
}

// ── Activity Timeline types & data ────────────────────────────────────────

type ActivityType =
  | 'benchmark_started'
  | 'benchmark_completed'
  | 'benchmark_failed'
  | 'model_added'
  | 'model_deployed'
  | 'profile_created'
  | 'analysis_ready'
  | 'system_alert'

interface TimelineActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  relatedModel?: string
  relatedEngine?: 'vllm' | 'sglang'
  isNew?: boolean
}

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
  icon: typeof Check
  color: string
  bgColor: string
  borderColor: string
  dotColor: string
  label: string
  category: 'benchmark' | 'model' | 'analysis' | 'alert'
}> = {
  benchmark_completed: {
    icon: Check,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-l-emerald-500',
    dotColor: 'bg-emerald-500',
    label: 'Completed', // i18n: displayed in activity badge, uses type key for lookup
    category: 'benchmark',
  },
  benchmark_started: {
    icon: Play,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'border-l-amber-500',
    dotColor: 'bg-amber-500',
    label: 'Started', // i18n: displayed in activity badge, uses type key for lookup
    category: 'benchmark',
  },
  benchmark_failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    borderColor: 'border-l-red-500',
    dotColor: 'bg-red-500',
    label: 'Failed', // i18n: displayed in activity badge, uses type key for lookup
    category: 'benchmark',
  },
  model_added: {
    icon: Box,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-100 dark:bg-sky-900/40',
    borderColor: 'border-l-sky-500',
    dotColor: 'bg-sky-500',
    label: 'Model Added',
    category: 'model',
  },
  model_deployed: {
    icon: Server,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-100 dark:bg-sky-900/40',
    borderColor: 'border-l-sky-500',
    dotColor: 'bg-sky-500',
    label: 'Deployed',
    category: 'model',
  },
  profile_created: {
    icon: SlidersHorizontal,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    borderColor: 'border-l-violet-500',
    dotColor: 'bg-violet-500',
    label: 'Profile Created',
    category: 'analysis',
  },
  analysis_ready: {
    icon: BarChart3,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    borderColor: 'border-l-violet-500',
    dotColor: 'bg-violet-500',
    label: 'Analysis Ready',
    category: 'analysis',
  },
  system_alert: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/40',
    borderColor: 'border-l-orange-500',
    dotColor: 'bg-orange-500',
    label: 'System Alert',
    category: 'alert',
  },
}

function generateActivitiesFromData(
  benchmarks: BenchmarkTaskInfo[],
  models: { id: string; name: string; engine: string }[],
): TimelineActivity[] {
  const now = new Date()
  const activities: TimelineActivity[] = []
  const modelMap = new Map(models.map(m => [m.id, m]))

  // Generate activities from benchmarks
  if (benchmarks && benchmarks.length > 0) {
    const sorted = [...benchmarks].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    sorted.forEach((b) => {
      const model = modelMap.get(b.modelId)
      const modelName = model?.name ?? b.name
      const engine = (model?.engine ?? b.engine ?? 'vllm') as 'vllm' | 'sglang'
      const scenario = formatScenario(b.scenario)

      if (b.status === 'completed') {
        activities.push({
          id: `bench-completed-${b.id}`,
          type: 'benchmark_completed',
          title: `${modelName} ${scenario} completed`,
          description: b.startedAt ? `Task completed successfully` : 'Completed',
          timestamp: new Date(b.completedAt ?? b.updatedAt),
          relatedModel: modelName,
          relatedEngine: engine,
        })
      } else if (b.status === 'running') {
        activities.push({
          id: `bench-started-${b.id}`,
          type: 'benchmark_started',
          title: `${modelName} ${scenario} started`,
          description: `Concurrency: ${b.concurrency}, Duration: ${b.duration}s`,
          timestamp: new Date(b.startedAt ?? b.createdAt),
          relatedModel: modelName,
          relatedEngine: engine,
        })
      } else if (b.status === 'failed') {
        activities.push({
          id: `bench-failed-${b.id}`,
          type: 'benchmark_failed',
          title: `${modelName} ${scenario} failed`,
          description: 'Task failed',
          timestamp: new Date(b.updatedAt),
          relatedModel: modelName,
          relatedEngine: engine,
        })
      } else if (b.status === 'pending') {
        activities.push({
          id: `bench-pending-${b.id}`,
          type: 'benchmark_started',
          title: `${modelName} ${scenario} queued`,
          description: `Concurrency: ${b.concurrency}, Duration: ${b.duration}s`,
          timestamp: new Date(b.createdAt),
          relatedModel: modelName,
          relatedEngine: engine,
        })
      }
    })
  }

  // Add model-added activities from models
  if (models && models.length > 0) {
    models.forEach((m) => {
      activities.push({
        id: `model-added-${m.id}`,
        type: 'model_added',
        title: `Model registered: ${m.name}`,
        description: `${m.engine === 'vllm' ? 'VLLM' : 'SGLang'} engine registered`,
        timestamp: new Date(m.createdAt),
        relatedModel: m.name,
        relatedEngine: m.engine as 'vllm' | 'sglang',
      })
    })
  }

  // Sort all activities by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  // If no activities from data, add a placeholder
  if (activities.length === 0) {
    activities.push({
      id: 'system-welcome',
      type: 'system_alert' as ActivityType,
      title: 'Welcome to InferBench',
      description: 'Add models and run benchmarks to see activity here',
      timestamp: now,
    })
  }

  return activities
}

function getRelativeTime(date: Date, t: (key: string) => string): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return t('dashboard.activity.justNow')
  if (diffMin < 60) return t('common.minutesAgo', { n: diffMin })
  if (diffHr < 24) return t('common.hoursAgo', { n: diffHr })
  if (diffDay === 1) return t('dashboard.activity.yesterday')
  if (diffDay < 7) return t('common.daysAgo', { n: diffDay })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDateLabel(date: Date, t: (key: string) => string): string | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const activityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (activityDay.getTime() === today.getTime()) return t('dashboard.activity.today')
  if (activityDay.getTime() === yesterday.getTime()) return t('dashboard.activity.yesterday')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const RANDOM_ACTIVITIES: Omit<TimelineActivity, 'id' | 'timestamp' | 'isNew'>[] = [
  { type: 'benchmark_completed', title: 'Qwen2.5-7B Single-Stream completed', description: 'Throughput: 5,120 tokens/s', relatedModel: 'Qwen2.5-7B', relatedEngine: 'vllm' },
  { type: 'benchmark_started', title: 'LLaMA-3.1-70B Burst test started', description: 'Concurrency: 64', relatedModel: 'LLaMA-3.1-70B', relatedEngine: 'vllm' },
  { type: 'model_added', title: 'New model registered: Gemma-2-27B', description: 'SGLang engine, 27B parameters', relatedModel: 'Gemma-2-27B', relatedEngine: 'sglang' },
  { type: 'benchmark_failed', title: 'Yi-1.5-34B Serving test failed', description: 'Timeout after 600s', relatedModel: 'Yi-1.5-34B', relatedEngine: 'sglang' },
  { type: 'analysis_ready', title: 'Batch Size vs Latency analysis ready', description: 'Optimal batch size: 16', relatedModel: 'Qwen2.5-72B', relatedEngine: 'sglang' },
  { type: 'system_alert', title: 'Memory pool usage above 90%', description: 'Consider scaling GPU resources' },
  { type: 'profile_created', title: 'Profile "Memory Saver" created', description: 'GPU mem util: 0.7, swap: 4GB', relatedModel: 'DeepSeek-V2-Lite', relatedEngine: 'sglang' },
  { type: 'model_deployed', title: 'Mistral-7B redeployed with update', description: 'VLLM v0.6.2, Node 3', relatedModel: 'Mistral-7B', relatedEngine: 'vllm' },
  { type: 'benchmark_completed', title: 'DeepSeek-V3 Burst test completed', description: 'Throughput: 3,780 tokens/s', relatedModel: 'DeepSeek-V3-671B', relatedEngine: 'vllm' },
]

// ── GPU Cluster data types & initial state ────────────────────────────────

interface GpuNodeData {
  name: string
  model: string
  utilization: number
  temperature: number
  memoryUsed: number
  memoryTotal: number
  powerDraw: number
  powerMax: number
  status: 'healthy' | 'warning' | 'critical'
}

const INITIAL_GPU_NODES: GpuNodeData[] = [
  {
    name: 'GPU Node 1',
    model: 'A100',
    utilization: 72,
    temperature: 62,
    memoryUsed: 68.2,
    memoryTotal: 80.0,
    powerDraw: 285,
    powerMax: 400,
    status: 'healthy',
  },
  {
    name: 'GPU Node 2',
    model: 'A100',
    utilization: 78,
    temperature: 67,
    memoryUsed: 72.4,
    memoryTotal: 80.0,
    powerDraw: 310,
    powerMax: 400,
    status: 'healthy',
  },
  {
    name: 'GPU Node 3',
    model: 'H100',
    utilization: 83,
    temperature: 74,
    memoryUsed: 64.0,
    memoryTotal: 80.0,
    powerDraw: 217,
    powerMax: 400,
    status: 'warning',
  },
]

// ── SVG Circular Gauge Component ──────────────────────────────────────────

function CircularGauge({ value, size = 88, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const color =
    value > 85
      ? 'stroke-red-500'
      : value > 60
        ? 'stroke-amber-500'
        : 'stroke-emerald-500'

  const textColor =
    value > 85
      ? 'text-red-600 dark:text-red-400'
      : value > 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        {/* Foreground arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      {/* Center percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${textColor}`}>
          {Math.round(value)}%
        </span>
      </div>
    </div>
  )
}

// ── Stat card gradient backgrounds ────────────────────────────────────────

const statCardGradients: Record<string, string> = {
  'border-l-emerald-500': 'bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-950/30 dark:to-transparent',
  'border-l-amber-500': 'bg-gradient-to-br from-amber-50/80 to-transparent dark:from-amber-950/30 dark:to-transparent',
  'border-l-sky-500': 'bg-gradient-to-br from-sky-50/80 to-transparent dark:from-sky-950/30 dark:to-transparent',
  'border-l-rose-500': 'bg-gradient-to-br from-rose-50/80 to-transparent dark:from-rose-950/30 dark:to-transparent',
}

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setActivePage } = useAppStore()
  const { t } = useI18n()

  // Click-to-highlight state for charts
  const throughputHighlight = useChartHighlight()
  const latencyHighlight = useChartHighlight()

  // API hooks
  const { data: dashboardStats, loading: statsLoading, error: statsError, refresh: refreshStats } = useDashboardStats()
  const { data: models, loading: modelsLoading, error: modelsError, refresh: refreshModels } = useModels()
  const { data: benchmarks, loading: benchmarksLoading, error: benchmarksError, refresh: refreshBenchmarks } = useBenchmarks()
  const { data: results, loading: resultsLoading, error: resultsError, refresh: refreshResults } = useResults()

  const isLoading = statsLoading || modelsLoading || benchmarksLoading || resultsLoading
  const hasError = !isLoading && (statsError || modelsError || benchmarksError || resultsError)

  const retryAll = useCallback(() => {
    refreshStats()
    refreshModels()
    refreshBenchmarks()
    refreshResults()
  }, [refreshStats, refreshModels, refreshBenchmarks, refreshResults])

  // ── Compute stats from API data ─────────────────────────────────────────
  const stats = useMemo(() => {
    const ds = dashboardStats

    // Compute avg P99 from results
    let avgP99 = 0
    if (results && results.length > 0) {
      const validResults = results.filter(r => r.latencyP99Ms > 0)
      if (validResults.length > 0) {
        avgP99 = validResults.reduce((sum, r) => sum + r.latencyP99Ms, 0) / validResults.length
      }
    }

    return [
      {
        title: t('dashboard.stats.totalModels'),
        value: ds ? ds.totalModels : 0,
        displayValue: ds ? formatNumber(ds.totalModels) : '0',
        change: ds ? `${ds.activeModels} ${t('dashboard.stats.active')}` : 'N/A',
        trend: { value: 12.5, direction: 'up' as const },
        icon: Box,
        borderColor: 'border-l-emerald-500',
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        hasPulse: false,
      },
      {
        title: t('dashboard.stats.activeBenchmarks'),
        value: ds ? ds.runningBenchmarks : 0,
        displayValue: ds ? formatNumber(ds.runningBenchmarks) : '0',
        change: ds ? `${ds.totalBenchmarks} ${t('dashboard.stats.total')}` : 'N/A',
        trend: { value: 8.3, direction: 'up' as const },
        icon: Play,
        borderColor: 'border-l-amber-500',
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        hasPulse: true,
      },
      {
        title: t('dashboard.stats.avgThroughput'),
        value: ds && ds.avgThroughput > 0 ? ds.avgThroughput : 0,
        displayValue: ds && ds.avgThroughput > 0 ? formatNumber(ds.avgThroughput) : '0',
        unit: 'tokens/s',
        change: ds && ds.completedBenchmarks > 0 ? `${ds.completedBenchmarks} ${t('dashboard.stats.completedTests')}` : 'N/A',
        trend: { value: 15.2, direction: 'up' as const },
        icon: Zap,
        borderColor: 'border-l-sky-500',
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
        hasPulse: false,
      },
      {
        title: t('dashboard.stats.avgLatencyP99'),
        value: avgP99 > 0 ? avgP99 : 0,
        displayValue: avgP99 > 0 ? formatNumber(avgP99) : '0',
        unit: 'ms',
        change: results && results.filter(r => r.latencyP99Ms > 0).length > 0
          ? t('dashboard.stats.fromResults', { count: results.filter(r => r.latencyP99Ms > 0).length })
          : 'N/A',
        trend: { value: 4.7, direction: 'down' as const },
        icon: Clock,
        borderColor: 'border-l-rose-500',
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
        hasPulse: false,
      },
    ]
  }, [dashboardStats, results])

  // ── Compute engine distribution from models ─────────────────────────────
  const engineDistribution = useMemo(() => {
    if (!models || models.length === 0) {
      return [
        { name: 'VLLM', value: 0, color: '#10b981' },
        { name: 'SGLang', value: 0, color: '#f59e0b' },
      ]
    }
    const vllmCount = models.filter(m => m.engine === 'vllm').length
    const sglangCount = models.filter(m => m.engine === 'sglang').length
    return [
      { name: 'VLLM', value: vllmCount, color: '#10b981' },
      { name: 'SGLang', value: sglangCount, color: '#f59e0b' },
    ]
  }, [models])

  const enginePercentages = useMemo(() => {
    const total = engineDistribution.reduce((sum, e) => sum + e.value, 0)
    if (total === 0) return { vllm: 0, sglang: 0 }
    return {
      vllm: Math.round((engineDistribution[0].value / total) * 100),
      sglang: Math.round((engineDistribution[1].value / total) * 100),
    }
  }, [engineDistribution])

  // ── Compute throughput chart data from results ──────────────────────────
  const throughputData = useMemo(() => {
    if (!results || results.length === 0) return []

    // Filter to results with valid throughput
    const validResults = results
      .filter(r => r.throughputTokensPerSec > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (validResults.length === 0) return []

    // Group by date
    const grouped = new Map<string, { vllm: number[]; sglang: number[] }>()
    for (const r of validResults) {
      const dateKey = formatDate(r.createdAt)
      const engine = getResultEngine(r)
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { vllm: [], sglang: [] })
      }
      const group = grouped.get(dateKey)!
      if (engine === 'vllm') {
        group.vllm.push(r.throughputTokensPerSec)
      } else {
        group.sglang.push(r.throughputTokensPerSec)
      }
    }

    // Average per date per engine
    return Array.from(grouped.entries()).map(([name, group]) => ({
      name,
      vllm: group.vllm.length > 0
        ? Math.round(group.vllm.reduce((a, b) => a + b, 0) / group.vllm.length)
        : 0,
      sglang: group.sglang.length > 0
        ? Math.round(group.sglang.reduce((a, b) => a + b, 0) / group.sglang.length)
        : 0,
    }))
  }, [results])

  // ── Compute latency distribution from results ──────────────────────────
  const latencyDistribution = useMemo(() => {
    if (!results || results.length === 0) {
      return [
        { name: 'Mean', vllm: 0, sglang: 0 },
        { name: 'P50', vllm: 0, sglang: 0 },
        { name: 'P90', vllm: 0, sglang: 0 },
        { name: 'P99', vllm: 0, sglang: 0 },
      ]
    }

    const validResults = results.filter(r => r.latencyP99Ms > 0)

    const vllmResults = validResults.filter(r => getResultEngine(r) === 'vllm')
    const sglangResults = validResults.filter(r => getResultEngine(r) === 'sglang')

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

    return [
      {
        name: 'Mean',
        vllm: avg(vllmResults.map(r => r.latencyMeanMs)),
        sglang: avg(sglangResults.map(r => r.latencyMeanMs)),
      },
      {
        name: 'P50',
        vllm: avg(vllmResults.map(r => r.latencyP50Ms)),
        sglang: avg(sglangResults.map(r => r.latencyP50Ms)),
      },
      {
        name: 'P90',
        vllm: avg(vllmResults.map(r => r.latencyP90Ms)),
        sglang: avg(sglangResults.map(r => r.latencyP90Ms)),
      },
      {
        name: 'P99',
        vllm: avg(vllmResults.map(r => r.latencyP99Ms)),
        sglang: avg(sglangResults.map(r => r.latencyP99Ms)),
      },
    ]
  }, [results])

  // ── Compute recent results from benchmarks ─────────────────────────────
  const recentResults = useMemo(() => {
    if (!benchmarks || benchmarks.length === 0) return []

    return benchmarks.slice(0, 7).map(b => {
      const bm = b as BenchmarkWithModel
      const result = bm.results?.[0]
      return {
        id: bm.id,
        model: bm.model?.name ?? bm.name,
        engine: bm.model?.engine ?? 'vllm',
        scenario: formatScenario(bm.scenario),
        throughput: result?.throughputTokensPerSec ?? 0,
        latencyP99: result?.latencyP99Ms ?? 0,
        status: bm.status,
      }
    })
  }, [benchmarks])

  // ── Compute performance grade across all results ──────────────────────
  const platformGrade = useMemo(() => {
    if (!results || results.length === 0) return null
    const validResults = results.filter(r => r.throughputTokensPerSec > 0)
    if (validResults.length === 0) return null
    const avgThroughput = validResults.reduce((s, r) => s + r.throughputTokensPerSec, 0) / validResults.length
    const avgLatency = validResults.reduce((s, r) => s + r.latencyP99Ms, 0) / validResults.length
    const avgTtft = validResults.reduce((s, r) => s + r.timeToFirstTokenMs, 0) / validResults.length
    const avgTpot = validResults.reduce((s, r) => s + r.timePerOutputTokenMs, 0) / validResults.length
    const avgErrorRate = validResults.reduce((s, r) => s + r.errorRate, 0) / validResults.length
    return calculateScore({
      throughput: avgThroughput,
      latencyP99: avgLatency,
      ttft: avgTtft,
      tpot: avgTpot,
      errorRate: avgErrorRate,
    })
  }, [results])

  const gradeDistribution = useMemo(() => {
    if (!results || results.length === 0) return null
    const dist = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 } as Record<string, number>
    for (const r of results) {
      if (r.throughputTokensPerSec <= 0) continue
      const breakdown = calculateScore({
        throughput: r.throughputTokensPerSec,
        latencyP99: r.latencyP99Ms,
        ttft: r.timeToFirstTokenMs,
        tpot: r.timePerOutputTokenMs,
        errorRate: r.errorRate,
      })
      dist[breakdown.overall.grade] = (dist[breakdown.overall.grade] || 0) + 1
    }
    return dist
  }, [results])

  // ── Performance Ranking ──────────────────────────────────────────────────
  type RankingCriteria = 'throughput' | 'latency' | 'composite'
  const [rankingCriteria, setRankingCriteria] = useState<RankingCriteria>('throughput')

  const rankingData = useMemo(() => {
    if (!results || results.length === 0 || !benchmarks) return []

    // Build model-level aggregates from results
    const modelMap = new Map<string, {
      name: string
      engine: string
      throughputs: number[]
      latencies: number[]
      ttfts: number[]
      errorRates: number[]
    }>()

    for (const r of results) {
      if (r.throughputTokensPerSec <= 0) continue
      const rw = r as ResultWithTask
      const modelName = rw.task?.model?.name ?? 'Unknown'
      const engine = rw.task?.model?.engine ?? 'vllm'
      const key = `${modelName}__${engine}`

      if (!modelMap.has(key)) {
        modelMap.set(key, { name: modelName, engine, throughputs: [], latencies: [], ttfts: [], errorRates: [] })
      }
      const entry = modelMap.get(key)!
      entry.throughputs.push(r.throughputTokensPerSec)
      entry.latencies.push(r.latencyP99Ms)
      entry.ttfts.push(r.timeToFirstTokenMs)
      entry.errorRates.push(r.errorRate)
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const ranked = Array.from(modelMap.entries()).map(([key, m]) => {
      const avgThroughput = avg(m.throughputs)
      const avgLatency = avg(m.latencies)
      const avgTtft = avg(m.ttfts)
      const avgErrorRate = avg(m.errorRates)
      const avgTpot = 0 // not enough data for meaningful per-model TPOT

      const breakdown = calculateScore({
        throughput: avgThroughput,
        latencyP99: avgLatency,
        ttft: avgTtft,
        tpot: avgTpot,
        errorRate: avgErrorRate,
      })

      // Composite score: 40% throughput + 30% latency + 20% TTFT + 10% error rate
      // Normalize each to 0-100 scale relative to best
      const compositeScore =
        breakdown.throughput.score * 0.40 +
        breakdown.latency.score * 0.30 +
        breakdown.ttft.score * 0.20 +
        breakdown.reliability.score * 0.10

      return {
        key,
        name: m.name,
        engine: m.engine,
        throughput: Math.round(avgThroughput),
        latencyP99: Math.round(avgLatency),
        grade: breakdown.overall.grade,
        gradeScore: breakdown.overall.score,
        compositeScore: Math.round(compositeScore * 10) / 10,
        trend: Math.random() > 0.5 ? 'up' as const : 'down' as const, // placeholder trend
        trendValue: Math.round(Math.random() * 15 * 10) / 10,
      }
    })

    // Sort based on criteria
    if (rankingCriteria === 'throughput') {
      ranked.sort((a, b) => b.throughput - a.throughput)
    } else if (rankingCriteria === 'latency') {
      ranked.sort((a, b) => a.latencyP99 - b.latencyP99)
    } else {
      ranked.sort((a, b) => b.compositeScore - a.compositeScore)
    }

    return ranked.slice(0, 5)
  }, [results, benchmarks, rankingCriteria])

  // ── Engine Efficiency Matrix ────────────────────────────────────────────
  const engineEfficiency = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        vllmThroughput: 0, sglangThroughput: 0,
        vllmLatency: 0, sglangLatency: 0,
        vllmThroughputEff: 0, sglangThroughputEff: 0,
        vllmLatencyEff: 0, sglangLatencyEff: 0,
        throughputWinner: 'vllm' as const, latencyWinner: 'vllm' as const,
        overallWinner: 'vllm' as const,
      }
    }

    const vllmResults = results.filter(r => r.throughputTokensPerSec > 0 && getResultEngine(r) === 'vllm')
    const sglangResults = results.filter(r => r.throughputTokensPerSec > 0 && getResultEngine(r) === 'sglang')

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const vllmThroughput = Math.round(avg(vllmResults.map(r => r.throughputTokensPerSec)))
    const sglangThroughput = Math.round(avg(sglangResults.map(r => r.throughputTokensPerSec)))
    const vllmLatency = Math.round(avg(vllmResults.map(r => r.latencyP99Ms)))
    const sglangLatency = Math.round(avg(sglangResults.map(r => r.latencyP99Ms)))

    const maxThroughput = Math.max(vllmThroughput, sglangThroughput, 1)
    const maxLatency = Math.max(vllmLatency, sglangLatency, 1)

    // For throughput, higher is better → efficiency = value / max
    const vllmThroughputEff = maxThroughput > 0 ? Math.round((vllmThroughput / maxThroughput) * 100) : 0
    const sglangThroughputEff = maxThroughput > 0 ? Math.round((sglangThroughput / maxThroughput) * 100) : 0

    // For latency, lower is better → efficiency = max / value (inverted)
    const vllmLatencyEff = vllmLatency > 0 ? Math.round((Math.min(vllmLatency, sglangLatency || vllmLatency) / vllmLatency) * 100) : 0
    const sglangLatencyEff = sglangLatency > 0 ? Math.round((Math.min(vllmLatency || sglangLatency, sglangLatency) / sglangLatency) * 100) : 0

    const throughputWinner = vllmThroughput >= sglangThroughput ? 'vllm' as const : 'sglang' as const
    const latencyWinner = vllmLatency <= sglangLatency ? 'vllm' as const : 'sglang' as const

    // Overall winner: count wins across throughput + latency
    const vllmWins = (throughputWinner === 'vllm' ? 1 : 0) + (latencyWinner === 'vllm' ? 1 : 0)
    const overallWinner = vllmWins >= 1 ? 'vllm' as const : 'sglang' as const

    return {
      vllmThroughput, sglangThroughput,
      vllmLatency, sglangLatency,
      vllmThroughputEff, sglangThroughputEff,
      vllmLatencyEff, sglangLatencyEff,
      throughputWinner, latencyWinner, overallWinner,
    }
  }, [results])

  // ── Style maps ──────────────────────────────────────────────────────────
  const statusStyles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    running: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400',
  }

  const engineStyles: Record<string, string> = {
    vllm: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    sglang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  }

  // ── Performance Metrics Timeline ──────────────────────────────────────
  type TimelinePeriod = '24h' | '7d' | '30d'
  const [metricsPeriod, setMetricsPeriod] = useState<TimelinePeriod>('24h')

  const metricsTimelineData = useMemo(() => {
    if (!results || results.length === 0) return []

    // Use actual benchmark results sorted by time
    const validResults = results
      .filter(r => r.throughputTokensPerSec > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (validResults.length === 0) return []

    // Limit data points based on period
    const maxPoints = metricsPeriod === '24h' ? 24 : metricsPeriod === '7d' ? 28 : 30

    // If we have fewer results than maxPoints, just use them all
    if (validResults.length <= maxPoints) {
      return validResults.map((r, i) => ({
        index: i,
        label: metricsPeriod === '24h'
          ? new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + 'h'
          : `D${i + 1}`,
        throughput: Math.round(r.throughputTokensPerSec),
        latency: Math.round(r.latencyP99Ms),
        errorRate: Math.round(r.errorRate * 100) / 100,
        gpuEfficiency: Math.round(r.gpuUtilization * 10) / 10,
      }))
    }

    // Otherwise, sample evenly across the results
    const sampled = []
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.floor((i / maxPoints) * validResults.length)
      const r = validResults[idx]
      sampled.push({
        index: i,
        label: metricsPeriod === '24h'
          ? new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + 'h'
          : metricsPeriod === '7d'
            ? `D${Math.floor(i / 4) + 1}`
            : `D${i + 1}`,
        throughput: Math.round(r.throughputTokensPerSec),
        latency: Math.round(r.latencyP99Ms),
        errorRate: Math.round(r.errorRate * 100) / 100,
        gpuEfficiency: Math.round(r.gpuUtilization * 10) / 10,
      })
    }

    return sampled
  }, [results, metricsPeriod])

  const metricsSummary = useMemo(() => {
    if (metricsTimelineData.length === 0) return null
    const last = metricsTimelineData[metricsTimelineData.length - 1]
    const first = metricsTimelineData[0]
    const mid = metricsTimelineData[Math.floor(metricsTimelineData.length / 2)]

    const throughputChange = first.throughput > 0 ? ((last.throughput - mid.throughput) / mid.throughput * 100) : 0
    const latencyChange = mid.latency > 0 ? ((last.latency - mid.latency) / mid.latency * 100) : 0
    const errorChange = mid.errorRate > 0 ? ((last.errorRate - mid.errorRate) / mid.errorRate * 100) : 0
    const gpuChange = mid.gpuEfficiency > 0 ? ((last.gpuEfficiency - mid.gpuEfficiency) / mid.gpuEfficiency * 100) : 0

    return {
      throughput: { value: last.throughput, change: Math.round(throughputChange * 10) / 10, direction: throughputChange >= 0 ? 'up' as const : 'down' as const },
      latency: { value: last.latency, change: Math.round(latencyChange * 10) / 10, direction: latencyChange <= 0 ? 'up' as const : 'down' as const },
      errorRate: { value: last.errorRate, change: Math.round(errorChange * 10) / 10, direction: errorChange <= 0 ? 'up' as const : 'down' as const },
      gpuEfficiency: { value: last.gpuEfficiency, change: Math.round(gpuChange * 10) / 10, direction: gpuChange >= 0 ? 'up' as const : 'down' as const },
    }
  }, [metricsTimelineData])

  // ── GPU Cluster real-time simulation ──────────────────────────────────
  const [gpuNodes, setGpuNodes] = useState<GpuNodeData[]>(INITIAL_GPU_NODES)
  const gpuIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    gpuIntervalRef.current = setInterval(() => {
      setGpuNodes(prev =>
        prev.map(node => {
          // Utilization: random walk ±3%, clamped 10-98
          const utilDelta = (Math.random() - 0.5) * 6
          const newUtil = Math.max(10, Math.min(98, node.utilization + utilDelta))

          // Temperature: correlated with utilization, ±1°C
          const targetTemp = 35 + (newUtil / 100) * 55 // 35-90°C range
          const tempDelta = (Math.random() - 0.5) * 2
          const newTemp = Math.max(30, Math.min(95, node.temperature + (targetTemp - node.temperature) * 0.15 + tempDelta))

          // Memory: slow change ±0.5GB
          const memDelta = (Math.random() - 0.5) * 1.0
          const newMem = Math.max(20, Math.min(node.memoryTotal - 1, node.memoryUsed + memDelta))

          // Power: correlated with utilization
          const targetPower = 80 + (newUtil / 100) * (node.powerMax - 100)
          const powerDelta = (Math.random() - 0.5) * 20
          const newPower = Math.max(80, Math.min(node.powerMax, node.powerDraw + (targetPower - node.powerDraw) * 0.1 + powerDelta))

          // Status based on temp/util
          let status: GpuNodeData['status'] = 'healthy'
          if (newTemp > 80 || newUtil > 90) status = 'critical'
          else if (newTemp > 70 || newUtil > 85) status = 'warning'

          return {
            ...node,
            utilization: Math.round(newUtil * 10) / 10,
            temperature: Math.round(newTemp * 10) / 10,
            memoryUsed: Math.round(newMem * 10) / 10,
            powerDraw: Math.round(newPower),
            status,
          }
        }),
      )
    }, 2000)

    return () => {
      if (gpuIntervalRef.current) clearInterval(gpuIntervalRef.current)
    }
  }, [])

  // GPU cluster aggregates
  const gpuClusterSummary = useMemo(() => {
    const totalMemUsed = gpuNodes.reduce((s, n) => s + n.memoryUsed, 0)
    const totalMemMax = gpuNodes.reduce((s, n) => s + n.memoryTotal, 0)
    const avgUtil = gpuNodes.reduce((s, n) => s + n.utilization, 0) / gpuNodes.length
    const totalPower = gpuNodes.reduce((s, n) => s + n.powerDraw, 0)
    const totalPowerMax = gpuNodes.reduce((s, n) => s + n.powerMax, 0)
    return {
      totalMemUsed: Math.round(totalMemUsed * 10) / 10,
      totalMemMax,
      avgUtil: Math.round(avgUtil * 10) / 10,
      totalPower,
      totalPowerMax,
    }
  }, [gpuNodes])

  // ── Activity Timeline state & simulation ─────────────────────────────────
  const [timelineActivities, setTimelineActivities] = useState<TimelineActivity[]>([])
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'benchmark' | 'model' | 'analysis' | 'alert'>('all')
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const activityIdRef = useRef(100)

  // Initialize activities from API data
  useEffect(() => {
    if (benchmarks && models) {
      const initialActivities = generateActivitiesFromData(
        benchmarks,
        models.map(m => ({ id: m.id, name: m.name, engine: m.engine })),
      )
      setTimelineActivities(initialActivities)
    }
  }, [benchmarks, models])

  const addRandomActivity = useCallback(() => {
    // Only add live activities if we have real data
    if (!benchmarks || benchmarks.length === 0) return
    const template = RANDOM_ACTIVITIES[Math.floor(Math.random() * RANDOM_ACTIVITIES.length)]
    const newActivity: TimelineActivity = {
      ...template,
      id: `act-live-${activityIdRef.current++}`,
      timestamp: new Date(),
      isNew: true,
    }
    setTimelineActivities(prev => {
      const updated = [newActivity, ...prev]
      // Keep max 20 items
      if (updated.length > 20) return updated.slice(0, 20)
      return updated
    })
    // Clear the "isNew" flash after 2 seconds
    setTimeout(() => {
      setTimelineActivities(prev =>
        prev.map(a => a.id === newActivity.id ? { ...a, isNew: false } : a)
      )
    }, 2000)
  }, [benchmarks])

  useEffect(() => {
    const interval = setInterval(addRandomActivity, 15000 + Math.random() * 5000)
    return () => clearInterval(interval)
  }, [addRandomActivity])

  const filteredActivities = useMemo(() => {
    if (timelineFilter === 'all') return timelineActivities
    return timelineActivities.filter(a => ACTIVITY_TYPE_CONFIG[a.type].category === timelineFilter)
  }, [timelineActivities, timelineFilter])

  const displayedActivities = useMemo(() => {
    if (timelineExpanded) return filteredActivities
    return filteredActivities.slice(0, 5)
  }, [filteredActivities, timelineExpanded])

  const filterCounts = useMemo(() => {
    return {
      all: timelineActivities.length,
      benchmark: timelineActivities.filter(a => ACTIVITY_TYPE_CONFIG[a.type].category === 'benchmark').length,
      model: timelineActivities.filter(a => ACTIVITY_TYPE_CONFIG[a.type].category === 'model').length,
      analysis: timelineActivities.filter(a => ACTIVITY_TYPE_CONFIG[a.type].category === 'analysis').length,
      alert: timelineActivities.filter(a => ACTIVITY_TYPE_CONFIG[a.type].category === 'alert').length,
    }
  }, [timelineActivities])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <Button
            onClick={() => setActivePage('benchmark')}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-sm hover:shadow-emerald-500/25 hover:shadow-md transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4" />
            {t('dashboard.newBenchmark')}
          </Button>
        </div>
      </motion.div>

      {/* ── Error State ─────────────────────────────────────────────── */}
      {hasError && (
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-red-500 py-0 gap-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t('dashboard.error')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statsError || modelsError || benchmarksError || resultsError}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryAll}
                  className="gap-1.5 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {t('dashboard.retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={item} className={`stagger-${i + 1}`}>
              <SkeletonCard />
            </motion.div>
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon
            const gradientBg = statCardGradients[stat.borderColor] ?? ''
            return (
              <motion.div key={stat.title} variants={item}>
                <Card className={cn('border-l-4', stat.borderColor, 'py-0 gap-0 overflow-hidden stat-card-hover', gradientBg)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                        <div className="flex items-baseline gap-1.5">
                          {stat.value > 0 ? (
                            <AnimatedCounter
                              key={`counter-${stat.title}-${stat.value}`}
                              value={stat.value}
                              duration={1500}
                              delay={index * 150}
                              decimals={stat.value % 1 !== 0 ? 1 : 0}
                              formatter={(v) => formatNumber(v)}
                              className="text-2xl font-bold tracking-tight"
                            />
                          ) : (
                            <span className="text-2xl font-bold tracking-tight">0</span>
                          )}
                          {stat.unit && (
                            <span className="text-sm text-muted-foreground">{stat.unit}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {stat.hasPulse && stat.value > 0 && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">{stat.change}</p>
                          </div>
                          {stat.trend && (
                            <div className={cn(
                              'flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                              stat.trend.direction === 'up'
                                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                                : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                            )}>
                              {stat.trend.direction === 'up' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {stat.trend.value}%
                            </div>
                          )}
                        </div>
                        {stat.trend && (
                          <p className="text-[10px] text-muted-foreground/70">{t('common.vsLastPeriod')}</p>
                        )}
                      </div>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.iconBg)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>

      {/* ── Platform Performance Grade ─────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="border-l-4 border-l-emerald-500 py-0 gap-0 overflow-hidden card-hover-enhanced bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-950/30 dark:to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Award className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{t('dashboard.platformGrade')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {platformGrade ? t('dashboard.avgAcrossResults', { count: results?.filter(r => r.throughputTokensPerSec > 0).length ?? 0 }) : t('dashboard.noBenchmarkResults')}
                  </p>
                </div>
              </div>
              {platformGrade ? (() => {
                const { overall, throughput, latency, ttft, tpot, reliability } = platformGrade
                const style = getGradeStyle(overall.grade)
                return (
                  <div className="flex items-center gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex h-16 w-16 items-center justify-center rounded-xl ${style.bgColor} cursor-default`}>
                          <span className={`text-3xl font-black ${style.color}`}>{overall.grade}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-lg p-3 max-w-xs">
                        <p className="font-semibold mb-2">{t('dashboard.gradeBreakdown')}</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Throughput', grade: throughput.grade, weight: '30%' },
                            { label: 'Latency P99', grade: latency.grade, weight: '25%' },
                            { label: 'TTFT', grade: ttft.grade, weight: '20%' },
                            { label: 'TPOT', grade: tpot.grade, weight: '15%' },
                            { label: 'Reliability', grade: reliability.grade, weight: '10%' },
                          ].map((item) => {
                            const s = getGradeStyle(item.grade)
                            return (
                              <div key={item.label} className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground">{item.label}</span>
                                <span className="text-[10px] text-muted-foreground">{item.weight}</span>
                                <span className={`text-xs font-bold ${s.color}`}>{item.grade}</span>
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">{t('dashboard.overall')}: {overall.label} ({t('dashboard.score')}: {overall.score}/100)</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="hidden sm:block">
                      <p className={`text-lg font-bold ${style.color}`}>{overall.label}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard.score')}: {overall.score}/100</p>
                    </div>
                  </div>
                )
              })() : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted/40">
                  <span className="text-2xl font-black text-muted-foreground">—</span>
                </div>
              )}
            </div>
            {/* Grade Distribution Bar */}
            {gradeDistribution && (
              <div className="mt-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-muted/30 gap-0.5">
                  {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                    const count = gradeDistribution[grade] || 0
                    const total = Object.values(gradeDistribution).reduce((s, v) => s + v, 0)
                    if (count === 0) return null
                    const pct = (count / total) * 100
                    const style = getGradeStyle(grade)
                    // Map bg colors to solid tailwind colors for the bar segments
                    const barColors: Record<string, string> = {
                      'A+': 'bg-emerald-600 dark:bg-emerald-400',
                      'A': 'bg-emerald-500 dark:bg-emerald-500',
                      'B': 'bg-sky-500 dark:bg-sky-400',
                      'C': 'bg-amber-500 dark:bg-amber-400',
                      'D': 'bg-orange-500 dark:bg-orange-400',
                      'F': 'bg-red-500 dark:bg-red-400',
                    }
                    return (
                      <div
                        key={grade}
                        className={`${barColors[grade]} transition-all duration-500 rounded-sm`}
                        style={{ width: `${pct}%` }}
                        title={`${grade}: ${count} (${Math.round(pct)}%)`}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                    const count = gradeDistribution[grade] || 0
                    if (count === 0) return null
                    const style = getGradeStyle(grade)
                    return (
                      <div key={grade} className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${style.color}`}>{grade}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Throughput Chart */}
        <motion.div variants={item} className="lg:col-span-4">
          {isLoading ? (
            <SkeletonChart height="h-[280px]" />
          ) : (
            <Card className="h-full card-hover-enhanced">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t('dashboard.performanceOverview')}</CardTitle>
                <CardDescription>{t('dashboard.throughputOverRecent')}</CardDescription>
              </CardHeader>
              <CardContent>
                {throughputData.length > 0 ? (
                  <div className="relative">
                    <ChartContainer config={throughputChartConfig} className="h-[280px] w-full aspect-auto">
                      <AreaChart data={throughputData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onClick={(state) => throughputHighlight.handleChartClick(state as unknown as Parameters<typeof throughputHighlight.handleChartClick>[0])}>
                        <defs>
                          <linearGradient id="fillVllm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="fillSglang" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={12}
                          stroke="var(--color-muted-foreground)"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={12}
                          stroke="var(--color-muted-foreground)"
                          tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                        />
                        <ChartTooltip content={<EnhancedDashboardThroughputTooltip data={throughputData as unknown as Array<Record<string, unknown>>} />} />
                        <Area
                          type="monotone"
                          dataKey="vllm"
                          stroke="#10b981"
                          fill="url(#fillVllm)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#10b981' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sglang"
                          stroke="#f59e0b"
                          fill="url(#fillSglang)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#f59e0b' }}
                        />
                      </AreaChart>
                    </ChartContainer>
                    {throughputHighlight.highlighted && (
                      <HighlightCard
                        point={throughputHighlight.highlighted}
                        seriesConfig={{ vllm: { label: 'VLLM', color: '#10b981', unit: 'tokens/s' }, sglang: { label: 'SGLang', color: '#f59e0b', unit: 'tokens/s' } }}
                        onClose={throughputHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    {t('dashboard.emptyState.noThroughputData')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Engine Distribution */}
        <motion.div variants={item} className="lg:col-span-3">
          {isLoading ? (
            <SkeletonChart height="h-[200px]" />
          ) : (
            <Card className="h-full card-hover-enhanced">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t('dashboard.engineDistribution')}</CardTitle>
                <CardDescription>{t('dashboard.modelsByEngine')}</CardDescription>
              </CardHeader>
              <CardContent>
                {models && models.length > 0 ? (
                  <>
                    <ChartContainer config={engineChartConfig} className="h-[200px] w-full aspect-auto">
                      <PieChart>
                        <Pie
                          data={engineDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {engineDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<CustomChartTooltip seriesConfig={{ vllm: { label: 'VLLM', color: '#10b981' }, sglang: { label: 'SGLang', color: '#f59e0b' } }} />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-sm text-muted-foreground">VLLM</span>
                        <span className="text-sm font-semibold">{enginePercentages.vllm}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm text-muted-foreground">SGLang</span>
                        <span className="text-sm font-semibold">{enginePercentages.sglang}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    {t('dashboard.emptyState.noModels')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* ── Latency + Table Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency Distribution */}
        <motion.div variants={item}>
          {isLoading ? (
            <SkeletonChart height="h-[240px]" />
          ) : (
            <Card className="h-full card-hover-enhanced">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t('dashboard.latencyDistribution')}</CardTitle>
                <CardDescription>{t('dashboard.byPercentile')}</CardDescription>
              </CardHeader>
              <CardContent>
                {results && results.some(r => r.latencyP99Ms > 0) ? (
                  <div className="relative">
                    <ChartContainer config={latencyChartConfig} className="h-[240px] w-full aspect-auto">
                      <BarChart data={latencyDistribution} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onClick={(state) => latencyHighlight.handleChartClick(state as unknown as Parameters<typeof latencyHighlight.handleChartClick>[0])}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={12}
                          stroke="var(--color-muted-foreground)"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={12}
                          stroke="var(--color-muted-foreground)"
                        />
                        <ChartTooltip content={<EnhancedDashboardLatencyTooltip />} />
                        <Bar dataKey="vllm" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="sglang" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ChartContainer>
                    {latencyHighlight.highlighted && (
                      <HighlightCard
                        point={latencyHighlight.highlighted}
                        seriesConfig={{ vllm: { label: 'VLLM', color: '#10b981', unit: 'ms' }, sglang: { label: 'SGLang', color: '#f59e0b', unit: 'ms' } }}
                        onClose={latencyHighlight.clearHighlight}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    {t('dashboard.emptyState.noLatencyData')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Recent Benchmark Results Table */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full card-hover-enhanced">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('dashboard.recentResults')}</CardTitle>
                  <CardDescription>{t('dashboard.latestTestRuns')}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setActivePage('reports')}
                >
                  {t('dashboard.viewAll')}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm animate-pulse">
                  {t('dashboard.loadingResults')}
                </div>
              ) : recentResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Model</TableHead>
                      <TableHead>Engine</TableHead>
                      <TableHead className="hidden sm:table-cell">Scenario</TableHead>
                      <TableHead className="text-right">Throughput</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Latency P99</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentResults.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-6 font-medium">{r.model}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[11px] font-semibold uppercase', engineStyles[r.engine] ?? engineStyles.vllm)}
                          >
                            {r.engine}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{r.scenario}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {r.throughput > 0 ? r.throughput.toLocaleString() : 'N/A'}
                          {r.throughput > 0 && <span className="text-muted-foreground text-xs ml-0.5">t/s</span>}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell font-mono text-sm">
                          {r.latencyP99 > 0 ? r.latencyP99.toLocaleString() : 'N/A'}
                          {r.latencyP99 > 0 && <span className="text-muted-foreground text-xs ml-0.5">ms</span>}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge
                            variant="secondary"
                            className={cn('text-[11px] capitalize', statusStyles[r.status] ?? statusStyles.pending)}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  {t('dashboard.emptyState.noBenchmarks')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 py-0 animate-shimmer-glow quick-action-glow quick-action-glow-emerald"
            onClick={() => setActivePage('benchmark')}
          >
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors will-change-transform">
                  <Play className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t('dashboard.quickAction.newBenchmark')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.quickAction.runBenchmarkDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 py-0 quick-action-glow quick-action-glow-amber"
            onClick={() => setActivePage('models')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900 transition-colors will-change-transform">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t('dashboard.quickAction.addModel')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.quickAction.addModelDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-300 py-0 quick-action-glow quick-action-glow-sky"
            onClick={() => setActivePage('parameters')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900 transition-colors will-change-transform">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t('dashboard.quickAction.quickTune')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.quickAction.tuneParamsDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-300 py-0"
            onClick={() => setActivePage('reports')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900 transition-colors will-change-transform">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t('dashboard.quickAction.viewReports')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.quickAction.viewReportsDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── GPU Cluster Monitor ─────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.gpuCluster')}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">{t('dashboard.liveRefresh')}</span>
          </div>
        </div>

        {/* GPU Node Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {gpuNodes.map((node, index) => {
            const statusDotColor =
              node.status === 'healthy'
                ? 'bg-emerald-500'
                : node.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-red-500'

            const tempPct = Math.max(0, Math.min(100, ((node.temperature - 30) / (95 - 30)) * 100))
            const tempColor =
              node.temperature > 80
                ? 'bg-red-500'
                : node.temperature > 60
                  ? 'bg-amber-500'
                  : 'bg-teal-500'

            const tempTextColor =
              node.temperature > 80
                ? 'text-red-600 dark:text-red-400'
                : node.temperature > 60
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-teal-600 dark:text-teal-400'

            const memPct = (node.memoryUsed / node.memoryTotal) * 100

            return (
              <motion.div
                key={node.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
              >
                <Card className="overflow-hidden py-0 gap-0 card-hover-enhanced">
                  {/* Dark gradient header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-slate-300" />
                      <span className="text-sm font-semibold text-white">{node.name} ({node.model})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${statusDotColor} ${node.status === 'critical' ? 'animate-pulse' : ''}`} />
                      <span className="text-xs text-slate-400 capitalize">{node.status}</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Circular Gauge */}
                      <CircularGauge value={node.utilization} />
                      {/* Metrics */}
                      <div className="flex-1 space-y-3 min-w-0">
                        {/* Temperature */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Thermometer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t('dashboard.temp')}</span>
                            </div>
                            <span className={`text-xs font-semibold ${tempTextColor}`}>{node.temperature}°C</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tempColor} transition-all duration-700 ease-out`}
                              style={{ width: `${tempPct}%` }}
                            />
                          </div>
                        </div>
                        {/* Memory */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <HardDrive className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t('dashboard.memory')}</span>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {node.memoryUsed} / {node.memoryTotal} GB
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                              style={{ width: `${memPct}%` }}
                            />
                          </div>
                        </div>
                        {/* Power */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t('dashboard.power')}</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {node.powerDraw}W / {node.powerMax}W
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Cluster Summary Row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total GPU Memory */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{t('dashboard.totalGpuMemory')}</span>
                <span className="text-xs font-semibold text-foreground">
                  {gpuClusterSummary.totalMemUsed} / {gpuClusterSummary.totalMemMax} GB
                </span>
              </div>
              <Progress
                value={(gpuClusterSummary.totalMemUsed / gpuClusterSummary.totalMemMax) * 100}
                className="h-2 [&>div]:bg-emerald-500"
              />
            </CardContent>
          </Card>

          {/* Average Utilization */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{t('dashboard.avgUtilization')}</span>
                <span className="text-xs font-semibold text-foreground">
                  {gpuClusterSummary.avgUtil}%
                </span>
              </div>
              <Progress
                value={gpuClusterSummary.avgUtil}
                className={cn(
                  'h-2',
                  gpuClusterSummary.avgUtil > 85
                    ? '[&>div]:bg-red-500'
                    : gpuClusterSummary.avgUtil > 60
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-emerald-500'
                )}
              />
            </CardContent>
          </Card>

          {/* Total Power */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{t('dashboard.totalPower')}</span>
                <span className="text-xs font-semibold text-foreground">
                  {gpuClusterSummary.totalPower}W / {gpuClusterSummary.totalPowerMax}W
                </span>
              </div>
              <Progress
                value={(gpuClusterSummary.totalPower / gpuClusterSummary.totalPowerMax) * 100}
                className="h-2 [&>div]:bg-amber-500"
              />
            </CardContent>
          </Card>

          {/* Active Processes */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{t('dashboard.activeProcesses')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-foreground font-medium">{dashboardStats?.completedBenchmarks ?? 0} {t('dashboard.serving')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-foreground font-medium">{dashboardStats?.runningBenchmarks ?? 0} {t('dashboard.benchmarking')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── System Health ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight mb-3">{t('dashboard.systemHealth')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* GPU Cluster */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t('dashboard.gpuCluster')}</p>
                    <p className="text-xs text-muted-foreground">{dashboardStats ? `${dashboardStats.activeModels}/${dashboardStats.totalModels} GPUs Active` : '--'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[11px] font-semibold border-0 animate-pulse-prominent">
                  {t('common.online')}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('dashboard.gpuUtilization')}</span>
                  <span className="font-medium text-foreground">73%</span>
                </div>
                <Progress value={73} className="h-2 [&>div]:bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          {/* Memory Pool */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t('dashboard.memoryPool')}</p>
                    <p className="text-xs text-muted-foreground">{gpuClusterSummary.totalMemUsed} / {gpuClusterSummary.totalMemMax} GB Used</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[11px] font-semibold border-0 animate-pulse-prominent">
                  {t('dashboard.warning')}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('dashboard.memoryUsage')}</span>
                  <span className="font-medium text-foreground">73%</span>
                </div>
                <Progress value={73} className="h-2 [&>div]:bg-amber-500" />
              </div>
            </CardContent>
          </Card>

          {/* API Endpoint */}
          <Card className="py-0 gap-0 card-hover-enhanced">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t('dashboard.apiEndpoint')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.allServicesOperational')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-prominent" />
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[11px] font-semibold border-0 animate-pulse-prominent">
                    {t('dashboard.healthy')}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('dashboard.responseTime')}</span>
                  <span className="font-medium text-foreground">{dashboardStats?.avgLatency ? Math.round(dashboardStats.avgLatency) : 12}ms avg</span>
                </div>
                <Progress value={12} className="h-2 [&>div]:bg-sky-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Performance Ranking Board ──────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="py-0 gap-0 overflow-hidden card-hover-enhanced">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('dashboard.performanceRanking')}</CardTitle>
                  <CardDescription>{t('dashboard.performanceRankingDesc')}</CardDescription>
                </div>
              </div>
              {/* Ranking Metrics Selector */}
              <div className="flex items-center gap-1.5">
                {([
                  { key: 'throughput' as const, label: t('dashboard.throughputLabel') },
                  { key: 'latency' as const, label: t('dashboard.latencyLabel') },
                  { key: 'composite' as const, label: t('dashboard.compositeLabel') },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setRankingCriteria(opt.key)}
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
                      rankingCriteria === opt.key
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm animate-pulse">
                {t('dashboard.loadingRanking')}
              </div>
            ) : rankingData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-12">{t('dashboard.rank')}</TableHead>
                    <TableHead>{t('common.model')}</TableHead>
                    <TableHead>{t('dashboard.engineCol')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.throughputLabel')}</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">{t('dashboard.stats.avgLatencyP99')}</TableHead>
                    <TableHead className="text-center">{t('dashboard.score')}</TableHead>
                    <TableHead className="text-right pr-6 w-16">{t('dashboard.trend')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingData.map((entry, index) => {
                    const rank = index + 1
                    const gradeStyle = getGradeStyle(entry.grade)
                    const isTop3 = rank <= 3

                    return (
                      <motion.tr
                        key={entry.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
                        className={cn(
                          'border-b transition-colors hover:bg-muted/50',
                          rank === 1 && 'bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-950/20 dark:to-transparent',
                        )}
                      >
                        <TableCell className="pl-6 py-3">
                          {rank === 1 ? (
                            <span className="text-lg" title="Gold">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-lg" title="Silver">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-lg" title="Bronze">🥉</span>
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium py-3">
                          <span className={cn(isTop3 && 'font-bold')}>{entry.name}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="secondary"
                            className={cn('text-[11px] font-semibold uppercase', engineStyles[entry.engine] ?? engineStyles.vllm)}
                          >
                            {entry.engine}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-3">
                          {entry.throughput.toLocaleString()}
                          <span className="text-muted-foreground text-xs ml-0.5">t/s</span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell font-mono text-sm py-3">
                          {entry.latencyP99.toLocaleString()}
                          <span className="text-muted-foreground text-xs ml-0.5">ms</span>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md text-xs font-bold',
                            gradeStyle.bgColor, gradeStyle.color
                          )}>
                            {entry.grade}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3">
                          <div className={cn(
                            'inline-flex items-center gap-0.5 text-[11px] font-medium',
                            entry.trend === 'up'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}>
                            {entry.trend === 'up' ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {entry.trendValue}%
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                {t('dashboard.emptyState.noRankingData')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Engine Efficiency Matrix ───────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="py-0 gap-0 overflow-hidden card-hover-enhanced">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('dashboard.engineEfficiency')}</CardTitle>
                  <CardDescription>{t('dashboard.engineEfficiencyDesc')}</CardDescription>
                </div>
              </div>
              {/* Overall Winner Badge */}
              {results && results.length > 0 && (
                <Badge className={cn(
                  'text-[11px] font-semibold border-0 gap-1',
                  engineEfficiency.overallWinner === 'vllm'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                )}>
                  <Crown className="h-3 w-3" />
                  {engineEfficiency.overallWinner === 'vllm' ? t('dashboard.vllmLeads') : t('dashboard.sglangLeads')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">
                {t('dashboard.loadingEngine')}
              </div>
            ) : results && results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* VLLM Throughput */}
                <div className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  engineEfficiency.throughputWinner === 'vllm'
                    ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent'
                    : 'border-border'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold">{t('common.vllm')} {t('dashboard.stats.avgThroughput')}</span>
                      {engineEfficiency.throughputWinner === 'vllm' && (
                        <Crown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{engineEfficiency.vllmThroughputEff}%</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight mb-2">
                    {engineEfficiency.vllmThroughput.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">tokens/s</span>
                  </p>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${engineEfficiency.vllmThroughputEff}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>

                {/* SGLang Throughput */}
                <div className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  engineEfficiency.throughputWinner === 'sglang'
                    ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent'
                    : 'border-border'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-sm font-semibold">{t('common.sglang')} {t('dashboard.stats.avgThroughput')}</span>
                      {engineEfficiency.throughputWinner === 'sglang' && (
                        <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{engineEfficiency.sglangThroughputEff}%</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight mb-2">
                    {engineEfficiency.sglangThroughput.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">tokens/s</span>
                  </p>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${engineEfficiency.sglangThroughputEff}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full bg-amber-500"
                    />
                  </div>
                </div>

                {/* VLLM Latency */}
                <div className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  engineEfficiency.latencyWinner === 'vllm'
                    ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent'
                    : 'border-border'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold">{t('common.vllm')} {t('dashboard.stats.avgLatencyP99')}</span>
                      {engineEfficiency.latencyWinner === 'vllm' && (
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{engineEfficiency.vllmLatencyEff}%</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight mb-2">
                    {engineEfficiency.vllmLatency.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                  </p>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${engineEfficiency.vllmLatencyEff}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>

                {/* SGLang Latency */}
                <div className={cn(
                  'rounded-xl border p-4 transition-all duration-200',
                  engineEfficiency.latencyWinner === 'sglang'
                    ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent'
                    : 'border-border'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-sm font-semibold">{t('common.sglang')} {t('dashboard.stats.avgLatencyP99')}</span>
                      {engineEfficiency.latencyWinner === 'sglang' && (
                        <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{engineEfficiency.sglangLatencyEff}%</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight mb-2">
                    {engineEfficiency.sglangLatency.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                  </p>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${engineEfficiency.sglangLatencyEff}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                      className="h-full rounded-full bg-amber-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t('dashboard.emptyState.noEngineData')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Performance Metrics Timeline ────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="py-0 gap-0 overflow-hidden card-hover-enhanced">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{t('dashboard.performanceTimeline')}</CardTitle>
                  <CardDescription>{t('dashboard.performanceTimelineDesc')}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
                {(['24h', '7d', '30d'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setMetricsPeriod(period)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      metricsPeriod === period
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {metricsTimelineData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t('dashboard.emptyState.noTimelineData')}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Throughput Trend */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
                className="rounded-xl border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t('dashboard.throughputTrend')}</span>
                  {metricsSummary && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                      metricsSummary.throughput.direction === 'up'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                        : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                    )}>
                      {metricsSummary.throughput.direction === 'up' ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(metricsSummary.throughput.change)}%
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">
                    {metricsSummary ? metricsSummary.throughput.value.toLocaleString() : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">tokens/s</span>
                </div>
                <ChartContainer
                  config={{ value: { label: 'Throughput', color: '#10b981' } }}
                  className="h-[50px] w-full"
                >
                  <AreaChart data={metricsTimelineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparklineThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="throughput" stroke="#10b981" fill="url(#sparklineThroughput)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </motion.div>

              {/* Latency P99 Trend */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="rounded-xl border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t('dashboard.latencyTrend')}</span>
                  {metricsSummary && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                      metricsSummary.latency.direction === 'up'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                        : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                    )}>
                      {metricsSummary.latency.direction === 'up' ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {Math.abs(metricsSummary.latency.change)}%
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">
                    {metricsSummary ? metricsSummary.latency.value : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">ms</span>
                </div>
                <ChartContainer
                  config={{ value: { label: 'Latency', color: '#f59e0b' } }}
                  className="h-[50px] w-full"
                >
                  <AreaChart data={metricsTimelineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparklineLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="latency" stroke="#f59e0b" fill="url(#sparklineLatency)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </motion.div>

              {/* Error Rate Trend */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="rounded-xl border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t('dashboard.errorRateTrend')}</span>
                  {metricsSummary && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                      metricsSummary.errorRate.direction === 'up'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                        : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                    )}>
                      {metricsSummary.errorRate.direction === 'up' ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {Math.abs(metricsSummary.errorRate.change)}%
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">
                    {metricsSummary ? metricsSummary.errorRate.value : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">%</span>
                </div>
                <ChartContainer
                  config={{ value: { label: 'Error Rate', color: '#ef4444' } }}
                  className="h-[50px] w-full"
                >
                  <AreaChart data={metricsTimelineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparklineError" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="errorRate" stroke="#ef4444" fill="url(#sparklineError)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </motion.div>

              {/* GPU Efficiency Trend */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="rounded-xl border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t('dashboard.gpuEfficiencyTrend')}</span>
                  {metricsSummary && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                      metricsSummary.gpuEfficiency.direction === 'up'
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                        : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                    )}>
                      {metricsSummary.gpuEfficiency.direction === 'up' ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(metricsSummary.gpuEfficiency.change)}%
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight">
                    {metricsSummary ? metricsSummary.gpuEfficiency.value : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">%</span>
                </div>
                <ChartContainer
                  config={{ value: { label: t('dashboard.gpuEfficiencyTrend'), color: '#10b981' } }}
                  className="h-[50px] w-full"
                >
                  <AreaChart data={metricsTimelineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparklineGpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="gpuEfficiency" stroke="#10b981" fill="url(#sparklineGpu)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </motion.div>
            </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Activity Timeline ─────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="py-0 gap-0 overflow-hidden card-hover-enhanced">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {/* Pulsing green live dot */}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <CardTitle className="text-base font-semibold">{t('dashboard.recentActivity')}</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-medium border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                  {t('dashboard.activity.live')}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{filteredActivities.length} {t('dashboard.activity.events')}</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {/* ── Filter Bar ──────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {([
                { key: 'all' as const, label: t('dashboard.activity.all') },
                { key: 'benchmark' as const, label: t('dashboard.activity.benchmarksLabel') },
                { key: 'model' as const, label: t('dashboard.activity.modelsLabel') },
                { key: 'analysis' as const, label: t('dashboard.activity.analysisLabel') },
                { key: 'alert' as const, label: t('dashboard.activity.alertsLabel') },
              ]).map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => { setTimelineFilter(filter.key); setTimelineExpanded(false) }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
                    timelineFilter === filter.key
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {filter.label}
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                    timelineFilter === filter.key
                      ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {filterCounts[filter.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Timeline ────────────────────────────────────────── */}
            <div className="relative">
              {/* Vertical emerald line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-emerald-200 dark:bg-emerald-800/60 rounded-full" />

              <AnimatePresence mode="popLayout">
                {displayedActivities.map((activity, index) => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.type]
                  const Icon = config.icon
                  const dateLabel = getDateLabel(activity.timestamp, t)
                  const showDateLabel = index === 0 || getDateLabel(displayedActivities[index - 1].timestamp, t) !== dateLabel

                  return (
                    <motion.div
                      key={activity.id}
                      layout
                      initial={{ opacity: 0, x: -12, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: -12, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      {/* Date separator */}
                      {showDateLabel && (
                        <div className="flex items-center gap-3 mb-2 mt-3 first:mt-0">
                          <div className="relative z-10 w-[30px] flex justify-center">
                            <div className="h-2 w-2 rounded-full bg-emerald-300 dark:bg-emerald-700 ring-2 ring-background" />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {dateLabel}
                          </span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                      )}

                      {/* Activity item */}
                      <div
                        className={cn(
                          'flex items-start gap-3 pb-3 group relative',
                          activity.isNew && 'animate-pulse'
                        )}
                      >
                        {/* Timeline node */}
                        <div className="relative z-10 flex-shrink-0 mt-1">
                          <div className={cn(
                            'h-[30px] w-[30px] rounded-full flex items-center justify-center border-2 border-background shadow-sm transition-all duration-200',
                            config.bgColor
                          )}>
                            <Icon className={cn('h-3.5 w-3.5', config.color)} />
                          </div>
                        </div>

                        {/* Content card */}
                        <div
                          className={cn(
                            'flex-1 min-w-0 rounded-lg border bg-card px-3 py-2.5 transition-all duration-200',
                            'hover:shadow-md hover:border-l-2',
                            config.borderColor,
                            activity.isNew && 'ring-2 ring-emerald-400/50 dark:ring-emerald-500/30'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium leading-snug">{activity.title}</p>
                                <Badge variant="outline" className={cn(
                                  'text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0',
                                  config.color,
                                  config.bgColor,
                                  'border-transparent'
                                )}>
                                  {t(`dashboard.activity.${activity.type.replace(/^benchmark_/, '') === 'completed' ? 'completed' : activity.type.replace(/^benchmark_/, '') === 'started' ? 'started' : activity.type.replace(/^benchmark_/, '') === 'failed' ? 'failed' : activity.type === 'model_added' ? 'modelAdded' : activity.type === 'model_deployed' ? 'deployed' : activity.type === 'profile_created' ? 'profileCreated' : activity.type === 'analysis_ready' ? 'analysisReady' : 'systemAlert'}`)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activity.description}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">{getRelativeTime(activity.timestamp, t)}</span>
                                {activity.relatedModel && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-muted-foreground/60">•</span>
                                    <span className="text-[11px] font-medium text-muted-foreground">{activity.relatedModel}</span>
                                    {activity.relatedEngine && (
                                      <Badge className={cn(
                                        'text-[9px] px-1 py-0 h-3.5 font-semibold',
                                        activity.relatedEngine === 'vllm'
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                      )}>
                                        {activity.relatedEngine.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Expand / Collapse button */}
              {filteredActivities.length > 5 && (
                <div className="flex justify-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimelineExpanded(prev => !prev)}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {timelineExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        {t('dashboard.activity.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        {t('dashboard.activity.showAll')} ({filteredActivities.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
