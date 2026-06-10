'use client'

import { useMemo } from 'react'
import { Box, Play, Zap, Clock, ArrowRight, Plus, SlidersHorizontal, TrendingUp, Server, HardDrive, Wifi, CheckCircle2, Info, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { useAppStore } from '@/lib/store'
import { useDashboardStats, useModels, useBenchmarks, useResults } from '@/hooks/use-api'
import type { BenchmarkTaskInfo, BenchmarkResultInfo } from '@/lib/types'
import { cn } from '@/lib/utils'
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

function SkeletonCard() {
  return (
    <Card className="border-l-4 border-l-muted py-0 gap-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonChart({ height = 'h-[260px]' }: { height?: string }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted animate-pulse rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className={cn(height, 'bg-muted/30 animate-pulse rounded')} />
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

  // API hooks
  const { data: dashboardStats, loading: statsLoading } = useDashboardStats()
  const { data: models, loading: modelsLoading } = useModels()
  const { data: benchmarks, loading: benchmarksLoading } = useBenchmarks()
  const { data: results, loading: resultsLoading } = useResults()

  const isLoading = statsLoading || modelsLoading || benchmarksLoading || resultsLoading

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
        title: 'Total Models',
        value: ds ? ds.totalModels : 0,
        displayValue: ds ? formatNumber(ds.totalModels) : '0',
        change: ds ? `${ds.activeModels} active` : 'N/A',
        icon: Box,
        borderColor: 'border-l-emerald-500',
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        hasPulse: false,
      },
      {
        title: 'Active Benchmarks',
        value: ds ? ds.runningBenchmarks : 0,
        displayValue: ds ? formatNumber(ds.runningBenchmarks) : '0',
        change: ds ? `${ds.totalBenchmarks} total` : 'N/A',
        icon: Play,
        borderColor: 'border-l-amber-500',
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        hasPulse: true,
      },
      {
        title: 'Avg Throughput',
        value: ds && ds.avgThroughput > 0 ? ds.avgThroughput : 0,
        displayValue: ds && ds.avgThroughput > 0 ? formatNumber(ds.avgThroughput) : '0',
        unit: 'tokens/s',
        change: ds && ds.completedBenchmarks > 0 ? `${ds.completedBenchmarks} completed tests` : 'N/A',
        icon: Zap,
        borderColor: 'border-l-sky-500',
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
        hasPulse: false,
      },
      {
        title: 'Avg Latency P99',
        value: avgP99 > 0 ? avgP99 : 0,
        displayValue: avgP99 > 0 ? formatNumber(avgP99) : '0',
        unit: 'ms',
        change: results && results.filter(r => r.latencyP99Ms > 0).length > 0
          ? `From ${results.filter(r => r.latencyP99Ms > 0).length} results`
          : 'N/A',
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
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of your inference engine benchmarking platform
            </p>
          </div>
          <Button
            onClick={() => setActivePage('benchmark')}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-sm hover:shadow-emerald-500/25 hover:shadow-md transition-all duration-300"
          >
            <Play className="h-4 w-4" />
            New Benchmark
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={item}>
              <SkeletonCard />
            </motion.div>
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon
            const gradientBg = statCardGradients[stat.borderColor] ?? ''
            return (
              <motion.div key={stat.title} variants={item}>
                <Card className={cn('border-l-4', stat.borderColor, 'py-0 gap-0 overflow-hidden', gradientBg)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                        <div className="flex items-baseline gap-1.5">
                          {stat.value > 0 ? (
                            <AnimatedCounter
                              value={stat.value}
                              duration={1000}
                              delay={index * 120}
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
                        <div className="flex items-center gap-1.5">
                          {stat.hasPulse && stat.value > 0 && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">{stat.change}</p>
                        </div>
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

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Throughput Chart */}
        <motion.div variants={item} className="lg:col-span-4">
          {isLoading ? (
            <SkeletonChart height="h-[280px]" />
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Performance Overview</CardTitle>
                <CardDescription>Throughput (tokens/s) over recent benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                {throughputData.length > 0 ? (
                  <ChartContainer config={throughputChartConfig} className="h-[280px] w-full aspect-auto">
                    <AreaChart data={throughputData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="vllm"
                        stroke="#10b981"
                        fill="url(#fillVllm)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sglang"
                        stroke="#f59e0b"
                        fill="url(#fillSglang)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    No benchmark results yet. Run a benchmark to see throughput data.
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
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Engine Distribution</CardTitle>
                <CardDescription>Models by inference engine</CardDescription>
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
                        <ChartTooltip content={<ChartTooltipContent />} />
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
                    No models registered yet.
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
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Latency Distribution</CardTitle>
                <CardDescription>By percentile (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                {results && results.some(r => r.latencyP99Ms > 0) ? (
                  <ChartContainer config={latencyChartConfig} className="h-[240px] w-full aspect-auto">
                    <BarChart data={latencyDistribution} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="vllm" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="sglang" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    No latency data available.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Recent Benchmark Results Table */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Benchmark Results</CardTitle>
                  <CardDescription>Latest test runs across all models</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setActivePage('reports')}
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm animate-pulse">
                  Loading benchmark results...
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
                  No benchmark results yet. Run a benchmark to see results here.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer group hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 py-0"
            onClick={() => setActivePage('benchmark')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
                  <Play className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">New Benchmark</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Run a new benchmark test</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200 py-0"
            onClick={() => setActivePage('models')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900 transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Add Model</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Register a new model</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer group hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-200 py-0"
            onClick={() => setActivePage('parameters')}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900 transition-colors">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Quick Tune</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adjust model parameters</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── System Health ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight mb-3">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* GPU Cluster */}
          <Card className="py-0 gap-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">GPU Cluster</p>
                    <p className="text-xs text-muted-foreground">8/8 GPUs Active</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[11px] font-semibold border-0">
                  Online
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>GPU Utilization</span>
                  <span className="font-medium text-foreground">73%</span>
                </div>
                <Progress value={73} className="h-2 [&>div]:bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          {/* Memory Pool */}
          <Card className="py-0 gap-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Memory Pool</p>
                    <p className="text-xs text-muted-foreground">58.4 / 80 GB Used</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[11px] font-semibold border-0">
                  Warning
                </Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Memory Usage</span>
                  <span className="font-medium text-foreground">73%</span>
                </div>
                <Progress value={73} className="h-2 [&>div]:bg-amber-500" />
              </div>
            </CardContent>
          </Card>

          {/* API Endpoint */}
          <Card className="py-0 gap-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">API Endpoint</p>
                    <p className="text-xs text-muted-foreground">All services operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[11px] font-semibold border-0">
                    Healthy
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Response Time</span>
                  <span className="font-medium text-foreground">12ms avg</span>
                </div>
                <Progress value={12} className="h-2 [&>div]:bg-sky-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Recent Activity Timeline ───────────────────────────────── */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Recent Activity</h2>
        <Card className="py-0 gap-0">
          <CardContent className="p-5">
            <div className="relative space-y-0">
              {[
                {
                  icon: CheckCircle2,
                  color: 'text-emerald-500',
                  dotColor: 'bg-emerald-500',
                  lineColor: 'bg-emerald-200 dark:bg-emerald-800',
                  title: 'Benchmark completed: Qwen2.5-72B Multi-Stream',
                  time: '5 min ago',
                },
                {
                  icon: Info,
                  color: 'text-sky-500',
                  dotColor: 'bg-sky-500',
                  lineColor: 'bg-sky-200 dark:bg-sky-800',
                  title: 'Model deployed: LLaMA-3.1-70B',
                  time: '23 min ago',
                },
                {
                  icon: SlidersHorizontal,
                  color: 'text-amber-500',
                  dotColor: 'bg-amber-500',
                  lineColor: 'bg-amber-200 dark:bg-amber-800',
                  title: 'Parameter profile updated: High Throughput',
                  time: '1h ago',
                },
                {
                  icon: TrendingUp,
                  color: 'text-sky-500',
                  dotColor: 'bg-sky-500',
                  lineColor: 'bg-sky-200 dark:bg-sky-800',
                  title: 'New analysis: Concurrency vs Throughput',
                  time: '2h ago',
                },
                {
                  icon: XCircle,
                  color: 'text-rose-500',
                  dotColor: 'bg-rose-500',
                  lineColor: 'bg-rose-200 dark:bg-rose-800',
                  title: 'Benchmark failed: DeepSeek-V3 Burst Test',
                  time: '3h ago',
                  isLast: true,
                },
              ].map((activity, index) => {
                const Icon = activity.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    className="flex items-start gap-4 pb-6 last:pb-0"
                  >
                    {/* Timeline connector */}
                    <div className="relative flex flex-col items-center">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-background border-2', activity.dotColor.replace('bg-', 'border-'))}>
                        <Icon className={cn('h-4 w-4', activity.color)} />
                      </div>
                      {!activity.isLast && (
                        <div className={cn('w-0.5 flex-1 mt-1', activity.lineColor)} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm font-medium leading-snug">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
