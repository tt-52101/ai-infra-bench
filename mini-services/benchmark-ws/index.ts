import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Types ────────────────────────────────────────────────────────
interface BenchmarkConfig {
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

interface SimulationState {
  config: BenchmarkConfig
  progress: number
  interval: ReturnType<typeof setInterval> | null
  socketId: string
  startTime: number
  throughputHistory: { time: string; throughput: number }[]
  lastThroughput: number
  lastLatency: number
}

// ─── Active Simulations ───────────────────────────────────────────
const activeSimulations = new Map<string, SimulationState>()

// ─── Simulation Logic ─────────────────────────────────────────────
function startSimulation(socketId: string, config: BenchmarkConfig) {
  // If there's already a simulation for this benchmark, stop it
  stopSimulation(config.benchmarkId)

  const state: SimulationState = {
    config,
    progress: 0,
    interval: null,
    socketId,
    startTime: Date.now(),
    throughputHistory: [],
    lastThroughput: 0,
    lastLatency: 0,
  }

  state.interval = setInterval(() => {
    // Increment progress by 1-3%
    const increment = 1 + Math.floor(Math.random() * 3)
    state.progress = Math.min(state.progress + increment, 100)

    const elapsedMs = Date.now() - state.startTime
    const elapsedSeconds = Math.round(elapsedMs / 1000)
    const reqsCompleted = Math.round((state.progress / 100) * config.numRequests)

    // Simulate realistic throughput with some variance
    const baseThroughput = config.concurrency === 1
      ? 2800
      : (1500 + config.concurrency * 120)
    const variance = (Math.random() - 0.5) * baseThroughput * 0.15
    const currentThroughput = Math.max(100, Math.round(baseThroughput + variance))

    // Latency varies inversely with throughput
    const baseLatency = config.concurrency === 1
      ? 580
      : (800 + config.concurrency * 15)
    const latencyVariance = (Math.random() - 0.5) * baseLatency * 0.2
    const currentLatency = Math.max(10, Math.round(baseLatency + latencyVariance))

    state.lastThroughput = currentThroughput
    state.lastLatency = currentLatency

    const historyEntry = { time: `${elapsedSeconds}s`, throughput: currentThroughput }
    state.throughputHistory = [...state.throughputHistory, historyEntry]

    // Emit progress update
    io.to(socketId).emit('benchmark:progress', {
      benchmarkId: config.benchmarkId,
      progress: state.progress,
      throughput: currentThroughput,
      latency: currentLatency,
      requestsCompleted: reqsCompleted,
      elapsedTime: elapsedSeconds,
      throughputHistory: state.throughputHistory,
    })

    // Check if benchmark is complete
    if (state.progress >= 100) {
      clearInterval(state.interval!)
      state.interval = null

      // Generate final results
      const finalThroughput = currentThroughput
      const finalLatency = currentLatency

      io.to(socketId).emit('benchmark:complete', {
        benchmarkId: config.benchmarkId,
        result: {
          throughputTokensPerSec: finalThroughput,
          throughputRequestsPerSec: Number((finalThroughput / (config.inputTokens + config.outputTokens)).toFixed(2)),
          latencyMeanMs: finalLatency,
          latencyP50Ms: Math.round(finalLatency * 0.9),
          latencyP90Ms: Math.round(finalLatency * 1.3),
          latencyP99Ms: Math.round(finalLatency * 1.6),
          timeToFirstTokenMs: Math.round(finalLatency * 0.25),
          timePerOutputTokenMs: Number((1000 / finalThroughput * config.outputTokens).toFixed(2)),
          gpuMemoryUsedGb: Number((30 + Math.random() * 40).toFixed(1)),
          gpuUtilization: Number((0.6 + Math.random() * 0.35).toFixed(2)),
          cpuUtilization: Number((0.1 + Math.random() * 0.3).toFixed(2)),
          errorRate: Number((Math.random() * 0.02).toFixed(4)),
          totalRequests: config.numRequests,
          successRequests: config.numRequests - Math.floor(Math.random() * 5),
          failedRequests: Math.floor(Math.random() * 5),
          detailJson: JSON.stringify({
            latencyDistribution: [
              { range: `0-${Math.round(finalLatency * 0.5)}ms`, count: Math.round(config.numRequests * 0.2) },
              { range: `${Math.round(finalLatency * 0.5)}-${Math.round(finalLatency * 0.9)}ms`, count: Math.round(config.numRequests * 0.35) },
              { range: `${Math.round(finalLatency * 0.9)}-${Math.round(finalLatency * 1.2)}ms`, count: Math.round(config.numRequests * 0.25) },
              { range: `${Math.round(finalLatency * 1.2)}-${Math.round(finalLatency * 1.5)}ms`, count: Math.round(config.numRequests * 0.12) },
              { range: `${Math.round(finalLatency * 1.5)}-${Math.round(finalLatency * 2)}ms`, count: Math.round(config.numRequests * 0.05) },
              { range: `>${Math.round(finalLatency * 2)}ms`, count: Math.round(config.numRequests * 0.03) }
            ],
            throughputTimeline: state.throughputHistory.length > 0
              ? state.throughputHistory
              : [{ time: '0s', throughput: finalThroughput }]
          }),
          throughputHistory: state.throughputHistory,
        }
      })

      // Clean up
      activeSimulations.delete(config.benchmarkId)
    }
  }, 500) // Update every 500ms

  activeSimulations.set(config.benchmarkId, state)
}

function stopSimulation(benchmarkId: string) {
  const state = activeSimulations.get(benchmarkId)
  if (state) {
    if (state.interval) {
      clearInterval(state.interval)
    }
    activeSimulations.delete(benchmarkId)
  }
}

// ─── Socket.io Connection Handler ─────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Client starts a benchmark
  socket.on('benchmark:start', (config: BenchmarkConfig) => {
    console.log(`Benchmark started: ${config.benchmarkId} by ${socket.id}`)
    startSimulation(socket.id, config)
  })

