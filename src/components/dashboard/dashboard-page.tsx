'use client'

import { Box, Play, Zap, Clock, ArrowRight, Plus, SlidersHorizontal, Activity, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

// ── Mock data ──────────────────────────────────────────────────────────────

const throughputData = [
  { name: 'Mar 1', vllm: 2450, sglang: 2180 },
  { name: 'Mar 3', vllm: 2680, sglang: 2340 },
  { name: 'Mar 5', vllm: 2520, sglang: 2510 },
  { name: 'Mar 7', vllm: 2910, sglang: 2680 },
  { name: 'Mar 9', vllm: 3150, sglang: 2890 },
  { name: 'Mar 11', vllm: 2880, sglang: 3050 },
  { name: 'Mar 13', vllm: 3340, sglang: 3120 },
  { name: 'Mar 15', vllm: 3520, sglang: 3280 },
  { name: 'Mar 17', vllm: 3210, sglang: 3450 },
  { name: 'Mar 19', vllm: 3680, sglang: 3390 },
]

const engineDistribution = [
  { name: 'VLLM', value: 58, color: '#10b981' },
  { name: 'SGLang', value: 42, color: '#f59e0b' },
]

const recentResults = [
  { id: '1', model: 'LLaMA-3-70B', engine: 'vllm', scenario: 'Serving', throughput: 3520, latencyP99: 186, status: 'completed' as const },
  { id: '2', model: 'Qwen2-72B', engine: 'sglang', scenario: 'Multi-Stream', throughput: 2890, latencyP99: 234, status: 'completed' as const },
  { id: '3', model: 'DeepSeek-V2', engine: 'vllm', scenario: 'Single-Stream', throughput: 4120, latencyP99: 98, status: 'completed' as const },
  { id: '4', model: 'Mixtral-8x7B', engine: 'sglang', scenario: 'Burst', throughput: 2150, latencyP99: 412, status: 'running' as const },
  { id: '5', model: 'LLaMA-3-8B', engine: 'vllm', scenario: 'Serving', throughput: 8940, latencyP99: 45, status: 'completed' as const },
  { id: '6', model: 'Qwen2-7B', engine: 'vllm', scenario: 'Custom', throughput: 7650, latencyP99: 62, status: 'completed' as const },
  { id: '7', model: 'Yi-34B', engine: 'sglang', scenario: 'Serving', throughput: 3680, latencyP99: 178, status: 'failed' as const },
]

const latencyDistribution = [
  { name: 'P50', vllm: 85, sglang: 92 },
  { name: 'P90', vllm: 145, sglang: 168 },
  { name: 'P99', vllm: 230, sglang: 285 },
  { name: 'P99.9', vllm: 410, sglang: 520 },
]

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

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setActivePage } = useAppStore()

  const stats = [
    {
      title: 'Total Models',
      value: '12',
      change: '+2 this week',
      icon: Box,
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    },
    {
      title: 'Active Benchmarks',
      value: '3',
      change: '1 running now',
      icon: Play,
      borderColor: 'border-l-amber-500',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    },
    {
      title: 'Avg Throughput',
      value: '3,240',
      unit: 'tokens/s',
      change: '+8.2% vs last',
      icon: Zap,
      borderColor: 'border-l-sky-500',
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
    },
    {
      title: 'Avg Latency P99',
      value: '186',
      unit: 'ms',
      change: '-12.5% vs last',
      icon: Clock,
      borderColor: 'border-l-rose-500',
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    },
  ]

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
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Play className="h-4 w-4" />
            New Benchmark
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.title} variants={item}>
              <Card className={cn('border-l-4', stat.borderColor, 'py-0 gap-0')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                        {stat.unit && (
                          <span className="text-sm text-muted-foreground">{stat.unit}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.iconBg)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Throughput Chart */}
        <motion.div variants={item} className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Performance Overview</CardTitle>
              <CardDescription>Throughput (tokens/s) over recent benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Engine Distribution */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Engine Distribution</CardTitle>
              <CardDescription>Models by inference engine</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <span className="text-sm font-semibold">58%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-muted-foreground">SGLang</span>
                  <span className="text-sm font-semibold">42%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Latency + Table Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latency Distribution */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Latency Distribution</CardTitle>
              <CardDescription>By percentile (ms)</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
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
                          className={cn('text-[11px] font-semibold uppercase', engineStyles[r.engine])}
                        >
                          {r.engine}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{r.scenario}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {r.throughput.toLocaleString()}
                        <span className="text-muted-foreground text-xs ml-0.5">t/s</span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono text-sm">
                        {r.latencyP99}
                        <span className="text-muted-foreground text-xs ml-0.5">ms</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge
                          variant="secondary"
                          className={cn('text-[11px] capitalize', statusStyles[r.status])}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
    </motion.div>
  )
}
