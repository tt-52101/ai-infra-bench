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
} from 'lucide-react'
import type { EngineType, ParameterProfileInfo, ModelInfo } from '@/lib/types'
import { useAppStore } from '@/lib/store'
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

// ─── Mock Models ────────────────────────────────────────────────────────────
const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'model-1',
    name: 'LLaMA-3-70B',
    engine: 'vllm',
    modelPath: '/models/llama3-70b',
    version: '1.0',
    status: 'active',
    description: 'LLaMA 3 70B parameter model',
    gpuType: 'A100',
    gpuCount: 4,
    maxSeqLen: 8192,
    dtype: 'bfloat16',
    tensorParallelSize: 4,
    pipelineParallelSize: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'model-2',
    name: 'Mistral-7B-Instruct',
    engine: 'sglang',
    modelPath: '/models/mistral-7b-instruct',
    version: '1.0',
    status: 'active',
    description: 'Mistral 7B Instruct model',
    gpuType: 'A100',
    gpuCount: 1,
    maxSeqLen: 32768,
    dtype: 'bfloat16',
    tensorParallelSize: 1,
    pipelineParallelSize: 1,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'model-3',
    name: 'Qwen2-72B-Chat',
    engine: 'vllm',
    modelPath: '/models/qwen2-72b-chat',
    version: '1.0',
    status: 'active',
    description: 'Qwen2 72B Chat model',
    gpuType: 'H100',
    gpuCount: 2,
    maxSeqLen: 32768,
    dtype: 'bfloat16',
    tensorParallelSize: 2,
    pipelineParallelSize: 1,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'model-4',
    name: 'DeepSeek-V2-Lite',
    engine: 'sglang',
    modelPath: '/models/deepseek-v2-lite',
    version: '1.0',
    status: 'inactive',
    description: 'DeepSeek V2 Lite model',
    gpuType: 'A6000',
    gpuCount: 1,
    maxSeqLen: 16384,
    dtype: 'bfloat16',
    tensorParallelSize: 1,
    pipelineParallelSize: 1,
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-01T10:00:00Z',
  },
]

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

