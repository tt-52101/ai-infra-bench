'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, Key, Copy, Check, ChevronDown, ChevronRight, Terminal, Send, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ApiEndpoint {
  method: HttpMethod
  path: string
  description: string
  requestBody?: string
  exampleResponse: string
  parameters?: { name: string; type: string; required: boolean; description: string }[]
}

interface EndpointGroup {
  title: string
  translationKey: string
  endpoints: ApiEndpoint[]
}

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  POST: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' },
  PUT: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
}

const endpointGroups: EndpointGroup[] = [
  {
    title: 'Models',
    translationKey: 'apiDocs.models',
    endpoints: [
      {
        method: 'GET',
        path: '/api/models',
        description: 'Retrieve a list of all registered inference models',
        exampleResponse: JSON.stringify(
          {
            data: [
              {
                id: 'model-001',
                name: 'LLaMA-3-70B',
                engine: 'vllm',
                modelPath: '/models/llama3-70b',
                status: 'active',
                gpuType: 'A100',
                gpuCount: 4,
                maxSeqLen: 4096,
                createdAt: '2024-01-15T10:30:00Z',
              },
            ],
            total: 5,
          },
          null,
          2
        ),
      },
      {
        method: 'POST',
        path: '/api/models',
        description: 'Register a new inference model',
        requestBody: JSON.stringify(
          {
            name: 'LLaMA-3-70B',
            engine: 'vllm',
            modelPath: '/models/llama3-70b',
            gpuType: 'A100',
            gpuCount: 4,
            maxSeqLen: 4096,
            dtype: 'float16',
            tensorParallelSize: 4,
          },
          null,
          2
        ),
        exampleResponse: JSON.stringify(
          {
            id: 'model-006',
            name: 'LLaMA-3-70B',
            engine: 'vllm',
            status: 'active',
            createdAt: '2024-03-01T14:30:00Z',
          },
          null,
          2
        ),
      },
      {
        method: 'GET',
        path: '/api/models/:id',
        description: 'Get detailed information about a specific model',
        parameters: [{ name: 'id', type: 'string', required: true, description: 'Model identifier' }],
        exampleResponse: JSON.stringify(
          {
            id: 'model-001',
            name: 'LLaMA-3-70B',
            engine: 'vllm',
            modelPath: '/models/llama3-70b',
            version: '1.0.0',
            status: 'active',
            gpuType: 'A100',
            gpuCount: 4,
            maxSeqLen: 4096,
            dtype: 'float16',
            tensorParallelSize: 4,
            pipelineParallelSize: 1,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-02-20T08:15:00Z',
          },
          null,
          2
        ),
      },
      {
        method: 'PUT',
        path: '/api/models/:id',
        description: 'Update a model configuration',
        parameters: [{ name: 'id', type: 'string', required: true, description: 'Model identifier' }],
        requestBody: JSON.stringify(
          {
            name: 'LLaMA-3-70B-Updated',
            gpuCount: 8,
            maxSeqLen: 8192,
          },
          null,
          2
        ),
        exampleResponse: JSON.stringify(
          {
            id: 'model-001',
            name: 'LLaMA-3-70B-Updated',
            gpuCount: 8,
            maxSeqLen: 8192,
            updatedAt: '2024-03-01T15:00:00Z',
          },
          null,
          2
        ),
      },
      {
        method: 'DELETE',
        path: '/api/models/:id',
        description: 'Delete a model from the platform',
        parameters: [{ name: 'id', type: 'string', required: true, description: 'Model identifier' }],
        exampleResponse: JSON.stringify({ success: true, message: 'Model deleted successfully' }, null, 2),
      },
    ],
  },
  {
    title: 'Profiles',
    translationKey: 'apiDocs.profiles',
    endpoints: [
      {
        method: 'GET',
        path: '/api/profiles',
        description: 'List all parameter profiles',
        exampleResponse: JSON.stringify(
          {
            data: [
              {
                id: 'profile-001',
                name: 'High Throughput',
                modelId: 'model-001',
                engine: 'vllm',
                maxModelLen: 4096,
                gpuMemoryUtil: 0.9,
                maxNumSeqs: 256,
                isPreset: true,
                createdAt: '2024-01-15T10:30:00Z',
              },
            ],
            total: 8,
          },
          null,
          2
        ),
      },
      {
        method: 'POST',
        path: '/api/profiles',
        description: 'Create a new parameter profile',
        requestBody: JSON.stringify(
          {
            name: 'Custom Profile',
            modelId: 'model-001',
            engine: 'vllm',
            maxModelLen: 4096,
            gpuMemoryUtil: 0.85,
            maxNumSeqs: 128,
            temperature: 0.7,
            topP: 0.95,
          },
          null,
          2
        ),
        exampleResponse: JSON.stringify(
          {
            id: 'profile-009',
            name: 'Custom Profile',
            modelId: 'model-001',
            engine: 'vllm',
            createdAt: '2024-03-01T16:00:00Z',
          },
          null,
          2
        ),
      },
    ],
  },
  {
    title: 'Benchmarks',
    translationKey: 'apiDocs.benchmarks',
    endpoints: [
      {
        method: 'GET',
        path: '/api/benchmarks',
        description: 'List all benchmark tasks',
        exampleResponse: JSON.stringify(
          {
            data: [
              {
                id: 'bench-001',
                name: 'Throughput Test #1',
                modelId: 'model-001',
                scenario: 'single_stream',
                numRequests: 1000,
                status: 'completed',
                createdAt: '2024-02-20T10:00:00Z',
              },
            ],
            total: 12,
          },
          null,
          2
        ),
      },
      {
        method: 'POST',
        path: '/api/benchmarks',
        description: 'Create and start a new benchmark task',
        requestBody: JSON.stringify(
          {
            name: 'Latency Test',
            modelId: 'model-001',
            profileId: 'profile-001',
            scenario: 'multi_stream',
            numRequests: 500,
            inputTokens: 128,
            outputTokens: 256,
            concurrency: 16,
            duration: 300,
          },
          null,
          2
        ),
        exampleResponse: JSON.stringify(
          {
            id: 'bench-013',
            name: 'Latency Test',
            status: 'running',
            progress: 0,
            createdAt: '2024-03-01T17:00:00Z',
          },
          null,
          2
        ),
      },
    ],
  },
  {
    title: 'Results',
    translationKey: 'apiDocs.results',
    endpoints: [
      {
        method: 'GET',
        path: '/api/results',
        description: 'List benchmark results',
        parameters: [
          { name: 'taskId', type: 'string', required: false, description: 'Filter by benchmark task ID' },
          { name: 'modelId', type: 'string', required: false, description: 'Filter by model ID' },
        ],
        exampleResponse: JSON.stringify(
          {
            data: [
              {
                id: 'result-001',
                taskId: 'bench-001',
                throughputTokensPerSec: 2450.5,
                throughputRequestsPerSec: 24.5,
                latencyMeanMs: 40.8,
                latencyP99Ms: 85.2,
                gpuUtilization: 0.92,
                totalRequests: 1000,
                successRequests: 998,
                failedRequests: 2,
                errorRate: 0.002,
                createdAt: '2024-02-20T11:30:00Z',
              },
            ],
            total: 24,
          },
          null,
          2
        ),
      },
    ],
  },
  {
    title: 'Analyses',
    translationKey: 'apiDocs.analyses',
    endpoints: [
      {
        method: 'GET',
        path: '/api/analyses',
        description: 'List inflection point analyses',
        exampleResponse: JSON.stringify(
          {
            data: [
              {
                id: 'analysis-001',
                modelId: 'model-001',
                engine: 'vllm',
                dimension: 'concurrency_throughput',
                inflectionPoint: 64,
                optimalValue: 48,
                performanceGain: 0.23,
                status: 'completed',
                createdAt: '2024-02-25T09:00:00Z',
              },
            ],
            total: 6,
          },
          null,
          2
        ),
      },
    ],
  },
  {
    title: 'Dashboard',
    translationKey: 'apiDocs.dashboard',
    endpoints: [
      {
        method: 'GET',
        path: '/api/dashboard',
        description: 'Get dashboard statistics and overview data',
        exampleResponse: JSON.stringify(
          {
            totalModels: 5,
            activeModels: 4,
            totalBenchmarks: 12,
            runningBenchmarks: 2,
            avgThroughput: 2150.3,
            avgLatency: 45.6,
            completedBenchmarks: 8,
            failedBenchmarks: 2,
          },
          null,
          2
        ),
      },
    ],
  },
]

