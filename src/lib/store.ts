import { create } from 'zustand'
import type { PageKey, ModelInfo, ParameterProfileInfo, BenchmarkTaskInfo, BenchmarkResultInfo, InflectionAnalysisInfo, DashboardStats } from './types'

interface AppState {
  // 导航
  activePage: PageKey
  setActivePage: (page: PageKey) => void
  
  // 模型
  models: ModelInfo[]
  setModels: (models: ModelInfo[]) => void
  addModel: (model: ModelInfo) => void
  updateModel: (id: string, model: Partial<ModelInfo>) => void
  removeModel: (id: string) => void
  
  // 参数配置
  profiles: ParameterProfileInfo[]
  setProfiles: (profiles: ParameterProfileInfo[]) => void
  addProfile: (profile: ParameterProfileInfo) => void
  updateProfile: (id: string, profile: Partial<ParameterProfileInfo>) => void
  removeProfile: (id: string) => void
  
  // Benchmark 任务
  tasks: BenchmarkTaskInfo[]
  setTasks: (tasks: BenchmarkTaskInfo[]) => void
  addTask: (task: BenchmarkTaskInfo) => void
  updateTask: (id: string, task: Partial<BenchmarkTaskInfo>) => void
  removeTask: (id: string) => void
  
  // Benchmark 结果
  results: BenchmarkResultInfo[]
  setResults: (results: BenchmarkResultInfo[]) => void
  addResult: (result: BenchmarkResultInfo) => void
  
  // 拐点分析
  analyses: InflectionAnalysisInfo[]
  setAnalyses: (analyses: InflectionAnalysisInfo[]) => void
  addAnalysis: (analysis: InflectionAnalysisInfo) => void
  
  // 仪表盘
  dashboardStats: DashboardStats
  setDashboardStats: (stats: DashboardStats) => void
  
  // 加载状态
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // 导航
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
  
  // 模型
  models: [],
  setModels: (models) => set({ models }),
  addModel: (model) => set((state) => ({ models: [...state.models, model] })),
  updateModel: (id, model) => set((state) => ({
    models: state.models.map((m) => m.id === id ? { ...m, ...model } : m)
  })),
  removeModel: (id) => set((state) => ({
    models: state.models.filter((m) => m.id !== id)
  })),
  
  // 参数配置
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
  updateProfile: (id, profile) => set((state) => ({
    profiles: state.profiles.map((p) => p.id === id ? { ...p, ...profile } : p)
  })),
  removeProfile: (id) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== id)
  })),
  
  // Benchmark 任务
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, task) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...task } : t)
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
  
  // Benchmark 结果
  results: [],
  setResults: (results) => set({ results }),
  addResult: (result) => set((state) => ({ results: [...state.results, result] })),
  
  // 拐点分析
  analyses: [],
  setAnalyses: (analyses) => set({ analyses }),
  addAnalysis: (analysis) => set((state) => ({ analyses: [...state.analyses, analysis] })),
  
  // 仪表盘
  dashboardStats: {
    totalModels: 0,
    activeModels: 0,
    totalBenchmarks: 0,
    runningBenchmarks: 0,
    avgThroughput: 0,
    avgLatency: 0,
    completedBenchmarks: 0,
    failedBenchmarks: 0,
  },
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  
  // 加载状态
  loading: false,
  setLoading: (loading) => set({ loading }),
}))
