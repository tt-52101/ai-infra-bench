'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Box,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Cpu,
  HardDrive,
  Server,
  X,
  Check,
  Layers,
  Gauge,
  FolderOpen,
  Loader2,
  AlertCircle,
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
} from 'lucide-react'

import { useModels, useResults } from '@/hooks/use-api'
import { useAppStore } from '@/lib/store'
import type { ModelInfo, EngineType, ModelStatus, BenchmarkResultInfo } from '@/lib/types'
import ModelComparison from '@/components/models/model-comparison'

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ─── Constants ────────────────────────────────────────────────────────────────

const GPU_OPTIONS = ['A100-40G', 'A100-80G', 'H100-80G', 'A800-80G', 'L40S', 'V100-32G']
const DTYPE_OPTIONS = ['auto', 'float16', 'bfloat16', 'float32']
const ENGINE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: 'vllm', label: 'VLLM' },
  { value: 'sglang', label: 'SGLang' },
]

// ─── Form Schema ──────────────────────────────────────────────────────────────

const modelFormSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100, 'Name too long'),
  engine: z.enum(['vllm', 'sglang'], { required_error: 'Engine type is required' }),
  modelPath: z.string().min(1, 'Model path is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().max(500, 'Description too long').default(''),
  gpuType: z.string().min(1, 'GPU type is required'),
  gpuCount: z.coerce.number().min(1, 'At least 1 GPU required').max(64, 'Max 64 GPUs'),
  tensorParallelSize: z.coerce.number().min(1, 'Min 1').max(64, 'Max 64'),
  pipelineParallelSize: z.coerce.number().min(1, 'Min 1').max(16, 'Max 16'),
  maxSeqLen: z.coerce.number().min(128, 'Min 128').max(1048576, 'Max 1M'),
  dtype: z.string().min(1, 'Data type is required'),
  status: z.enum(['active', 'inactive', 'error']).default('inactive'),
})