  // Client stops a benchmark
  socket.on('benchmark:stop', (data: { benchmarkId: string }) => {
    console.log(`Benchmark stopped: ${data.benchmarkId} by ${socket.id}`)
    stopSimulation(data.benchmarkId)
    socket.emit('benchmark:stopped', { benchmarkId: data.benchmarkId })
  })

  // Client subscribes to a benchmark's progress
  socket.on('benchmark:subscribe', (data: { benchmarkId: string }) => {
    console.log(`Client ${socket.id} subscribed to benchmark: ${data.benchmarkId}`)
    const state = activeSimulations.get(data.benchmarkId)
    if (state) {
      // Send current state
      socket.emit('benchmark:progress', {
        benchmarkId: data.benchmarkId,
        progress: state.progress,
        throughput: state.lastThroughput,
        latency: state.lastLatency,
        requestsCompleted: Math.round((state.progress / 100) * state.config.numRequests),
        elapsedTime: Math.round((Date.now() - state.startTime) / 1000),
        throughputHistory: state.throughputHistory,
      })
    }
  })

  // Client unsubscribes from a benchmark
  socket.on('benchmark:unsubscribe', (data: { benchmarkId: string }) => {
    console.log(`Client ${socket.id} unsubscribed from benchmark: ${data.benchmarkId}`)
  })

  // Handle disconnect - stop all simulations for this client
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
    // Stop any running simulations for this client
    for (const [benchmarkId, state] of activeSimulations.entries()) {
      if (state.socketId === socket.id) {
        stopSimulation(benchmarkId)
      }
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Benchmark WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  // Stop all active simulations
  for (const [benchmarkId] of activeSimulations.entries()) {
    stopSimulation(benchmarkId)
  }
  io.close()
  httpServer.close(() => {
    console.log('Benchmark WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  for (const [benchmarkId] of activeSimulations.entries()) {
    stopSimulation(benchmarkId)
  }
  io.close()
  httpServer.close(() => {
    console.log('Benchmark WebSocket server closed')
    process.exit(0)
  })
})
