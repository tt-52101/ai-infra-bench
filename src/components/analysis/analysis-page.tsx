'use client'

import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, ReferenceLine, ReferenceArea, ComposedChart, Bar,
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
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BarChart3,
  Cpu, HardDrive, Zap, Clock, ArrowUp, ArrowDown, Search, Download,
  RefreshCw, Plus, Trash2, Eye, Activity, Target, Gauge,
} from 'lucide-react'
import type { EngineType } from '@/lib/types'

// ─── Color Constants ─────────────────────────────────────────────
const VLLM_COLOR = '#10b981'
const SGLANG_COLOR = '#f59e0b'
const MODEL_COLORS: Record<string, string> = {
  'Qwen2.5-72B': '#10b981',
  'Llama-3.1-70B': '#f59e0b',
  'DeepSeek-V2': '#ef4444',
  'Mistral-7B': '#8b5cf6',
  'Yi-1.5-34B': '#06b6d4',
}

const MODELS = ['Qwen2.5-72B', 'Llama-3.1-70B', 'DeepSeek-V2', 'Mistral-7B', 'Yi-1.5-34B']

// ─── Analysis Dimensions ─────────────────────────────────────────
interface AnalysisDimension {
  key: string
  label: string
  xLabel: string
  yLabel: string
  icon: React.ReactNode
  description: string
  inflectionLabel: string
}

const DIMENSIONS: AnalysisDimension[] = [
  { key: 'concurrency_throughput', label: 'Concurrency vs Throughput', xLabel: 'Concurrency', yLabel: 'Throughput (tok/s)', icon: <Zap className="w-5 h-5" />, description: 'Identify the concurrency level where throughput gains diminish', inflectionLabel: 'Optimal Concurrency' },
  { key: 'batch_latency', label: 'Batch Size vs Latency', xLabel: 'Batch Size', yLabel: 'Latency P99 (ms)', icon: <Clock className="w-5 h-5" />, description: 'Find the batch size that balances throughput and latency', inflectionLabel: 'Optimal Batch Size' },
  { key: 'seqlen_memory', label: 'Seq Length vs Memory', xLabel: 'Sequence Length', yLabel: 'GPU Memory (GB)', icon: <HardDrive className="w-5 h-5" />, description: 'Detect when memory usage exceeds GPU capacity', inflectionLabel: 'Memory Limit' },
  { key: 'gpumem_performance', label: 'GPU Mem Util vs Performance', xLabel: 'GPU Memory Utilization', yLabel: 'Throughput (tok/s)', icon: <Cpu className="w-5 h-5" />, description: 'Optimize GPU memory allocation for best performance', inflectionLabel: 'Optimal GPU Util' },
  { key: 'inputlen_ttft', label: 'Input Length vs TTFT', xLabel: 'Input Token Length', yLabel: 'TTFT (ms)', icon: <Activity className="w-5 h-5" />, description: 'Find the input length where TTFT degrades significantly', inflectionLabel: 'TTFT Degradation Point' },
]

// ─── Generate Curve Data ─────────────────────────────────────────
function generateConcurrencyThroughput(model: string, engine: EngineType) {
  const baseThroughput: Record<string, number> = {
    'Qwen2.5-72B': 2800, 'Llama-3.1-70B': 3100, 'DeepSeek-V2': 1900,
    'Mistral-7B': 8900, 'Yi-1.5-34B': 4600,
  }
  const base = baseThroughput[model] || 3000
  const factor = engine === 'sglang' ? 0.9 : 1.0
  const concurrencyLevels = [1, 2, 4, 8, 16, 32, 64, 128, 256]
  const inflectionIdx = engine === 'vllm' ? 5 : 4 // VLLM at 32, SGLang at 16

  return concurrencyLevels.map((c, idx) => {
    let throughput: number
    if (idx <= inflectionIdx) {
      throughput = base * factor * (1 - Math.exp(-0.15 * c))
    } else {
      const peakThroughput = base * factor * (1 - Math.exp(-0.15 * concurrencyLevels[inflectionIdx]))
      const decline = (idx - inflectionIdx) * 0.03
      throughput = peakThroughput * (1 - decline)
    }
    // Add some noise
    throughput *= (0.97 + Math.random() * 0.06)
    return { x: c, y: Math.round(throughput) }
  })
}

