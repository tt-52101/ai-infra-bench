'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, LineChart, Line, ReferenceLine, ReferenceArea, ComposedChart,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BarChart3,
  Cpu, HardDrive, Zap, Clock, ArrowUp, ArrowDown, Search, Download,
  RefreshCw, Plus, Trash2, Eye, Activity, Target, Gauge, Loader2,
  Flame, Lightbulb, ShieldAlert, Scale, Sparkles, ArrowRight,
  Grid3X3, Tornado, Info, Thermometer,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAnalyses, useModels, useBenchmarks, useResults } from '@/hooks/use-api'
import { useI18n } from '@/hooks/use-i18n'
import type { EngineType, ModelInfo } from '@/lib/types'
import { EnhancedAnalysisTooltip, useChartHighlight, HighlightCard } from '@/components/ui/enhanced-chart-tooltip'

// ─── Color Constants ─────────────────────────────────────────────
const VLLM_COLOR = '#10b981'
const SGLANG_COLOR = '#f59e0b'
const COLOR_PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316']

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
  const inflectionIdx = engine === 'vllm' ? 5 : 4

  return concurrencyLevels.map((c, idx) => {
    let throughput: number
    if (idx <= inflectionIdx) {
      throughput = base * factor * (1 - Math.exp(-0.15 * c))
    } else {
      const peakThroughput = base * factor * (1 - Math.exp(-0.15 * concurrencyLevels[inflectionIdx]))
      const decline = (idx - inflectionIdx) * 0.03
      throughput = peakThroughput * (1 - decline)
    }
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
  const inflectionIdx = 4

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
  const inflectionIdx = 5

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
  const inflectionIdx = 5

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
// (Now using EnhancedAnalysisTooltip from enhanced-chart-tooltip.tsx)

// ─── Correlation Heatmap Data ────────────────────────────────────
const HEATMAP_PARAMETERS = [
  { key: 'tensor_parallelism', label: 'Tensor Parallelism', short: 'TP' },
  { key: 'gpu_memory_utilization', label: 'GPU Mem Util', short: 'GPU Mem' },
  { key: 'max_num_seqs', label: 'Max Num Seqs', short: 'MaxSeqs' },
  { key: 'max_model_length', label: 'Max Model Len', short: 'MaxLen' },
  { key: 'block_size', label: 'Block Size', short: 'BlkSize' },
  { key: 'swap_space', label: 'Swap Space', short: 'Swap' },
]

const HEATMAP_METRICS = [
  { key: 'throughput_tokens_per_sec', label: 'Throughput (tok/s)', short: 'Throughput' },
  { key: 'latency_p99_ms', label: 'Latency P99 (ms)', short: 'Latency' },
  { key: 'ttft_ms', label: 'TTFT (ms)', short: 'TTFT' },
  { key: 'tpot_ms', label: 'TPOT (ms)', short: 'TPOT' },
  { key: 'gpu_utilization', label: 'GPU Utilization', short: 'GPU Util' },
  { key: 'memory_efficiency', label: 'Memory Efficiency', short: 'Mem Eff' },
]

function generateCorrelationMatrix(): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  const baseCorrelations: Record<string, Record<string, number>> = {
    tensor_parallelism: {
      throughput_tokens_per_sec: 0.85, latency_p99_ms: -0.72, ttft_ms: -0.15,
      tpot_ms: -0.35, gpu_utilization: 0.78, memory_efficiency: 0.65,
    },
    gpu_memory_utilization: {
      throughput_tokens_per_sec: 0.62, latency_p99_ms: 0.25, ttft_ms: 0.18,
      tpot_ms: 0.12, gpu_utilization: 0.91, memory_efficiency: -0.55,
    },
    max_num_seqs: {
      throughput_tokens_per_sec: 0.58, latency_p99_ms: 0.68, ttft_ms: 0.45,
      tpot_ms: 0.52, gpu_utilization: 0.42, memory_efficiency: -0.38,
    },
    max_model_length: {
      throughput_tokens_per_sec: -0.28, latency_p99_ms: 0.55, ttft_ms: 0.72,
      tpot_ms: 0.48, gpu_utilization: -0.15, memory_efficiency: -0.62,
    },
    block_size: {
      throughput_tokens_per_sec: 0.18, latency_p99_ms: -0.12, ttft_ms: -0.08,
      tpot_ms: -0.10, gpu_utilization: 0.22, memory_efficiency: 0.32,
    },
    swap_space: {
      throughput_tokens_per_sec: -0.35, latency_p99_ms: 0.58, ttft_ms: 0.42,
      tpot_ms: 0.38, gpu_utilization: -0.28, memory_efficiency: 0.45,
    },
  }

  HEATMAP_PARAMETERS.forEach((param) => {
    matrix[param.key] = {}
    HEATMAP_METRICS.forEach((metric) => {
      const base = baseCorrelations[param.key]?.[metric.key] ?? 0
      const noise = (Math.random() - 0.5) * 0.08
      matrix[param.key][metric.key] = Math.round((base + noise) * 100) / 100
    })
  })

  return matrix
}

const CORRELATION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  tensor_parallelism: {
    throughput_tokens_per_sec: 'Strong positive: More GPUs for TP significantly increases throughput via parallel computation',
    latency_p99_ms: 'Strong negative: Higher TP reduces tail latency through distributed processing',
    ttft_ms: 'Weak negative: TP slightly reduces TTFT but communication overhead limits gains',
    tpot_ms: 'Moderate negative: TP reduces per-token latency but with diminishing returns',
    gpu_utilization: 'Strong positive: More TP GPUs leads to higher aggregate GPU utilization',
    memory_efficiency: 'Moderate positive: TP distributes KV cache across GPUs, improving per-GPU efficiency',
  },
  gpu_memory_utilization: {
    throughput_tokens_per_sec: 'Moderate positive: More GPU memory for KV cache allows more concurrent requests',
    latency_p99_ms: 'Weak positive: Higher mem util can cause GC pressure, slightly increasing P99',
    ttft_ms: 'Weak positive: More prefill memory slightly increases TTFT overhead',
    tpot_ms: 'Weak positive: Higher utilization can cause minor decode latency increases',
    gpu_utilization: 'Strong positive: Allocating more memory directly increases GPU utilization',
    memory_efficiency: 'Moderate negative: Near-full memory reduces efficiency due to fragmentation and GC',
  },
  max_num_seqs: {
    throughput_tokens_per_sec: 'Moderate positive: More concurrent sequences improves throughput up to a point',
    latency_p99_ms: 'Moderate positive: Higher concurrency causes latency tail to grow',
    ttft_ms: 'Moderate positive: More sequences queuing increases time-to-first-token',
    tpot_ms: 'Moderate positive: Higher concurrency degrades per-token latency',
    gpu_utilization: 'Weak positive: More sequences keeps GPU busier',
    memory_efficiency: 'Weak negative: More concurrent sequences fragments memory usage',
  },
  max_model_length: {
    throughput_tokens_per_sec: 'Weak negative: Longer max seq pre-allocates more memory, reducing available throughput',
    latency_p99_ms: 'Moderate positive: Longer sequences increase tail latency significantly',
    ttft_ms: 'Strong positive: Longer inputs dramatically increase prefill time',
    tpot_ms: 'Moderate positive: Longer outputs increase decode time per request',
    gpu_utilization: 'Weak negative: Memory reservation for long sequences reduces active utilization',
    memory_efficiency: 'Moderate negative: Pre-allocated memory for long seqs is often underutilized',
  },
  block_size: {
    throughput_tokens_per_sec: 'Weak positive: Larger blocks can slightly improve memory access patterns',
    latency_p99_ms: 'Weak negative: Optimized block sizes slightly reduce latency',
    ttft_ms: 'Weak negative: Block size has minimal effect on TTFT',
    tpot_ms: 'Weak negative: Good block alignment slightly reduces decode latency',
    gpu_utilization: 'Weak positive: Larger blocks improve memory coalescing',
    memory_efficiency: 'Weak positive: Well-chosen block sizes reduce memory waste',
  },
  swap_space: {
    throughput_tokens_per_sec: 'Moderate negative: Swapping to CPU severely degrades throughput',
    latency_p99_ms: 'Moderate positive: Swapping causes significant latency spikes',
    ttft_ms: 'Moderate positive: Swapped-out KV cache must be loaded, increasing TTFT',
    tpot_ms: 'Moderate positive: CPU-GPU transfer during decode adds latency',
    gpu_utilization: 'Weak negative: Time spent on swaps reduces useful GPU computation',
    memory_efficiency: 'Moderate positive: Swap allows running larger workloads than GPU memory permits',
  },
}

