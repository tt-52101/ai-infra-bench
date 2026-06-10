'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, RotateCcw, Trash2, Eye, Clock, Zap, Activity,
  Cpu, HardDrive, ArrowUpRight, Loader2, CheckCircle2, XCircle,
  Timer, ArrowUpDown, ArrowUp, ArrowDown, Filter, Plus,
  Server, Settings, Cloud, ChevronRight, AlertTriangle,
  Gauge, TrendingUp, BarChart3
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from '@/components/ui/chart'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid
} from 'recharts'
import { useBenchmarks, useResults, useModels, useProfiles } from '@/hooks/use-api'
import { toast } from 'sonner'
import type {
  BenchmarkTaskInfo, BenchmarkResultInfo, BenchmarkScenario,
  TaskStatus, ModelInfo, ParameterProfileInfo, EngineType
} from '@/lib/types'

// ─── Extended types for API responses with included relations ────
interface BenchmarkWithRelations extends BenchmarkTaskInfo {
  model?: { id: string; name: string; engine: string }
  profile?: { id: string; name: string; engine: string }
  results?: BenchmarkResultInfo[]
}

// ─── Scenario Config ──────────────────────────────────────────
interface ScenarioConfig {
  id: BenchmarkScenario
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  preset: {
    numRequests: number
    concurrency: number
    duration: number
    inputTokens: number
    outputTokens: number
  }
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'single_stream',
    label: 'Single Stream',
    description: 'Test single request latency and throughput',
    icon: <span className="text-lg font-bold">1→</span>,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    borderColor: 'border-emerald-200 data-[state=selected]:border-emerald-500',
    preset: { numRequests: 100, concurrency: 1, duration: 60, inputTokens: 512, outputTokens: 256 }
  },
  {
    id: 'multi_stream',
    label: 'Multi Stream',
    description: 'Test concurrent request handling',
    icon: <span className="text-lg font-bold">≡→</span>,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100',
    borderColor: 'border-sky-200 data-[state=selected]:border-sky-500',
    preset: { numRequests: 1000, concurrency: 32, duration: 120, inputTokens: 1024, outputTokens: 512 }
  },
  {
    id: 'burst',
    label: 'Burst',
    description: 'Test sudden spike handling',
    icon: <Zap className="size-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    borderColor: 'border-amber-200 data-[state=selected]:border-amber-500',
    preset: { numRequests: 500, concurrency: 64, duration: 30, inputTokens: 256, outputTokens: 128 }
  },
  {
    id: 'serving',
    label: 'Serving',
    description: 'Test production-like serving patterns',
    icon: <Cloud className="size-5" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 hover:bg-violet-100',
    borderColor: 'border-violet-200 data-[state=selected]:border-violet-500',
    preset: { numRequests: 2000, concurrency: 16, duration: 300, inputTokens: 2048, outputTokens: 1024 }
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Configure custom test parameters',
    icon: <Settings className="size-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 hover:bg-slate-100',
    borderColor: 'border-slate-200 data-[state=selected]:border-slate-500',
    preset: { numRequests: 500, concurrency: 8, duration: 120, inputTokens: 1024, outputTokens: 512 }
  }
]

// ─── Helper Functions ─────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatNumber(num: number, decimals = 1): string {
  if (num >= 1000) return `${(num / 1000).toFixed(decimals)}k`
  return num.toFixed(decimals)
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getScenarioLabel(scenario: BenchmarkScenario): string {
  return SCENARIOS.find(s => s.id === scenario)?.label ?? scenario
}

function getScenarioColor(scenario: BenchmarkScenario): string {
  const s = SCENARIOS.find(s => s.id === scenario)
  return s ? s.color : 'text-slate-600'
}