function generateBatchLatency(model: string, engine: EngineType) {
  const baseLatency: Record<string, number> = {
    'Qwen2.5-72B': 180, 'Llama-3.1-70B': 170, 'DeepSeek-V2': 210,
    'Mistral-7B': 60, 'Yi-1.5-34B': 110,
  }
  const base = baseLatency[model] || 150
  const factor = engine === 'sglang' ? 0.85 : 1.0
  const batchSizes = [1, 2, 4, 8, 16, 32, 64, 128]
  const inflectionIdx = 4 // batch_size=16

  return batchSizes.map((b, idx) => {
    let latency: number
    if (idx <= inflectionIdx) {
      latency = base * factor * (0.4 + 0.6 * Math.sqrt(idx / inflectionIdx))
    } else {
      const infLatency = base * factor * (0.4 + 0.6 * Math.sqrt(1))
      latency = infLatency + (idx - inflectionIdx) * (base * 0.08)
    }
    latency *= (0.97 + Math.random() * 0.06)
    return { x: b, y: Math.round(latency) }
  })
}

function generateSeqLenMemory(model: string, engine: EngineType) {
  const baseMemory: Record<string, number> = {
    'Qwen2.5-72B': 70, 'Llama-3.1-70B': 66, 'DeepSeek-V2': 76,
    'Mistral-7B': 13, 'Yi-1.5-34B': 37,
  }
  const base = baseMemory[model] || 50
  const factor = engine === 'sglang' ? 0.96 : 1.0
  const seqLens = [512, 1024, 2048, 4096, 8192, 16384, 32768]
  const gpuCapacity = 80
  const inflectionIdx = model === 'Mistral-7B' ? 6 : 5

  return seqLens.map((s, idx) => {
    let memory = base * factor * (0.3 + 0.7 * Math.log2(s) / Math.log2(32768))
    // Step increase for KV cache
    if (idx >= 3) memory += (idx - 2) * 2.5
    if (idx >= inflectionIdx) memory += (idx - inflectionIdx + 1) * 5
    memory *= (0.98 + Math.random() * 0.04)
    return { x: s, y: Math.round(memory * 10) / 10, isOverCapacity: memory > gpuCapacity }
  })
}

function generateGpuMemPerformance(model: string, engine: EngineType) {
  const basePerf: Record<string, number> = {
    'Qwen2.5-72B': 2800, 'Llama-3.1-70B': 3100, 'DeepSeek-V2': 1900,
    'Mistral-7B': 8900, 'Yi-1.5-34B': 4600,
  }
  const base = basePerf[model] || 3000
  const factor = engine === 'sglang' ? 0.9 : 1.0
  const gpuUtils = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98]
  const inflectionIdx = 5 // 0.85

  return gpuUtils.map((g, idx) => {
    let perf: number
    if (idx <= inflectionIdx) {
      perf = base * factor * (0.3 + 0.7 * (g - 0.5) / 0.35)
    } else {
      const peakPerf = base * factor
      perf = peakPerf - (idx - inflectionIdx) * base * 0.05
    }
    perf *= (0.97 + Math.random() * 0.06)
    return { x: g, y: Math.round(perf) }
  })
}

function generateInputLenTTFT(model: string, engine: EngineType) {
  const baseTTFT: Record<string, number> = {
    'Qwen2.5-72B': 40, 'Llama-3.1-70B': 35, 'DeepSeek-V2': 50,
    'Mistral-7B': 10, 'Yi-1.5-34B': 22,
  }
  const base = baseTTFT[model] || 30
  const factor = engine === 'sglang' ? 0.82 : 1.0
  const inputLens = [128, 256, 512, 1024, 2048, 4096, 8192, 16384]
  const inflectionIdx = 5 // 4096 tokens

  return inputLens.map((l, idx) => {
    let ttft: number
    if (idx <= inflectionIdx) {
      ttft = base * factor * (0.5 + 0.5 * (idx / inflectionIdx))
    } else {
      const infTTFT = base * factor
      ttft = infTTFT + (idx - inflectionIdx) * base * 0.6
    }
    ttft *= (0.97 + Math.random() * 0.06)
    return { x: l, y: Math.round(ttft) }
  })
}