function getCorrelationColor(value: number): string {
  if (value >= 0) {
    const intensity = Math.min(value, 1)
    const r = Math.round(255 - intensity * (255 - 16))
    const g = Math.round(255 - intensity * (255 - 185))
    const b = Math.round(255 - intensity * (255 - 129))
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const intensity = Math.min(Math.abs(value), 1)
    const r = Math.round(255 - intensity * (255 - 239))
    const g = Math.round(255 - intensity * (255 - 68))
    const b = Math.round(255 - intensity * (255 - 68))
    return `rgb(${r}, ${g}, ${b})`
  }
}

function getCorrelationTextColor(value: number): string {
  return Math.abs(value) > 0.5 ? 'text-white' : 'text-foreground'
}

// ─── Optimization Suggestions ────────────────────────────────────
interface OptimizationSuggestion {
  category: 'performance' | 'efficiency' | 'risk' | 'tradeoff'
  title: string
  description: string
  impact: string
  confidence: 'High' | 'Medium' | 'Low'
  currentValue: string
  suggestedValue: string
}

function generateOptimizationSuggestions(modelName: string, engine: EngineType): OptimizationSuggestion[] {
  const isVllm = engine === 'vllm'
  const suggestions: OptimizationSuggestion[] = [
    {
      category: 'performance',
      title: `Increase tensor_parallelism from ${isVllm ? 2 : 2} to ${isVllm ? 4 : 4}`,
      description: `Scaling TP from 2 to 4 GPUs for ${modelName} can improve throughput by distributing computation across more devices, especially for large-batch workloads.`,
      impact: '+45% throughput',
      confidence: 'High',
      currentValue: 'TP=2',
      suggestedValue: 'TP=4',
    },
    {
      category: 'performance',
      title: `Reduce max_num_seqs from 256 to 128`,
      description: `Lowering max concurrent sequences reduces queue depth, decreasing P99 latency while maintaining ~85% of peak throughput for ${modelName}.`,
      impact: '-30% latency',
      confidence: 'High',
      currentValue: 'max_num_seqs=256',
      suggestedValue: 'max_num_seqs=128',
    },
    {
      category: 'efficiency',
      title: `Lower gpu_memory_utilization from 0.95 to 0.85`,
      description: `Reducing GPU memory allocation from 95% to 85% provides a safety buffer that reduces OOM risk and garbage collection overhead, with minimal throughput impact.`,
      impact: 'Reduced OOM risk',
      confidence: 'Medium',
      currentValue: 'gpu_mem_util=0.95',
      suggestedValue: 'gpu_mem_util=0.85',
    },
    {
      category: 'efficiency',
      title: `Enable prefix_caching to save GPU memory`,
      description: `${isVllm ? 'VLLM' : 'SGLang'} supports prefix caching which caches common prompt prefixes. For workloads with repeated system prompts, this can save ~20% GPU memory.`,
      impact: '20% memory savings',
      confidence: 'Medium',
      currentValue: 'prefix_caching=off',
      suggestedValue: 'prefix_caching=on',
    },
    {
      category: 'risk',
      title: `Current gpu_memory_utilization of 0.95 is near OOM threshold`,
      description: `At 95% GPU memory utilization, ${modelName} is at high risk for OOM errors, especially with varying input lengths. Reduce to 0.85-0.90 for safer operation.`,
      impact: 'High OOM risk',
      confidence: 'High',
      currentValue: 'gpu_mem_util=0.95',
      suggestedValue: 'gpu_mem_util=0.85',
    },
    {
      category: 'risk',
      title: `Concurrency > 64 causes significant latency degradation`,
      description: `Beyond 64 concurrent sequences, ${modelName} shows exponential P99 latency growth due to GPU memory thrashing. Consider capping concurrency.`,
      impact: 'Latency spike risk',
      confidence: 'High',
      currentValue: 'concurrency=128',
      suggestedValue: 'concurrency=64',
    },
    {
      category: 'tradeoff',
      title: `Trade-off: Increasing TP from 2→4 improves throughput +45% but adds ~2ms TTFT overhead`,
      description: `Higher TP adds inter-GPU communication latency during prefill, slightly increasing TTFT. For TTFT-sensitive workloads, weigh the trade-off carefully.`,
      impact: '+45% throughput, +2ms TTFT',
      confidence: 'Medium',
      currentValue: 'TP=2',
      suggestedValue: 'TP=4',
    },
    {
      category: 'tradeoff',
      title: `Sweet spot: max_num_seqs=64 balances throughput and latency optimally`,
      description: `At max_num_seqs=64, ${modelName} achieves 90% of peak throughput while keeping P99 latency under 200ms. This is the Pareto-optimal operating point.`,
      impact: '90% throughput, <200ms P99',
      confidence: 'Medium',
      currentValue: 'max_num_seqs=256',
      suggestedValue: 'max_num_seqs=64',
    },
  ]
  return suggestions
}

