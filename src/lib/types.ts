// 推理引擎类型
export type EngineType = 'vllm' | 'sglang'

// 模型状态
export type ModelStatus = 'active' | 'inactive' | 'error'

// Benchmark 场景
export type BenchmarkScenario = 'single_stream' | 'multi_stream' | 'burst' | 'serving' | 'custom'

// 任务状态
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

// 模型信息
export interface ModelInfo {
  id: string
  name: string
  engine: EngineType
  modelPath: string
  version: string
  status: ModelStatus
  description: string
  gpuType: string
  gpuCount: number
  maxSeqLen: number
  dtype: string
  tensorParallelSize: number
  pipelineParallelSize: number
  createdAt: string
  updatedAt: string
}

// 参数配置
export interface ParameterProfileInfo {
  id: string
  name: string
  modelId: string
  engine: EngineType
  maxModelLen: number
  gpuMemoryUtil: number
  maxNumSeqs: number
  maxNumBatchedTokens: number
  swapSpace: number
  blockSize: number
  quantization: string
  enforceEager: boolean
  enablePrefixCaching: boolean
  enableChunkedPrefill: boolean
  memFractionStatic: number
  chunkPrefillSize: number
  temperature: number
  topP: number
  topK: number
  repetitionPenalty: number
  isPreset: boolean
  description: string
  createdAt: string
  updatedAt: string
  modelName?: string
}

// Benchmark 任务
export interface BenchmarkTaskInfo {
  id: string
  name: string
  modelId: string
  profileId: string
  scenario: BenchmarkScenario
  numRequests: number
  inputTokens: number
  outputTokens: number
  concurrency: number
  duration: number
  status: TaskStatus
  progress: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  modelName?: string
  profileName?: string
  engine?: EngineType
}

// Benchmark 结果
export interface BenchmarkResultInfo {
  id: string
  taskId: string
  throughputTokensPerSec: number
  throughputRequestsPerSec: number
  latencyMeanMs: number
  latencyP50Ms: number
  latencyP90Ms: number
  latencyP99Ms: number
  timeToFirstTokenMs: number
  timePerOutputTokenMs: number
  gpuMemoryUsedGb: number
  gpuUtilization: number
  cpuUtilization: number
  errorRate: number
  totalRequests: number
  successRequests: number
  failedRequests: number
  detailJson: string
  createdAt: string
}

// 拐点分析
export interface InflectionAnalysisInfo {
  id: string
  modelId: string
  engine: EngineType
  dimension: string
  inflectionPoint: number
  optimalValue: number
  performanceGain: number
  analysisJson: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

// 仪表盘统计
export interface DashboardStats {
  totalModels: number
  activeModels: number
  totalBenchmarks: number
  runningBenchmarks: number
  avgThroughput: number
  avgLatency: number
  completedBenchmarks: number
  failedBenchmarks: number
}

// 导航页面
export type PageKey = 'dashboard' | 'models' | 'parameters' | 'benchmark' | 'reports' | 'analysis'
