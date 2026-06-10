'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  SlidersHorizontal,
  Info,
  Save,
  Copy,
  Trash2,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Plus,
  RotateCcw,
  Edit3,
  Loader2,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { EngineType, ParameterProfileInfo } from '@/lib/types'
import { useProfiles, useModels } from '@/hooks/use-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// ─── Parameter Tooltips ────────────────────────────────────────────────────
const PARAM_TOOLTIPS: Record<string, string> = {
  maxModelLen: 'Maximum sequence length the model can handle. Higher values use more memory.',
  gpuMemoryUtil: 'Fraction of GPU memory to use. Higher values allow more sequences but less safety margin.',
  swapSpace: 'CPU swap space (GB) to use when GPU memory is full. Increases capacity but reduces speed.',
  blockSize: 'Block size for key-value cache management. Affects memory allocation granularity.',
  maxNumSeqs: 'Maximum number of sequences per iteration. Higher values improve throughput but increase latency.',
  maxNumBatchedTokens: 'Maximum number of tokens batched per iteration. Affects throughput and latency tradeoff.',
  chunkPrefillSize: 'SGLang only. Size of each chunk during prefill. Smaller chunks reduce latency but may lower throughput.',
  enforceEager: 'Disable CUDA graphs and always use eager mode. Useful for debugging but slower.',
  enablePrefixCaching: 'Cache prefixes of prompts to reuse KV cache for shared prefixes. Saves computation.',
  enableChunkedPrefill: 'Break long prefill requests into chunks. Helps interleaving with decode requests.',
  quantization: 'Weight quantization method. Reduces memory usage at the cost of potential accuracy loss.',
  memFractionStatic: 'SGLang only. Fraction of GPU memory used for static allocation. Affects memory planning.',
  temperature: 'Controls randomness in sampling. 0 = deterministic, higher = more creative/diverse.',
  topP: 'Nucleus sampling threshold. Only tokens with cumulative probability < topP are considered.',
  topK: 'Only sample from the top K most likely tokens. -1 = disabled (all tokens considered).',
  repetitionPenalty: 'Penalizes repeated tokens. 1.0 = no penalty, higher = stronger penalty for repetition.',
}

// ─── Default Parameter Values ───────────────────────────────────────────────
interface ParameterValues {
  maxModelLen: number
  gpuMemoryUtil: number
  swapSpace: number
  blockSize: number
  maxNumSeqs: number
  maxNumBatchedTokens: number
  chunkPrefillSize: number
  enforceEager: boolean
  enablePrefixCaching: boolean
  enableChunkedPrefill: boolean
  quantization: string
  memFractionStatic: number
  temperature: number
  topP: number
  topK: number
  repetitionPenalty: number
}

const DEFAULT_PARAMS: ParameterValues = {
  maxModelLen: 4096,
  gpuMemoryUtil: 0.9,
  swapSpace: 4,
  blockSize: 16,
  maxNumSeqs: 256,
  maxNumBatchedTokens: 4096,
  chunkPrefillSize: 8192,
  enforceEager: false,
  enablePrefixCaching: false,
  enableChunkedPrefill: false,
  quantization: 'none',
  memFractionStatic: 0.88,
  temperature: 1.0,
  topP: 1.0,
  topK: -1,
  repetitionPenalty: 1.0,
}

// ─── Preset Profiles ────────────────────────────────────────────────────────
const PRESET_PROFILES: (ParameterValues & { name: string; description: string; highlights: string[] })[] = [
  {
    name: 'High Throughput',
    description: 'Optimized for maximum throughput with high concurrency and GPU utilization.',
    highlights: ['maxNumSeqs: 512', 'gpuMemoryUtil: 0.95', 'Chunked Prefill enabled'],
    maxModelLen: 4096,
    gpuMemoryUtil: 0.95,
    swapSpace: 4,
    blockSize: 16,
    maxNumSeqs: 512,
    maxNumBatchedTokens: 32768,
    chunkPrefillSize: 8192,
    enforceEager: false,
    enablePrefixCaching: true,
    enableChunkedPrefill: true,
    quantization: 'none',
    memFractionStatic: 0.88,
    temperature: 1.0,
    topP: 1.0,
    topK: -1,
    repetitionPenalty: 1.0,
  },
  {
    name: 'Low Latency',
    description: 'Minimizes response latency with eager mode and small batch sizes.',
    highlights: ['maxNumSeqs: 32', 'enforceEager: true', 'Small batch size'],
    maxModelLen: 4096,
    gpuMemoryUtil: 0.85,
    swapSpace: 2,
    blockSize: 16,
    maxNumSeqs: 32,
    maxNumBatchedTokens: 2048,
    chunkPrefillSize: 4096,
    enforceEager: true,
    enablePrefixCaching: false,
    enableChunkedPrefill: false,
    quantization: 'none',
    memFractionStatic: 0.85,
    temperature: 1.0,
    topP: 1.0,
    topK: -1,
    repetitionPenalty: 1.0,
  },
  {
    name: 'Balanced',
    description: 'A balanced configuration for general-purpose workloads.',
    highlights: ['maxNumSeqs: 128', 'gpuMemoryUtil: 0.9', 'Prefix Caching enabled'],
    maxModelLen: 8192,
    gpuMemoryUtil: 0.9,
    swapSpace: 4,
    blockSize: 16,
    maxNumSeqs: 128,
    maxNumBatchedTokens: 8192,
    chunkPrefillSize: 8192,
    enforceEager: false,
    enablePrefixCaching: true,
    enableChunkedPrefill: true,
    quantization: 'none',
    memFractionStatic: 0.88,
    temperature: 1.0,
    topP: 1.0,
    topK: -1,
    repetitionPenalty: 1.0,
  },
  {
    name: 'Memory Saver',
    description: 'Minimizes GPU memory usage for resource-constrained environments.',
    highlights: ['gpuMemoryUtil: 0.7', 'maxModelLen: 2048', 'Low swap space'],
    maxModelLen: 2048,
    gpuMemoryUtil: 0.7,
    swapSpace: 1,
    blockSize: 8,
    maxNumSeqs: 64,
    maxNumBatchedTokens: 4096,
    chunkPrefillSize: 4096,
    enforceEager: false,
    enablePrefixCaching: false,
    enableChunkedPrefill: false,
    quantization: 'none',
    memFractionStatic: 0.8,
    temperature: 1.0,
    topP: 1.0,
    topK: -1,
    repetitionPenalty: 1.0,
  },
]