/** Map API benchmark (with nested relations) to flat BenchmarkTaskInfo */
function mapBenchmarkTask(b: BenchmarkWithRelations): BenchmarkTaskInfo {
  return {
    id: b.id,
    name: b.name,
    modelId: b.modelId,
    profileId: b.profileId,
    scenario: b.scenario,
    numRequests: b.numRequests,
    inputTokens: b.inputTokens,
    outputTokens: b.outputTokens,
    concurrency: b.concurrency,
    duration: b.duration,
    status: b.status,
    progress: b.progress,
    startedAt: b.startedAt,
    completedAt: b.completedAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    modelName: b.model?.name ?? b.modelName,
    profileName: b.profile?.name ?? b.profileName,
    engine: b.model?.engine ?? b.engine,
  }
}

// ─── Status Badge Component ───────────────────────────────────
function StatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: <Clock className="size-3" />
    },
    running: {
      label: 'Running',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <Loader2 className="size-3 animate-spin" />
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="size-3" />
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="size-3" />
    }
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={`${c.className} gap-1`}>
      {c.icon} {c.label}
    </Badge>
  )
}

// ─── Stats Card Component ─────────────────────────────────────
function StatsCard({ title, value, icon, color }: {
  title: string; value: number; icon: React.ReactNode; color: string
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mini Chart Component ─────────────────────────────────────
function MiniThroughputChart({ data, height = 80 }: { data: { time: string; throughput: number }[]; height?: number }) {
  const config = {
    throughput: { label: 'Throughput', color: 'hsl(142, 71%, 45%)' }
  }
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="throughput" stroke="hsl(142, 71%, 45%)" fill="url(#throughputGrad)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}

// ─── Latency Distribution Chart ───────────────────────────────
function LatencyDistChart({ data }: { data: { range: string; count: number }[] }) {
  const config = {
    count: { label: 'Requests', color: 'hsl(221, 83%, 53%)' }
  }
  return (
    <ChartContainer config={config} className="w-full" style={{ height: 160 }}>
      <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function BenchmarkPage() {
  const { data: benchmarksRaw, loading: benchmarksLoading, addBenchmark, editBenchmark, removeBenchmark } = useBenchmarks()
  const { data: results, addResult } = useResults()
  const { data: models } = useModels()
  const { data: profiles } = useProfiles()

  // Map API benchmarks to flat BenchmarkTaskInfo with modelName/profileName/engine
  const tasks = useMemo<BenchmarkTaskInfo[]>(() => {
    if (!benchmarksRaw) return []
    return benchmarksRaw.map(mapBenchmarkTask)
  }, [benchmarksRaw])

  // ─── Local State ──────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [selectedResultTask, setSelectedResultTask] = useState<BenchmarkTaskInfo | null>(null)

  // Config form state
  const [taskName, setTaskName] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedScenario, setSelectedScenario] = useState<BenchmarkScenario>('single_stream')
  const [numRequests, setNumRequests] = useState(100)
  const [inputTokens, setInputTokens] = useState(512)
  const [outputTokens, setOutputTokens] = useState(256)
  const [concurrency, setConcurrency] = useState(1)
  const [duration, setDuration] = useState(60)

  // Running benchmark simulation state
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [runningProgress, setRunningProgress] = useState(0)
  const [liveMetrics, setLiveMetrics] = useState({
    requestsCompleted: 0,
    currentThroughput: 0,
    currentLatency: 0,
    elapsedSeconds: 0,
    throughputHistory: [] as { time: string; throughput: number }[]
  })
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const throughputHistoryRef = useRef<{ time: string; throughput: number }[]>([])

  // Table sorting and filtering
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')

  // ─── Derived Data ─────────────────────────────────────────
  const filteredProfiles = useMemo(() =>
    (profiles ?? []).filter(p => p.modelId === selectedModelId),
    [profiles, selectedModelId]
  )

  const stats = useMemo(() => ({
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  }), [tasks])

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = statusFilter === 'all'
      ? [...tasks]
      : tasks.filter(t => t.status === statusFilter)

    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'scenario': cmp = a.scenario.localeCompare(b.scenario); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
        default: cmp = 0
      }
      return sortDirection === 'desc' ? -cmp : cmp
    })

    return filtered
  }, [tasks, statusFilter, sortField, sortDirection])

  // ─── Scenario Change Handler ────────────────────────────────
  const handleScenarioChange = useCallback((scenario: BenchmarkScenario) => {
    setSelectedScenario(scenario)
    const preset = SCENARIOS.find(s => s.id === scenario)!.preset
    setNumRequests(preset.numRequests)
    setInputTokens(preset.inputTokens)
    setOutputTokens(preset.outputTokens)
    setConcurrency(preset.concurrency)
    setDuration(preset.duration)
  }, [])

  // ─── Start Benchmark Handler ────────────────────────────────
  const handleStartBenchmark = useCallback(async () => {
    if (!taskName || !selectedModelId || !selectedProfileId) return

    try {
      // Create benchmark via API (status defaults to 'pending')
      const newTask = await addBenchmark({
        name: taskName,
        modelId: selectedModelId,
        profileId: selectedProfileId,
        scenario: selectedScenario,
        numRequests,
        inputTokens,
        outputTokens,
        concurrency,
        duration,
      })

      // Update to running status
      await editBenchmark(newTask.id, {
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString(),
      })

      setRunningTaskId(newTask.id)
      setRunningProgress(0)
      setConfigOpen(false)

      // Reset form
      setTaskName('')
      setSelectedModelId('')
      setSelectedProfileId('')
      setSelectedScenario('single_stream')
      setNumRequests(100)
      setInputTokens(512)
      setOutputTokens(256)
      setConcurrency(1)
      setDuration(60)

      // Simulate running benchmark
      setLiveMetrics({
        requestsCompleted: 0,
        currentThroughput: 0,
        currentLatency: 0,
        elapsedSeconds: 0,
        throughputHistory: []
      })
      throughputHistoryRef.current = []

      const taskDuration = duration
      const taskNumRequests = numRequests
      const taskConcurrency = concurrency
      const taskInputTokens = inputTokens
      const taskOutputTokens = outputTokens

      const totalSteps = 50
      const intervalMs = 200
      let step = 0

      simulationRef.current = setInterval(() => {
        step++
        const progress = Math.min(Math.round((step / totalSteps) * 100), 100)
        const elapsedSeconds = Math.round((step / totalSteps) * taskDuration)
        const reqsCompleted = Math.round((progress / 100) * taskNumRequests)

        // Simulate realistic throughput with some variance
        const baseThroughput = taskConcurrency === 1 ? 2800 : (1500 + taskConcurrency * 120)
        const variance = (Math.random() - 0.5) * baseThroughput * 0.15
        const currentThroughput = Math.max(0, Math.round(baseThroughput + variance))

        const baseLatency = taskConcurrency === 1 ? 580 : (800 + taskConcurrency * 15)
        const latencyVariance = (Math.random() - 0.5) * baseLatency * 0.2
        const currentLatency = Math.max(0, Math.round(baseLatency + latencyVariance))

        const newHistoryEntry = { time: `${elapsedSeconds}s`, throughput: currentThroughput }
        throughputHistoryRef.current = [...throughputHistoryRef.current, newHistoryEntry]

        setLiveMetrics({
          requestsCompleted: reqsCompleted,
          currentThroughput,
          currentLatency,
          elapsedSeconds,
          throughputHistory: throughputHistoryRef.current
        })
        setRunningProgress(progress)

        if (step >= totalSteps) {
          if (simulationRef.current) clearInterval(simulationRef.current)
          simulationRef.current = null
          setRunningTaskId(null)
          setRunningProgress(0)

          // Generate result data
          const finalThroughput = currentThroughput
          const finalLatency = currentLatency

          // Save result via API
          addResult({
            taskId: newTask.id,
            throughputTokensPerSec: finalThroughput,
            throughputRequestsPerSec: Number((finalThroughput / (taskInputTokens + taskOutputTokens)).toFixed(2)),
            latencyMeanMs: finalLatency,
            latencyP50Ms: Math.round(finalLatency * 0.9),
            latencyP90Ms: Math.round(finalLatency * 1.3),
            latencyP99Ms: Math.round(finalLatency * 1.6),
            timeToFirstTokenMs: Math.round(finalLatency * 0.25),
            timePerOutputTokenMs: Number((1000 / finalThroughput * taskOutputTokens).toFixed(2)),
            gpuMemoryUsedGb: Number((30 + Math.random() * 40).toFixed(1)),
            gpuUtilization: Number((0.6 + Math.random() * 0.35).toFixed(2)),
            cpuUtilization: Number((0.1 + Math.random() * 0.3).toFixed(2)),
            errorRate: Number((Math.random() * 0.02).toFixed(4)),
            totalRequests: taskNumRequests,
            successRequests: taskNumRequests - Math.floor(Math.random() * 5),
            failedRequests: Math.floor(Math.random() * 5),
            detailJson: JSON.stringify({
              latencyDistribution: [
                { range: `0-${Math.round(finalLatency * 0.5)}ms`, count: Math.round(taskNumRequests * 0.2) },
                { range: `${Math.round(finalLatency * 0.5)}-${Math.round(finalLatency * 0.9)}ms`, count: Math.round(taskNumRequests * 0.35) },
                { range: `${Math.round(finalLatency * 0.9)}-${Math.round(finalLatency * 1.2)}ms`, count: Math.round(taskNumRequests * 0.25) },
                { range: `${Math.round(finalLatency * 1.2)}-${Math.round(finalLatency * 1.5)}ms`, count: Math.round(taskNumRequests * 0.12) },
                { range: `${Math.round(finalLatency * 1.5)}-${Math.round(finalLatency * 2)}ms`, count: Math.round(taskNumRequests * 0.05) },
                { range: `>${Math.round(finalLatency * 2)}ms`, count: Math.round(taskNumRequests * 0.03) }
              ],
              throughputTimeline: throughputHistoryRef.current.length > 0
                ? throughputHistoryRef.current
                : [{ time: '0s', throughput: finalThroughput }]
            }),
          }).catch((err) => {
            console.error('Failed to save result:', err)
            toast.error('Failed to save benchmark result')
          })

          // Update benchmark status to completed
          editBenchmark(newTask.id, {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).catch((err) => {
            console.error('Failed to update benchmark:', err)
            toast.error('Failed to update benchmark status')
          })

          toast.success('Benchmark completed successfully')
        }
      }, intervalMs)
    } catch (err) {
      console.error('Failed to start benchmark:', err)
      toast.error('Failed to start benchmark. Please try again.')
    }
  }, [
    taskName, selectedModelId, selectedProfileId, selectedScenario,
    numRequests, inputTokens, outputTokens, concurrency, duration,
    addBenchmark, editBenchmark, addResult
  ])

  // ─── Stop Benchmark Handler ─────────────────────────────────
  const handleStopBenchmark = useCallback(async () => {
    if (!runningTaskId) return
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
    try {
      await editBenchmark(runningTaskId, {
        status: 'failed',
        updatedAt: new Date().toISOString()
      })
      toast.warning('Benchmark stopped')
    } catch (err) {
      console.error('Failed to stop benchmark:', err)
      toast.error('Failed to update benchmark status')
    }
    setRunningTaskId(null)
    setRunningProgress(0)
  }, [runningTaskId, editBenchmark])

  // ─── Delete Handler ─────────────────────────────────────────
  const handleDelete = useCallback(async (taskId: string, taskName: string) => {
    try {
      await removeBenchmark(taskId)
      toast.success(`Deleted "${taskName}"`)
    } catch (err) {
      console.error('Failed to delete benchmark:', err)
      toast.error('Failed to delete benchmark')
    }
  }, [removeBenchmark])

  // ─── Duplicate Task Handler ─────────────────────────────────
  const handleDuplicate = useCallback(async (task: BenchmarkTaskInfo) => {
    try {
      await addBenchmark({
        name: `${task.name} (Copy)`,
        modelId: task.modelId,
        profileId: task.profileId,
        scenario: task.scenario,
        numRequests: task.numRequests,
        inputTokens: task.inputTokens,
        outputTokens: task.outputTokens,
        concurrency: task.concurrency,
        duration: task.duration,
      })
      toast.success(`Duplicated "${task.name}"`)
    } catch (err) {
      console.error('Failed to duplicate benchmark:', err)
      toast.error('Failed to duplicate benchmark')
    }
  }, [addBenchmark])

  // ─── View Result Handler ────────────────────────────────────
  const handleViewResult = useCallback((task: BenchmarkTaskInfo) => {
    setSelectedResultTask(task)
    setResultDialogOpen(true)
  }, [])

  // ─── Sort Handler ───────────────────────────────────────────
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  // ─── Get Result for Task ────────────────────────────────────
  const getResultForTask = useCallback((taskId: string) => {
    return (results ?? []).find(r => r.taskId === taskId)
  }, [results])

  // ─── Sort Icon ──────────────────────────────────────────────
  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <ArrowUpDown className="size-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="size-3" />
      : <ArrowDown className="size-3" />
  }

  // ─── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  // ─── Get Running Task ───────────────────────────────────────
  const runningTask = useMemo(() =>
    runningTaskId ? tasks.find(t => t.id === runningTaskId) : null,
    [runningTaskId, tasks]
  )

  // ─── Result Detail Data ─────────────────────────────────────
  const selectedResult = selectedResultTask ? getResultForTask(selectedResultTask.id) : null
  const selectedDetailJson = selectedResult ? (() => {
    try {
      return JSON.parse(selectedResult.detailJson)
    } catch {
      return null
    }
  })() : null

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header Section ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Benchmark Testing
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Evaluate model performance across different scenarios and configurations
              </p>
            </div>
            <Button onClick={() => setConfigOpen(true)} size="lg" className="shrink-0">
              <Plus className="size-4" /> New Benchmark
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatsCard
              title="Total Tests"
              value={stats.total}
              icon={<BarChart3 className="size-5 text-slate-600" />}
              color="bg-slate-100"
            />
            <StatsCard
              title="Running"
              value={stats.running}
              icon={<Activity className="size-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <StatsCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle2 className="size-5 text-emerald-600" />}
              color="bg-emerald-50"
            />
            <StatsCard
              title="Failed"
              value={stats.failed}
              icon={<XCircle className="size-5 text-red-600" />}
              color="bg-red-50"
            />
          </div>
        </motion.div>

        {/* ── Running Benchmark Panel ────────────────────── */}
        <AnimatePresence>
          {runningTask && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 overflow-hidden"
            >
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-sky-50/50 py-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
                        <Loader2 className="size-4 animate-spin text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{runningTask.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {runningTask.modelName} • {getScenarioLabel(runningTask.scenario)} • Concurrency: {runningTask.concurrency}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopBenchmark}
                    >
                      <Square className="size-3" /> Stop
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{runningProgress}%</span>
                    </div>
                    <Progress value={runningProgress} className="h-2.5" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-muted-foreground text-xs">Requests Done</p>
                      <p className="text-lg font-bold">{liveMetrics.requestsCompleted}/{runningTask.numRequests}</p>
                    </div>
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-muted-foreground text-xs">Throughput</p>
                      <p className="text-lg font-bold">{formatNumber(liveMetrics.currentThroughput)} <span className="text-muted-foreground text-xs font-normal">tok/s</span></p>
                    </div>
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-muted-foreground text-xs">Latency</p>
                      <p className="text-lg font-bold">{liveMetrics.currentLatency} <span className="text-muted-foreground text-xs font-normal">ms</span></p>
                    </div>
                    <div className="rounded-lg bg-white/60 p-3">
                      <p className="text-muted-foreground text-xs">Elapsed / Remaining</p>
                      <p className="text-lg font-bold">
                        {liveMetrics.elapsedSeconds}s <span className="text-muted-foreground text-xs font-normal">/ {Math.max(0, runningTask.duration - liveMetrics.elapsedSeconds)}s</span>
                      </p>
                    </div>
                  </div>

                  {/* Mini throughput chart */}
                  {liveMetrics.throughputHistory.length > 2 && (
                    <MiniThroughputChart data={liveMetrics.throughputHistory} height={100} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Benchmark History Table ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6"
        >
          <Card className="py-4">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Benchmark History</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground size-4" />
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
                  >
                    <SelectTrigger className="h-8 w-[130px]" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {benchmarksLoading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('name')}
                        >
                          <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
                        </TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('scenario')}
                        >
                          <span className="flex items-center gap-1">Scenario <SortIcon field="scenario" /></span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('status')}
                        >
                          <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                        </TableHead>
                        <TableHead>Throughput</TableHead>
                        <TableHead>Latency P99</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('createdAt')}
                        >
                          <span className="flex items-center gap-1">Created <SortIcon field="createdAt" /></span>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center">
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                              <BarChart3 className="size-8 opacity-40" />
                              <p className="text-sm">No benchmark tasks found</p>
                              <p className="text-xs">Click &quot;New Benchmark&quot; to create one</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedTasks.map(task => {
                          const result = getResultForTask(task.id)
                          return (
                            <TableRow key={task.id} className="group">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{task.name}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {task.engine?.toUpperCase()} • {task.profileName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1.5">
                                  <Server className="text-muted-foreground size-3.5" />
                                  {task.modelName}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`flex items-center gap-1 text-sm font-medium ${getScenarioColor(task.scenario)}`}>
                                  {getScenarioLabel(task.scenario)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={task.status} />
                              </TableCell>
                              <TableCell>
                                {result ? (
                                  <span className="font-mono text-sm">
                                    {formatNumber(result.throughputTokensPerSec)} tok/s
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {result ? (
                                  <span className="font-mono text-sm">
                                    {result.latencyP99Ms}ms
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {task.status === 'running' ? (
                                  <span className="text-blue-600 text-sm">
                                    {formatDuration(liveMetrics.elapsedSeconds)} / {formatDuration(task.duration)}
                                  </span>
                                ) : task.completedAt && task.startedAt ? (
                                  <span className="text-sm">
                                    {formatDuration(Math.round(
                                      (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000
                                    ))}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    {formatDuration(task.duration)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-muted-foreground text-sm cursor-default">
                                      {getTimeAgo(task.createdAt)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {new Date(task.createdAt).toLocaleString()}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {task.status === 'completed' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-8"
                                          onClick={() => handleViewResult(task)}
                                        >
                                          <Eye className="size-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View Results</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => handleDuplicate(task)}
                                      >
                                        <RotateCcw className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicate</TooltipContent>
                                  </Tooltip>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="size-8">
                                        <Trash2 className="size-4 text-red-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Benchmark</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete &quot;{task.name}&quot;? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(task.id, task.name)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── New Benchmark Configuration Sheet ──────────── */}
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="mt-4">
            <SheetTitle className="text-xl">New Benchmark</SheetTitle>
            <SheetDescription>
              Configure and start a new benchmark test for your model.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Test Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Test Info</h3>

              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  placeholder="e.g., LLaMA-3.1 Single Stream Test"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={selectedModelId} onValueChange={(v) => {
                  setSelectedModelId(v)
                  setSelectedProfileId('')
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {(models ?? []).map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          {model.name}
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {model.engine.toUpperCase()}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Parameter Profile</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId} disabled={!selectedModelId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedModelId ? 'Select a profile' : 'Select a model first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProfiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.isPreset && (
                          <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                            Preset
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Scenario Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Scenario</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SCENARIOS.map(scenario => (
                  <motion.button
                    key={scenario.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleScenarioChange(scenario.id)}
                    data-state={selectedScenario === scenario.id ? 'selected' : 'unselected'}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${scenario.bgColor} ${scenario.borderColor} ${
                      selectedScenario === scenario.id
                        ? 'ring-2 ring-offset-1 shadow-sm'
                        : ''
                    }`}
                    style={selectedScenario === scenario.id ? {
                      borderColor: scenario.color.includes('emerald') ? '#059669' :
                        scenario.color.includes('sky') ? '#0284c7' :
                        scenario.color.includes('amber') ? '#d97706' :
                        scenario.color.includes('violet') ? '#7c3aed' :
                        '#475569'
                    } : {}}
                  >
                    <span className={scenario.color}>{scenario.icon}</span>
                    <span className="text-xs font-semibold">{scenario.label}</span>
                    <span className="text-muted-foreground text-[10px] leading-tight text-center">
                      {scenario.description}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Test Parameters */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Test Parameters</h3>

              <div className="space-y-2">
                <Label htmlFor="num-requests">Number of Requests</Label>
                <Input
                  id="num-requests"
                  type="number"
                  min={1}
                  max={100000}
                  value={numRequests}
                  onChange={e => setNumRequests(Number(e.target.value))}
                  disabled={selectedScenario !== 'custom'}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Input Token Length</Label>
                  <span className="text-muted-foreground text-xs font-mono">{inputTokens}</span>
                </div>
                <Slider
                  value={[inputTokens]}
                  onValueChange={([v]) => setInputTokens(v)}
                  min={32}
                  max={8192}
                  step={32}
                  disabled={selectedScenario !== 'custom'}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Output Token Length</Label>
                  <span className="text-muted-foreground text-xs font-mono">{outputTokens}</span>
                </div>
                <Slider
                  value={[outputTokens]}
                  onValueChange={([v]) => setOutputTokens(v)}
                  min={32}
                  max={8192}
                  step={32}
                  disabled={selectedScenario !== 'custom'}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Concurrency Level</Label>
                  <span className="text-muted-foreground text-xs font-mono">{concurrency}</span>
                </div>
                <Slider
                  value={[concurrency]}
                  onValueChange={([v]) => setConcurrency(v)}
                  min={1}
                  max={128}
                  step={1}
                  disabled={selectedScenario !== 'custom'}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Test Duration</Label>
                  <span className="text-muted-foreground text-xs font-mono">{duration}s</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={10}
                  max={600}
                  step={10}
                  disabled={selectedScenario !== 'custom'}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartBenchmark}
              disabled={!taskName || !selectedModelId || !selectedProfileId}
            >
              <Play className="size-4" /> Start Benchmark
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Benchmark Result Detail Dialog ─────────────── */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedResultTask && selectedResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gauge className="size-5" />
                  {selectedResultTask.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedResultTask.modelName} • {getScenarioLabel(selectedResultTask.scenario)} • {selectedResultTask.engine?.toUpperCase()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="performance" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="performance" className="flex-1">
                    <TrendingUp className="size-3.5" /> Performance
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="flex-1">
                    <Cpu className="size-3.5" /> Resources
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">
                    <Activity className="size-3.5" /> Details
                  </TabsTrigger>
                </TabsList>

                {/* Performance Tab */}
                <TabsContent value="performance" className="mt-4 space-y-4">
                  {/* Throughput Cards */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Throughput</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="py-3">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
                              <ArrowUpRight className="size-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Tokens/sec</p>
                              <p className="text-xl font-bold">{formatNumber(selectedResult.throughputTokensPerSec)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-3">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100">
                              <Activity className="size-4 text-sky-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Requests/sec</p>
                              <p className="text-xl font-bold">{selectedResult.throughputRequestsPerSec}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Latency Cards */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Latency</h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Mean', value: selectedResult.latencyMeanMs },
                        { label: 'P50', value: selectedResult.latencyP50Ms },
                        { label: 'P90', value: selectedResult.latencyP90Ms },
                        { label: 'P99', value: selectedResult.latencyP99Ms },
                      ].map(item => (
                        <Card key={item.label} className="py-3">
                          <CardContent className="p-3 text-center">
                            <p className="text-muted-foreground text-xs">{item.label}</p>
                            <p className="text-lg font-bold">{item.value}<span className="text-muted-foreground text-xs font-normal ml-0.5">ms</span></p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* TTFT & TPOT */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">First Token & Per-Token</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="py-3">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                              <Timer className="size-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">TTFT</p>
                              <p className="text-lg font-bold">{selectedResult.timeToFirstTokenMs}<span className="text-muted-foreground text-xs font-normal ml-0.5">ms</span></p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-3">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
                              <Zap className="size-4 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">TPOT</p>
                              <p className="text-lg font-bold">{selectedResult.timePerOutputTokenMs}<span className="text-muted-foreground text-xs font-normal ml-0.5">ms</span></p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Throughput Timeline Chart */}
                  {selectedDetailJson?.throughputTimeline && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Throughput Timeline</h4>
                      <MiniThroughputChart data={selectedDetailJson.throughputTimeline} height={140} />
                    </div>
                  )}
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card className="py-3">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
                            <HardDrive className="size-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">GPU Memory</p>
                            <p className="text-lg font-bold">{selectedResult.gpuMemoryUsedGb}<span className="text-muted-foreground text-xs font-normal ml-0.5">GB</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100">
                            <Cpu className="size-4 text-sky-600" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">GPU Utilization</p>
                            <p className="text-lg font-bold">{(selectedResult.gpuUtilization * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-3">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                            <Server className="size-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">CPU Utilization</p>
                            <p className="text-lg font-bold">{(selectedResult.cpuUtilization * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Utilization Bars */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>GPU Memory</span>
                        <span className="font-mono">{selectedResult.gpuMemoryUsedGb} GB</span>
                      </div>
                      <Progress value={(selectedResult.gpuMemoryUsedGb / 80) * 100} className="h-3" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>GPU Utilization</span>
                        <span className="font-mono">{(selectedResult.gpuUtilization * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={selectedResult.gpuUtilization * 100} className="h-3" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>CPU Utilization</span>
                        <span className="font-mono">{(selectedResult.cpuUtilization * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={selectedResult.cpuUtilization * 100} className="h-3" />
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-4 space-y-4">
                  {/* Error Stats */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Request Statistics</h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Card className="py-3">
                        <CardContent className="p-3 text-center">
                          <p className="text-muted-foreground text-xs">Total</p>
                          <p className="text-lg font-bold">{selectedResult.totalRequests}</p>
                        </CardContent>
                      </Card>
                      <Card className="py-3">
                        <CardContent className="p-3 text-center">
                          <p className="text-muted-foreground text-xs">Success</p>
                          <p className="text-lg font-bold text-emerald-600">{selectedResult.successRequests}</p>
                        </CardContent>
                      </Card>
                      <Card className="py-3">
                        <CardContent className="p-3 text-center">
                          <p className="text-muted-foreground text-xs">Failed</p>
                          <p className="text-lg font-bold text-red-600">{selectedResult.failedRequests}</p>
                        </CardContent>
                      </Card>
                      <Card className="py-3">
                        <CardContent className="p-3 text-center">
                          <p className="text-muted-foreground text-xs">Error Rate</p>
                          <p className="text-lg font-bold">{(selectedResult.errorRate * 100).toFixed(2)}%</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Latency Distribution Chart */}
                  {selectedDetailJson?.latencyDistribution && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Latency Distribution</h4>
                      <LatencyDistChart data={selectedDetailJson.latencyDistribution} />
                    </div>
                  )}

                  {/* Test Configuration */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Test Configuration</h4>
                    <Card className="py-3">
                      <CardContent className="p-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Scenario</span>
                            <span className="font-medium">{getScenarioLabel(selectedResultTask.scenario)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Requests</span>
                            <span className="font-medium">{selectedResultTask.numRequests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Input Tokens</span>
                            <span className="font-medium">{selectedResultTask.inputTokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Output Tokens</span>
                            <span className="font-medium">{selectedResultTask.outputTokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Concurrency</span>
                            <span className="font-medium">{selectedResultTask.concurrency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{formatDuration(selectedResultTask.duration)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
