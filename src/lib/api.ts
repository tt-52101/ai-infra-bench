/**
 * API Client for InferBench Platform
 * Centralized API layer with type-safe methods for all endpoints
 */

import type {
  ModelInfo,
  ParameterProfileInfo,
  BenchmarkTaskInfo,
  BenchmarkResultInfo,
  InflectionAnalysisInfo,
  DashboardStats,
  EngineType,
  ModelStatus,
  BenchmarkScenario,
  TaskStatus,
} from './types'

// ── Base Fetch Helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `API Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data as T
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/dashboard')
}

// ── Models ─────────────────────────────────────────────────────────────────

export async function fetchModels(filters?: {
  engine?: EngineType
  status?: ModelStatus
}): Promise<ModelInfo[]> {
  const params = new URLSearchParams()
  if (filters?.engine) params.set('engine', filters.engine)
  if (filters?.status) params.set('status', filters.status)
  const qs = params.toString()
  return apiFetch<ModelInfo[]>(`/api/models${qs ? `?${qs}` : ''}`)
}

export async function fetchModel(id: string): Promise<ModelInfo> {
  return apiFetch<ModelInfo>(`/api/models/${id}`)
}

export async function createModel(data: Omit<ModelInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelInfo> {
  return apiFetch<ModelInfo>('/api/models', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateModel(id: string, data: Partial<ModelInfo>): Promise<ModelInfo> {
  return apiFetch<ModelInfo>(`/api/models/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteModel(id: string): Promise<void> {
  await apiFetch(`/api/models/${id}`, { method: 'DELETE' })
}

// ── Parameter Profiles ─────────────────────────────────────────────────────

export async function fetchProfiles(filters?: {
  modelId?: string
  engine?: EngineType
}): Promise<ParameterProfileInfo[]> {
  const params = new URLSearchParams()
  if (filters?.modelId) params.set('modelId', filters.modelId)
  if (filters?.engine) params.set('engine', filters.engine)
  const qs = params.toString()
  return apiFetch<ParameterProfileInfo[]>(`/api/profiles${qs ? `?${qs}` : ''}`)
}

export async function fetchProfile(id: string): Promise<ParameterProfileInfo> {
  return apiFetch<ParameterProfileInfo>(`/api/profiles/${id}`)
}

export async function createProfile(data: Omit<ParameterProfileInfo, 'id' | 'createdAt' | 'updatedAt' | 'modelName'>): Promise<ParameterProfileInfo> {
  return apiFetch<ParameterProfileInfo>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateProfile(id: string, data: Partial<ParameterProfileInfo>): Promise<ParameterProfileInfo> {
  return apiFetch<ParameterProfileInfo>(`/api/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteProfile(id: string): Promise<void> {
  await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' })
}

// ── Benchmark Tasks ────────────────────────────────────────────────────────

export async function fetchBenchmarks(filters?: {
  status?: TaskStatus
  modelId?: string
}): Promise<BenchmarkTaskInfo[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.modelId) params.set('modelId', filters.modelId)
  const qs = params.toString()
  return apiFetch<BenchmarkTaskInfo[]>(`/api/benchmarks${qs ? `?${qs}` : ''}`)
}

export async function fetchBenchmark(id: string): Promise<BenchmarkTaskInfo> {
  return apiFetch<BenchmarkTaskInfo>(`/api/benchmarks/${id}`)
}

export async function createBenchmark(data: {
  name: string
  modelId: string
  profileId: string
  scenario: BenchmarkScenario
  numRequests: number
  inputTokens: number
  outputTokens: number
  concurrency: number
  duration: number
}): Promise<BenchmarkTaskInfo> {
  return apiFetch<BenchmarkTaskInfo>('/api/benchmarks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBenchmark(id: string, data: Partial<BenchmarkTaskInfo>): Promise<BenchmarkTaskInfo> {
  return apiFetch<BenchmarkTaskInfo>(`/api/benchmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBenchmark(id: string): Promise<void> {
  await apiFetch(`/api/benchmarks/${id}`, { method: 'DELETE' })
}

// ── Benchmark Results ──────────────────────────────────────────────────────

export async function fetchResults(filters?: {
  taskId?: string
}): Promise<BenchmarkResultInfo[]> {
  const params = new URLSearchParams()
  if (filters?.taskId) params.set('taskId', filters.taskId)
  const qs = params.toString()
  return apiFetch<BenchmarkResultInfo[]>(`/api/results${qs ? `?${qs}` : ''}`)
}

export async function createResult(data: Omit<BenchmarkResultInfo, 'id' | 'createdAt'>): Promise<BenchmarkResultInfo> {
  return apiFetch<BenchmarkResultInfo>('/api/results', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ── Inflection Analyses ───────────────────────────────────────────────────

export async function fetchAnalyses(filters?: {
  modelId?: string
  dimension?: string
}): Promise<InflectionAnalysisInfo[]> {
  const params = new URLSearchParams()
  if (filters?.modelId) params.set('modelId', filters.modelId)
  if (filters?.dimension) params.set('dimension', filters.dimension)
  const qs = params.toString()
  return apiFetch<InflectionAnalysisInfo[]>(`/api/analyses${qs ? `?${qs}` : ''}`)
}

export async function fetchAnalysis(id: string): Promise<InflectionAnalysisInfo> {
  return apiFetch<InflectionAnalysisInfo>(`/api/analyses/${id}`)
}

export async function createAnalysis(data: Omit<InflectionAnalysisInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<InflectionAnalysisInfo> {
  return apiFetch<InflectionAnalysisInfo>('/api/analyses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAnalysis(id: string, data: Partial<InflectionAnalysisInfo>): Promise<InflectionAnalysisInfo> {
  return apiFetch<InflectionAnalysisInfo>(`/api/analyses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAnalysis(id: string): Promise<void> {
  await apiFetch(`/api/analyses/${id}`, { method: 'DELETE' })
}

// ── Seed ───────────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<{ models: number; profiles: number; benchmarkTasks: number; analyses: number }> {
  const res = await fetch('/api/seed', { method: 'POST' })
  const json = await res.json()
  return json.data
}