function generateCurveData(dimension: string, model: string, engine: EngineType): Array<{ x: number; y: number; isOverCapacity?: boolean }> {
  switch (dimension) {
    case 'concurrency_throughput': return generateConcurrencyThroughput(model, engine)
    case 'batch_latency': return generateBatchLatency(model, engine)
    case 'seqlen_memory': return generateSeqLenMemory(model, engine)
    case 'gpumem_performance': return generateGpuMemPerformance(model, engine)
    case 'inputlen_ttft': return generateInputLenTTFT(model, engine)
    default: return []
  }
}

// ─── Inflection Points ───────────────────────────────────────────
const INFLECTION_POINTS: Record<string, { vllm: number; sglang: number; optimalRange: [number, number]; performanceGain: number; riskLevel: 'Low' | 'Medium' | 'High' }> = {
  concurrency_throughput: { vllm: 32, sglang: 16, optimalRange: [16, 64], performanceGain: 23.5, riskLevel: 'Low' },
  batch_latency: { vllm: 16, sglang: 16, optimalRange: [8, 32], performanceGain: 18.2, riskLevel: 'Medium' },
  seqlen_memory: { vllm: 16384, sglang: 16384, optimalRange: [4096, 16384], performanceGain: 0, riskLevel: 'High' },
  gpumem_performance: { vllm: 0.85, sglang: 0.85, optimalRange: [0.8, 0.9], performanceGain: 15.8, riskLevel: 'Low' },
  inputlen_ttft: { vllm: 4096, sglang: 4096, optimalRange: [512, 4096], performanceGain: 12.3, riskLevel: 'Medium' },
}

// ─── Historical Analysis Data ────────────────────────────────────
interface HistoricalAnalysis {
  id: string
  model: string
  dimension: string
  inflectionPoint: number
  optimalValue: number
  performanceGain: number
  status: 'completed' | 'running' | 'failed'
  createdAt: string
}

const HISTORICAL_ANALYSES: HistoricalAnalysis[] = [
  { id: 'ha1', model: 'Qwen2.5-72B', dimension: 'Concurrency vs Throughput', inflectionPoint: 32, optimalValue: 2840, performanceGain: 23.5, status: 'completed', createdAt: '2025-01-20T10:00:00Z' },
  { id: 'ha2', model: 'Llama-3.1-70B', dimension: 'Batch Size vs Latency', inflectionPoint: 16, optimalValue: 165, performanceGain: 18.2, status: 'completed', createdAt: '2025-01-19T15:30:00Z' },
  { id: 'ha3', model: 'DeepSeek-V2', dimension: 'Seq Length vs Memory', inflectionPoint: 16384, optimalValue: 78, performanceGain: 0, status: 'completed', createdAt: '2025-01-18T09:00:00Z' },
  { id: 'ha4', model: 'Mistral-7B', dimension: 'Input Length vs TTFT', inflectionPoint: 4096, optimalValue: 22, performanceGain: 12.3, status: 'completed', createdAt: '2025-01-17T14:00:00Z' },
  { id: 'ha5', model: 'Yi-1.5-34B', dimension: 'GPU Mem Util vs Performance', inflectionPoint: 0.85, optimalValue: 4580, performanceGain: 15.8, status: 'completed', createdAt: '2025-01-16T11:30:00Z' },
  { id: 'ha6', model: 'Qwen2.5-72B', dimension: 'Input Length vs TTFT', inflectionPoint: 4096, optimalValue: 85, performanceGain: 10.1, status: 'completed', createdAt: '2025-01-15T16:00:00Z' },
  { id: 'ha7', model: 'Llama-3.1-70B', dimension: 'Concurrency vs Throughput', inflectionPoint: 64, optimalValue: 3100, performanceGain: 21.8, status: 'running', createdAt: '2025-01-21T08:00:00Z' },
]