// ─── Initial saved profiles ────────────────────────────────────────────────
const INITIAL_SAVED_PROFILES: ParameterProfileInfo[] = [
  {
    id: 'profile-saved-1',
    name: 'Production Config',
    modelId: 'model-1',
    engine: 'vllm',
    maxModelLen: 8192,
    gpuMemoryUtil: 0.92,
    maxNumSeqs: 256,
    maxNumBatchedTokens: 16384,
    swapSpace: 4,
    blockSize: 16,
    quantization: 'none',
    enforceEager: false,
    enablePrefixCaching: true,
    enableChunkedPrefill: true,
    memFractionStatic: 0.88,
    chunkPrefillSize: 8192,
    temperature: 0.7,
    topP: 0.9,
    topK: -1,
    repetitionPenalty: 1.0,
    isPreset: false,
    description: 'Production configuration for LLaMA-3-70B serving.',
    createdAt: '2024-06-10T08:00:00Z',
    updatedAt: '2024-06-12T14:30:00Z',
    modelName: 'LLaMA-3-70B',
  },
  {
    id: 'profile-saved-2',
    name: 'Dev Testing',
    modelId: 'model-2',
    engine: 'sglang',
    maxModelLen: 4096,
    gpuMemoryUtil: 0.85,
    maxNumSeqs: 64,
    maxNumBatchedTokens: 4096,
    swapSpace: 2,
    blockSize: 16,
    quantization: 'none',
    enforceEager: true,
    enablePrefixCaching: false,
    enableChunkedPrefill: false,
    memFractionStatic: 0.85,
    chunkPrefillSize: 4096,
    temperature: 1.0,
    topP: 1.0,
    topK: -1,
    repetitionPenalty: 1.0,
    isPreset: false,
    description: 'Development testing config with eager mode for Mistral-7B.',
    createdAt: '2024-06-08T10:00:00Z',
    updatedAt: '2024-06-09T16:00:00Z',
    modelName: 'Mistral-7B-Instruct',
  },
  {
    id: 'profile-saved-3',
    name: 'AWQ Quantized Serve',
    modelId: 'model-3',
    engine: 'vllm',
    maxModelLen: 4096,
    gpuMemoryUtil: 0.9,
    maxNumSeqs: 128,
    maxNumBatchedTokens: 8192,
    swapSpace: 4,
    blockSize: 16,
    quantization: 'awq',
    enforceEager: false,
    enablePrefixCaching: true,
    enableChunkedPrefill: true,
    memFractionStatic: 0.88,
    chunkPrefillSize: 8192,
    temperature: 0.8,
    topP: 0.95,
    topK: 50,
    repetitionPenalty: 1.05,
    isPreset: false,
    description: 'AWQ quantized serving for Qwen2-72B with reduced memory.',
    createdAt: '2024-06-14T12:00:00Z',
    updatedAt: '2024-06-14T12:00:00Z',
    modelName: 'Qwen2-72B-Chat',
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ParametersPage() {
  const { profiles, addProfile, updateProfile, removeProfile, models } = useAppStore()

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

  // Use store profiles or initial saved profiles
  const savedProfiles = useMemo(() => {
    if (profiles.length > 0) return profiles
    return INITIAL_SAVED_PROFILES
  }, [profiles])

  // Use store models or mock models
  const availableModels = useMemo(() => {
    if (models.length > 0) return models
    return MOCK_MODELS
  }, [models])

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
  const importPresets = useCallback(() => {
    if (presetsImported) {
      toast.info('Presets have already been imported.')
      return
    }
    PRESET_PROFILES.forEach((preset, idx) => {
      const profile: ParameterProfileInfo = {
        id: `profile-preset-${idx}`,
        name: preset.name,
        modelId: selectedModelId || 'model-1',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelName: selectedModelId
          ? (availableModels.find((m) => m.id === selectedModelId)?.name ?? 'Unknown')
          : 'LLaMA-3-70B',
      }
      addProfile(profile)
    })
    setPresetsImported(true)
    toast.success('Preset profiles imported successfully!', {
      description: `${PRESET_PROFILES.length} preset configurations added.`,
    })
  }, [presetsImported, selectedModelId, availableModels, addProfile])

  // ── Save profile ──
  const handleSaveProfile = useCallback(() => {
    if (!profileName.trim()) {
      toast.error('Profile name is required.')
      return
    }
    if (!selectedModelId) {
      toast.error('Please select a model first.')
      return
    }

    const now = new Date().toISOString()

    if (editingProfileId) {
      updateProfile(editingProfileId, {
        name: profileName.trim(),
        description: profileDescription.trim(),
        modelId: selectedModelId,
        engine,
        modelName: selectedModel?.name,
        ...params,
        updatedAt: now,
      })
      toast.success('Profile updated successfully!')
    } else {
      const newProfile: ParameterProfileInfo = {
        id: `profile-custom-${Date.now()}`,
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
        createdAt: now,
        updatedAt: now,
        modelName: selectedModel?.name,
      }
      addProfile(newProfile)
      toast.success('Profile saved successfully!')
    }

    setSaveDialogOpen(false)
    setProfileName('')
    setProfileDescription('')
    setEditingProfileId(null)
  }, [profileName, profileDescription, selectedModelId, selectedModel, engine, params, editingProfileId, addProfile, updateProfile])

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
  const handleDuplicateProfile = useCallback((profile: ParameterProfileInfo) => {
    const now = new Date().toISOString()
    const newProfile: ParameterProfileInfo = {
      ...profile,
      id: `profile-custom-${Date.now()}`,
      name: `${profile.name} (Copy)`,
      isPreset: false,
      createdAt: now,
      updatedAt: now,
    }
    addProfile(newProfile)
    toast.success('Profile duplicated!', { description: `"${profile.name}" has been duplicated.` })
  }, [addProfile])

  // ── Delete profile ──
  const handleDeleteProfile = useCallback(() => {
    if (deleteTargetId) {
      removeProfile(deleteTargetId)
      toast.success('Profile deleted.')
      setDeleteTargetId(null)
      setDeleteDialogOpen(false)
    }
  }, [deleteTargetId, removeProfile])

  // ── Impact calculations ──
  const impact = useMemo(() => computeImpact(params, engine), [params, engine])

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
                <Button variant="outline" size="sm" onClick={importPresets}>
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

            {/* ── Model Selector ── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Select Model</CardTitle>
                <CardDescription>Choose the model to configure parameters for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 w-full sm:w-auto">
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

            {/* ── Saved Profiles Table ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Saved Profiles</h2>
                <Badge variant="secondary" className="text-xs">
                  {savedProfiles.length} profiles
                </Badge>
              </div>
              {savedProfiles.length === 0 ? (
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
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={!profileName.trim() || !selectedModelId}>
                <Save className="size-4" />
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
              <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProfile}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