const SUGGESTION_CATEGORIES = {
  performance: {
    label: 'Performance Optimization',
    icon: Zap,
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50/50',
    textColor: 'text-emerald-600',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  efficiency: {
    label: 'Resource Efficiency',
    icon: Lightbulb,
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50/50',
    textColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  risk: {
    label: 'Risk Warnings',
    icon: ShieldAlert,
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50/50',
    textColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
  },
  tradeoff: {
    label: 'Trade-off Analysis',
    icon: Scale,
    borderColor: 'border-l-sky-500',
    bgColor: 'bg-sky-50/50',
    textColor: 'text-sky-600',
    badgeColor: 'bg-sky-100 text-sky-700',
  },
}

const CONFIDENCE_COLORS = {
  High: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-gray-100 text-gray-600',
}

// ─── Sensitivity Analysis Data ───────────────────────────────────
interface SensitivityItem {
  parameter: string
  metric: string
  positiveImpact: number
  negativeImpact: number
}

function generateSensitivityData(): SensitivityItem[] {
  const params = [
    { key: 'tensor_parallelism', label: 'Tensor Parallelism' },
    { key: 'gpu_memory_utilization', label: 'GPU Mem Util' },
    { key: 'max_num_seqs', label: 'Max Num Seqs' },
    { key: 'max_model_length', label: 'Max Model Length' },
    { key: 'block_size', label: 'Block Size' },
    { key: 'swap_space', label: 'Swap Space' },
  ]
  const metrics = [
    { key: 'throughput', label: 'Throughput' },
    { key: 'latency', label: 'Latency P99' },
    { key: 'ttft', label: 'TTFT' },
    { key: 'gpu_util', label: 'GPU Utilization' },
  ]

  const baseImpacts: Record<string, Record<string, { pos: number; neg: number }>> = {
    tensor_parallelism: {
      throughput: { pos: 45, neg: -20 }, latency: { pos: 15, neg: -30 },
      ttft: { pos: 5, neg: -8 }, gpu_util: { pos: 35, neg: -25 },
    },
    gpu_memory_utilization: {
      throughput: { pos: 18, neg: -35 }, latency: { pos: -8, neg: 12 },
      ttft: { pos: -5, neg: 8 }, gpu_util: { pos: 40, neg: -30 },
    },
    max_num_seqs: {
      throughput: { pos: 25, neg: -15 }, latency: { pos: -30, neg: 8 },
      ttft: { pos: -20, neg: 5 }, gpu_util: { pos: 15, neg: -12 },
    },
    max_model_length: {
      throughput: { pos: -8, neg: 15 }, latency: { pos: -35, neg: 12 },
      ttft: { pos: -40, neg: 10 }, gpu_util: { pos: -5, neg: 8 },
    },
    block_size: {
      throughput: { pos: 5, neg: -3 }, latency: { pos: -3, neg: 2 },
      ttft: { pos: -2, neg: 1 }, gpu_util: { pos: 8, neg: -5 },
    },
    swap_space: {
      throughput: { pos: -15, neg: 8 }, latency: { pos: -25, neg: 5 },
      ttft: { pos: -18, neg: 4 }, gpu_util: { pos: -10, neg: 6 },
    },
  }

  const items: SensitivityItem[] = []
  params.forEach((param) => {
    metrics.forEach((metric) => {
      const base = baseImpacts[param.key]?.[metric.key]
      if (base) {
        const noise = () => Math.round((Math.random() - 0.5) * 4)
        items.push({
          parameter: param.label,
          metric: metric.label,
          positiveImpact: base.pos + noise(),
          negativeImpact: base.neg + noise(),
        })
      }
    })
  })

  return items
}

// ─── Parameter Sensitivity Heatmap Data ──────────────────────────
const SENSITIVITY_HEATMAP_PARAMS = [
  { key: 'max_num_seqs', label: 'Max Num Sequences' },
  { key: 'gpu_mem_util', label: 'GPU Mem Util' },
  { key: 'max_model_length', label: 'Max Model Length' },
  { key: 'chunk_prefill', label: 'Chunk Prefill' },
  { key: 'block_size', label: 'Block Size' },
  { key: 'temperature', label: 'Temperature' },
]

const SENSITIVITY_HEATMAP_METRICS = [
  { key: 'throughput', label: 'Throughput' },
  { key: 'latency_p99', label: 'Latency P99' },
  { key: 'ttft', label: 'TTFT' },
  { key: 'tpot', label: 'TPOT' },
  { key: 'memory_usage', label: 'Memory Usage' },
]

function generateSensitivityMatrix(engine: EngineType | 'both'): Record<string, Record<string, number>> {
  // Base sensitivity scores (0-100) - how much changing a parameter affects a metric
  // VLLM base values
  const vllmBase: Record<string, Record<string, number>> = {
    max_num_seqs: {
      throughput: 75, latency_p99: 80, ttft: 45, tpot: 50, memory_usage: 35,
    },
    gpu_mem_util: {
      throughput: 90, latency_p99: 40, ttft: 30, tpot: 25, memory_usage: 70,
    },
    max_model_length: {
      throughput: 30, latency_p99: 50, ttft: 55, tpot: 45, memory_usage: 85,
    },
    chunk_prefill: {
      throughput: 35, latency_p99: 30, ttft: 60, tpot: 20, memory_usage: 25,
    },
    block_size: {
      throughput: 15, latency_p99: 12, ttft: 10, tpot: 10, memory_usage: 20,
    },
    temperature: {
      throughput: 7, latency_p99: 5, ttft: 3, tpot: 3, memory_usage: 2,
    },
  }

  // SGLang variations - slightly different sensitivities
  const sglangBase: Record<string, Record<string, number>> = {
    max_num_seqs: {
      throughput: 70, latency_p99: 78, ttft: 40, tpot: 55, memory_usage: 38,
    },
    gpu_mem_util: {
      throughput: 85, latency_p99: 38, ttft: 28, tpot: 22, memory_usage: 75,
    },
    max_model_length: {
      throughput: 28, latency_p99: 48, ttft: 52, tpot: 42, memory_usage: 82,
    },
    chunk_prefill: {
      throughput: 40, latency_p99: 35, ttft: 65, tpot: 25, memory_usage: 28,
    },
    block_size: {
      throughput: 18, latency_p99: 15, ttft: 12, tpot: 12, memory_usage: 22,
    },
    temperature: {
      throughput: 6, latency_p99: 4, ttft: 2, tpot: 2, memory_usage: 1,
    },
  }

  const base = engine === 'sglang' ? sglangBase : vllmBase
  const matrix: Record<string, Record<string, number>> = {}

  SENSITIVITY_HEATMAP_PARAMS.forEach((param) => {
    matrix[param.key] = {}
    SENSITIVITY_HEATMAP_METRICS.forEach((metric) => {
      let value = base[param.key]?.[metric.key] ?? 10
      // Add small noise for realism
      value += Math.round((Math.random() - 0.5) * 6)
      value = Math.max(0, Math.min(100, value))
      matrix[param.key][metric.key] = value
    })
  })

  // If "both" engines, average them with slight variation
  if (engine === 'both') {
    SENSITIVITY_HEATMAP_PARAMS.forEach((param) => {
      SENSITIVITY_HEATMAP_METRICS.forEach((metric) => {
        const v = vllmBase[param.key]?.[metric.key] ?? 10
        const s = sglangBase[param.key]?.[metric.key] ?? 10
        let avg = Math.round((v + s) / 2)
        avg += Math.round((Math.random() - 0.5) * 4)
        avg = Math.max(0, Math.min(100, avg))
        matrix[param.key][metric.key] = avg
      })
    })
  }

  return matrix
}

function getSensitivityColor(score: number): string {
  if (score <= 20) {
    // Cool blue/teal - very low sensitivity
    const t = score / 20
    const r = Math.round(20 + t * 0)
    const g = Math.round(140 + t * 40)
    const b = Math.round(160 + t * 20)
    return `rgb(${r}, ${g}, ${b})`
  } else if (score <= 40) {
    // Green - low sensitivity
    const t = (score - 20) / 20
    const r = Math.round(20 + t * 10)
    const g = Math.round(180 - t * 20)
    const b = Math.round(80 - t * 30)
    return `rgb(${r}, ${g}, ${b})`
  } else if (score <= 60) {
    // Yellow/amber - medium sensitivity
    const t = (score - 40) / 20
    const r = Math.round(30 + t * 220)
    const g = Math.round(160 - t * 20)
    const b = Math.round(50 - t * 30)
    return `rgb(${r}, ${g}, ${b})`
  } else if (score <= 80) {
    // Orange - high sensitivity
    const t = (score - 60) / 20
    const r = Math.round(250)
    const g = Math.round(140 - t * 70)
    const b = Math.round(20 + t * 0)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // Red/hot - very high sensitivity
    const t = (score - 80) / 20
    const r = Math.round(240 + t * 15)
    const g = Math.round(70 - t * 40)
    const b = Math.round(20 + t * 10)
    return `rgb(${r}, ${g}, ${b})`
  }
}

function getSensitivityTextColor(score: number): string {
  // White text on dark backgrounds, dark text on light backgrounds
  if (score > 60) return 'text-white'
  if (score > 40) return 'text-gray-900'
  return 'text-white'
}

function getSensitivityInterpretation(score: number): string {
  if (score <= 20) return 'Very low sensitivity — changing this parameter has minimal effect'
  if (score <= 40) return 'Low sensitivity — this parameter has a modest influence'
  if (score <= 60) return 'Medium sensitivity — changes to this parameter noticeably affect performance'
  if (score <= 80) return 'High sensitivity — this parameter significantly impacts this metric'
  return 'Very high sensitivity — even small changes to this parameter have major impact'
}

function getSensitivityLevel(score: number): 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' {
  if (score <= 20) return 'Very Low'
  if (score <= 40) return 'Low'
  if (score <= 60) return 'Medium'
  if (score <= 80) return 'High'
  return 'Very High'
}

// ─── Main Component ──────────────────────────────────────────────
export default function AnalysisPage() {
  const [selectedDimension, setSelectedDimension] = useState('concurrency_throughput')
  const [selectedModel, setSelectedModel] = useState('')
  const [showMultiModel, setShowMultiModel] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState<EngineType | 'both'>('both')
  const [creating, setCreating] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState('inflection')
  const { t } = useI18n()

  // Click-to-highlight state for charts
  const singleModelHighlight = useChartHighlight()
  const multiModelHighlight = useChartHighlight()

  // Correlation heatmap state
  const [correlationMatrix] = useState(() => generateCorrelationMatrix())
  const [hoveredCell, setHoveredCell] = useState<{ param: string; metric: string } | null>(null)

  // Optimization suggestions state
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false)

  // Sensitivity data
  const [sensitivityData] = useState(() => generateSensitivityData())
  const [selectedSensitivityMetric, setSelectedSensitivityMetric] = useState('Throughput')

  // Parameter Sensitivity Heatmap state
  const [heatmapEngine, setHeatmapEngine] = useState<EngineType | 'both'>('both')
  const sensitivityMatrix = useMemo(() => generateSensitivityMatrix(heatmapEngine), [heatmapEngine])
  const [sensitivityHovered, setSensitivityHovered] = useState<{ param: string; metric: string } | null>(null)

  // API hooks
  const { data: analyses, loading: analysesLoading, addAnalysis, removeAnalysis } = useAnalyses()
  const { data: models, loading: modelsLoading } = useModels()
  const { data: results } = useResults()

  // Derived model data
  const modelNames = useMemo(() => (models ?? []).map((m) => m.name), [models])
  const modelMap = useMemo(() => {
    const map: Record<string, ModelInfo> = {}
    if (models) models.forEach((m) => { map[m.name] = m })
    return map
  }, [models])

  // Dynamic model colors
  const modelColors = useMemo(() => {
    const colors: Record<string, string> = {}
    modelNames.forEach((name, idx) => {
      colors[name] = COLOR_PALETTE[idx % COLOR_PALETTE.length]
    })
    return colors
  }, [modelNames])

  // Set default selected model when models load
  useEffect(() => {
    if (modelNames.length > 0 && !modelNames.includes(selectedModel)) {
      setSelectedModel(modelNames[0])
    }
  }, [modelNames, selectedModel])

  // Map API analyses to display format for historical table
  const historicalAnalyses = useMemo(() => {
    if (!analyses || !models) return []
    return analyses.map((a) => {
      const model = models.find((m) => m.id === a.modelId)
      const dim = DIMENSIONS.find((d) => d.key === a.dimension)
      return {
        id: a.id,
        modelName: model?.name ?? 'Unknown',
        dimensionLabel: dim?.label ?? a.dimension,
        inflectionPoint: a.inflectionPoint,
        optimalValue: a.optimalValue,
        performanceGain: a.performanceGain,
        status: a.status,
        createdAt: a.createdAt,
      }
    })
  }, [analyses, models])

  // Find the currently selected model info
  const currentModel = modelMap[selectedModel]

  const dimension = DIMENSIONS.find((d) => d.key === selectedDimension)!
  const inflectionInfo = INFLECTION_POINTS[selectedDimension]!

  // ─── Chart Data ───────────────────────────────────────────────
  const singleModelData = useMemo(() => {
    if (!selectedModel) return []
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
    if (modelNames.length === 0) return []
    const allData: Record<string, Array<{ x: number; y: number }>> = {}
    modelNames.forEach((m) => {
      const engine = selectedEngine === 'both' ? 'vllm' : selectedEngine
      allData[m] = generateCurveData(selectedDimension, m, engine)
    })

    const maxLen = Math.max(...Object.values(allData).map((d) => d.length))
    return Array.from({ length: maxLen }, (_, i) => {
      const entry: Record<string, number> = { x: allData[modelNames[0]][i]?.x ?? 0 }
      modelNames.forEach((m) => {
        entry[m] = allData[m][i]?.y ?? 0
      })
      return entry
    })
  }, [selectedDimension, selectedEngine, modelNames])

  // ─── Inflection Point Reference ───────────────────────────────
  const inflectionX = selectedEngine === 'sglang' ? inflectionInfo.sglang : inflectionInfo.vllm
  const optimalStart = inflectionInfo.optimalRange[0]
  const optimalEnd = inflectionInfo.optimalRange[1]

  // ─── Recommendations ──────────────────────────────────────────
  const recommendations = useMemo(() => getRecommendations(selectedDimension, selectedModel), [selectedDimension, selectedModel])

  // ─── Sensitivity chart data per metric ────────────────────────
  const sensitivityChartData = useMemo(() => {
    const filtered = sensitivityData
      .filter((d) => d.metric === selectedSensitivityMetric)
      .sort((a, b) => (Math.abs(b.positiveImpact) + Math.abs(b.negativeImpact)) - (Math.abs(a.positiveImpact) + Math.abs(a.negativeImpact)))
      .slice(0, 6)

    return filtered.map((d) => ({
      parameter: d.parameter,
      positive: d.positiveImpact,
      negative: d.negativeImpact,
    }))
  }, [sensitivityData, selectedSensitivityMetric])

  // ─── Sensitivity Heatmap: Top 3 insights ─────────────────────
  const sensitivityInsights = useMemo(() => {
    const pairs: Array<{ param: string; paramLabel: string; metric: string; metricLabel: string; score: number }> = []
    SENSITIVITY_HEATMAP_PARAMS.forEach((param) => {
      SENSITIVITY_HEATMAP_METRICS.forEach((metric) => {
        const score = sensitivityMatrix[param.key]?.[metric.key] ?? 0
        pairs.push({ param: param.key, paramLabel: param.label, metric: metric.key, metricLabel: metric.label, score })
      })
    })
    // Sort by score descending, take top 3
    return pairs.sort((a, b) => b.score - a.score).slice(0, 3)
  }, [sensitivityMatrix])

  // ─── Risk color ───────────────────────────────────────────────
  const riskColor = { Low: 'text-emerald-600', Medium: 'text-amber-600', High: 'text-red-600' }
  const riskBg = { Low: 'bg-emerald-50', Medium: 'bg-amber-50', High: 'bg-red-50' }

  // Format x-axis for special dimensions
  const formatXAxis = (value: number) => {
    if (selectedDimension === 'gpumem_performance') return `${(value * 100).toFixed(0)}%`
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return value.toString()
  }

  // ─── Handlers ─────────────────────────────────────────────────
  const handleNewAnalysis = useCallback(async () => {
    if (!currentModel) {
      toast.error('Please select a model first')
      return
    }
    setCreating(true)
    try {
      const engine = selectedEngine === 'both' ? 'vllm' : selectedEngine
      const curveData = generateCurveData(selectedDimension, selectedModel, engine)
      const inflectionIdx = curveData.findIndex((d) => d.x === inflectionX)
      const optimalValue = inflectionIdx >= 0 ? curveData[inflectionIdx].y : 0

      await addAnalysis({
        modelId: currentModel.id,
        engine: currentModel.engine,
        dimension: selectedDimension,
        inflectionPoint: inflectionX,
        optimalValue,
        performanceGain: inflectionInfo.performanceGain,
        analysisJson: JSON.stringify({
          dimension: selectedDimension,
          model: selectedModel,
          engine: currentModel.engine,
          inflectionPoint: inflectionX,
          optimalRange: inflectionInfo.optimalRange,
          riskLevel: inflectionInfo.riskLevel,
        }),
        status: 'completed',
      })
      toast.success('Analysis created successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create analysis')
    } finally {
      setCreating(false)
    }
  }, [currentModel, selectedDimension, selectedModel, selectedEngine, inflectionX, inflectionInfo, addAnalysis])

  const handleDeleteAnalysis = useCallback(async (id: string) => {
    try {
      await removeAnalysis(id)
      toast.success('Analysis deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete analysis')
    }
  }, [removeAnalysis])

  const handleViewAnalysis = useCallback((analysisId: string) => {
    if (!analyses || !models) return
    const analysis = analyses.find((a) => a.id === analysisId)
    if (!analysis) return
    const model = models.find((m) => m.id === analysis.modelId)
    if (model) setSelectedModel(model.name)
    setSelectedDimension(analysis.dimension)
    setActiveMainTab('inflection')
    toast.info('Switched to analysis view')
  }, [analyses, models])

  const handleRerunAnalysis = useCallback(async (analysisId: string) => {
    if (!analyses || !models) return
    const analysis = analyses.find((a) => a.id === analysisId)
    if (!analysis) return
    const model = models.find((m) => m.id === analysis.modelId)
    if (!model) return

    setCreating(true)
    try {
      const dimInfo = INFLECTION_POINTS[analysis.dimension]
      const engine = analysis.engine
      const inflectionPt = engine === 'sglang' ? dimInfo?.sglang : dimInfo?.vllm ?? analysis.inflectionPoint
      const curveData = generateCurveData(analysis.dimension, model.name, engine)
      const inflectionIdx = curveData.findIndex((d) => d.x === inflectionPt)
      const optimalValue = inflectionIdx >= 0 ? curveData[inflectionIdx].y : analysis.optimalValue

      await addAnalysis({
        modelId: model.id,
        engine,
        dimension: analysis.dimension,
        inflectionPoint: inflectionPt,
        optimalValue,
        performanceGain: dimInfo?.performanceGain ?? analysis.performanceGain,
        analysisJson: JSON.stringify({
          dimension: analysis.dimension,
          model: model.name,
          engine,
          inflectionPoint: inflectionPt,
          optimalRange: dimInfo?.optimalRange,
          riskLevel: dimInfo?.riskLevel,
        }),
        status: 'completed',
      })
      toast.success('Analysis rerun successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rerun analysis')
    } finally {
      setCreating(false)
    }
  }, [analyses, models, addAnalysis])

  const handleGenerateSuggestions = useCallback(() => {
    if (!currentModel) {
      toast.error('Please select a model first')
      return
    }
    setSuggestionsLoading(true)
    setTimeout(() => {
      setSuggestions(generateOptimizationSuggestions(selectedModel, currentModel.engine))
      setSuggestionsLoading(false)
      setSuggestionsGenerated(true)
      toast.success('Optimization suggestions generated')
    }, 1500)
  }, [currentModel, selectedModel])

  const handleApplySuggestion = useCallback((suggestion: OptimizationSuggestion) => {
    toast.info(`Apply: ${suggestion.suggestedValue} — Navigate to Parameters page to apply`)
  }, [])

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('analysis.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('analysis.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {modelsLoading ? (
            <Skeleton className="w-[170px] h-9" />
          ) : (
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {modelNames.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleNewAnalysis}
            disabled={creating || !currentModel}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Analysis
          </Button>
        </div>
      </div>

      {/* ─── Main Tabs ───────────────────────────────────────── */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inflection" className="gap-1.5">
            <Target className="w-4 h-4" />
            Inflection Analysis
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-1.5">
            <Grid3X3 className="w-4 h-4" />
            Correlation Heatmap
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            Optimization Suggestions
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="gap-1.5">
            <Tornado className="w-4 h-4" />
            Sensitivity Analysis
          </TabsTrigger>
          <TabsTrigger value="sensitivity-heatmap" className="gap-1.5">
            <Thermometer className="w-4 h-4" />
            Sensitivity Heatmap
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: Inflection Analysis (Existing)
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="inflection" className="space-y-6">
          {/* ─── Analysis Dimension Selection ────────────────── */}
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

          {/* ─── Analysis Summary Cards ──────────────────────── */}
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

          {/* ─── Main Chart ──────────────────────────────────── */}
          <Tabs defaultValue="single" className="space-y-4">
            <TabsList>
              <TabsTrigger value="single" onClick={() => setShowMultiModel(false)}>Single Model</TabsTrigger>
              <TabsTrigger value="multi" onClick={() => setShowMultiModel(true)}>Multi-Model Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{dimension.label} — {selectedModel || 'Select a model'}</CardTitle>
                  <CardDescription>
                    Inflection point marked at {selectedDimension === 'gpumem_performance' ? `${(inflectionX * 100).toFixed(0)}%` : inflectionX.toLocaleString()}. Shaded area shows optimal range.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative h-[450px]">
                    {selectedModel ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={singleModelData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }} onClick={(state) => singleModelHighlight.handleChartClick(state as unknown as Parameters<typeof singleModelHighlight.handleChartClick>[0])}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="x" tick={{ fontSize: 12 }} label={{ value: dimension.xLabel, position: 'insideBottom', offset: -5, style: { fontSize: 12 } }} tickFormatter={formatXAxis} />
                          <YAxis tick={{ fontSize: 12 }} label={{ value: dimension.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                          <Tooltip content={<EnhancedAnalysisTooltip yLabel={dimension.yLabel} dimension={selectedDimension} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <ReferenceArea x1={optimalStart} x2={optimalEnd} fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeOpacity={0.2} />
                          <ReferenceLine x={inflectionX} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Inflection: ${selectedDimension === 'gpumem_performance' ? `${(inflectionX * 100).toFixed(0)}%` : inflectionX.toLocaleString()}`, position: 'top', fill: '#ef4444', fontSize: 12, fontWeight: 600 }} />
                          {selectedDimension === 'seqlen_memory' && (
                            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'GPU Limit (80GB)', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                          )}
                          {(selectedEngine === 'both' || selectedEngine === 'vllm') && (
                            <Line type="monotone" dataKey="VLLM" stroke={VLLM_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: VLLM_COLOR, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: VLLM_COLOR }} />
                          )}
                          {(selectedEngine === 'both' || selectedEngine === 'sglang') && (
                            <Line type="monotone" dataKey="SGLang" stroke={SGLANG_COLOR} strokeWidth={2.5} dot={{ r: 4, fill: SGLANG_COLOR, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: SGLANG_COLOR }} />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Select a model to view analysis chart</p>
                      </div>
                    )}
                    {singleModelHighlight.highlighted && (
                      <HighlightCard
                        point={singleModelHighlight.highlighted}
                        seriesConfig={{
                          VLLM: { label: 'VLLM', color: VLLM_COLOR },
                          SGLang: { label: 'SGLang', color: SGLANG_COLOR },
                        }}
                        onClose={singleModelHighlight.clearHighlight}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multi">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{dimension.label} — Multi-Model Comparison</CardTitle>
                  <CardDescription>
                    Overlay of {selectedEngine === 'both' ? 'VLLM' : selectedEngine === 'vllm' ? 'VLLM' : 'SGLang'} curves across all models.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative h-[450px]">
                    {modelNames.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={multiModelData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }} onClick={(state) => multiModelHighlight.handleChartClick(state as unknown as Parameters<typeof multiModelHighlight.handleChartClick>[0])}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="x" tick={{ fontSize: 12 }} label={{ value: dimension.xLabel, position: 'insideBottom', offset: -5, style: { fontSize: 12 } }} tickFormatter={formatXAxis} />
                          <YAxis tick={{ fontSize: 12 }} label={{ value: dimension.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                          <Tooltip content={<EnhancedAnalysisTooltip yLabel={dimension.yLabel} dimension={selectedDimension} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <ReferenceLine x={inflectionX} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={2} label={{ value: 'Inflection', position: 'top', fill: '#ef4444', fontSize: 12, fontWeight: 600 }} />
                          {selectedDimension === 'seqlen_memory' && (
                            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'GPU Limit', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                          )}
                          {modelNames.map((m) => (
                            <Line key={m} type="monotone" dataKey={m} stroke={modelColors[m]} strokeWidth={2} dot={{ r: 3, fill: modelColors[m], strokeWidth: 1.5, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No models available for comparison</p>
                      </div>
                    )}
                    {multiModelHighlight.highlighted && (
                      <HighlightCard
                        point={multiModelHighlight.highlighted}
                        seriesConfig={Object.fromEntries(modelNames.map((m) => [m, { label: m, color: modelColors[m] }]))}
                        onClose={multiModelHighlight.clearHighlight}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ─── Recommendations ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Recommendations
              </CardTitle>
              <CardDescription>Auto-generated insights based on inflection point analysis for {selectedModel || 'selected model'}</CardDescription>
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

          {/* ─── Historical Analysis Table ────────────────────── */}
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
                    {analysesLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : historicalAnalyses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No analyses found. Click &quot;New Analysis&quot; to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historicalAnalyses.map((ha) => (
                        <TableRow key={ha.id}>
                          <TableCell className="font-medium text-sm">{ha.modelName}</TableCell>
                          <TableCell className="text-sm">{ha.dimensionLabel}</TableCell>
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
                            <Badge variant={ha.status === 'completed' ? 'default' : ha.status === 'running' ? 'secondary' : 'destructive'} className="text-xs">
                              {ha.status === 'running' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                              {ha.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(ha.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleViewAnalysis(ha.id)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleRerunAnalysis(ha.id)} disabled={creating}>
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => handleDeleteAnalysis(ha.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 2: Correlation Heatmap
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-emerald-500" />
                Multi-Parameter Correlation Heatmap
              </CardTitle>
              <CardDescription>
                Correlation between configuration parameters and performance metrics for {selectedModel || 'selected model'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Column headers */}
                  <div className="flex">
                    <div className="w-[140px] shrink-0" />
                    {HEATMAP_METRICS.map((metric) => (
                      <div key={metric.key} className="flex-1 min-w-[80px] text-center">
                        <span className="text-xs font-medium text-muted-foreground writing-mode-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', height: '70px' }}>
                          {metric.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Heatmap rows */}
                  {HEATMAP_PARAMETERS.map((param) => (
                    <div key={param.key} className="flex items-center">
                      <div className="w-[140px] shrink-0 pr-3 text-right">
                        <span className="text-xs font-medium text-foreground">{param.label}</span>
                      </div>
                      {HEATMAP_METRICS.map((metric) => {
                        const value = correlationMatrix[param.key]?.[metric.key] ?? 0
                        const isHovered = hoveredCell?.param === param.key && hoveredCell?.metric === metric.key
                        const desc = CORRELATION_DESCRIPTIONS[param.key]?.[metric.key] ?? ''

                        return (
                          <Tooltip key={`${param.key}-${metric.key}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex-1 min-w-[80px] h-[48px] flex items-center justify-center cursor-pointer transition-all border border-border/30 ${isHovered ? 'ring-2 ring-primary z-10 scale-105' : ''}`}
                                style={{ backgroundColor: getCorrelationColor(value) }}
                                onMouseEnter={() => setHoveredCell({ param: param.key, metric: metric.key })}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                <span className={`text-xs font-mono font-semibold ${getCorrelationTextColor(value)}`}>
                                  {value >= 0 ? '+' : ''}{value.toFixed(2)}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px]">
                              <div className="space-y-1">
                                <p className="font-semibold text-xs">{param.label} ↔ {metric.short}</p>
                                <p className="text-xs opacity-90">Correlation: <span className="font-mono font-bold">{value >= 0 ? '+' : ''}{value.toFixed(2)}</span></p>
                                <p className="text-xs opacity-80">{desc}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  ))}

                  {/* Color Legend */}
                  <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                    <span className="text-xs text-muted-foreground font-medium">Negative Correlation</span>
                    <div className="flex items-center gap-0.5">
                      {[-1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                        <div
                          key={v}
                          className="w-8 h-5 flex items-center justify-center"
                          style={{ backgroundColor: getCorrelationColor(v) }}
                        >
                          <span className={`text-[9px] font-mono ${getCorrelationTextColor(v)}`}>
                            {v === 0 ? '0' : v > 0 ? `+${v}` : v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Positive Correlation</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-[10px] text-muted-foreground">Strong Negative</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-white border border-border/50" />
                      <span className="text-[10px] text-muted-foreground">No Correlation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                      <span className="text-[10px] text-muted-foreground">Strong Positive</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Correlations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Strongest Positive</p>
                    <p className="text-sm font-bold">GPU Mem Util ↔ GPU Utilization</p>
                    <p className="text-xs font-mono text-emerald-600">+{((correlationMatrix['gpu_memory_utilization']?.['gpu_utilization'] ?? 0.91)).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Strongest Negative</p>
                    <p className="text-sm font-bold">Max Model Len ↔ Mem Efficiency</p>
                    <p className="text-xs font-mono text-red-600">{((correlationMatrix['max_model_length']?.['memory_efficiency'] ?? -0.62)).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Most Influential Param</p>
                    <p className="text-sm font-bold">Tensor Parallelism</p>
                    <p className="text-xs text-muted-foreground">Highest avg |correlation| across metrics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 3: Optimization Suggestions
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Optimization Suggestions Engine
                  </CardTitle>
                  <CardDescription>
                    Automated optimization recommendations for {selectedModel || 'selected model'} based on benchmark analysis
                  </CardDescription>
                </div>
                <Button
                  onClick={handleGenerateSuggestions}
                  disabled={suggestionsLoading || !currentModel}
                  className="gap-1.5"
                >
                  {suggestionsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate Suggestions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!suggestionsGenerated && !suggestionsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Lightbulb className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Generate Optimization Suggestions</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select a model and click &quot;Generate Suggestions&quot; to analyze current parameters and benchmark results for automated optimization recommendations.
                  </p>
                </div>
              ) : suggestionsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg border border-l-4 border-l-gray-300">
                      <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(SUGGESTION_CATEGORIES).map(([key, cat]) => {
                      const count = suggestions.filter((s) => s.category === key).length
                      const Icon = cat.icon
                      return (
                        <Badge key={key} variant="outline" className={`gap-1.5 py-1 px-3 ${cat.textColor}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cat.label} ({count})
                        </Badge>
                      )
                    })}
                  </div>

                  {suggestions.map((suggestion, idx) => {
                    const cat = SUGGESTION_CATEGORIES[suggestion.category]
                    const Icon = cat.icon
                    return (
                      <div
                        key={idx}
                        className={`border-l-4 ${cat.borderColor} ${cat.bgColor} rounded-lg p-4 transition-all hover:shadow-sm`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-md ${cat.bgColor} ${cat.textColor} shrink-0 mt-0.5`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-sm font-semibold leading-tight">{suggestion.title}</h4>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${CONFIDENCE_COLORS[suggestion.confidence]}`}>
                                {suggestion.confidence}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{suggestion.description}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-mono gap-1">
                                <ArrowRight className="w-3 h-3" />
                                {suggestion.impact}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {suggestion.currentValue} → {suggestion.suggestedValue}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs ml-auto"
                                onClick={() => handleApplySuggestion(suggestion)}
                              >
                                Apply
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 4: Sensitivity Analysis
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="sensitivity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tornado className="w-5 h-5 text-sky-500" />
                    Parameter Sensitivity Analysis
                  </CardTitle>
                  <CardDescription>
                    How much each metric changes when parameters vary across their full range for {selectedModel || 'selected model'}
                  </CardDescription>
                </div>
                <Select value={selectedSensitivityMetric} onValueChange={setSelectedSensitivityMetric}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Throughput">Throughput</SelectItem>
                    <SelectItem value="Latency P99">Latency P99</SelectItem>
                    <SelectItem value="TTFT">TTFT</SelectItem>
                    <SelectItem value="GPU Utilization">GPU Utilization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {sensitivityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sensitivityChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Impact (%)', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                        tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="parameter"
                        tick={{ fontSize: 12 }}
                        width={120}
                      />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number, name: string) => {
                          const label = name === 'positive' ? 'Positive Impact' : 'Negative Impact'
                          return [`${value > 0 ? '+' : ''}${value}%`, label]
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1.5} />
                      <Bar dataKey="positive" fill="#10b981" name="positive" radius={[0, 4, 4, 0]} barSize={16} />
                      <Bar dataKey="negative" fill="#ef4444" name="negative" radius={[4, 0, 0, 4]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No sensitivity data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top 3 most impactful parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sensitivityChartData.slice(0, 3).map((item, idx) => {
              const totalImpact = Math.abs(item.positiveImpact) + Math.abs(item.negativeImpact)
              const impactLevel = totalImpact > 60 ? 'High' : totalImpact > 30 ? 'Medium' : 'Low'
              const impactColor = impactLevel === 'High' ? 'text-red-600' : impactLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
              const impactBg = impactLevel === 'High' ? 'bg-red-50' : impactLevel === 'Medium' ? 'bg-amber-50' : 'bg-emerald-50'

              return (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${impactBg}`}>
                        <Flame className={`w-5 h-5 ${impactColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">#{idx + 1} Most Impactful</p>
                        <p className="text-sm font-bold">{item.parameter}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-emerald-600">+{item.positiveImpact}%</span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs font-mono text-red-600">{item.negativeImpact}%</span>
                          <Badge variant="outline" className={`text-[10px] ${impactColor}`}>{impactLevel}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Detailed sensitivity table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Sensitivity Matrix
              </CardTitle>
              <CardDescription>Impact of each parameter on all metrics (top 3 highlighted per metric)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Throughput</TableHead>
                      <TableHead>Latency P99</TableHead>
                      <TableHead>TTFT</TableHead>
                      <TableHead>GPU Util</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const paramNames = [...new Set(sensitivityData.map((d) => d.parameter))]
                      return paramNames.map((param) => (
                        <TableRow key={param}>
                          <TableCell className="font-medium text-sm">{param}</TableCell>
                          {['Throughput', 'Latency P99', 'TTFT', 'GPU Utilization'].map((metric) => {
                            const item = sensitivityData.find((d) => d.parameter === param && d.metric === metric)
                            if (!item) return <TableCell key={metric} className="text-sm text-muted-foreground">—</TableCell>
                            const totalImpact = Math.abs(item.positiveImpact) + Math.abs(item.negativeImpact)
                            // Check if this param is top 3 for this metric
                            const metricItems = sensitivityData
                              .filter((d) => d.metric === metric)
                              .sort((a, b) => (Math.abs(b.positiveImpact) + Math.abs(b.negativeImpact)) - (Math.abs(a.positiveImpact) + Math.abs(a.negativeImpact)))
                            const isTop3 = metricItems.slice(0, 3).some((m) => m.parameter === param)
                            return (
                              <TableCell key={metric} className={`text-sm ${isTop3 ? 'font-semibold' : ''}`}>
                                <div className="flex items-center gap-1.5">
                                  {isTop3 && <Flame className="w-3 h-3 text-amber-500 shrink-0" />}
                                  <span className="font-mono text-emerald-600">+{item.positiveImpact}%</span>
                                  <span className="text-muted-foreground">/</span>
                                  <span className="font-mono text-red-600">{item.negativeImpact}%</span>
                                </div>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 5: Parameter Sensitivity Heatmap
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="sensitivity-heatmap" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Thermometer className="w-5 h-5 text-red-500" />
                      Parameter Sensitivity Heatmap
                    </CardTitle>
                    <CardDescription>
                      How different parameter combinations affect performance metrics — sensitivity scores range from 0 (no impact) to 100 (critical impact)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Engine:</span>
                    <div className="flex rounded-md border overflow-hidden">
                      {(['both', 'vllm', 'sglang'] as const).map((eng) => (
                        <Button
                          key={eng}
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-3 text-xs rounded-none ${
                            heatmapEngine === eng
                              ? eng === 'vllm'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : eng === 'sglang'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                  : 'bg-primary/10 text-primary'
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => setHeatmapEngine(eng)}
                        >
                          {eng === 'both' ? 'Both' : eng === 'vllm' ? 'VLLM' : 'SGLang'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[640px]">
                    {/* Column headers (metrics) */}
                    <div className="flex mb-1">
                      <div className="w-[140px] shrink-0" />
                      {SENSITIVITY_HEATMAP_METRICS.map((metric) => (
                        <div key={metric.key} className="flex-1 min-w-[90px] text-center">
                          <span
                            className="text-xs font-medium text-muted-foreground inline-block"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '65px' }}
                          >
                            {metric.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Heatmap rows (parameters) */}
                    {SENSITIVITY_HEATMAP_PARAMS.map((param, rowIdx) => (
                      <motion.div
                        key={param.key}
                        className="flex items-center mb-1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: rowIdx * 0.05 }}
                      >
                        <div className="w-[140px] shrink-0 pr-3 text-right">
                          <span className="text-xs font-medium text-foreground">{param.label}</span>
                        </div>
                        {SENSITIVITY_HEATMAP_METRICS.map((metric) => {
                          const score = sensitivityMatrix[param.key]?.[metric.key] ?? 0
                          const isHovered = sensitivityHovered?.param === param.key && sensitivityHovered?.metric === metric.key

                          return (
                            <Tooltip key={`${param.key}-${metric.key}`}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  className={`flex-1 min-w-[90px] h-[52px] flex items-center justify-center cursor-pointer transition-all rounded-md border border-border/20 mx-0.5 ${
                                    isHovered ? 'ring-2 ring-primary z-10 scale-110 shadow-lg' : 'hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: getSensitivityColor(score) }}
                                  onMouseEnter={() => setSensitivityHovered({ param: param.key, metric: metric.key })}
                                  onMouseLeave={() => setSensitivityHovered(null)}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: isHovered ? 1.1 : 1 }}
                                  transition={{ duration: 0.2, delay: rowIdx * 0.03 }}
                                >
                                  <span className={`text-xs font-mono font-bold ${getSensitivityTextColor(score)}`}>
                                    {score}
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <div className="space-y-1.5">
                                  <p className="font-semibold text-xs">Parameter: {param.label}</p>
                                  <p className="text-xs opacity-90">Metric: {metric.label}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs opacity-80">Sensitivity:</span>
                                    <span className="font-mono font-bold text-sm">{score}%</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${
                                        score > 80 ? 'border-red-400 text-red-600' :
                                        score > 60 ? 'border-orange-400 text-orange-600' :
                                        score > 40 ? 'border-amber-400 text-amber-600' :
                                        score > 20 ? 'border-emerald-400 text-emerald-600' :
                                        'border-teal-400 text-teal-600'
                                      }`}
                                    >
                                      {getSensitivityLevel(score)}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] opacity-70 leading-relaxed">{getSensitivityInterpretation(score)}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </motion.div>
                    ))}

                    {/* Color Scale Legend */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground font-medium">Low Sensitivity</span>
                        <div className="flex items-center gap-0.5">
                          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                            <div
                              key={v}
                              className="w-8 h-6 flex items-center justify-center rounded-sm"
                              style={{ backgroundColor: getSensitivityColor(v) }}
                            >
                              <span className={`text-[8px] font-mono ${getSensitivityTextColor(v)}`}>
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">High Sensitivity</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSensitivityColor(10) }} />
                          <span className="text-[10px] text-muted-foreground">Very Low (0-20)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSensitivityColor(30) }} />
                          <span className="text-[10px] text-muted-foreground">Low (20-40)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSensitivityColor(50) }} />
                          <span className="text-[10px] text-muted-foreground">Medium (40-60)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSensitivityColor(70) }} />
                          <span className="text-[10px] text-muted-foreground">High (60-80)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSensitivityColor(90) }} />
                          <span className="text-[10px] text-muted-foreground">Very High (80-100)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── Sensitivity Insights ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Sensitivity Insights
                </CardTitle>
                <CardDescription>
                  Top 3 most sensitive parameter-metric pairs requiring careful tuning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sensitivityInsights.map((insight, idx) => {
                    const level = getSensitivityLevel(insight.score)
                    const isHigh = insight.score > 80
                    const isMedium = insight.score > 60 && insight.score <= 80
                    const borderClass = isHigh ? 'border-l-red-500' : isMedium ? 'border-l-orange-500' : 'border-l-amber-500'
                    const bgClass = isHigh ? 'bg-red-50/50 dark:bg-red-950/20' : isMedium ? 'bg-orange-50/50 dark:bg-orange-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'
                    const iconClass = isHigh ? 'text-red-600' : isMedium ? 'text-orange-600' : 'text-amber-600'
                    const badgeClass = isHigh ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : isMedium ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'

                    return (
                      <motion.div
                        key={`${insight.param}-${insight.metric}`}
                        className={`border-l-4 ${borderClass} ${bgClass} rounded-lg p-4`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + idx * 0.1 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 mt-0.5`}>
                            {isHigh ? (
                              <Flame className={`w-5 h-5 ${iconClass}`} />
                            ) : isMedium ? (
                              <AlertTriangle className={`w-5 h-5 ${iconClass}`} />
                            ) : (
                              <Info className={`w-5 h-5 ${iconClass}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                                #{idx + 1} Most Sensitive
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                                {level}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold mb-1">
                              {insight.paramLabel} → {insight.metricLabel}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${insight.score}%`,
                                    backgroundColor: getSensitivityColor(insight.score),
                                  }}
                                />
                              </div>
                              <span className="text-sm font-mono font-bold" style={{ color: getSensitivityColor(insight.score) }}>
                                {insight.score}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {isHigh ? (
                                <>
                                  <span className="font-semibold">{insight.paramLabel}</span> has HIGH impact on{' '}
                                  <span className="font-semibold">{insight.metricLabel}</span> ({insight.score}% sensitivity).
                                  Consider tuning this parameter carefully for {insight.metricLabel.toLowerCase()}-critical workloads.
                                </>
                              ) : isMedium ? (
                                <>
                                  <span className="font-semibold">{insight.paramLabel}</span> has moderate-high impact on{' '}
                                  <span className="font-semibold">{insight.metricLabel}</span> ({insight.score}% sensitivity).
                                  Adjustments to this parameter will noticeably affect {insight.metricLabel.toLowerCase()}.
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">{insight.paramLabel}</span> has notable impact on{' '}
                                  <span className="font-semibold">{insight.metricLabel}</span> ({insight.score}% sensitivity).
                                  Monitor this pair when optimizing.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── Engine Comparison Note ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">About Parameter Sensitivity</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sensitivity scores indicate how much a performance metric changes when a parameter varies across its full range.
                      Scores are derived from benchmark data analysis across multiple configurations.
                      {heatmapEngine === 'both' && ' Current view shows averaged sensitivity across both VLLM and SGLang engines.'}
                      {heatmapEngine === 'vllm' && ' Current view shows VLLM-specific sensitivity scores.'}
                      {heatmapEngine === 'sglang' && ' Current view shows SGLang-specific sensitivity scores.'}
                      {' '}Use the engine toggle above to compare how sensitivity differs between inference engines.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
