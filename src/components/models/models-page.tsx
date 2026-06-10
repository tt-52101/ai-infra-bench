'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { v4 as uuidv4 } from 'uuid'
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
  ChevronRight,
  Layers,
  Gauge,
  FolderOpen,
} from 'lucide-react'

import { useAppStore } from '@/lib/store'
import type { ModelInfo, EngineType, ModelStatus } from '@/lib/types'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from '@/components/ui/switch'
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'model-1',
    name: 'Qwen2.5-72B-Instruct',
    engine: 'vllm',
    modelPath: '/data/models/Qwen2.5-72B-Instruct',
    version: '1.0.0',
    status: 'active',
    description: 'Qwen2.5 72B parameter instruction-tuned model for advanced text generation and reasoning tasks.',
    gpuType: 'A100-80G',
    gpuCount: 8,
    maxSeqLen: 32768,
    dtype: 'bfloat16',
    tensorParallelSize: 8,
    pipelineParallelSize: 1,
    createdAt: '2024-12-15T08:30:00Z',
    updatedAt: '2025-01-20T14:22:00Z',
  },
  {
    id: 'model-2',
    name: 'Llama-3.1-70B-Instruct',
    engine: 'sglang',
    modelPath: '/data/models/Meta-Llama-3.1-70B-Instruct',
    version: '3.1.0',
    status: 'active',
    description: 'Meta Llama 3.1 70B instruction-tuned model optimized for SGLang runtime.',
    gpuType: 'H100-80G',
    gpuCount: 4,
    maxSeqLen: 131072,
    dtype: 'bfloat16',
    tensorParallelSize: 4,
    pipelineParallelSize: 1,
    createdAt: '2024-11-20T10:00:00Z',
    updatedAt: '2025-02-05T09:15:00Z',
  },
  {
    id: 'model-3',
    name: 'DeepSeek-V2-Chat',
    engine: 'vllm',
    modelPath: '/data/models/deepseek-llm/deepseek-v2-chat',
    version: '2.0.0',
    status: 'error',
    description: 'DeepSeek V2 Chat model with MoE architecture. Currently experiencing GPU memory errors.',
    gpuType: 'A800-80G',
    gpuCount: 8,
    maxSeqLen: 16384,
    dtype: 'bfloat16',
    tensorParallelSize: 8,
    pipelineParallelSize: 1,
    createdAt: '2025-01-10T12:00:00Z',
    updatedAt: '2025-03-01T16:45:00Z',
  },
  {
    id: 'model-4',
    name: 'Mistral-7B-Instruct',
    engine: 'sglang',
    modelPath: '/data/models/mistral-7b-instruct-v0.3',
    version: '0.3.0',
    status: 'active',
    description: 'Mistral 7B instruction-tuned model, lightweight and efficient for single-GPU deployment.',
    gpuType: 'L40S',
    gpuCount: 1,
    maxSeqLen: 32768,
    dtype: 'float16',
    tensorParallelSize: 1,
    pipelineParallelSize: 1,
    createdAt: '2025-02-01T09:30:00Z',
    updatedAt: '2025-02-28T11:00:00Z',
  },
  {
    id: 'model-5',
    name: 'Yi-1.5-34B-Chat',
    engine: 'vllm',
    modelPath: '/data/models/01-ai/Yi-1.5-34B-Chat',
    version: '1.5.0',
    status: 'inactive',
    description: 'Yi 1.5 34B Chat model. Currently offline for maintenance and parameter tuning.',
    gpuType: 'A100-40G',
    gpuCount: 4,
    maxSeqLen: 4096,
    dtype: 'bfloat16',
    tensorParallelSize: 4,
    pipelineParallelSize: 1,
    createdAt: '2024-10-05T14:00:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
  },
]

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
}: {
  model: ModelInfo
  onEdit: (model: ModelInfo) => void
  onDelete: (model: ModelInfo) => void
  onViewDetails: (model: ModelInfo) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative transition-all duration-200 hover:shadow-md hover:border-primary/20 py-0 gap-0">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <CardTitle className="text-base font-semibold truncate">{model.name}</CardTitle>
                <EngineBadge engine={model.engine} />
              </div>
              <div className="flex items-center gap-3">
                <StatusDot status={model.status} />
                <span className="text-xs text-muted-foreground">v{model.version}</span>
              </div>
            </div>
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingModel: ModelInfo | null
}) {
  const { addModel, updateModel } = useAppStore()
  const isEditing = !!editingModel

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
    (values: ModelFormValues) => {
      const now = new Date().toISOString()
      if (isEditing && editingModel) {
        updateModel(editingModel.id, {
          ...values,
          updatedAt: now,
        })
        toast.success('Model updated', { description: `${values.name} has been updated successfully.` })
      } else {
        const newModel: ModelInfo = {
          id: uuidv4(),
          ...values,
          createdAt: now,
          updatedAt: now,
        }
        addModel(newModel)
        toast.success('Model created', { description: `${values.name} has been added successfully.` })
      }
      onOpenChange(false)
    },
    [isEditing, editingModel, updateModel, addModel, onOpenChange]
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="model-form">
            {isEditing ? (
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

// ─── Model Detail Sheet ───────────────────────────────────────────────────────

function ModelDetailSheet({
  model,
  open,
  onOpenChange,
}: {
  model: ModelInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
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
      <SheetContent side="right" className="sm:max-w-lg w-full p-0 overflow-hidden">
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
  const { models, setModels, removeModel } = useAppStore()

  // Initialize mock data if store is empty
  useEffect(() => {
    if (models.length === 0) {
      setModels(MOCK_MODELS)
    }
  }, [models.length, setModels])

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

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        searchQuery === '' ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.modelPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesEngine = engineFilter === 'all' || model.engine === engineFilter
      const matchesStatus = statusFilter === 'all' || model.status === statusFilter
      return matchesSearch && matchesEngine && matchesStatus
    })
  }, [models, searchQuery, engineFilter, statusFilter])

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

  const confirmDelete = useCallback(() => {
    if (deleteModel) {
      removeModel(deleteModel.id)
      toast.success('Model deleted', { description: `${deleteModel.name} has been removed.` })
    }
    setDeleteDialogOpen(false)
    setDeleteModel(null)
  }, [deleteModel, removeModel])

  const handleViewDetails = useCallback((model: ModelInfo) => {
    setDetailModel(model)
    setDetailSheetOpen(true)
  }, [])

  // Stats
  const modelStats = useMemo(() => {
    const total = models.length
    const active = models.filter((m) => m.status === 'active').length
    const inactive = models.filter((m) => m.status === 'inactive').length
    const error = models.filter((m) => m.status === 'error').length
    const vllm = models.filter((m) => m.engine === 'vllm').length
    const sglang = models.filter((m) => m.engine === 'sglang').length
    return { total, active, inactive, error, vllm, sglang }
  }, [models])

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
          <Button onClick={handleAdd} className="shrink-0">
            <Plus className="size-4" />
            Add Model
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Models', value: modelStats.total, color: '' },
            { label: 'Active', value: modelStats.active, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'VLLM', value: modelStats.vllm, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'SGLang', value: modelStats.sglang, color: 'text-amber-600 dark:text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-3 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

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

      {/* Model Cards Grid */}
      {filteredModels.length === 0 ? (
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
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <ModelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingModel={editingModel}
      />

      {/* Detail Sheet */}
      <ModelDetailSheet
        model={detailModel}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
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
            <AlertDialogCancel onClick={() => setDeleteModel(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
