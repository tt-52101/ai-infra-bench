/**
 * Custom React hooks for API data fetching with loading/error states
 * Uses SWR-like pattern with automatic refresh capabilities
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchDashboardStats,
  fetchModels,
  fetchModel,
  createModel,
  updateModel as updateModelAPI,
  deleteModel as deleteModelAPI,
  fetchProfiles,
  createProfile,
  updateProfile as updateProfileAPI,
  deleteProfile as deleteProfileAPI,
  fetchBenchmarks,
  createBenchmark,
  updateBenchmark as updateBenchmarkAPI,
  deleteBenchmark as deleteBenchmarkAPI,
  fetchResults,
  createResult,
  fetchAnalyses,
  createAnalysis,
  deleteAnalysis as deleteAnalysisAPI,
  seedDatabase,
} from '@/lib/api'
import type {
  DashboardStats,
  ModelInfo,
  ParameterProfileInfo,
  BenchmarkTaskInfo,
  BenchmarkResultInfo,
  InflectionAnalysisInfo,
  EngineType,
  ModelStatus,
  TaskStatus,
  BenchmarkScenario,
} from '@/lib/types'

// ── Generic hook pattern ───────────────────────────────────────────────────

interface UseQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
}

function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<DashboardStats>(() => fetchDashboardStats(), [])
}

// ── Models ─────────────────────────────────────────────────────────────────

export function useModels(filters?: { engine?: EngineType; status?: ModelStatus }) {
  const query = useQuery<ModelInfo[]>(
    () => fetchModels(filters),
    [filters?.engine, filters?.status]
  )

  const addModel = useCallback(async (data: Omit<ModelInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newModel = await createModel(data)
    query.refresh()
    return newModel
  }, [query])

  const editModel = useCallback(async (id: string, data: Partial<ModelInfo>) => {
    const updated = await updateModelAPI(id, data)
    query.refresh()
    return updated
  }, [query])

  const removeModel = useCallback(async (id: string) => {
    await deleteModelAPI(id)
    query.refresh()
  }, [query])

  return { ...query, addModel, editModel, removeModel }
}

export function useModel(id: string | null) {
  return useQuery<ModelInfo>(
    () => id ? fetchModel(id) : Promise.reject('No ID'),
    [id]
  )
}

// ── Parameter Profiles ─────────────────────────────────────────────────────

export function useProfiles(filters?: { modelId?: string; engine?: EngineType }) {
  const query = useQuery<ParameterProfileInfo[]>(
    () => fetchProfiles(filters),
    [filters?.modelId, filters?.engine]
  )

  const addProfile = useCallback(async (data: Omit<ParameterProfileInfo, 'id' | 'createdAt' | 'updatedAt' | 'modelName'>) => {
    const newProfile = await createProfile(data)
    query.refresh()
    return newProfile
  }, [query])

  const editProfile = useCallback(async (id: string, data: Partial<ParameterProfileInfo>) => {
    const updated = await updateProfileAPI(id, data)
    query.refresh()
    return updated
  }, [query])

  const removeProfile = useCallback(async (id: string) => {
    await deleteProfileAPI(id)
    query.refresh()
  }, [query])

  return { ...query, addProfile, editProfile, removeProfile }
}

// ── Benchmark Tasks ────────────────────────────────────────────────────────

export function useBenchmarks(filters?: { status?: TaskStatus; modelId?: string }) {
  const query = useQuery<BenchmarkTaskInfo[]>(
    () => fetchBenchmarks(filters),
    [filters?.status, filters?.modelId]
  )

  const addBenchmark = useCallback(async (data: {
    name: string
    modelId: string
    profileId: string
    scenario: BenchmarkScenario
    numRequests: number
    inputTokens: number
    outputTokens: number
    concurrency: number
    duration: number
  }) => {
    const newTask = await createBenchmark(data)
    query.refresh()
    return newTask
  }, [query])

  const editBenchmark = useCallback(async (id: string, data: Partial<BenchmarkTaskInfo>) => {
    const updated = await updateBenchmarkAPI(id, data)
    query.refresh()
    return updated
  }, [query])

  const removeBenchmark = useCallback(async (id: string) => {
    await deleteBenchmarkAPI(id)
    query.refresh()
  }, [query])

  return { ...query, addBenchmark, editBenchmark, removeBenchmark }
}

// ── Benchmark Results ──────────────────────────────────────────────────────

export function useResults(filters?: { taskId?: string }) {
  const query = useQuery<BenchmarkResultInfo[]>(
    () => fetchResults(filters),
    [filters?.taskId]
  )

  const addResult = useCallback(async (data: Omit<BenchmarkResultInfo, 'id' | 'createdAt'>) => {
    const newResult = await createResult(data)
    query.refresh()
    return newResult
  }, [query])

  return { ...query, addResult }
}

// ── Inflection Analyses ───────────────────────────────────────────────────

export function useAnalyses(filters?: { modelId?: string; dimension?: string }) {
  const query = useQuery<InflectionAnalysisInfo[]>(
    () => fetchAnalyses(filters),
    [filters?.modelId, filters?.dimension]
  )

  const addAnalysis = useCallback(async (data: Omit<InflectionAnalysisInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAnalysis = await createAnalysis(data)
    query.refresh()
    return newAnalysis
  }, [query])

  const removeAnalysis = useCallback(async (id: string) => {
    await deleteAnalysisAPI(id)
    query.refresh()
  }, [query])

  return { ...query, addAnalysis, removeAnalysis }
}

// ── Seed ───────────────────────────────────────────────────────────────────

export function useSeedDatabase() {
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ models: number; profiles: number; benchmarkTasks: number; analyses: number } | null>(null)

  const seed = useCallback(async () => {
    setSeeding(true)
    try {
      const result = await seedDatabase()
      setSeedResult(result)
      return result
    } finally {
      setSeeding(false)
    }
  }, [])

  return { seed, seeding, seedResult }
}
