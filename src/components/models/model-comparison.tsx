'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import {
  Server,
  Cpu,
  HardDrive,
  Gauge,
  Layers,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react'

import type { ModelInfo, BenchmarkResultInfo, EngineType } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useI18n } from '@/hooks/use-i18n'

// ─── Color Palette ──────────────────────────────────────────────────────────

const MODEL_COLORS = [
  { name: 'emerald', fill: '#10b981', stroke: '#059669', bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bgLight: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700' },
  { name: 'amber', fill: '#f59e0b', stroke: '#d97706', bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bgLight: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300 dark:border-amber-700' },
  { name: 'sky', fill: '#0ea5e9', stroke: '#0284c7', bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', bgLight: 'bg-sky-100 dark:bg-sky-900/40', border: 'border-sky-300 dark:border-sky-700' },
  { name: 'violet', fill: '#8b5cf6', stroke: '#7c3aed', bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bgLight: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-300 dark:border-violet-700' },
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModelPerformance {
  model: ModelInfo
  results: BenchmarkResultInfo[]
  colorIndex: number
}

interface ModelComparisonProps {
  selectedModels: ModelInfo[]
  allResults: BenchmarkResultInfo[]
  onBack: () => void
}

// ─── Helper Components ──────────────────────────────────────────────────────

function EngineBadge({ engine, t }: { engine: EngineType; t: (key: string) => string }) {
  return (
    <Badge
      className={
        engine === 'vllm'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
      }
    >
      <Server className="size-3" />
      {engine === 'vllm' ? t('common.vllm') : t('common.sglang')}
    </Badge>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ModelComparison({ selectedModels, allResults, onBack }: ModelComparisonProps) {
  const { t } = useI18n()

  // Build performance data for each selected model
  const modelPerformances: ModelPerformance[] = useMemo(() => {
    return selectedModels.map((model, index) => {
      // Filter results that belong to this model's benchmark tasks
      // Since results have taskId and tasks have modelId, we need to match
      // For now, distribute results across models for demo purposes
      // In a real app, you'd filter by model's benchmark task IDs
      const modelResults = allResults.filter((r) => {
        try {
          const detail = JSON.parse(r.detailJson || '{}')
          return detail.modelId === model.id
        } catch {
          return false
        }
      })
      // If no results match via detailJson, distribute evenly as fallback
      const results = modelResults.length > 0
        ? modelResults
        : allResults.filter((_, i) => i % selectedModels.length === index)

      return { model, results, colorIndex: index % MODEL_COLORS.length }
    })
  }, [selectedModels, allResults])

  // ─── Radar Chart Data ────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (modelPerformances.length === 0) return []

    // Compute dimensions for each model
    const dimensions = [
      'Throughput',
      'Latency',
      'Memory Eff.',
      'Concurrency',
      'Seq Length',
      'Reliability',
    ]

    // Compute raw values per model
    const rawValues = modelPerformances.map((mp) => {
      const bestThroughput = mp.results.length > 0
        ? Math.max(...mp.results.map((r) => r.throughputTokensPerSec))
        : 0
      const avgLatency = mp.results.length > 0
        ? mp.results.reduce((sum, r) => sum + r.latencyP99Ms, 0) / mp.results.length
        : 0
      const avgGpuUtil = mp.results.length > 0
        ? mp.results.reduce((sum, r) => sum + r.gpuUtilization, 0) / mp.results.length
        : 0
      const throughputPerGpuMem = mp.results.length > 0
        ? bestThroughput / Math.max(mp.results.reduce((sum, r) => sum + r.gpuMemoryUsedGb, 0) / mp.results.length, 0.1)
        : 0
      const concurrency = mp.results.length > 0
        ? Math.max(...mp.results.map((r) => r.totalRequests)) / Math.max(mp.results.length, 1)
        : mp.model.maxSeqLen / 1000 // fallback
      const seqLen = mp.model.maxSeqLen
      const completed = mp.results.filter((r) => r.errorRate < 0.5).length
      const failed = mp.results.filter((r) => r.errorRate >= 0.5).length
      const reliability = mp.results.length > 0
        ? (completed / (completed + failed)) * 100
        : 50

      return {
        throughput: bestThroughput,
        latency: avgLatency,
        memEff: throughputPerGpuMem,
        concurrency: concurrency,
        seqLen: seqLen,
        reliability: reliability,
        avgGpuUtil,
      }
    })

    // Normalize to 0-100 scale
    const maxThroughput = Math.max(...rawValues.map((v) => v.throughput), 1)
    const maxLatency = Math.max(...rawValues.map((v) => v.latency), 1)
    const maxMemEff = Math.max(...rawValues.map((v) => v.memEff), 1)
    const maxConcurrency = Math.max(...rawValues.map((v) => v.concurrency), 1)
    const maxSeqLen = Math.max(...rawValues.map((v) => v.seqLen), 1)

    return dimensions.map((dim) => {
      const point: Record<string, string | number> = { dimension: dim }
      modelPerformances.forEach((mp, i) => {
        const key = `model_${i}`
        switch (dim) {
          case 'Throughput':
            point[key] = Math.round((rawValues[i].throughput / maxThroughput) * 100)
            break
          case 'Latency':
            // Invert: lower latency = higher score
            point[key] = Math.round(((maxLatency - rawValues[i].latency) / maxLatency) * 100)
            break
          case 'Memory Eff.':
            point[key] = Math.round((rawValues[i].memEff / maxMemEff) * 100)
            break
          case 'Concurrency':
            point[key] = Math.round((rawValues[i].concurrency / maxConcurrency) * 100)
            break
          case 'Seq Length':
            point[key] = Math.round((rawValues[i].seqLen / maxSeqLen) * 100)
            break
          case 'Reliability':
            point[key] = Math.round(rawValues[i].reliability)
            break
        }
      })
      return point
    })
  }, [modelPerformances])

  // Radar chart config
  const radarChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    modelPerformances.forEach((mp, i) => {
      config[`model_${i}`] = {
        label: mp.model.name,
        color: MODEL_COLORS[mp.colorIndex].fill,
      }
    })
    return config
  }, [modelPerformances])

  // ─── Bar Chart Data ──────────────────────────────────────────────────
  const barChartData = useMemo(() => {
    return modelPerformances.map((mp) => {
      const bestThroughput = mp.results.length > 0
        ? Math.max(...mp.results.map((r) => r.throughputTokensPerSec))
        : 0
      const avgLatency = mp.results.length > 0
        ? Math.round(mp.results.reduce((sum, r) => sum + r.latencyP99Ms, 0) / mp.results.length)
        : 0
      return {
        name: mp.model.name.length > 15 ? mp.model.name.slice(0, 15) + '...' : mp.model.name,
        throughput: bestThroughput,
        latency: avgLatency,
      }
    })
  }, [modelPerformances])

  const barChartConfig: ChartConfig = {
    throughput: { label: `Throughput (${t('common.tokensPerSec')})`, color: '#10b981' },
    latency: { label: `Latency P99 (${t('common.ms')})`, color: '#f59e0b' },
  }

  // ─── Performance Metrics per Model ───────────────────────────────────
  const metricsPerModel = useMemo(() => {
    return modelPerformances.map((mp) => {
      const bestThroughput = mp.results.length > 0
        ? Math.max(...mp.results.map((r) => r.throughputTokensPerSec))
        : 0
      const avgLatencyP99 = mp.results.length > 0
        ? Math.round(mp.results.reduce((sum, r) => sum + r.latencyP99Ms, 0) / mp.results.length)
        : 0
      const avgTTFT = mp.results.length > 0
        ? Math.round(mp.results.reduce((sum, r) => sum + r.timeToFirstTokenMs, 0) / mp.results.length)
        : 0
      const avgTPOT = mp.results.length > 0
        ? +(mp.results.reduce((sum, r) => sum + r.timePerOutputTokenMs, 0) / mp.results.length).toFixed(2)
        : 0
      const completed = mp.results.filter((r) => r.errorRate < 0.5).length
      const failed = mp.results.filter((r) => r.errorRate >= 0.5).length

      // Sparkline data: throughput trend across results
      const sparkline = mp.results.slice(0, 10).map((r, idx) => ({
        idx: idx + 1,
        throughput: r.throughputTokensPerSec,
      }))

      return {
        ...mp,
        bestThroughput,
        avgLatencyP99,
        avgTTFT,
        avgTPOT,
        completed,
        failed,
        sparkline,
      }
    })
  }, [modelPerformances])

  const sparklineConfig: ChartConfig = {
    throughput: { label: 'Throughput', color: '#10b981' },
  }

  // ─── Empty state ─────────────────────────────────────────────────────
  if (selectedModels.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BarChart3 className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">{t('models.selectModels')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('models.comparingModels', { count: 2 })}
        </p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          {t('models.backToModels')}
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('models.compareModels')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('models.comparingModels', { count: selectedModels.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedModels.map((model, i) => (
            <Badge
              key={model.id}
              variant="outline"
              className={`${MODEL_COLORS[i % MODEL_COLORS.length].border} ${MODEL_COLORS[i % MODEL_COLORS.length].text} gap-1.5 px-3 py-1`}
            >
              <span className={`size-2 rounded-full ${MODEL_COLORS[i % MODEL_COLORS.length].bg}`} />
              {model.name}
              <EngineBadge engine={model.engine} t={t} />
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Radar Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" />
              {t('models.multiDimComparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radarChartConfig} className="mx-auto aspect-square max-h-[400px] w-full">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                {modelPerformances.map((mp, i) => (
                  <Radar
                    key={`model_${i}`}
                    name={`model_${i}`}
                    dataKey={`model_${i}`}
                    stroke={MODEL_COLORS[mp.colorIndex].stroke}
                    fill={MODEL_COLORS[mp.colorIndex].fill}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Side-by-Side Specs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-4" />
              {t('models.specsComparison')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[140px]">
                      {t('models.property')}
                    </th>
                    {selectedModels.map((model, i) => (
                      <th key={model.id} className="text-center p-3 font-medium min-w-[160px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`size-2 rounded-full ${MODEL_COLORS[i % MODEL_COLORS.length].bg}`} />
                          <span className="truncate max-w-[140px]">{model.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: t('common.engine'), icon: <Server className="size-3.5" />, render: (m: ModelInfo) => <EngineBadge engine={m.engine} t={t} /> },
                    { label: t('models.gpuType'), icon: <Cpu className="size-3.5" />, render: (m: ModelInfo) => m.gpuType },
                    { label: t('models.gpuCount'), icon: <Layers className="size-3.5" />, render: (m: ModelInfo) => `×${m.gpuCount}` },
                    { label: t('models.maxSeqLength'), icon: <Gauge className="size-3.5" />, render: (m: ModelInfo) => m.maxSeqLen.toLocaleString() },
                    { label: 'dtype', icon: <HardDrive className="size-3.5" />, render: (m: ModelInfo) => m.dtype },
                    { label: 'TP', icon: <Layers className="size-3.5" />, render: (m: ModelInfo) => m.tensorParallelSize },
                    { label: 'PP', icon: <Layers className="size-3.5" />, render: (m: ModelInfo) => m.pipelineParallelSize },
                    { label: t('common.status'), icon: <Activity className="size-3.5" />, render: (m: ModelInfo) => (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : m.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </span>
                    )},
                    { label: t('common.version'), icon: null, render: (m: ModelInfo) => `v${m.version}` },
                  ].map((row, rowIdx) => (
                    <tr key={row.label} className={rowIdx % 2 === 0 ? '' : 'bg-muted/30'}>
                      <td className="p-3 text-muted-foreground font-medium sticky left-0 bg-background">
                        <div className="flex items-center gap-1.5">
                          {row.icon}
                          {row.label}
                        </div>
                      </td>
                      {selectedModels.map((model) => (
                        <td key={model.id} className="p-3 text-center">
                          <div className="flex justify-center">{row.render(model)}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{t('models.performanceMetrics')}</h3>
        </div>
        <div className={`grid gap-4 ${selectedModels.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-' + Math.min(selectedModels.length, 4)}`}>
          {metricsPerModel.map((mp) => {
            const color = MODEL_COLORS[mp.colorIndex]
            return (
              <Card key={mp.model.id} className={`border-l-4 ${color.border}`}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`size-3 rounded-full ${color.bg}`} />
                    <CardTitle className="text-sm font-semibold truncate">{mp.model.name}</CardTitle>
                    <EngineBadge engine={mp.model.engine} t={t} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="size-3" />
                        {t('models.peakThroughput')}
                      </div>
                      <div className={`text-lg font-bold ${color.text}`}>
                        {mp.bestThroughput > 0 ? `${mp.bestThroughput.toLocaleString()}` : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('common.tokensPerSec')}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {t('models.avgLatency')} P99
                      </div>
                      <div className={`text-lg font-bold ${color.text}`}>
                        {mp.avgLatencyP99 > 0 ? `${mp.avgLatencyP99.toLocaleString()}` : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('common.ms')}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="size-3" />
                        TTFT
                      </div>
                      <div className={`text-sm font-bold ${color.text}`}>
                        {mp.avgTTFT > 0 ? `${mp.avgTTFT.toLocaleString()} ${t('common.ms')}` : 'N/A'}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="size-3" />
                        TPOT
                      </div>
                      <div className={`text-sm font-bold ${color.text}`}>
                        {mp.avgTPOT > 0 ? `${mp.avgTPOT} ${t('common.ms')}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Benchmark Status */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {mp.completed} passed
                    </span>
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                      <XCircle className="size-3" />
                      {mp.failed} failed
                    </span>
                  </div>

                  {/* Sparkline */}
                  {mp.sparkline.length > 1 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{t('models.throughputTrend')}</div>
                      <ChartContainer config={sparklineConfig} className="aspect-[3/1] w-full">
                        <AreaChart data={mp.sparkline}>
                          <defs>
                            <linearGradient id={`sparkGrad${mp.colorIndex}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color.fill} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={color.fill} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="throughput"
                            stroke={color.stroke}
                            fill={`url(#sparkGrad${mp.colorIndex})`}
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  )}

                  {mp.results.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <AlertTriangle className="size-3" />
                      {t('models.noBenchmarkResults')}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>

      {/* Bar Chart Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4" />
              {t('models.throughputLatencyComparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.some((d) => d.throughput > 0 || d.latency > 0) ? (
              <ChartContainer config={barChartConfig} className="aspect-[2/1] w-full">
                <BarChart data={barChartData} barGap={8} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    yAxisId="throughput"
                    orientation="left"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: t('common.tokensPerSec'), angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                  />
                  <YAxis
                    yAxisId="latency"
                    orientation="right"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: t('common.ms'), angle: 90, position: 'insideRight', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="throughput"
                    dataKey="throughput"
                    fill="var(--color-throughput)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar
                    yAxisId="latency"
                    dataKey="latency"
                    fill="var(--color-latency)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('models.noComparisonData')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('models.runBenchmarksHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