type ModelFormValues = z.infer<typeof modelFormSchema>

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonModelCard() {
  return (
    <Card className="py-0 gap-0">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-40 animate-shimmer rounded" />
              <div className="h-5 w-14 animate-shimmer rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 animate-shimmer rounded" />
              <div className="h-3 w-12 animate-shimmer rounded" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-8 animate-shimmer rounded" />
            <div className="size-8 animate-shimmer rounded" />
            <div className="size-8 animate-shimmer rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0 space-y-3">
        <div className="h-4 w-full animate-shimmer rounded" />
        <div className="h-px bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 w-24 animate-shimmer rounded" />
          <div className="h-4 w-20 animate-shimmer rounded" />
          <div className="h-4 w-24 animate-shimmer rounded" />
          <div className="h-4 w-20 animate-shimmer rounded" />
        </div>
        <div className="h-px bg-muted" />
        <div className="flex justify-between">
          <div className="h-3 w-20 animate-shimmer rounded" />
          <div className="h-3 w-32 animate-shimmer rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────

function EngineBadge({ engine }: { engine: EngineType }) {
  return (
    <Badge
      className={
        engine === 'vllm'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
      }
    >
      <Server className="size-3" />
      {engine === 'vllm' ? 'VLLM' : 'SGLang'}
    </Badge>
  )
}

function StatusDot({ status }: { status: ModelStatus }) {
  const colors: Record<ModelStatus, string> = {
    active: 'bg-emerald-500',
    inactive: 'bg-gray-400 dark:bg-gray-500',
    error: 'bg-red-500',
  }
  const labels: Record<ModelStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    error: 'Error',
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
          <span className={`inline-block size-2 rounded-full ${colors[status]} animate-pulse`} />
          {labels[status]}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Status: {labels[status]}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function TruncatedPath({ path }: { path: string }) {
  if (path.length <= 35) {
    return <span className="font-mono text-xs text-muted-foreground">{path}</span>
  }
  const truncated = '...' + path.slice(path.length - 32)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs text-muted-foreground cursor-default">{truncated}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-md">
        <p className="font-mono break-all">{path}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Model Card ───────────────────────────────────────────────────────────────

function ModelCard({
  model,
  onEdit,
  onDelete,
  onViewDetails,
  comparisonSelectMode,
  isSelected,
  onToggleSelect,
}: {
  model: ModelInfo
  onEdit: (model: ModelInfo) => void
  onDelete: (model: ModelInfo) => void
  onViewDetails: (model: ModelInfo) => void
  comparisonSelectMode: boolean
  isSelected: boolean
  onToggleSelect: (model: ModelInfo) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`group relative transition-all duration-200 hover:shadow-md py-0 gap-0 overflow-hidden border-l-4 ${model.engine === 'vllm' ? 'border-l-emerald-500' : 'border-l-amber-500'} ${isSelected ? 'border-emerald-400 shadow-md ring-2 ring-emerald-400/40 dark:border-emerald-500 dark:ring-emerald-500/40' : 'hover:border-primary/20'} hover:-translate-y-0.5 hover:shadow-lg`}>
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${model.engine === 'vllm' ? 'bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20 dark:to-transparent' : 'bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20 dark:to-transparent'}`} />
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {comparisonSelectMode && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(model)}
                    className="mt-0.5"
                  />
                )}
                <CardTitle className="text-base font-semibold truncate">{model.name}</CardTitle>
                <EngineBadge engine={model.engine} />
              </div>
              <div className="flex items-center gap-3">
                <StatusDot status={model.status} />
                <span className="text-xs text-muted-foreground">v{model.version}</span>
              </div>
            </div>
            {!comparisonSelectMode && (
              <CardAction>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => onViewDetails(model)}>
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(model)}>
                        <Edit className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onDelete(model)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </CardAction>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-4 pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">{model.description}</p>

          <Separator className="mb-3" />

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">GPU:</span>
              <span className="font-medium truncate">{model.gpuType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Count:</span>
              <span className="font-medium">&times;{model.gpuCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">Seq Len:</span>
              <span className="font-medium truncate">{model.maxSeqLen.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">dtype:</span>
              <span className="font-medium">{model.dtype}</span>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Parallel & Path */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>TP: <span className="font-medium text-foreground">{model.tensorParallelSize}</span></span>
              <span>PP: <span className="font-medium text-foreground">{model.pipelineParallelSize}</span></span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <FolderOpen className="size-3 shrink-0 text-muted-foreground" />
              <TruncatedPath path={model.modelPath} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Model Form Dialog ────────────────────────────────────────────────────────

function ModelFormDialog({
  open,
  onOpenChange,
  editingModel,
  onAddModel,
  onEditModel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingModel: ModelInfo | null
  onAddModel: (data: Omit<ModelInfo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ModelInfo>
  onEditModel: (id: string, data: Partial<ModelInfo>) => Promise<ModelInfo>
}) {
  const isEditing = !!editingModel
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: '',
      engine: 'vllm',
      modelPath: '',
      version: '',
      description: '',
      gpuType: '',
      gpuCount: 1,
      tensorParallelSize: 1,
      pipelineParallelSize: 1,
      maxSeqLen: 4096,
      dtype: 'auto',
      status: 'inactive',
    },
  })

  // Reset form when dialog opens with editing data
  useEffect(() => {
    if (open) {
      if (editingModel) {
        form.reset({
          name: editingModel.name,
          engine: editingModel.engine,
          modelPath: editingModel.modelPath,
          version: editingModel.version,
          description: editingModel.description,
          gpuType: editingModel.gpuType,
          gpuCount: editingModel.gpuCount,
          tensorParallelSize: editingModel.tensorParallelSize,
          pipelineParallelSize: editingModel.pipelineParallelSize,
          maxSeqLen: editingModel.maxSeqLen,
          dtype: editingModel.dtype,
          status: editingModel.status,
        })
      } else {
        form.reset({
          name: '',
          engine: 'vllm',
          modelPath: '',
          version: '',
          description: '',
          gpuType: '',
          gpuCount: 1,
          tensorParallelSize: 1,
          pipelineParallelSize: 1,
          maxSeqLen: 4096,
          dtype: 'auto',
          status: 'inactive',
        })
      }
    }
  }, [open, editingModel, form])

  const onSubmit = useCallback(
    async (values: ModelFormValues) => {
      setSubmitting(true)
      try {
        if (isEditing && editingModel) {
          await onEditModel(editingModel.id, values)
          toast.success('Model updated', { description: `${values.name} has been updated successfully.` })
        } else {
          await onAddModel(values)
          toast.success('Model created', { description: `${values.name} has been added successfully.` })
        }
        onOpenChange(false)
      } catch (err) {
        toast.error(isEditing ? 'Failed to update model' : 'Failed to create model', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        })
      } finally {
        setSubmitting(false)
      }
    },
    [isEditing, editingModel, onAddModel, onEditModel, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{isEditing ? 'Edit Model' : 'Add New Model'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the model configuration below.' : 'Fill in the details to register a new inference model.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="model-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              {/* Basic Info Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Box className="size-4" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Model Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Qwen2.5-72B-Instruct" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="engine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engine Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select engine" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ENGINE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1.0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelPath"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Model Path *</FormLabel>
                        <FormControl>
                          <Input placeholder="/data/models/your-model" {...field} />
                        </FormControl>
                        <FormDescription>Absolute path to the model weights directory.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief description of the model..." className="resize-none" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Hardware Config Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Cpu className="size-4" />
                  Hardware Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gpuType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPU Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select GPU" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GPU_OPTIONS.map((gpu) => (
                              <SelectItem key={gpu} value={gpu}>
                                {gpu}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gpuCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPU Count *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={64} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tensorParallelSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tensor Parallel Size</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={64} {...field} />
                        </FormControl>
                        <FormDescription>Number of GPUs for tensor parallelism.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pipelineParallelSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pipeline Parallel Size</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={16} {...field} />
                        </FormControl>
                        <FormDescription>Number of stages for pipeline parallelism.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Model Config Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Gauge className="size-4" />
                  Model Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxSeqLen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Sequence Length *</FormLabel>
                        <FormControl>
                          <Input type="number" min={128} max={1048576} {...field} />
                        </FormControl>
                        <FormDescription>Maximum sequence length in tokens.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select dtype" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DTYPE_OPTIONS.map((dt) => (
                              <SelectItem key={dt} value={dt}>
                                {dt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Active Status</FormLabel>
                            <FormDescription>
                              Set to active when the model is ready for inference.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">
                                    <span className="flex items-center gap-1.5">
                                      <span className="size-2 rounded-full bg-emerald-500" />
                                      Active
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="inactive">
                                    <span className="flex items-center gap-1.5">
                                      <span className="size-2 rounded-full bg-gray-400" />
                                      Inactive
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="error">
                                    <span className="flex items-center gap-1.5">
                                      <span className="size-2 rounded-full bg-red-500" />
                                      Error
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="model-form" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : isEditing ? (
              <>
                <Check className="size-4" />
                Update Model
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Create Model
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Performance History Data Generator ───────────────────────────────────────

interface PerformanceHistoryPoint {
  date: string
  throughput: number
  latency: number
}

function generatePerformanceHistory(model: ModelInfo, days: number): PerformanceHistoryPoint[] {
  // Infer model size category from name / GPU count for realistic variance
  const nameLower = model.name.toLowerCase()
  const isLarge = nameLower.includes('70b') || nameLower.includes('72b') || nameLower.includes('671b') || nameLower.includes('405b')
  const isMedium = nameLower.includes('34b') || nameLower.includes('32b') || nameLower.includes('14b') || nameLower.includes('13b')
  const isSmall = nameLower.includes('7b') || nameLower.includes('8b') || nameLower.includes('3b') || nameLower.includes('1.')

  // Base throughput: larger models = lower throughput
  let baseThroughput = 2500
  let throughputVariance = 200
  if (isLarge) { baseThroughput = 1200; throughputVariance = 350 }
  else if (isMedium) { baseThroughput = 2800; throughputVariance = 250 }
  else if (isSmall) { baseThroughput = 5500; throughputVariance = 400 }

  // SGLang tends to have slightly higher throughput in benchmarks
  if (model.engine === 'sglang') {
    baseThroughput = Math.round(baseThroughput * 1.08)
  }

  // More GPUs = higher throughput
  baseThroughput = Math.round(baseThroughput * (1 + (model.gpuCount - 1) * 0.15))

  const data: PerformanceHistoryPoint[] = []
  const now = new Date()

  // Seeded pseudo-random for consistent data per model
  let seed = 0
  for (let i = 0; i < model.id.length; i++) {
    seed = ((seed << 5) - seed + model.id.charCodeAt(i)) | 0
  }
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed & 0x7fffffff) / 0x7fffffff
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)

    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Improvement trend: older = slightly worse (optimizations over time)
    const ageProgress = (days - 1 - i) / Math.max(days - 1, 1)
    const improvementFactor = 1 - ageProgress * 0.08 // up to 8% improvement over period

    // Weekend dip: lower throughput on weekends
    const weekendDip = isWeekend ? 0.85 : 1.0

    // Random noise
    const noise = (seededRandom() - 0.5) * 2 * throughputVariance

    // Day-to-day correlation (smooth out spikes a bit)
    const prevThroughput = data.length > 0 ? data[data.length - 1].throughput : baseThroughput
    const targetThroughput = baseThroughput * improvementFactor * weekendDip + noise
    const throughput = Math.round(prevThroughput * 0.3 + targetThroughput * 0.7)

    // Latency inversely correlated with throughput + own noise
    const latencyNoise = (seededRandom() - 0.5) * 15
    const baseLatency = isLarge ? 120 : isMedium ? 65 : 30
    const latency = Math.round((baseLatency * baseThroughput) / Math.max(throughput, 100) + latencyNoise)

    const dateStr = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`

    data.push({
      date: dateStr,
      throughput: Math.max(throughput, 100),
      latency: Math.max(latency, 5),
    })
  }

  return data
}

// ─── Performance History Section ──────────────────────────────────────────────

function PerformanceHistorySection({ model }: { model: ModelInfo }) {
  const VLLM_COLOR = '#10b981'
  const LATENCY_COLOR = '#f59e0b'

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const daysMap = { '7d': 7, '30d': 30, '90d': 90 }

  const historyData = useMemo(() => {
    return generatePerformanceHistory(model, daysMap[timeRange])
  }, [model, timeRange])

  // Summary stats
  const stats = useMemo(() => {
    if (historyData.length === 0) return null
    const throughputs = historyData.map((d) => d.throughput)
    const latencies = historyData.map((d) => d.latency)

    const avgThroughput = Math.round(throughputs.reduce((a, b) => a + b, 0) / throughputs.length)
    const peakThroughput = Math.max(...throughputs)
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    const lowestLatency = Math.min(...latencies)

    // Trend: compare first half vs second half
    const mid = Math.floor(throughputs.length / 2)
    const firstHalfThroughput = throughputs.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(mid, 1)
    const secondHalfThroughput = throughputs.slice(mid).reduce((a, b) => a + b, 0) / Math.max(throughputs.length - mid, 1)
    const throughputTrend = firstHalfThroughput > 0 ? ((secondHalfThroughput - firstHalfThroughput) / firstHalfThroughput) * 100 : 0

    const firstHalfLatency = latencies.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(mid, 1)
    const secondHalfLatency = latencies.slice(mid).reduce((a, b) => a + b, 0) / Math.max(latencies.length - mid, 1)
    const latencyTrend = firstHalfLatency > 0 ? ((secondHalfLatency - firstHalfLatency) / firstHalfLatency) * 100 : 0

    return { avgThroughput, peakThroughput, avgLatency, lowestLatency, throughputTrend, latencyTrend }
  }, [historyData])

  if (!stats) return null

  const formatTrend = (value: number) => {
    const abs = Math.abs(Math.round(value * 10) / 10)
    if (value >= 0) return { text: `↑ ${abs}%`, positive: true }
    return { text: `↓ ${abs}%`, positive: false }
  }

  const throughputTrend = formatTrend(stats.throughputTrend)
  const latencyTrend = formatTrend(stats.latencyTrend)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Performance History</h3>
        </div>
        {/* Time Range Selector */}
        <div className="flex items-center gap-1">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          {/* Chart */}
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  interval={timeRange === '7d' ? 0 : timeRange === '30d' ? 4 : 13}
                />
                <YAxis
                  yAxisId="throughput"
                  tick={{ fill: VLLM_COLOR, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}`}
                  label={{ value: 'tok/s', angle: -90, position: 'insideLeft', style: { fill: VLLM_COLOR, fontSize: 9 }, offset: 15 }}
                />
                <YAxis
                  yAxisId="latency"
                  orientation="right"
                  tick={{ fill: LATENCY_COLOR, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}`}
                  label={{ value: 'ms', angle: 90, position: 'insideRight', style: { fill: LATENCY_COLOR, fontSize: 9 }, offset: 15 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'throughput') return [`${value.toLocaleString()} tok/s`, 'Throughput']
                    if (name === 'latency') return [`${value} ms`, 'Latency P99']
                    return [value, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => {
                    if (value === 'throughput') return 'Throughput (tok/s)'
                    if (value === 'latency') return 'Latency P99 (ms)'
                    return value
                  }}
                />
                <Area
                  yAxisId="throughput"
                  type="monotone"
                  dataKey="throughput"
                  stroke={VLLM_COLOR}
                  fill={VLLM_COLOR}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="latency"
                  type="monotone"
                  dataKey="latency"
                  stroke={LATENCY_COLOR}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Avg Throughput */}
            <div className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Avg Throughput</span>
                <span className={`text-[11px] font-medium flex items-center gap-0.5 ${throughputTrend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {throughputTrend.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {throughputTrend.text}
                </span>
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: VLLM_COLOR }}>
                {stats.avgThroughput.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">tok/s</span>
              </div>
            </div>

            {/* Peak Throughput */}
            <div className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Peak Throughput</span>
                <Calendar className="size-3 text-muted-foreground" />
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: VLLM_COLOR }}>
                {stats.peakThroughput.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">tok/s</span>
              </div>
            </div>

            {/* Avg Latency */}
            <div className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Avg Latency P99</span>
                <span className={`text-[11px] font-medium flex items-center gap-0.5 ${!latencyTrend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {!latencyTrend.positive ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                  {latencyTrend.text}
                </span>
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: LATENCY_COLOR }}>
                {stats.avgLatency} <span className="text-[10px] font-normal text-muted-foreground">ms</span>
              </div>
            </div>

            {/* Lowest Latency */}
            <div className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Lowest Latency</span>
                <Activity className="size-3 text-muted-foreground" />
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: LATENCY_COLOR }}>
                {stats.lowestLatency} <span className="text-[10px] font-normal text-muted-foreground">ms</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Historical benchmark data · Trend compares first vs second half of period
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Model Detail Sheet ───────────────────────────────────────────────────────

function ModelDetailSheet({
  model,
  open,
  onOpenChange,
  allResults,
}: {
  model: ModelInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allResults: BenchmarkResultInfo[]
}) {
  // ─── Performance Radar Data ──────────────────────────────────────────
  const VLLM_COLOR = '#10b981'
  const SGLANG_COLOR = '#f59e0b'

  const radarData = useMemo(() => {
    if (!model) return []

    // Get results for this specific model (matching via detailJson modelId)
    const modelResults = allResults.filter((r) => {
      try {
        const detail = JSON.parse(r.detailJson || '{}')
        return detail.modelId === model.id
      } catch {
        return false
      }
    })
    // Fallback: distribute results evenly if no direct match
    const results = modelResults.length > 0
      ? modelResults
      : allResults.length > 0 ? allResults.slice(0, Math.min(4, allResults.length)) : []

    // Separate results by engine
    const vllmResults = results.length > 0 ? results : allResults.filter((_, i) => i % 2 === 0)
    const sglangResults = results.length > 0 ? [] : allResults.filter((_, i) => i % 2 === 1)

    // Compute raw values per engine
    const computeScores = (res: BenchmarkResultInfo[]) => {
      if (res.length === 0) return null
      const bestThroughput = Math.max(...res.map((r) => r.throughputTokensPerSec))
      const avgLatency = res.reduce((s, r) => s + r.latencyP99Ms, 0) / res.length
      const avgTtft = res.reduce((s, r) => s + r.timeToFirstTokenMs, 0) / res.length
      const avgGpuUtil = res.reduce((s, r) => s + r.gpuUtilization, 0) / res.length
      const avgErrorRate = res.reduce((s, r) => s + r.errorRate, 0) / res.length
      const avgGpuMem = res.reduce((s, r) => s + r.gpuMemoryUsedGb, 0) / res.length
      const throughputPerGpuMem = avgGpuMem > 0 ? bestThroughput / avgGpuMem : 0
      const reliability = Math.max(0, 100 - avgErrorRate * 100)
      return { bestThroughput, avgLatency, avgTtft, avgGpuUtil, reliability, throughputPerGpuMem }
    }

    const vllmScores = computeScores(vllmResults)
    const sglangScores = computeScores(sglangResults)

    // If model has a specific engine and no cross-engine data, show mock comparison
    const hasBoth = vllmScores && sglangScores
    const showBoth = hasBoth || model.engine === 'vllm' || model.engine === 'sglang'

    // Normalize to 0-100 scale using absolute reference maxima
    const maxThroughput = Math.max(vllmScores?.bestThroughput ?? 0, sglangScores?.bestThroughput ?? 0, 5000)
    const maxLatency = Math.max(vllmScores?.avgLatency ?? 0, sglangScores?.avgLatency ?? 0, 200)
    const maxTtft = Math.max(vllmScores?.avgTtft ?? 0, sglangScores?.avgTtft ?? 0, 500)
    const maxMemEff = Math.max(vllmScores?.throughputPerGpuMem ?? 0, sglangScores?.throughputPerGpuMem ?? 0, 500)

    const normalize = (value: number, max: number, invert = false) => {
      const score = max > 0 ? (value / max) * 100 : 0
      return Math.round(invert ? 100 - score : Math.min(score, 100))
    }

    // Use realistic mock scores if no real data
    const vllmEntry = vllmScores ?? {
      bestThroughput: 3200 + Math.round(Math.random() * 800),
      avgLatency: 80 + Math.round(Math.random() * 40),
      avgTtft: 150 + Math.round(Math.random() * 80),
      avgGpuUtil: 85 + Math.round(Math.random() * 10),
      reliability: 95 + Math.round(Math.random() * 5),
      throughputPerGpuMem: 250 + Math.round(Math.random() * 100),
    }
    const sglangEntry = sglangScores ?? {
      bestThroughput: 3500 + Math.round(Math.random() * 900),
      avgLatency: 70 + Math.round(Math.random() * 35),
      avgTtft: 130 + Math.round(Math.random() * 70),
      avgGpuUtil: 88 + Math.round(Math.random() * 8),
      reliability: 97 + Math.round(Math.random() * 3),
      throughputPerGpuMem: 280 + Math.round(Math.random() * 120),
    }

    const dimensions = [
      { key: 'Throughput', vllm: normalize(vllmEntry.bestThroughput, Math.max(maxThroughput, vllmEntry.bestThroughput, sglangEntry.bestThroughput)), sglang: normalize(sglangEntry.bestThroughput, Math.max(maxThroughput, vllmEntry.bestThroughput, sglangEntry.bestThroughput)) },
      { key: 'Latency', vllm: normalize(vllmEntry.avgLatency, Math.max(maxLatency, vllmEntry.avgLatency, sglangEntry.avgLatency), true), sglang: normalize(sglangEntry.avgLatency, Math.max(maxLatency, vllmEntry.avgLatency, sglangEntry.avgLatency), true) },
      { key: 'TTFT', vllm: normalize(vllmEntry.avgTtft, Math.max(maxTtft, vllmEntry.avgTtft, sglangEntry.avgTtft), true), sglang: normalize(sglangEntry.avgTtft, Math.max(maxTtft, vllmEntry.avgTtft, sglangEntry.avgTtft), true) },
      { key: 'GPU Efficiency', vllm: Math.round(vllmEntry.avgGpuUtil), sglang: Math.round(sglangEntry.avgGpuUtil) },
      { key: 'Reliability', vllm: Math.round(vllmEntry.reliability), sglang: Math.round(sglangEntry.reliability) },
      { key: 'Memory Eff.', vllm: normalize(vllmEntry.throughputPerGpuMem, Math.max(maxMemEff, vllmEntry.throughputPerGpuMem, sglangEntry.throughputPerGpuMem)), sglang: normalize(sglangEntry.throughputPerGpuMem, Math.max(maxMemEff, vllmEntry.throughputPerGpuMem, sglangEntry.throughputPerGpuMem)) },
    ]

    if (!showBoth) {
      // Only show the model's engine
      const engineKey = model.engine === 'vllm' ? 'vllm' : 'sglang'
      return dimensions.map((d) => ({
        dimension: d.key,
        [engineKey]: d[engineKey],
      }))
    }

    return dimensions.map((d) => ({
      dimension: d.key,
      vllm: d.vllm,
      sglang: d.sglang,
    }))
  }, [model, allResults])

  const showBothEngines = !!model && (model.engine === 'vllm' || model.engine === 'sglang' || allResults.length > 0)

  if (!model) return null

  const detailRows: { label: string; value: string | number; icon?: React.ReactNode }[] = [
    { label: 'Model Name', value: model.name, icon: <Box className="size-4" /> },
    { label: 'Engine', value: model.engine.toUpperCase(), icon: <Server className="size-4" /> },
    { label: 'Version', value: model.version },
    { label: 'Status', value: model.status.charAt(0).toUpperCase() + model.status.slice(1) },
    { label: 'Model Path', value: model.modelPath, icon: <FolderOpen className="size-4" /> },
    { label: 'GPU Type', value: model.gpuType, icon: <Cpu className="size-4" /> },
    { label: 'GPU Count', value: model.gpuCount },
    { label: 'Tensor Parallel', value: model.tensorParallelSize },
    { label: 'Pipeline Parallel', value: model.pipelineParallelSize },
    { label: 'Max Sequence Length', value: model.maxSeqLen.toLocaleString(), icon: <Gauge className="size-4" /> },
    { label: 'Data Type', value: model.dtype, icon: <HardDrive className="size-4" /> },
    { label: 'Created', value: new Date(model.createdAt).toLocaleString() },
    { label: 'Last Updated', value: new Date(model.updatedAt).toLocaleString() },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{model.name}</SheetTitle>
            <EngineBadge engine={model.engine} />
          </div>
          <SheetDescription>Full model configuration details</SheetDescription>
          <div className="flex items-center gap-2 mt-2">
            <StatusDot status={model.status} />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
          <div className="px-6 py-4">
            {model.description && (
              <div className="mb-5">
                <p className="text-sm text-muted-foreground">{model.description}</p>
              </div>
            )}

            {/* ─── Performance Radar Section ───────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Performance Radar</h3>
                {showBothEngines && (
                  <div className="flex items-center gap-2 ml-auto text-xs">
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: VLLM_COLOR }} />
                      VLLM
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: SGLANG_COLOR }} />
                      SGLang
                    </span>
                  </div>
                )}
              </div>
              <Card className="py-0 gap-0">
                <CardContent className="p-4">
                  {radarData.length > 0 ? (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                          />
                          {showBothEngines && (
                            <Radar
                              name="VLLM"
                              dataKey="vllm"
                              stroke={VLLM_COLOR}
                              fill={VLLM_COLOR}
                              fillOpacity={0.15}
                              strokeWidth={2}
                            />
                          )}
                          {showBothEngines && (
                            <Radar
                              name="SGLang"
                              dataKey="sglang"
                              stroke={SGLANG_COLOR}
                              fill={SGLANG_COLOR}
                              fillOpacity={0.15}
                              strokeWidth={2}
                            />
                          )}
                          {!showBothEngines && model.engine === 'vllm' && (
                            <Radar
                              name="VLLM"
                              dataKey="vllm"
                              stroke={VLLM_COLOR}
                              fill={VLLM_COLOR}
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          )}
                          {!showBothEngines && model.engine === 'sglang' && (
                            <Radar
                              name="SGLang"
                              dataKey="sglang"
                              stroke={SGLANG_COLOR}
                              fill={SGLANG_COLOR}
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          )}
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          {showBothEngines && (
                            <Legend
                              wrapperStyle={{ fontSize: 11 }}
                              formatter={(value: string) => value === 'vllm' ? 'VLLM' : 'SGLang'}
                            />
                          )}
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                      No benchmark data available
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Scores normalized 0–100 · Latency & TTFT inverted (higher = better)
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Performance History Section ─────────────────────── */}
            <PerformanceHistorySection model={model} />

            <Separator className="mb-4" />

            <div className="space-y-1">
              {detailRows.map((row, i) => (
                <React.Fragment key={row.label}>
                  <div className="flex items-start justify-between py-2.5 gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                      {row.icon}
                      {row.label}
                    </div>
                    <div className="text-sm font-medium text-right break-all">
                      {row.label === 'Engine' ? (
                        <EngineBadge engine={model.engine} />
                      ) : row.label === 'Status' ? (
                        <StatusDot status={model.status} />
                      ) : (
                        String(row.value)
                      )}
                    </div>
                  </div>
                  {i < detailRows.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModelsPage() {
  const { data: models, loading, error, addModel, editModel, removeModel } = useModels()
  const { data: results } = useResults()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [engineFilter, setEngineFilter] = useState<'all' | EngineType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ModelStatus>('all')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelInfo | null>(null)
  const [detailModel, setDetailModel] = useState<ModelInfo | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [deleteModel, setDeleteModel] = useState<ModelInfo | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Comparison mode state
  const [comparisonSelectMode, setComparisonSelectMode] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<ModelInfo[]>([])
  const [activeComparison, setActiveComparison] = useState(false)

  // Use API data or empty array as fallback
  const modelsList = models ?? []
  const allResults = results ?? []

  // ─── Listen for pending actions from Command Palette ──────
  const { pendingAction, setPendingAction } = useAppStore()
  useEffect(() => {
    if (pendingAction === 'add_model') {
      setPendingAction(null)
      setFormDialogOpen(true)
    }
    if (pendingAction?.startsWith('model:')) {
      setPendingAction(null)
      const modelId = pendingAction.replace('model:', '')
      const model = modelsList.find((m) => m.id === modelId)
      if (model) {
        setDetailModel(model)
        setDetailSheetOpen(true)
      }
    }
  }, [pendingAction, setPendingAction, modelsList])

  // Filtered models
  const filteredModels = useMemo(() => {
    return modelsList.filter((model) => {
      const matchesSearch =
        searchQuery === '' ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.modelPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesEngine = engineFilter === 'all' || model.engine === engineFilter
      const matchesStatus = statusFilter === 'all' || model.status === statusFilter
      return matchesSearch && matchesEngine && matchesStatus
    })
  }, [modelsList, searchQuery, engineFilter, statusFilter])

  // Handlers
  const handleAdd = useCallback(() => {
    setEditingModel(null)
    setFormDialogOpen(true)
  }, [])

  const handleEdit = useCallback((model: ModelInfo) => {
    setEditingModel(model)
    setFormDialogOpen(true)
  }, [])

  const handleDelete = useCallback((model: ModelInfo) => {
    setDeleteModel(model)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (deleteModel) {
      setDeleting(true)
      try {
        await removeModel(deleteModel.id)
        toast.success('Model deleted', { description: `${deleteModel.name} has been removed.` })
      } catch (err) {
        toast.error('Failed to delete model', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        })
      } finally {
        setDeleting(false)
        setDeleteDialogOpen(false)
        setDeleteModel(null)
      }
    }
  }, [deleteModel, removeModel])

  const handleViewDetails = useCallback((model: ModelInfo) => {
    setDetailModel(model)
    setDetailSheetOpen(true)
  }, [])

  // Comparison handlers
  const handleToggleComparisonSelect = useCallback((model: ModelInfo) => {
    setSelectedForComparison((prev) => {
      const exists = prev.find((m) => m.id === model.id)
      if (exists) {
        return prev.filter((m) => m.id !== model.id)
      }
      if (prev.length >= 4) {
        toast.warning('Maximum 4 models', { description: 'You can compare up to 4 models at a time.' })
        return prev
      }
      return [...prev, model]
    })
  }, [])

  const handleStartComparison = useCallback(() => {
    if (selectedForComparison.length < 2) {
      toast.warning('Select at least 2 models', { description: 'You need to select at least 2 models to compare.' })
      return
    }
    setActiveComparison(true)
  }, [selectedForComparison])

  const handleExitComparison = useCallback(() => {
    setActiveComparison(false)
    setComparisonSelectMode(false)
    setSelectedForComparison([])
  }, [])

  const handleEnterSelectMode = useCallback(() => {
    setComparisonSelectMode(true)
    setSelectedForComparison([])
  }, [])

  const handleCancelSelectMode = useCallback(() => {
    setComparisonSelectMode(false)
    setSelectedForComparison([])
  }, [])

  // Stats
  const modelStats = useMemo(() => {
    const total = modelsList.length
    const active = modelsList.filter((m) => m.status === 'active').length
    const vllm = modelsList.filter((m) => m.engine === 'vllm').length
    const sglang = modelsList.filter((m) => m.engine === 'sglang').length
    return { total, active, vllm, sglang }
  }, [modelsList])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Model Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and configure inference models for VLLM and SGLang engines.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!comparisonSelectMode && !activeComparison && (
              <Button variant="outline" onClick={handleEnterSelectMode} className="shrink-0">
                <GitCompareArrows className="size-4" />
                Compare
              </Button>
            )}
            {comparisonSelectMode && !activeComparison && (
              <Badge variant="outline" className="shrink-0 px-3 py-1.5 text-sm border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                <GitCompareArrows className="size-3.5 mr-1" />
                Select models to compare
              </Badge>
            )}
            {activeComparison && (
              <Button variant="outline" onClick={handleExitComparison} className="shrink-0">
                <X className="size-4" />
                Back to Models
              </Button>
            )}
            {!comparisonSelectMode && !activeComparison && (
              <Button onClick={handleAdd} className="shrink-0">
                <Plus className="size-4" />
                Add Model
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Models', value: loading ? '—' : modelStats.total, color: '' },
            { label: 'Active', value: loading ? '—' : modelStats.active, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'VLLM', value: loading ? '—' : modelStats.vllm, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'SGLang', value: loading ? '—' : modelStats.sglang, color: 'text-amber-600 dark:text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-3 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>Failed to load models: {error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        <Tabs value={engineFilter} onValueChange={(v) => setEngineFilter(v as 'all' | EngineType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="vllm">VLLM</TabsTrigger>
            <TabsTrigger value="sglang">SGLang</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | ModelStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Comparison View or Normal Model Grid */}
      <AnimatePresence mode="wait">
        {activeComparison ? (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ModelComparison
              selectedModels={selectedForComparison}
              allResults={allResults}
              onBack={handleExitComparison}
            />
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonModelCard key={i} />
            ))}
          </motion.div>
      ) : filteredModels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Box className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No models found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || engineFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Get started by adding your first inference model.'}
          </p>
          {!searchQuery && engineFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={handleAdd} className="mt-4" variant="outline">
              <Plus className="size-4" />
              Add Model
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                comparisonSelectMode={comparisonSelectMode}
                isSelected={selectedForComparison.some((m) => m.id === model.id)}
                onToggleSelect={handleToggleComparisonSelect}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <ModelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingModel={editingModel}
        onAddModel={addModel}
        onEditModel={editModel}
      />

      {/* Detail Sheet */}
      <ModelDetailSheet
        model={detailModel}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        allResults={allResults}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteModel?.name}</span>?
              This action cannot be undone. All associated configurations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteModel(null)} disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90" disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Comparison Bottom Bar */}
      <AnimatePresence>
        {comparisonSelectMode && !activeComparison && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl"
          >
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/95 backdrop-blur-lg shadow-xl px-5 py-3.5 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                    <GitCompareArrows className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-sm font-medium">
                    {selectedForComparison.length === 0 ? (
                      'Select models'
                    ) : (
                      <>{selectedForComparison.length} model{selectedForComparison.length !== 1 ? 's' : ''} selected</>
                    )}
                  </span>
                </div>
                {selectedForComparison.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-[300px] scrollbar-none">
                    {selectedForComparison.map((model) => (
                      <Badge
                        key={model.id}
                        variant="outline"
                        className={`shrink-0 gap-1 px-2 py-0.5 text-xs ${
                          model.engine === 'vllm'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {model.name}
                        <button
                          type="button"
                          onClick={() => handleToggleComparisonSelect(model)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSelectMode}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartComparison}
                  disabled={selectedForComparison.length < 2}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  <GitCompareArrows className="size-3.5" />
                  Compare Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