// ─── Helper: InfoTooltip ────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.preventDefault()}>
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p className="text-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Helper: ParamSliderRow ────────────────────────────────────────────────
function ParamSliderRow({
  label,
  paramKey,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  paramKey: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  const tooltip = PARAM_TOOLTIPS[paramKey]
  const displayValue = step < 1 ? value.toFixed(2) : value.toString()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <span className="text-sm font-mono font-medium tabular-nums bg-muted px-2 py-0.5 rounded">
          {displayValue}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{step < 1 ? min.toFixed(2) : min}{unit ? ` ${unit}` : ''}</span>
        <span>{step < 1 ? max.toFixed(2) : max}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  )
}

// ─── Helper: ParamSwitchRow ────────────────────────────────────────────────
function ParamSwitchRow({
  label,
  paramKey,
  checked,
  onChange,
}: {
  label: string
  paramKey: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const tooltip = PARAM_TOOLTIPS[paramKey]

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// ─── Sensitivity Parameter Configuration ────────────────────────────────────
const SENSITIVITY_PARAM_CONFIG: Record<string, {
  label: string
  key: keyof ParameterValues
  min: number
  max: number
  step: number
  unit?: string
}> = {
  maxNumSeqs: { label: 'Max Num Sequences', key: 'maxNumSeqs', min: 1, max: 1024, step: 1 },
  gpuMemoryUtil: { label: 'GPU Memory Utilization', key: 'gpuMemoryUtil', min: 0.5, max: 0.99, step: 0.01 },
  maxNumBatchedTokens: { label: 'Max Batched Tokens', key: 'maxNumBatchedTokens', min: 256, max: 65536, step: 256, unit: 'tokens' },
  maxModelLen: { label: 'Max Model Length', key: 'maxModelLen', min: 512, max: 32768, step: 512, unit: 'tokens' },
  swapSpace: { label: 'Swap Space', key: 'swapSpace', min: 0, max: 16, step: 1, unit: 'GB' },
}

// ─── Helper: Generate Sensitivity Data ───────────────────────────────────────
interface SensitivityDataPoint {
  paramValue: number
  paramLabel: string
  throughput: number
  latency: number
}

function generateSensitivityData(
  currentParams: ParameterValues,
  engine: EngineType,
  paramKey: keyof ParameterValues,
  numPoints: number = 40,
): SensitivityDataPoint[] {
  const config = SENSITIVITY_PARAM_CONFIG[paramKey]
  if (!config) return []

  const { min, max, step } = config
  const data: SensitivityDataPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    const rawValue = min + t * (max - min)
    // Snap to step
    const snappedValue = Math.round(rawValue / step) * step
    // Clamp
    const paramValue = Math.max(min, Math.min(max, snappedValue))

    // Create modified params with this param value
    const modifiedParams = { ...currentParams, [paramKey]: paramValue }

    // Compute impact for these modified params
    const impact = computeImpact(modifiedParams, engine)

    // Add realistic curve shaping based on parameter type
    // For concurrency-like params (maxNumSeqs, maxNumBatchedTokens), add diminishing returns effect
    let throughput = impact.throughput
    let latency = impact.latency

    if (paramKey === 'maxNumSeqs' || paramKey === 'maxNumBatchedTokens') {
      // Throughput: logistic-like growth with saturation
      // Scale the throughput to show clear plateau effect
      const normalizedT = (paramValue - min) / (max - min)
      const saturationPoint = 0.5 + (currentParams.gpuMemoryUtil - 0.5) * 0.3
      const logisticFactor = 1 / (1 + Math.exp(-8 * (normalizedT - saturationPoint)))
      const baseThroughput = 15 + 55 * logisticFactor
      const dimReturns = -15 * Math.max(0, normalizedT - 0.7) * Math.max(0, normalizedT - 0.7) * 10
      throughput = Math.round(Math.min(100, Math.max(5, baseThroughput + dimReturns + (modifiedParams.enableChunkedPrefill ? 8 : 0) + (modifiedParams.enablePrefixCaching ? 5 : 0) + (modifiedParams.quantization !== 'none' ? 5 : 0))))

      // Latency: linear + exponential after saturation
      const linearComponent = 20 + 40 * normalizedT
      const expComponent = 30 * Math.pow(Math.max(0, normalizedT - 0.6), 2) / 0.16
      latency = Math.round(Math.min(100, Math.max(5, linearComponent + expComponent + (modifiedParams.enforceEager ? -10 : 0) + (modifiedParams.enableChunkedPrefill ? -5 : 0))))
    } else if (paramKey === 'gpuMemoryUtil') {
      // Throughput increases with GPU mem util, but plateaus near max
      const normalizedT = (paramValue - min) / (max - min)
      throughput = Math.round(Math.min(100, Math.max(5, 20 + 60 * Math.pow(normalizedT, 0.6) + (modifiedParams.enableChunkedPrefill ? 8 : 0) + (modifiedParams.maxNumSeqs / 1024) * 15)))

      // Latency slightly decreases with more GPU memory (less swapping), then stabilizes
      latency = Math.round(Math.min(100, Math.max(5, 70 - 30 * Math.pow(normalizedT, 0.5) + (modifiedParams.maxNumSeqs / 1024) * 15 - (modifiedParams.enforceEager ? 10 : 0))))
    } else if (paramKey === 'maxModelLen') {
      // Throughput decreases with larger model length (more memory per sequence)
      const normalizedT = (paramValue - min) / (max - min)
      throughput = Math.round(Math.min(100, Math.max(5, 75 - 40 * normalizedT + (modifiedParams.enableChunkedPrefill ? 8 : 0) + (modifiedParams.maxNumSeqs / 1024) * 15)))

      // Latency increases with model length
      latency = Math.round(Math.min(100, Math.max(5, 25 + 35 * normalizedT + (modifiedParams.maxNumSeqs / 1024) * 20 - (modifiedParams.enforceEager ? 10 : 0))))
    } else if (paramKey === 'swapSpace') {
      // Throughput: swap helps up to a point, then hurts
      const normalizedT = (paramValue - min) / (max - min)
      const swapBenefit = 10 * Math.min(1, normalizedT * 3)
      const swapCost = -8 * Math.max(0, normalizedT - 0.4) * 2
      throughput = Math.round(Math.min(100, Math.max(5, 40 + swapBenefit + swapCost + (modifiedParams.enableChunkedPrefill ? 8 : 0) + (modifiedParams.maxNumSeqs / 1024) * 15)))

      // Latency: increases when swapping is used heavily
      latency = Math.round(Math.min(100, Math.max(5, 40 + 20 * Math.max(0, normalizedT - 0.3) / 0.7 + (modifiedParams.maxNumSeqs / 1024) * 20 - (modifiedParams.enforceEager ? 10 : 0))))
    }

    // Format label
    const paramLabel = step < 1 ? paramValue.toFixed(2) : paramValue.toString()

    data.push({
      paramValue,
      paramLabel,
      throughput,
      latency,
    })
  }

  return data
}

// ─── Helper: Estimate Impact ────────────────────────────────────────────────
function computeImpact(params: ParameterValues, engine: EngineType) {
  // Memory estimation: base + gpuMemoryUtil factor + modelLen factor + sequences factor
  const memBase = 20 // base GB for a 70B model
  const memGpuUtil = params.gpuMemoryUtil * 60
  const memModelLen = (params.maxModelLen / 32768) * 15
  const memSeqs = (params.maxNumSeqs / 1024) * 10
  const memSwap = params.swapSpace * 0.5
  const memQuant = params.quantization !== 'none' ? -15 : 0
  const memTotal = Math.min(100, Math.max(5, memBase + memGpuUtil + memModelLen + memSeqs + memSwap + memQuant))

  // Throughput estimation
  const tpBase = 30
  const tpSeqs = (params.maxNumSeqs / 1024) * 30
  const tpBatched = (params.maxNumBatchedTokens / 65536) * 20
  const tpChunked = params.enableChunkedPrefill ? 15 : 0
  const tpPrefix = params.enablePrefixCaching ? 10 : 0
  const tpEager = params.enforceEager ? -10 : 0
  const tpQuant = params.quantization !== 'none' ? 8 : 0
  const tpTotal = Math.min(100, Math.max(5, tpBase + tpSeqs + tpBatched + tpChunked + tpPrefix + tpEager + tpQuant))

  // Latency estimation (lower is better, so we invert for the "goodness" indicator)
  const latBase = 50
  const latSeqs = -(params.maxNumSeqs / 1024) * 30 // more seqs = higher latency
  const latBatched = -(params.maxNumBatchedTokens / 65536) * 10
  const latEager = params.enforceEager ? 15 : 0 // eager mode = lower latency for single requests
  const latChunked = params.enableChunkedPrefill ? 10 : 0 // chunked prefill = lower TTFT
  const latTotal = Math.min(100, Math.max(5, latBase + latSeqs + latBatched + latEager + latChunked))

  return {
    memory: Math.round(memTotal),
    throughput: Math.round(tpTotal),
    latency: Math.round(latTotal),
  }
}

// ─── Trend Indicator (outside render to avoid lint error) ───────────────────
function TrendIndicator({ value, threshold = 50 }: { value: number; threshold?: number }) {
  if (value > threshold + 15) {
    return <ArrowUp className="size-4 text-emerald-500" />
  } else if (value < threshold - 15) {
    return <ArrowDown className="size-4 text-red-500" />
  }
  return <Minus className="size-4 text-yellow-500" />
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </CardContent>
    </Card>
  )
}

function SkeletonTableRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-14" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
    </TableRow>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ParametersPage() {
  const { data: profiles, loading: profilesLoading, error: profilesError, addProfile, editProfile, removeProfile } = useProfiles()
  const { data: models, loading: modelsLoading, error: modelsError } = useModels()

  // ── State ──
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [params, setParams] = useState<ParameterValues>({ ...DEFAULT_PARAMS })
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileDescription, setProfileDescription] = useState('')
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [presetsImported, setPresetsImported] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sensitivityParam, setSensitivityParam] = useState<keyof typeof SENSITIVITY_PARAM_CONFIG>('maxNumSeqs')

  // Null-safe lists from API data
  const savedProfiles = profiles ?? []
  const availableModels = models ?? []

  const selectedModel = useMemo(() => {
    return availableModels.find((m) => m.id === selectedModelId) ?? null
  }, [selectedModelId, availableModels])

  const engine: EngineType = selectedModel?.engine ?? 'vllm'

  // ── Parameter updaters ──
  const updateParam = useCallback(<K extends keyof ParameterValues>(key: K, value: ParameterValues[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetParams = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS })
  }, [])

  // ── Apply preset ──
  const applyPreset = useCallback((preset: typeof PRESET_PROFILES[number]) => {
    const { name: _name, description: _desc, highlights: _hl, ...presetParams } = preset
    setParams({ ...presetParams })
    toast.success(`Applied "${preset.name}" preset`, {
      description: preset.description,
    })
  }, [])

  // ── Import presets to saved profiles ──
  const importPresets = useCallback(async () => {
    if (presetsImported) {
      toast.info('Presets have already been imported.')
      return
    }
    try {
      for (const preset of PRESET_PROFILES) {
        await addProfile({
          name: preset.name,
          modelId: selectedModelId || availableModels[0]?.id || '',
          engine: selectedModelId
            ? (availableModels.find((m) => m.id === selectedModelId)?.engine ?? 'vllm')
            : 'vllm',
          maxModelLen: preset.maxModelLen,
          gpuMemoryUtil: preset.gpuMemoryUtil,
          maxNumSeqs: preset.maxNumSeqs,
          maxNumBatchedTokens: preset.maxNumBatchedTokens,
          swapSpace: preset.swapSpace,
          blockSize: preset.blockSize,
          quantization: preset.quantization,
          enforceEager: preset.enforceEager,
          enablePrefixCaching: preset.enablePrefixCaching,
          enableChunkedPrefill: preset.enableChunkedPrefill,
          memFractionStatic: preset.memFractionStatic,
          chunkPrefillSize: preset.chunkPrefillSize,
          temperature: preset.temperature,
          topP: preset.topP,
          topK: preset.topK,
          repetitionPenalty: preset.repetitionPenalty,
          isPreset: true,
          description: preset.description,
        })
      }
      setPresetsImported(true)
      toast.success('Preset profiles imported successfully!', {
        description: `${PRESET_PROFILES.length} preset configurations added.`,
      })
    } catch (err) {
      toast.error('Failed to import presets', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    }
  }, [presetsImported, selectedModelId, availableModels, addProfile])

  // ── Save profile ──
  const handleSaveProfile = useCallback(async () => {
    if (!profileName.trim()) {
      toast.error('Profile name is required.')
      return
    }
    if (!selectedModelId) {
      toast.error('Please select a model first.')
      return
    }

    setSaving(true)
    try {
      if (editingProfileId) {
        await editProfile(editingProfileId, {
          name: profileName.trim(),
          description: profileDescription.trim(),
          modelId: selectedModelId,
          engine,
          ...params,
        })
        toast.success('Profile updated successfully!')
      } else {
        await addProfile({
          name: profileName.trim(),
          modelId: selectedModelId,
          engine,
          maxModelLen: params.maxModelLen,
          gpuMemoryUtil: params.gpuMemoryUtil,
          maxNumSeqs: params.maxNumSeqs,
          maxNumBatchedTokens: params.maxNumBatchedTokens,
          swapSpace: params.swapSpace,
          blockSize: params.blockSize,
          quantization: params.quantization,
          enforceEager: params.enforceEager,
          enablePrefixCaching: params.enablePrefixCaching,
          enableChunkedPrefill: params.enableChunkedPrefill,
          memFractionStatic: params.memFractionStatic,
          chunkPrefillSize: params.chunkPrefillSize,
          temperature: params.temperature,
          topP: params.topP,
          topK: params.topK,
          repetitionPenalty: params.repetitionPenalty,
          isPreset: false,
          description: profileDescription.trim(),
        })
        toast.success('Profile saved successfully!')
      }

      setSaveDialogOpen(false)
      setProfileName('')
      setProfileDescription('')
      setEditingProfileId(null)
    } catch (err) {
      toast.error(editingProfileId ? 'Failed to update profile' : 'Failed to save profile', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setSaving(false)
    }
  }, [profileName, profileDescription, selectedModelId, engine, params, editingProfileId, addProfile, editProfile])

  // ── Edit profile ──
  const handleEditProfile = useCallback((profile: ParameterProfileInfo) => {
    setEditingProfileId(profile.id)
    setProfileName(profile.name)
    setProfileDescription(profile.description)
    setSelectedModelId(profile.modelId)
    setParams({
      maxModelLen: profile.maxModelLen,
      gpuMemoryUtil: profile.gpuMemoryUtil,
      maxNumSeqs: profile.maxNumSeqs,
      maxNumBatchedTokens: profile.maxNumBatchedTokens,
      swapSpace: profile.swapSpace,
      blockSize: profile.blockSize,
      quantization: profile.quantization,
      enforceEager: profile.enforceEager,
      enablePrefixCaching: profile.enablePrefixCaching,
      enableChunkedPrefill: profile.enableChunkedPrefill,
      memFractionStatic: profile.memFractionStatic,
      chunkPrefillSize: profile.chunkPrefillSize,
      temperature: profile.temperature,
      topP: profile.topP,
      topK: profile.topK,
      repetitionPenalty: profile.repetitionPenalty,
    })
    setSaveDialogOpen(true)
  }, [])

  // ── Duplicate profile ──
  const handleDuplicateProfile = useCallback(async (profile: ParameterProfileInfo) => {
    try {
      await addProfile({
        name: `${profile.name} (Copy)`,
        modelId: profile.modelId,
        engine: profile.engine,
        maxModelLen: profile.maxModelLen,
        gpuMemoryUtil: profile.gpuMemoryUtil,
        maxNumSeqs: profile.maxNumSeqs,
        maxNumBatchedTokens: profile.maxNumBatchedTokens,
        swapSpace: profile.swapSpace,
        blockSize: profile.blockSize,
        quantization: profile.quantization,
        enforceEager: profile.enforceEager,
        enablePrefixCaching: profile.enablePrefixCaching,
        enableChunkedPrefill: profile.enableChunkedPrefill,
        memFractionStatic: profile.memFractionStatic,
        chunkPrefillSize: profile.chunkPrefillSize,
        temperature: profile.temperature,
        topP: profile.topP,
        topK: profile.topK,
        repetitionPenalty: profile.repetitionPenalty,
        isPreset: false,
        description: profile.description,
      })
      toast.success('Profile duplicated!', { description: `"${profile.name}" has been duplicated.` })
    } catch (err) {
      toast.error('Failed to duplicate profile', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    }
  }, [addProfile])

  // ── Delete profile ──
  const handleDeleteProfile = useCallback(async () => {
    if (!deleteTargetId) return

    setDeleting(true)
    try {
      await removeProfile(deleteTargetId)
      toast.success('Profile deleted.')
      setDeleteTargetId(null)
      setDeleteDialogOpen(false)
    } catch (err) {
      toast.error('Failed to delete profile', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setDeleting(false)
    }
  }, [deleteTargetId, removeProfile])

  // ── Impact calculations ──
  const impact = useMemo(() => computeImpact(params, engine), [params, engine])

  // ── Sensitivity chart data ──
  const sensitivityData = useMemo(
    () => generateSensitivityData(params, engine, sensitivityParam),
    [params, engine, sensitivityParam],
  )

  const currentSensitivityValue = params[sensitivityParam] as number
  const sensitivityConfig = SENSITIVITY_PARAM_CONFIG[sensitivityParam]

  // Find the closest data point label to the current parameter value for the ReferenceLine
  const currentSensitivityLabel = useMemo(() => {
    if (!sensitivityConfig || !sensitivityData.length) return undefined
    const closest = sensitivityData.reduce((prev, curr) =>
      Math.abs(curr.paramValue - currentSensitivityValue) < Math.abs(prev.paramValue - currentSensitivityValue) ? curr : prev,
    )
    return closest.paramLabel
  }, [sensitivityData, currentSensitivityValue, sensitivityConfig])

  const isLoading = profilesLoading || modelsLoading

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <ScrollArea className="h-screen">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="size-7 text-primary" />
                  Parameter Tuning
                </h1>
                <p className="text-muted-foreground mt-1">Configure and optimize inference parameters for your models</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={importPresets} disabled={isLoading}>
                  <Download className="size-4" />
                  Import Presets
                </Button>
                <Button size="sm" onClick={() => {
                  setEditingProfileId(null)
                  setProfileName('')
                  setProfileDescription('')
                  setSaveDialogOpen(true)
                }}>
                  <Plus className="size-4" />
                  New Profile
                </Button>
              </div>
            </div>

            <Separator />

            {/* ── Error State ── */}
            {(profilesError || modelsError) && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="py-4 flex items-center gap-3">
                  <AlertCircle className="size-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Failed to load data</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profilesError && `Profiles: ${profilesError}`}
                      {profilesError && modelsError && ' · '}
                      {modelsError && `Models: ${modelsError}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Model Selector ── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Select Model</CardTitle>
                <CardDescription>Choose the model to configure parameters for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 w-full sm:w-auto">
                    {modelsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={selectedModelId} onValueChange={(val) => {
                        setSelectedModelId(val)
                        const model = availableModels.find((m) => m.id === val)
                        if (model) {
                          toast.info(`Selected ${model.name}`, {
                            description: `Engine: ${model.engine.toUpperCase()}`,
                          })
                        }
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a model..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {selectedModel && (
                    <Badge variant={engine === 'vllm' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      <Cpu className="size-3 mr-1" />
                      {engine.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Preset Profiles ── */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Preset Profiles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PRESET_PROFILES.map((preset, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">{preset.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{preset.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        {preset.highlights.map((hl, i) => (
                          <div key={i} className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-0.5">
                            {hl}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => applyPreset(preset)}
                      >
                        Apply
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Parameter Configuration Form ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Parameter Configuration</h2>
                <Button variant="ghost" size="sm" onClick={resetParams}>
                  <RotateCcw className="size-4" />
                  Reset to Defaults
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={['memory', 'batch', 'optimization', 'sampling']} className="space-y-2">

                {/* Memory & Capacity */}
                <AccordionItem value="memory" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <HardDrive className="size-4 text-orange-500" />
                      <span className="font-semibold">Memory &amp; Capacity</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-2 pb-4">
                      <ParamSliderRow
                        label="Max Model Length"
                        paramKey="maxModelLen"
                        value={params.maxModelLen}
                        min={512}
                        max={32768}
                        step={512}
                        unit="tokens"
                        onChange={(v) => updateParam('maxModelLen', v)}
                      />
                      <ParamSliderRow
                        label="GPU Memory Utilization"
                        paramKey="gpuMemoryUtil"
                        value={params.gpuMemoryUtil}
                        min={0.5}
                        max={0.99}
                        step={0.01}
                        onChange={(v) => updateParam('gpuMemoryUtil', v)}
                      />
                      <ParamSliderRow
                        label="Swap Space"
                        paramKey="swapSpace"
                        value={params.swapSpace}
                        min={0}
                        max={16}
                        step={1}
                        unit="GB"
                        onChange={(v) => updateParam('swapSpace', v)}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-medium">Block Size</Label>
                          <InfoTooltip text={PARAM_TOOLTIPS.blockSize} />
                        </div>
                        <Select
                          value={params.blockSize.toString()}
                          onValueChange={(v) => updateParam('blockSize', parseInt(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[8, 16, 32, 64].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Batch & Concurrency */}
                <AccordionItem value="batch" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-blue-500" />
                      <span className="font-semibold">Batch &amp; Concurrency</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-2 pb-4">
                      <ParamSliderRow
                        label="Max Num Sequences"
                        paramKey="maxNumSeqs"
                        value={params.maxNumSeqs}
                        min={1}
                        max={1024}
                        step={1}
                        onChange={(v) => updateParam('maxNumSeqs', v)}
                      />
                      <ParamSliderRow
                        label="Max Num Batched Tokens"
                        paramKey="maxNumBatchedTokens"
                        value={params.maxNumBatchedTokens}
                        min={256}
                        max={65536}
                        step={256}
                        unit="tokens"
                        onChange={(v) => updateParam('maxNumBatchedTokens', v)}
                      />
                      {engine === 'sglang' && (
                        <ParamSliderRow
                          label="Chunk Prefill Size"
                          paramKey="chunkPrefillSize"
                          value={params.chunkPrefillSize}
                          min={512}
                          max={32768}
                          step={512}
                          unit="tokens"
                          onChange={(v) => updateParam('chunkPrefillSize', v)}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Optimization Flags */}
                <AccordionItem value="optimization" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-yellow-500" />
                      <span className="font-semibold">Optimization Flags</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5 pt-2 pb-4">
                      <ParamSwitchRow
                        label="Enforce Eager"
                        paramKey="enforceEager"
                        checked={params.enforceEager}
                        onChange={(v) => updateParam('enforceEager', v)}
                      />
                      <ParamSwitchRow
                        label="Enable Prefix Caching"
                        paramKey="enablePrefixCaching"
                        checked={params.enablePrefixCaching}
                        onChange={(v) => updateParam('enablePrefixCaching', v)}
                      />
                      <ParamSwitchRow
                        label="Enable Chunked Prefill"
                        paramKey="enableChunkedPrefill"
                        checked={params.enableChunkedPrefill}
                        onChange={(v) => updateParam('enableChunkedPrefill', v)}
                      />
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-medium">Quantization</Label>
                          <InfoTooltip text={PARAM_TOOLTIPS.quantization} />
                        </div>
                        <Select
                          value={params.quantization}
                          onValueChange={(v) => updateParam('quantization', v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="awq">AWQ</SelectItem>
                            <SelectItem value="gptq">GPTQ</SelectItem>
                            <SelectItem value="squeezellm">SqueezeLLM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {engine === 'sglang' && (
                        <ParamSliderRow
                          label="Mem Fraction Static"
                          paramKey="memFractionStatic"
                          value={params.memFractionStatic}
                          min={0.5}
                          max={0.99}
                          step={0.01}
                          onChange={(v) => updateParam('memFractionStatic', v)}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sampling Parameters */}
                <AccordionItem value="sampling" className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-purple-500" />
                      <span className="font-semibold">Sampling Parameters</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-2 pb-4">
                      <ParamSliderRow
                        label="Temperature"
                        paramKey="temperature"
                        value={params.temperature}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(v) => updateParam('temperature', v)}
                      />
                      <ParamSliderRow
                        label="Top P"
                        paramKey="topP"
                        value={params.topP}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(v) => updateParam('topP', v)}
                      />
                      <ParamSliderRow
                        label="Top K"
                        paramKey="topK"
                        value={params.topK}
                        min={-1}
                        max={100}
                        step={1}
                        onChange={(v) => updateParam('topK', v)}
                      />
                      <ParamSliderRow
                        label="Repetition Penalty"
                        paramKey="repetitionPenalty"
                        value={params.repetitionPenalty}
                        min={1.0}
                        max={2.0}
                        step={0.05}
                        onChange={(v) => updateParam('repetitionPenalty', v)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Separator />

            {/* ── Live Impact Preview ── */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Live Impact Preview</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Approximate indicators based on current parameter values
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Estimated Memory Usage */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="size-4 text-orange-500" />
                      Estimated Memory Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{impact.memory}%</span>
                      <TrendIndicator value={impact.memory} threshold={50} />
                    </div>
                    <Progress value={impact.memory} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {impact.memory > 80
                        ? 'High memory usage - consider reducing gpuMemoryUtil or maxModelLen'
                        : impact.memory > 50
                          ? 'Moderate memory usage - balanced configuration'
                          : 'Low memory usage - room for increasing capacity'}
                    </p>
                  </CardContent>
                </Card>

                {/* Estimated Throughput */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="size-4 text-emerald-500" />
                      Estimated Throughput
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{impact.throughput}%</span>
                      <TrendIndicator value={impact.throughput} threshold={50} />
                    </div>
                    <Progress value={impact.throughput} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {impact.throughput > 70
                        ? 'High throughput potential - optimized for concurrent serving'
                        : impact.throughput > 40
                          ? 'Moderate throughput - good for mixed workloads'
                          : 'Lower throughput - optimized for other metrics'}
                    </p>
                  </CardContent>
                </Card>

                {/* Estimated Latency */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="size-4 text-blue-500" />
                      Estimated Latency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{impact.latency}%</span>
                      <TrendIndicator value={impact.latency} threshold={50} />
                    </div>
                    <Progress value={impact.latency} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {impact.latency > 70
                        ? 'Lower latency expected - responsive for interactive use'
                        : impact.latency > 40
                          ? 'Moderate latency - acceptable for most use cases'
                          : 'Higher latency expected - optimize for throughput instead'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* ── Parameter Sensitivity Preview ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Parameter Sensitivity Preview</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.preventDefault()}>
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm">
                      <p className="text-xs">
                        This prediction model uses approximate heuristics to estimate how throughput and latency
                        change as a single parameter varies. Throughput typically follows a logistic curve
                        (diminishing returns after saturation), while latency increases linearly with
                        acceleration after the saturation point. These are predictions — run actual
                        benchmarks for precise measurements.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">X-Axis Parameter:</Label>
                  <Select
                    value={sensitivityParam}
                    onValueChange={(v) => setSensitivityParam(v as keyof typeof SENSITIVITY_PARAM_CONFIG)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SENSITIVITY_PARAM_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Throughput Prediction Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-500" />
                      Throughput Prediction
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Estimated throughput as {sensitivityConfig?.label ?? 'parameter'} varies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[220px]">
                      <ChartContainer
                        config={{
                          throughput: { label: 'Throughput', color: '#10b981' },
                        }}
                        className="w-full h-full"
                      >
                        <AreaChart
                          data={sensitivityData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="throughputSensitivityGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="paramLabel"
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            width={35}
                            domain={[0, 100]}
                          />
                          <ChartTooltip
                            content={(
                              <ChartTooltipContent
                                formatter={(value: number) => [`${value}%`, 'Throughput']}
                                labelFormatter={(label: string) => `${sensitivityConfig?.label ?? 'Param'}: ${label}`}
                              />
                            )}
                          />
                          <ReferenceLine
                            x={currentSensitivityLabel}
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            label={{
                              value: 'Current',
                              position: 'top',
                              fill: '#10b981',
                              fontSize: 10,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="throughput"
                            stroke="#10b981"
                            fill="url(#throughputSensitivityGrad)"
                            strokeWidth={2}
                            animationDuration={400}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Latency Prediction Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="size-4 text-amber-500" />
                      Latency Prediction
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Estimated latency as {sensitivityConfig?.label ?? 'parameter'} varies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[220px]">
                      <ChartContainer
                        config={{
                          latency: { label: 'Latency', color: '#f59e0b' },
                        }}
                        className="w-full h-full"
                      >
                        <AreaChart
                          data={sensitivityData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="latencySensitivityGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="paramLabel"
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            width={35}
                            domain={[0, 100]}
                          />
                          <ChartTooltip
                            content={(
                              <ChartTooltipContent
                                formatter={(value: number) => [`${value}%`, 'Latency']}
                                labelFormatter={(label: string) => `${sensitivityConfig?.label ?? 'Param'}: ${label}`}
                              />
                            )}
                          />
                          <ReferenceLine
                            x={currentSensitivityLabel}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            label={{
                              value: 'Current',
                              position: 'top',
                              fill: '#f59e0b',
                              fontSize: 10,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="latency"
                            stroke="#f59e0b"
                            fill="url(#latencySensitivityGrad)"
                            strokeWidth={2}
                            animationDuration={400}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <Separator />

            {/* ── Saved Profiles Table ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Saved Profiles</h2>
                <Badge variant="secondary" className="text-xs">
                  {savedProfiles.length} profiles
                </Badge>
              </div>
              {profilesLoading ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Model</TableHead>
                          <TableHead className="hidden md:table-cell">Engine</TableHead>
                          <TableHead className="hidden lg:table-cell">Key Parameters</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <SkeletonTableRow key={i} />
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : savedProfiles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <SlidersHorizontal className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No saved profiles yet.</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Create a new profile or import presets to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Model</TableHead>
                          <TableHead className="hidden md:table-cell">Engine</TableHead>
                          <TableHead className="hidden lg:table-cell">Key Parameters</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savedProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{profile.name}</span>
                                {profile.isPreset && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    PRESET
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {profile.modelName || 'Unknown'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge
                                variant={profile.engine === 'vllm' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {profile.engine.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  seqs:{profile.maxNumSeqs}
                                </span>
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  gpu:{profile.gpuMemoryUtil}
                                </span>
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  len:{profile.maxModelLen}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      onClick={() => handleEditProfile(profile)}
                                    >
                                      <Edit3 className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      onClick={() => handleDuplicateProfile(profile)}
                                    >
                                      <Copy className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicate</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setDeleteTargetId(profile.id)
                                        setDeleteDialogOpen(true)
                                      }}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ── Save Profile Dialog ── */}
        <Dialog open={saveDialogOpen} onOpenChange={(open) => {
          setSaveDialogOpen(open)
          if (!open) {
            setEditingProfileId(null)
            setProfileName('')
            setProfileDescription('')
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProfileId ? 'Edit Profile' : 'Save Profile'}</DialogTitle>
              <DialogDescription>
                {editingProfileId
                  ? 'Update the profile name and description.'
                  : 'Save the current parameter configuration as a new profile.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  placeholder="e.g., Production High-Throughput"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-description">Description</Label>
                <Textarea
                  id="profile-description"
                  placeholder="Describe the purpose and configuration of this profile..."
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  rows={3}
                />
              </div>
              {!selectedModelId && (
                <p className="text-xs text-destructive">
                  Please select a model before saving a profile.
                </p>
              )}
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Current Configuration Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-xs text-muted-foreground">Engine:</span>
                  <span className="text-xs font-mono">{engine.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">Max Model Len:</span>
                  <span className="text-xs font-mono">{params.maxModelLen}</span>
                  <span className="text-xs text-muted-foreground">GPU Mem Util:</span>
                  <span className="text-xs font-mono">{params.gpuMemoryUtil}</span>
                  <span className="text-xs text-muted-foreground">Max Num Seqs:</span>
                  <span className="text-xs font-mono">{params.maxNumSeqs}</span>
                  <span className="text-xs text-muted-foreground">Quantization:</span>
                  <span className="text-xs font-mono">{params.quantization}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={!profileName.trim() || !selectedModelId || saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {editingProfileId ? 'Update' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Dialog ── */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this profile? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTargetId(null)} disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProfile}
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
