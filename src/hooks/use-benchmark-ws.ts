'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

// ─── Types ────────────────────────────────────────────────────────
export interface BenchmarkConfig {
  benchmarkId: string
  name: string
  modelId: string
  profileId: string
  scenario: string
  numRequests: number
  inputTokens: number
  outputTokens: number
  concurrency: number
  duration: number
}

export interface BenchmarkProgress {
  benchmarkId: string
  progress: number
  throughput: number
  latency: number
  requestsCompleted: number
  elapsedTime: number
  throughputHistory: { time: string; throughput: number }[]
}

export interface BenchmarkCompleteResult {
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
  throughputHistory: { time: string; throughput: number }[]
}

export interface BenchmarkComplete {
  benchmarkId: string
  result: BenchmarkCompleteResult
}

export interface UseBenchmarkWSReturn {
  connected: boolean
  startBenchmark: (config: BenchmarkConfig) => void
  stopBenchmark: (benchmarkId: string) => void
  subscribeToBenchmark: (benchmarkId: string) => void
  unsubscribeFromBenchmark: (benchmarkId: string) => void
  onProgress: ((callback: (data: BenchmarkProgress) => void) => () => void) | null
  onComplete: ((callback: (data: BenchmarkComplete) => void) => () => void) | null
  onStopped: ((callback: (data: { benchmarkId: string }) => void) => () => void) | null
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useBenchmarkWS(): UseBenchmarkWSReturn {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to WebSocket service via Caddy gateway
    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      console.log('[BenchmarkWS] Connected:', socketInstance.id)
      setConnected(true)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('[BenchmarkWS] Disconnected:', reason)
      setConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.warn('[BenchmarkWS] Connection error:', error.message)
      setConnected(false)
    })

    return () => {
      socketInstance.disconnect()
      socketRef.current = null
    }
  }, [])

  const startBenchmark = useCallback((config: BenchmarkConfig) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('benchmark:start', config)
    } else {
      console.warn('[BenchmarkWS] Cannot start benchmark: not connected')
    }
  }, [])

  const stopBenchmark = useCallback((benchmarkId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('benchmark:stop', { benchmarkId })
    }
  }, [])

  const subscribeToBenchmark = useCallback((benchmarkId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('benchmark:subscribe', { benchmarkId })
    }
  }, [])

  const unsubscribeFromBenchmark = useCallback((benchmarkId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('benchmark:unsubscribe', { benchmarkId })
    }
  }, [])

  const onProgress = useCallback((callback: (data: BenchmarkProgress) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on('benchmark:progress', callback)
    return () => { socket.off('benchmark:progress', callback) }
  }, [])

  const onComplete = useCallback((callback: (data: BenchmarkComplete) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on('benchmark:complete', callback)
    return () => { socket.off('benchmark:complete', callback) }
  }, [])

  const onStopped = useCallback((callback: (data: { benchmarkId: string }) => void) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on('benchmark:stopped', callback)
    return () => { socket.off('benchmark:stopped', callback) }
  }, [])

  return {
    connected,
    startBenchmark,
    stopBenchmark,
    subscribeToBenchmark,
    unsubscribeFromBenchmark,
    onProgress,
    onComplete,
    onStopped,
  }
}