function MethodBadge({ method }: { method: HttpMethod }) {
  const colors = METHOD_COLORS[method]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      {method}
    </span>
  )
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <div className="rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-xs font-mono text-zinc-400">{language}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

function TryItPanel({ endpoint, t }: { endpoint: ApiEndpoint; t: (key: string) => string }) {
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const pathParamsList = endpoint.parameters?.filter((p) => endpoint.path.includes(`:${p.name}`)) || []

  const resolvedPath = Object.entries(pathParams).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value || `:${key}`),
    endpoint.path
  )

  const curlCommand = (() => {
    let cmd = `curl -X ${endpoint.method} https://api.inferbench.io${resolvedPath}`
    cmd += ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
    cmd += ` \\\n  -H "Content-Type: application/json"`
    if (endpoint.requestBody) {
      cmd += ` \\\n  -d '${endpoint.requestBody}'`
    }
    return cmd
  })()

  const handleSend = () => {
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
        {pathParamsList.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">{t('apiDocs.parameters')}</h5>
            {pathParamsList.map((param) => (
              <div key={param.name} className="flex items-center gap-3">
                <span className="text-sm font-mono text-foreground min-w-[80px]">{param.name}</span>
                {param.required && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-500/30 text-red-500">
                    required
                  </Badge>
                )}
                <Input
                  placeholder={param.name}
                  value={pathParams[param.name] || ''}
                  onChange={(e) => setPathParams({ ...pathParams, [param.name]: e.target.value })}
                  className="h-8 text-sm font-mono max-w-xs"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" /> cURL
          </h5>
          <CodeBlock code={curlCommand} language="bash" />
        </div>

        <Button
          size="sm"
          className="gap-2"
          onClick={handleSend}
        >
          <Send className="h-3.5 w-3.5" />
          {t('apiDocs.sendRequest')}
        </Button>

        <AnimatePresence>
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">{t('apiDocs.response')}</h5>
                <CodeBlock code={endpoint.exampleResponse} language="json" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function EndpointCard({ endpoint, t }: { endpoint: ApiEndpoint; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  const [tryItOpen, setTryItOpen] = useState(false)

  return (
    <Card className="overflow-hidden border-border/50 hover:border-border transition-colors">
      <CardContent className="p-0">
        <button
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
          <span className="text-sm text-muted-foreground hidden sm:block max-w-[300px] truncate">
            {endpoint.description}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-1">{t('apiDocs.description')}</h5>
                  <p className="text-sm text-foreground">{endpoint.description}</p>
                </div>

                {endpoint.parameters && endpoint.parameters.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('apiDocs.parameters')}</h5>
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="px-3 py-2 text-left font-medium">Name</th>
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Required</th>
                            <th className="px-3 py-2 text-left font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoint.parameters.map((param) => (
                            <tr key={param.name} className="border-t border-border/30">
                              <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">
                                {param.name}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{param.type}</td>
                              <td className="px-3 py-2">
                                {param.required ? (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-500/30 text-red-500">
                                    required
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">optional</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {endpoint.requestBody && (
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('apiDocs.requestBody')}</h5>
                    <CodeBlock code={endpoint.requestBody} language="json" />
                  </div>
                )}

                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('apiDocs.exampleResponse')}</h5>
                  <CodeBlock code={endpoint.exampleResponse} language="json" />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setTryItOpen(!tryItOpen)}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  {t('apiDocs.tryIt')}
                  {tryItOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>

                <AnimatePresence>
                  {tryItOpen && <TryItPanel endpoint={endpoint} t={t} />}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export function ApiDocsPage() {
  const { t } = useI18n()
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false)

  const baseUrl = 'https://api.inferbench.io'

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText(baseUrl)
    setCopiedBaseUrl(true)
    setTimeout(() => setCopiedBaseUrl(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('apiDocs.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('apiDocs.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('apiDocs.baseUrl')}</h3>
              <code className="text-sm font-mono text-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                {baseUrl}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleCopyBaseUrl}
            >
              {copiedBaseUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedBaseUrl ? 'Copied' : t('common.copy')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-amber-500" />
            {t('apiDocs.authentication')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t('apiDocs.authDescription')}</p>
          <CodeBlock
            code={`Authorization: Bearer YOUR_API_KEY`}
            language="http"
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Endpoints */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-emerald-600" />
          {t('apiDocs.endpoints')}
        </h2>
        <div className="space-y-6">
          {endpointGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3 px-1">
                {t(group.translationKey)}
              </h3>
              <div className="space-y-2">
                {group.endpoints.map((endpoint, idx) => (
                  <EndpointCard
                    key={`${endpoint.method}-${endpoint.path}-${idx}`}
                    endpoint={endpoint}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
