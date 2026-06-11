import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Clear existing data (in reverse dependency order)
    await db.benchmarkResult.deleteMany()
    await db.benchmarkTask.deleteMany()
    await db.parameterProfile.deleteMany()
    await db.inflectionAnalysis.deleteMany()
    await db.model.deleteMany()

    // Create 5 models
    const models = await Promise.all([
      db.model.create({
        data: {
          name: 'Qwen2.5-72B-Instruct',
          engine: 'vllm',
          modelPath: '/models/Qwen2.5-72B-Instruct',
          version: '1.0.0',
          status: 'active',
          description: 'Qwen2.5 72B instruction-tuned model for high-quality text generation',
          gpuType: 'A100-80G',
          gpuCount: 4,
          maxSeqLen: 8192,
          dtype: 'bfloat16',
          tensorParallelSize: 4,
          pipelineParallelSize: 1,
        },
      }),
      db.model.create({
        data: {
          name: 'Llama-3.1-70B-Instruct',
          engine: 'sglang',
          modelPath: '/models/Llama-3.1-70B-Instruct',
          version: '1.0.0',
          status: 'active',
          description: 'Meta Llama 3.1 70B instruct model optimized for SGLang',
          gpuType: 'A100-80G',
          gpuCount: 4,
          maxSeqLen: 4096,
          dtype: 'bfloat16',
          tensorParallelSize: 4,
          pipelineParallelSize: 1,
        },
      }),
      db.model.create({
        data: {
          name: 'Qwen2.5-7B-Instruct',
          engine: 'vllm',
          modelPath: '/models/Qwen2.5-7B-Instruct',
          version: '1.0.0',
          status: 'active',
          description: 'Qwen2.5 7B lightweight instruction model',
          gpuType: 'A100-80G',
          gpuCount: 1,
          maxSeqLen: 4096,
          dtype: 'float16',
          tensorParallelSize: 1,
          pipelineParallelSize: 1,
        },
      }),
      db.model.create({
        data: {
          name: 'DeepSeek-V2-Lite',
          engine: 'sglang',
          modelPath: '/models/DeepSeek-V2-Lite',
          version: '1.0.0',
          status: 'inactive',
          description: 'DeepSeek V2 Lite model for efficient inference',
          gpuType: 'A10G-24G',
          gpuCount: 2,
          maxSeqLen: 4096,
          dtype: 'float16',
          tensorParallelSize: 2,
          pipelineParallelSize: 1,
        },
      }),
      db.model.create({
        data: {
          name: 'Mistral-7B-Instruct-v0.3',
          engine: 'vllm',
          modelPath: '/models/Mistral-7B-Instruct-v0.3',
          version: '1.0.0',
          status: 'error',
          description: 'Mistral 7B instruct model - currently experiencing errors',
          gpuType: 'A10G-24G',
          gpuCount: 1,
          maxSeqLen: 8192,
          dtype: 'auto',
          tensorParallelSize: 1,
          pipelineParallelSize: 1,
        },
      }),
    ])

    // Create 4 parameter profiles
    const profiles = await Promise.all([
      db.parameterProfile.create({
        data: {
          name: 'High Throughput Config',
          modelId: models[0].id,
          engine: 'vllm',
          maxModelLen: 8192,
          gpuMemoryUtil: 0.95,
          maxNumSeqs: 512,
          maxNumBatchedTokens: 16384,
          swapSpace: 4,
          blockSize: 16,
          quantization: '',
          enforceEager: false,
          enablePrefixCaching: true,
          enableChunkedPrefill: true,
          memFractionStatic: 0.88,
          chunkPrefillSize: 8192,
          temperature: 0.7,
          topP: 0.9,
          topK: -1,
          repetitionPenalty: 1.0,
          isPreset: true,
          description: 'Optimized for maximum throughput with prefix caching and chunked prefill',
        },
      }),
      db.parameterProfile.create({
        data: {
          name: 'Low Latency Config',
          modelId: models[0].id,
          engine: 'vllm',
          maxModelLen: 4096,
          gpuMemoryUtil: 0.9,
          maxNumSeqs: 64,
          maxNumBatchedTokens: 4096,
          swapSpace: 2,
          blockSize: 16,
          quantization: '',
          enforceEager: true,
          enablePrefixCaching: false,
          enableChunkedPrefill: false,
          memFractionStatic: 0.88,
          chunkPrefillSize: 8192,
          temperature: 0.7,
          topP: 0.9,
          topK: -1,
          repetitionPenalty: 1.0,
          isPreset: true,
          description: 'Optimized for minimal latency with eager execution',
        },
      }),
      db.parameterProfile.create({
        data: {
          name: 'SGLang Default Config',
          modelId: models[1].id,
          engine: 'sglang',
          maxModelLen: 4096,
          gpuMemoryUtil: 0.9,
          maxNumSeqs: 256,
          maxNumBatchedTokens: 8192,
          swapSpace: 4,
          blockSize: 16,
          quantization: '',
          enforceEager: false,
          enablePrefixCaching: true,
          enableChunkedPrefill: true,
          memFractionStatic: 0.88,
          chunkPrefillSize: 8192,
          temperature: 0.7,
          topP: 0.9,
          topK: -1,
          repetitionPenalty: 1.0,
          isPreset: true,
          description: 'Default SGLang configuration with prefix caching',
        },
      }),
      db.parameterProfile.create({
        data: {
          name: 'AWQ Quantized Config',
          modelId: models[2].id,
          engine: 'vllm',
          maxModelLen: 4096,
          gpuMemoryUtil: 0.85,
          maxNumSeqs: 128,
          maxNumBatchedTokens: 8192,
          swapSpace: 2,
          blockSize: 16,
          quantization: 'awq',
          enforceEager: false,
          enablePrefixCaching: false,
          enableChunkedPrefill: false,
          memFractionStatic: 0.88,
          chunkPrefillSize: 8192,
          temperature: 0.7,
          topP: 0.9,
          topK: -1,
          repetitionPenalty: 1.0,
          isPreset: false,
          description: 'AWQ quantized model configuration for reduced memory usage',
        },
      }),
    ])

    // Create 5 benchmark tasks with results
    const benchmarkTasks = await Promise.all([
      db.benchmarkTask.create({
        data: {
          name: 'Qwen2.5-72B Throughput Test',
          modelId: models[0].id,
          profileId: profiles[0].id,
          scenario: 'serving',
          numRequests: 500,
          inputTokens: 256,
          outputTokens: 256,
          concurrency: 16,
          duration: 120,
          status: 'completed',
          progress: 100,
          startedAt: new Date(Date.now() - 3600000),
          completedAt: new Date(Date.now() - 3480000),
        },
      }),
      db.benchmarkTask.create({
        data: {
          name: 'Qwen2.5-72B Latency Test',
          modelId: models[0].id,
          profileId: profiles[1].id,
          scenario: 'single_stream',
          numRequests: 100,
          inputTokens: 128,
          outputTokens: 128,
          concurrency: 1,
          duration: 60,
          status: 'completed',
          progress: 100,
          startedAt: new Date(Date.now() - 7200000),
          completedAt: new Date(Date.now() - 7140000),
        },
      }),
      db.benchmarkTask.create({
        data: {
          name: 'Llama-3.1-70B Serving Test',
          modelId: models[1].id,
          profileId: profiles[2].id,
          scenario: 'serving',
          numRequests: 300,
          inputTokens: 512,
          outputTokens: 256,
          concurrency: 8,
          duration: 90,
          status: 'running',
          progress: 65.5,
          startedAt: new Date(Date.now() - 1800000),
        },
      }),
      db.benchmarkTask.create({
        data: {
          name: 'Qwen2.5-7B AWQ Benchmark',
          modelId: models[2].id,
          profileId: profiles[3].id,
          scenario: 'burst',
          numRequests: 200,
          inputTokens: 64,
          outputTokens: 64,
          concurrency: 32,
          duration: 30,
          status: 'completed',
          progress: 100,
          startedAt: new Date(Date.now() - 10800000),
          completedAt: new Date(Date.now() - 10770000),
        },
      }),
      db.benchmarkTask.create({
        data: {
          name: 'Mistral-7B Multi-Stream Test',
          modelId: models[4].id,
          profileId: profiles[3].id,
          scenario: 'multi_stream',
          numRequests: 150,
          inputTokens: 256,
          outputTokens: 128,
          concurrency: 4,
          duration: 60,
          status: 'failed',
          progress: 23.0,
          startedAt: new Date(Date.now() - 5400000),
          completedAt: new Date(Date.now() - 5385000),
        },
      }),
    ])

    // Create benchmark results for completed tasks
    await Promise.all([
      db.benchmarkResult.create({
        data: {
          taskId: benchmarkTasks[0].id,
          throughputTokensPerSec: 2850.5,
          throughputRequestsPerSec: 11.13,
          latencyMeanMs: 1436.2,
          latencyP50Ms: 1280.0,
          latencyP90Ms: 2150.0,
          latencyP99Ms: 3420.0,
          timeToFirstTokenMs: 285.6,
          timePerOutputTokenMs: 11.2,
          gpuMemoryUsedGb: 68.4,
          gpuUtilization: 92.5,
          cpuUtilization: 15.3,
          errorRate: 0.2,
          totalRequests: 500,
          successRequests: 499,
          failedRequests: 1,
          detailJson: JSON.stringify({
            timeSeries: Array.from({ length: 10 }, (_, i) => ({
              timestamp: Date.now() - (10 - i) * 12000,
              throughput: 2700 + Math.random() * 300,
              latency: 1300 + Math.random() * 300,
            })),
          }),
        },
      }),
      db.benchmarkResult.create({
        data: {
          taskId: benchmarkTasks[1].id,
          throughputTokensPerSec: 890.3,
          throughputRequestsPerSec: 6.95,
          latencyMeanMs: 143.8,
          latencyP50Ms: 138.2,
          latencyP90Ms: 165.4,
          latencyP99Ms: 210.8,
          timeToFirstTokenMs: 42.3,
          timePerOutputTokenMs: 11.3,
          gpuMemoryUsedGb: 62.1,
          gpuUtilization: 78.2,
          cpuUtilization: 8.5,
          errorRate: 0,
          totalRequests: 100,
          successRequests: 100,
          failedRequests: 0,
          detailJson: JSON.stringify({
            timeSeries: Array.from({ length: 10 }, (_, i) => ({
              timestamp: Date.now() - (10 - i) * 6000,
              throughput: 850 + Math.random() * 80,
              latency: 135 + Math.random() * 20,
            })),
          }),
        },
      }),
      db.benchmarkResult.create({
        data: {
          taskId: benchmarkTasks[3].id,
          throughputTokensPerSec: 4200.8,
          throughputRequestsPerSec: 65.64,
          latencyMeanMs: 487.5,
          latencyP50Ms: 420.0,
          latencyP90Ms: 680.0,
          latencyP99Ms: 950.0,
          timeToFirstTokenMs: 95.2,
          timePerOutputTokenMs: 6.1,
          gpuMemoryUsedGb: 14.2,
          gpuUtilization: 88.7,
          cpuUtilization: 12.1,
          errorRate: 0.5,
          totalRequests: 200,
          successRequests: 199,
          failedRequests: 1,
          detailJson: JSON.stringify({
            timeSeries: Array.from({ length: 10 }, (_, i) => ({
              timestamp: Date.now() - (10 - i) * 3000,
              throughput: 4000 + Math.random() * 400,
              latency: 450 + Math.random() * 100,
            })),
          }),
        },
      }),
      db.benchmarkResult.create({
        data: {
          taskId: benchmarkTasks[4].id,
          throughputTokensPerSec: 0,
          throughputRequestsPerSec: 0,
          latencyMeanMs: 0,
          latencyP50Ms: 0,
          latencyP90Ms: 0,
          latencyP99Ms: 0,
          timeToFirstTokenMs: 0,
          timePerOutputTokenMs: 0,
          gpuMemoryUsedGb: 5.2,
          gpuUtilization: 0,
          cpuUtilization: 3.1,
          errorRate: 100,
          totalRequests: 34,
          successRequests: 0,
          failedRequests: 34,
          detailJson: JSON.stringify({
            error: 'CUDA out of memory. Tried to allocate 2.5 GiB but only 1.2 GiB available.',
          }),
        },
      }),
    ])

    // Create 5 inflection analyses
    await Promise.all([
      db.inflectionAnalysis.create({
        data: {
          modelId: models[0].id,
          engine: 'vllm',
          dimension: 'concurrency',
          inflectionPoint: 16,
          optimalValue: 14,
          performanceGain: 23.5,
          analysisJson: JSON.stringify({
            dataPoints: Array.from({ length: 20 }, (_, i) => ({
              concurrency: (i + 1) * 2,
              throughput: Math.min(2850, 500 + (i * 150) - Math.max(0, (i - 8) * 30)),
              latency: 200 + (i * 80) + Math.max(0, (i - 7) * 50),
            })),
            conclusion: 'Optimal concurrency is 14. Beyond 16, latency increases significantly while throughput plateaus.',
          }),
          status: 'completed',
        },
      }),
      db.inflectionAnalysis.create({
        data: {
          modelId: models[0].id,
          engine: 'vllm',
          dimension: 'gpu_memory',
          inflectionPoint: 0.92,
          optimalValue: 0.9,
          performanceGain: 8.2,
          analysisJson: JSON.stringify({
            dataPoints: Array.from({ length: 10 }, (_, i) => ({
              gpuMemoryUtil: 0.7 + (i * 0.03),
              throughput: 2200 + (i * 80) - Math.max(0, (i - 6) * 40),
              oomRisk: i >= 8 ? 'high' : i >= 6 ? 'medium' : 'low',
            })),
            conclusion: 'GPU memory utilization of 0.9 provides best balance. Beyond 0.92, OOM risk increases sharply.',
          }),
          status: 'completed',
        },
      }),
      db.inflectionAnalysis.create({
        data: {
          modelId: models[1].id,
          engine: 'sglang',
          dimension: 'batch_size',
          inflectionPoint: 256,
          optimalValue: 224,
          performanceGain: 15.8,
          analysisJson: JSON.stringify({
            dataPoints: Array.from({ length: 8 }, (_, i) => ({
              maxNumSeqs: 32 * (i + 1),
              throughput: 1800 + (i * 120) - Math.max(0, (i - 5) * 60),
              latency: 500 + (i * 40) + Math.max(0, (i - 6) * 80),
            })),
            conclusion: 'Optimal batch size is 224. Beyond 256, latency degrades while throughput gains are minimal.',
          }),
          status: 'completed',
        },
      }),
      db.inflectionAnalysis.create({
        data: {
          modelId: models[2].id,
          engine: 'vllm',
          dimension: 'seq_length',
          inflectionPoint: 4096,
          optimalValue: 2048,
          performanceGain: 42.3,
          analysisJson: JSON.stringify({
            dataPoints: Array.from({ length: 8 }, (_, i) => ({
              maxModelLen: 512 * (i + 1),
              throughput: 5500 - (i * 200) - Math.max(0, (i - 4) * 300),
              gpuMemory: 5 + (i * 1.5) + Math.max(0, (i - 4) * 2),
            })),
            conclusion: 'Sequence length beyond 4096 causes significant throughput drop due to memory constraints on single GPU.',
          }),
          status: 'completed',
        },
      }),
      db.inflectionAnalysis.create({
        data: {
          modelId: models[1].id,
          engine: 'sglang',
          dimension: 'input_tokens',
          inflectionPoint: 512,
          optimalValue: 256,
          performanceGain: 18.7,
          analysisJson: JSON.stringify({
            dataPoints: Array.from({ length: 8 }, (_, i) => ({
              inputTokens: 64 * (i + 1),
              ttft: 50 + (i * 30) + Math.max(0, (i - 4) * 50),
              throughput: 3200 - (i * 150) - Math.max(0, (i - 4) * 200),
            })),
            conclusion: 'Input tokens beyond 512 cause TTFT to increase non-linearly. Optimal for serving is 256 input tokens.',
          }),
          status: 'completed',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        models: models.length,
        profiles: profiles.length,
        benchmarkTasks: benchmarkTasks.length,
        analyses: 5,
      },
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}