// ─── Recommendations ─────────────────────────────────────────────
function getRecommendations(dimension: string, selectedModel: string): Array<{ title: string; description: string; type: 'success' | 'warning' | 'danger' }> {
  const ip = INFLECTION_POINTS[dimension]
  const recs: Array<{ title: string; description: string; type: 'success' | 'warning' | 'danger' }> = []

  switch (dimension) {
    case 'concurrency_throughput':
      recs.push(
        { title: `For maximum throughput: Use concurrency=${ip.vllm}`, description: `${selectedModel} with VLLM achieves peak throughput at concurrency ${ip.vllm}. Beyond this, gains diminish due to GPU saturation.`, type: 'success' },
        { title: `For lowest latency: Use concurrency=${ip.sglang}`, description: `SGLang shows optimal latency at concurrency ${ip.sglang}. Consider SGLang for latency-sensitive workloads.`, type: 'success' },
        { title: `Optimal concurrency range: ${ip.optimalRange[0]}-${ip.optimalRange[1]}`, description: `Stay within this range for balanced performance. Going beyond may cause resource contention.`, type: 'warning' },
      )
      break
    case 'batch_latency':
      recs.push(
        { title: `Optimal batch size: ${ip.vllm}`, description: `Batch size ${ip.vllm} provides the best latency-throughput trade-off for ${selectedModel}.`, type: 'success' },
        { title: `Avoid batch sizes > 64`, description: `Large batches cause significant latency spikes without proportional throughput gains.`, type: 'warning' },
      )
      break
    case 'seqlen_memory':
      recs.push(
        { title: `Memory warning: ${selectedModel} will OOM at seq_len > 16,384`, description: `GPU memory (80GB) will be exceeded. Consider using quantization or tensor parallelism.`, type: 'danger' },
        { title: `Safe operating range: up to ${ip.optimalRange[1].toLocaleString()} tokens`, description: `Within this range, memory usage stays under 90% of GPU capacity.`, type: 'success' },
      )
      break
    case 'gpumem_performance':
      recs.push(
        { title: `Optimal GPU memory utilization: ${(ip.vllm * 100).toFixed(0)}%`, description: `Setting gpu_memory_utilization to ${ip.vllm} provides the best throughput without OOM risk.`, type: 'success' },
        { title: `Avoid >95% GPU memory utilization`, description: `Near-full memory leads to frequent garbage collection and throughput degradation.`, type: 'warning' },
      )
      break
    case 'inputlen_ttft':
      recs.push(
        { title: `TTFT degrades significantly beyond ${ip.vllm.toLocaleString()} input tokens`, description: `Consider chunking inputs or using prefix caching for longer sequences.`, type: 'warning' },
        { title: `Use prefix caching for repeated long inputs`, description: `SGLang's prefix caching can reduce TTFT by up to 40% for repeated prompt prefixes.`, type: 'success' },
      )
      break
  }
  return recs
}

// ─── Custom Chart Tooltip ────────────────────────────────────────
function AnalysisTooltip({ active, payload, label, yLabel }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: number | string; yLabel: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.dataKey}:</span>
          <span className="font-mono font-medium">{p.value.toLocaleString()} {yLabel.includes('ms') ? 'ms' : yLabel.includes('GB') ? 'GB' : yLabel.includes('%') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export default function AnalysisPage() {
  const [selectedDimension, setSelectedDimension] = useState('concurrency_throughput')
  const [selectedModel, setSelectedModel] = useState('Qwen2.5-72B')
  const [showMultiModel, setShowMultiModel] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState<EngineType | 'both'>('both')

  const dimension = DIMENSIONS.find((d) => d.key === selectedDimension)!
  const inflectionInfo = INFLECTION_POINTS[selectedDimension]!

  // ─── Chart Data ───────────────────────────────────────────────
  const singleModelData = useMemo(() => {
    const vllmData = generateCurveData(selectedDimension, selectedModel, 'vllm')
    const sglangData = generateCurveData(selectedDimension, selectedModel, 'sglang')

    const maxLen = Math.max(vllmData.length, sglangData.length)
    return Array.from({ length: maxLen }, (_, i) => ({
      x: vllmData[i]?.x ?? sglangData[i]?.x ?? 0,
      VLLM: vllmData[i]?.y ?? 0,
      SGLang: sglangData[i]?.y ?? 0,
      isOverCapacity: vllmData[i]?.isOverCapacity || sglangData[i]?.isOverCapacity,
    }))
  }, [selectedDimension, selectedModel])

  const multiModelData = useMemo(() => {
    const allData: Record<string, Array<{ x: number; y: number }>> = {}
    MODELS.forEach((m) => {
      const engine = selectedEngine === 'both' ? 'vllm' : selectedEngine
      allData[m] = generateCurveData(selectedDimension, m, engine)
    })

    const maxLen = Math.max(...Object.values(allData).map((d) => d.length))
    return Array.from({ length: maxLen }, (_, i) => {
      const entry: Record<string, number> = { x: allData[MODELS[0]][i]?.x ?? 0 }
      MODELS.forEach((m) => {
        entry[m] = allData[m][i]?.y ?? 0
      })
      return entry
    })
  }, [selectedDimension, selectedEngine])

  // ─── Inflection Point Reference ───────────────────────────────
  const inflectionX = selectedEngine === 'sglang' ? inflectionInfo.sglang : inflectionInfo.vllm
  const optimalStart = inflectionInfo.optimalRange[0]
  const optimalEnd = inflectionInfo.optimalRange[1]

  // ─── Recommendations ──────────────────────────────────────────
  const recommendations = useMemo(() => getRecommendations(selectedDimension, selectedModel), [selectedDimension, selectedModel])

  // ─── Risk color ───────────────────────────────────────────────
  const riskColor = { Low: 'text-emerald-600', Medium: 'text-amber-600', High: 'text-red-600' }
  const riskBg = { Low: 'bg-emerald-50', Medium: 'bg-amber-50', High: 'bg-red-50' }

  // Format x-axis for special dimensions
  const formatXAxis = (value: number) => {
    if (selectedDimension === 'gpumem_performance') return `${(value * 100).toFixed(0)}%`
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return value.toString()
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inflection Point Analysis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Identify optimal parameter configurations for inference engines
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEngine} onValueChange={(v) => setSelectedEngine(v as EngineType | 'both')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="vllm">VLLM</SelectItem>
              <SelectItem value="sglang">SGLang</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* ─── Analysis Dimension Selection ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DIMENSIONS.map((dim) => (
          <Card
            key={dim.key}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedDimension === dim.key ? 'ring-2 ring-primary shadow-md' : ''}`}
            onClick={() => setSelectedDimension(dim.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${selectedDimension === dim.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {dim.icon}
                </div>
                <span className={`text-xs font-medium ${selectedDimension === dim.key ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dim.label.split(' vs ')[0]}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">{dim.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Analysis Summary Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{dimension.inflectionLabel}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {selectedDimension === 'gpumem_performance' ? `${(inflectionX * 100).toFixed(0)}%` : inflectionX.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Optimal Range</p>
                <p className="text-2xl font-bold tabular-nums">
                  {selectedDimension === 'gpumem_performance'
                    ? `${(optimalStart * 100).toFixed(0)}%-${(optimalEnd * 100).toFixed(0)}%`
                    : `${optimalStart.toLocaleString()}-${optimalEnd.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Performance Gain</p>
                <p className="text-2xl font-bold tabular-nums">{inflectionInfo.performanceGain > 0 ? `+${inflectionInfo.performanceGain}` : 'N/A'}<span className="text-sm font-normal text-muted-foreground">%</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${riskBg[inflectionInfo.riskLevel]}`}>
                <AlertTriangle className={`w-5 h-5 ${riskColor[inflectionInfo.riskLevel]}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Risk Assessment</p>
                <p className={`text-2xl font-bold ${riskColor[inflectionInfo.riskLevel]}`}>{inflectionInfo.riskLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Chart ──────────────────────────────────────── */}
      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single" onClick={() => setShowMultiModel(false)}>Single Model</TabsTrigger>
          <TabsTrigger value="multi" onClick={() => setShowMultiModel(true)}>Multi-Model Comparison</TabsTrigger>
        </TabsList>

        {/* ─── Single Model Chart ─────────────────────────────── */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dimension.label} — {selectedModel}</CardTitle>
              <CardDescription>
                Inflection point marked at {selectedDimension === 'gpumem_performance' ? `${(inflectionX * 100).toFixed(0)}%` : inflectionX.toLocaleString()}. Shaded area shows optimal range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={singleModelData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="x"
                      tick={{ fontSize: 12 }}
                      label={{ value: dimension.xLabel, position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                      tickFormatter={formatXAxis}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ value: dimension.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip content={<AnalysisTooltip yLabel={dimension.yLabel} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />

                    {/* Optimal Zone Shading */}
                    <ReferenceArea
                      x1={optimalStart}
                      x2={optimalEnd}
                      fill="#10b981"
                      fillOpacity={0.08}
                      stroke="#10b981"
                      strokeOpacity={0.2}
                    />

                    {/* Inflection Point Line */}
                    <ReferenceLine
                      x={inflectionX}
                      stroke="#ef4444"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{
                        value: `Inflection: ${selectedDimension === 'gpumem_performance' ? `${(inflectionX * 100).toFixed(0)}%` : inflectionX.toLocaleString()}`,
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />

                    {/* GPU Capacity Line for memory dimension */}
                    {selectedDimension === 'seqlen_memory' && (
                      <ReferenceLine
                        y={80}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{ value: 'GPU Limit (80GB)', position: 'right', fill: '#ef4444', fontSize: 11 }}
                      />
                    )}

                    {(selectedEngine === 'both' || selectedEngine === 'vllm') && (
                      <Line
                        type="monotone"
                        dataKey="VLLM"
                        stroke={VLLM_COLOR}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: VLLM_COLOR, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {(selectedEngine === 'both' || selectedEngine === 'sglang') && (
                      <Line
                        type="monotone"
                        dataKey="SGLang"
                        stroke={SGLANG_COLOR}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: SGLANG_COLOR, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Multi-Model Comparison ─────────────────────────── */}
        <TabsContent value="multi">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dimension.label} — Multi-Model Comparison</CardTitle>
              <CardDescription>
                Overlay of {selectedEngine === 'both' ? 'VLLM' : selectedEngine === 'vllm' ? 'VLLM' : 'SGLang'} curves across all models. Each color represents a different model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={multiModelData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="x"
                      tick={{ fontSize: 12 }}
                      label={{ value: dimension.xLabel, position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                      tickFormatter={formatXAxis}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ value: dimension.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip content={<AnalysisTooltip yLabel={dimension.yLabel} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />

                    {/* Inflection Point Line */}
                    <ReferenceLine
                      x={inflectionX}
                      stroke="#ef4444"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{
                        value: 'Inflection',
                        position: 'top',
                        fill: '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />

                    {selectedDimension === 'seqlen_memory' && (
                      <ReferenceLine
                        y={80}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{ value: 'GPU Limit', position: 'right', fill: '#ef4444', fontSize: 11 }}
                      />
                    )}

                    {MODELS.map((m) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={MODEL_COLORS[m]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: MODEL_COLORS[m], strokeWidth: 1.5, stroke: '#fff' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Recommendations ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Recommendations
          </CardTitle>
          <CardDescription>Auto-generated insights based on inflection point analysis for {selectedModel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  rec.type === 'success' ? 'border-emerald-200 bg-emerald-50/50' :
                  rec.type === 'warning' ? 'border-amber-200 bg-amber-50/50' :
                  'border-red-200 bg-red-50/50'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {rec.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                  {rec.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
                  {rec.type === 'danger' && <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                  <p className="text-sm font-medium leading-tight">{rec.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Historical Analysis Table ───────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Historical Analyses
          </CardTitle>
          <CardDescription>Previous inflection point analyses</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Dimension</TableHead>
                  <TableHead>Inflection Point</TableHead>
                  <TableHead>Optimal Value</TableHead>
                  <TableHead>Perf. Gain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HISTORICAL_ANALYSES.map((ha) => (
                  <TableRow key={ha.id}>
                    <TableCell className="font-medium text-sm">{ha.model}</TableCell>
                    <TableCell className="text-sm">{ha.dimension}</TableCell>
                    <TableCell className="font-mono text-sm">{typeof ha.inflectionPoint === 'number' && ha.inflectionPoint < 1 ? `${(ha.inflectionPoint * 100).toFixed(0)}%` : ha.inflectionPoint.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-sm">{ha.optimalValue.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {ha.performanceGain > 0 ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3" />+{ha.performanceGain}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ha.status === 'completed' ? 'default' : ha.status === 'running' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {ha.status === 'running' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {ha.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(ha.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
