'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  SlidersHorizontal, Rocket, BarChart3, Eye, TrendingUp, Puzzle,
  Monitor, Code2, Terminal, Bell, Shield, Zap, Server,
  Database, Activity, ArrowRight, Check, Github, BookOpen,
  Users, FileText, ChevronRight, Cpu, Box,
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/hooks/use-i18n'
import { useAppStore } from '@/lib/store'

// ── Animation Helpers ──

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

// ── Mock Data ──

const latencyTrendData = [
  { concurrency: 8, throughput: 145, latency: 42 },
  { concurrency: 16, throughput: 238, latency: 56 },
  { concurrency: 24, throughput: 298, latency: 78 },
  { concurrency: 32, throughput: 312, latency: 98 },
  { concurrency: 40, throughput: 310, latency: 128 },
  { concurrency: 48, throughput: 298, latency: 186 },
  { concurrency: 56, throughput: 275, latency: 256 },
  { concurrency: 64, throughput: 248, latency: 356 },
]

const inflectionData = [
  { concurrency: 4, throughput: 82, latency: 32 },
  { concurrency: 8, throughput: 155, latency: 45 },
  { concurrency: 16, throughput: 248, latency: 62 },
  { concurrency: 24, throughput: 296, latency: 85 },
  { concurrency: 32, throughput: 312, latency: 108 },
  { concurrency: 40, throughput: 318, latency: 145 },
  { concurrency: 48, throughput: 305, latency: 198 },
  { concurrency: 56, throughput: 278, latency: 275 },
  { concurrency: 64, throughput: 245, latency: 368 },
  { concurrency: 72, throughput: 210, latency: 478 },
  { concurrency: 80, throughput: 178, latency: 598 },
]

const benchmarkData = [
  { model: 'LLaMA-3-70B', engine: 'vLLM', scenario: 'Serving', throughput: 312.5, firstTokenLatency: 128, p95Latency: 356, errorRate: 0.12 },
  { model: 'LLaMA-3-70B', engine: 'SGLang', scenario: 'Serving', throughput: 298.3, firstTokenLatency: 115, p95Latency: 342, errorRate: 0.08 },
  { model: 'Qwen2-72B', engine: 'vLLM', scenario: 'Multi-Stream', throughput: 276.8, firstTokenLatency: 142, p95Latency: 389, errorRate: 0.15 },
  { model: 'Qwen2-72B', engine: 'SGLang', scenario: 'Multi-Stream', throughput: 265.4, firstTokenLatency: 135, p95Latency: 375, errorRate: 0.10 },
  { model: 'Mixtral-8x7B', engine: 'vLLM', scenario: 'Burst', throughput: 425.6, firstTokenLatency: 95, p95Latency: 268, errorRate: 0.22 },
  { model: 'Mixtral-8x7B', engine: 'SGLang', scenario: 'Burst', throughput: 412.8, firstTokenLatency: 88, p95Latency: 255, errorRate: 0.18 },
]

// ── Circular Progress Component ──

function CircularProgress({ value, color, size = 100, strokeWidth = 8 }: {
  value: number; color: string; size?: number; strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  )
}

// ── Section Wrapper ──

function Section({ id, children, className = '' }: {
  id: string; children: React.ReactNode; className?: string
}) {
  return (
    <motion.section
      id={id}
      className={`py-16 md:py-20 ${className}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

// ── Main Landing Page ──

export function LandingPage() {
  const { t } = useI18n()
  const { setActivePage } = useAppStore()

  const tuningParams = [
    { name: 'max_model_len', value: '8192', desc: t('landing.tuning.maxModelLenDesc') },
    { name: 'gpu_memory_utilization', value: '0.90', desc: t('landing.tuning.gpuMemoryUtilDesc') },
    { name: 'tensor_parallel_size', value: '4', desc: t('landing.tuning.tensorParallelDesc') },
    { name: 'max_num_seqs', value: '256', desc: t('landing.tuning.maxNumSeqsDesc') },
    { name: 'max_num_batched_tokens', value: '8192', desc: t('landing.tuning.maxNumBatchedTokensDesc') },
    { name: 'enable_prefix_caching', value: 'true', desc: t('landing.tuning.enablePrefixCachingDesc') },
    { name: 'enable_chunked_prefill', value: 'true', desc: t('landing.tuning.enableChunkedPrefillDesc') },
    { name: 'swap_space', value: '4 (GB)', desc: t('landing.tuning.swapSpaceDesc') },
  ]

  const resourceData = [
    { label: t('landing.resource.gpuUtil'), value: 82, color: '#10b981' },
    { label: t('landing.resource.vramUsage'), value: 78, color: '#f59e0b' },
    { label: t('landing.resource.cpuUtil'), value: 36, color: '#6366f1' },
    { label: t('landing.resource.memoryUsage'), value: 33, color: '#ec4899' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-amber-500/5 dark:from-emerald-500/10 dark:via-transparent dark:to-amber-500/10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/8 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          <motion.div {...fadeInUp}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {t('landing.footer.openSource')} · Apache-2.0
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <span className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 bg-clip-text text-transparent">
              {t('landing.hero.title')}
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl font-semibold text-foreground/90 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.p
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          >
            {t('landing.hero.description')}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
          >
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base shadow-lg shadow-emerald-500/25" onClick={() => setActivePage('dashboard')}>
              {t('landing.hero.getStarted')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 h-12 text-base border-emerald-500/30 hover:bg-emerald-500/5" onClick={() => setActivePage('benchmark')}>
              <Eye className="mr-2 h-4 w-4" />
              {t('landing.hero.viewDemo')}
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
          >
            {[
              { label: t('landing.hero.githubStars'), value: '2.8k+' },
              { label: t('landing.hero.activeUsers'), value: '1.2k+' },
              { label: t('landing.hero.benchmarksRun'), value: '50k+' },
              { label: t('landing.hero.modelsSupported'), value: '100+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Core Features Section ── */}
      <Section id="features">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {t('landing.features.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.features.title')}</h2>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: SlidersHorizontal, title: t('landing.features.quickTuning'), desc: t('landing.features.quickTuningDesc'), accent: 'emerald' },
              { icon: Rocket, title: t('landing.features.fastDeploy'), desc: t('landing.features.fastDeployDesc'), accent: 'amber' },
              { icon: BarChart3, title: t('landing.features.multiBenchmark'), desc: t('landing.features.multiBenchmarkDesc'), accent: 'emerald' },
              { icon: Eye, title: t('landing.features.transparentPerf'), desc: t('landing.features.transparentPerfDesc'), accent: 'amber' },
              { icon: TrendingUp, title: t('landing.features.inflectionAnalysis'), desc: t('landing.features.inflectionAnalysisDesc'), accent: 'emerald' },
              { icon: Puzzle, title: t('landing.features.openExtensible'), desc: t('landing.features.openExtensibleDesc'), accent: 'amber' },
            ].map((feature) => (
              <motion.div key={feature.title} variants={staggerItem} transition={{ duration: 0.4 }}>
                <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      feature.accent === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── System Architecture Section ── */}
      <Section id="architecture" className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {t('landing.architecture.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.architecture.title')}</h2>
          </div>

          <div className="space-y-4 max-w-5xl mx-auto">
            {/* User Layer */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-emerald-500/[0.02] overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{t('landing.architecture.userLayer')}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: Monitor, label: t('landing.architecture.webConsole') },
                      { icon: Code2, label: t('landing.architecture.openApi') },
                      { icon: Terminal, label: t('landing.architecture.sdkCli') },
                      { icon: Bell, label: t('landing.architecture.monitoring') },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <item.icon className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/40 to-amber-500/40" />
            </div>

            {/* Gateway Service Layer */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-500/[0.02] overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">{t('landing.architecture.gatewayLayer')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: Server, label: t('landing.architecture.loadBalancing') },
                      { icon: Shield, label: t('landing.architecture.authRateLimit') },
                      { icon: Zap, label: t('landing.architecture.requestScheduling') },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <item.icon className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/40 to-emerald-500/40" />
            </div>

            {/* Inference Engine Layer */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-emerald-500/[0.02] overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{t('landing.architecture.engineLayer')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* vLLM */}
                    <div className="p-4 rounded-lg bg-background/60 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Box className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('landing.architecture.vllmEngine')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[t('landing.architecture.pagedAttention'), t('landing.architecture.continuousBatching'), t('landing.architecture.kvCacheReuse'), t('landing.architecture.tensorPipelineParallel')].map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {/* SGLang */}
                    <div className="p-4 rounded-lg bg-background/60 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Box className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{t('landing.architecture.sglangEngine')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[t('landing.architecture.radixAttention'), t('landing.architecture.jumpForward'), t('landing.architecture.autoParallelism'), t('landing.architecture.efficientScheduling')].map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/40 to-amber-500/40" />
            </div>

            {/* Resource Layer */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-500/[0.02] overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">{t('landing.architecture.resourceLayer')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: Cpu, label: t('landing.architecture.gpuCluster') },
                      { icon: Database, label: t('landing.architecture.modelStorage') },
                      { icon: Activity, label: t('landing.architecture.autoStartMonitoring') },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <item.icon className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── Quick Tuning Section ── */}
      <Section id="tuning">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              {t('landing.tuning.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.tuning.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.tuning.subtitle')}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">{t('landing.tuning.paramName')}</TableHead>
                      <TableHead className="font-semibold">{t('landing.tuning.currentValue')}</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">{t('landing.tuning.description')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tuningParams.map((param) => (
                      <TableRow key={param.name} className="hover:bg-emerald-500/[0.03] transition-colors">
                        <TableCell className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{param.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            {param.value}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{param.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-end">
              <Button variant="outline" size="sm">
                {t('landing.tuning.reset')}
              </Button>
              <Button variant="outline" size="sm" className="border-emerald-500/30">
                {t('landing.tuning.saveConfig')}
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActivePage('parameters')}>
                <Rocket className="mr-2 h-3.5 w-3.5" />
                {t('landing.tuning.applyAndRun')}
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── Quick Deployment Section ── */}
      <Section id="deploy" className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Rocket className="h-3 w-3 mr-1" />
              {t('landing.deploy.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.deploy.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.deploy.subtitle')}</p>
          </div>

          {/* Main 4 steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
            {[
              { step: 1, icon: Box, label: t('landing.deploy.selectModel'), color: 'emerald' },
              { step: 2, icon: Cpu, label: t('landing.deploy.selectEngine'), color: 'amber' },
              { step: 3, icon: SlidersHorizontal, label: t('landing.deploy.configureResources'), color: 'emerald' },
              { step: 4, icon: Rocket, label: t('landing.deploy.oneClickDeploy'), color: 'amber' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative"
              >
                <Card className={`h-full border-border/50 ${
                  item.color === 'emerald' ? 'hover:border-emerald-500/30' : 'hover:border-amber-500/30'
                } transition-colors`}>
                  <CardContent className="p-5 text-center">
                    <div className={`w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm ${
                      item.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                      {item.step}
                    </div>
                    <item.icon className={`h-6 w-6 mx-auto mb-2 ${
                      item.color === 'emerald' ? 'text-emerald-500' : 'text-amber-500'
                    }`} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </CardContent>
                </Card>
                {/* Connecting arrow (hidden on mobile) */}
                {idx < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Sub-steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { icon: Server, label: t('landing.deploy.k8sDeploy') },
              { icon: TrendingUp, label: t('landing.deploy.elasticScaling') },
              { icon: Shield, label: t('landing.deploy.canaryRelease') },
              { icon: Activity, label: t('landing.deploy.healthMonitoring') },
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + idx * 0.08 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-card/60 border border-border/30"
              >
                <item.icon className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Performance Metrics Section ── */}
      <Section id="performance">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-3 w-3 mr-1" />
              {t('landing.perf.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.perf.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.perf.subtitle')}</p>
          </div>

          {/* 4 Big metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('landing.perf.throughput'), value: '312.5', unit: 'token/s', color: 'emerald' },
              { label: t('landing.perf.firstTokenLatency'), value: '128', unit: 'ms', color: 'amber' },
              { label: t('landing.perf.p95Latency'), value: '356', unit: 'ms', color: 'emerald' },
              { label: t('landing.perf.concurrency'), value: '64', unit: '', color: 'amber' },
            ].map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <Card className={`border-border/50 ${
                  metric.color === 'emerald' ? 'hover:border-emerald-500/30' : 'hover:border-amber-500/30'
                } transition-colors`}>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                    <p className={`text-3xl md:text-4xl font-extrabold ${
                      metric.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {metric.value}
                    </p>
                    {metric.unit && <p className="text-xs text-muted-foreground mt-1">{metric.unit}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Latency trend chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('landing.perf.latencyTrend')}</CardTitle>
                <CardDescription className="text-xs">{t('landing.perf.latencyVsConcurrency')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis dataKey="concurrency" tick={{ fontSize: 12 }} label={{ value: 'Concurrency', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Throughput', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', fontSize: 11 }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="throughput" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} name="Throughput" />
                      <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="Latency" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* ── Inflection Point Analysis Section ── */}
      <Section id="inflection" className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              {t('landing.inflection.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.inflection.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.inflection.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-border/50 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('landing.inflection.throughputVsConcurrency')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inflectionData}>
                        <defs>
                          <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="concurrency" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <ReferenceLine yAxisId="left" x={40} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Inflection', position: 'top', fill: '#ef4444', fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="throughput" stroke="#10b981" fill="url(#throughputGrad)" strokeWidth={2.5} name="Throughput" />
                        <Area yAxisId="right" type="monotone" dataKey="latency" stroke="#f59e0b" fill="url(#latencyGrad)" strokeWidth={2.5} name="Latency" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Info panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{t('landing.inflection.inflectionAt')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">40</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('landing.inflection.concurrencyLevel')}</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t('landing.inflection.recommendedRange')}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">32 – 64</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('landing.inflection.analysis')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── Multi-Model Benchmark Section ── */}
      <Section id="benchmark">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-3 w-3 mr-1" />
              {t('landing.benchmark.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.benchmark.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.benchmark.subtitle')}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">{t('landing.benchmark.model')}</TableHead>
                        <TableHead className="font-semibold">{t('landing.benchmark.engine')}</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">{t('landing.benchmark.scenario')}</TableHead>
                        <TableHead className="font-semibold text-right">{t('landing.benchmark.throughput')}</TableHead>
                        <TableHead className="font-semibold text-right hidden sm:table-cell">{t('landing.benchmark.firstTokenLatency')}</TableHead>
                        <TableHead className="font-semibold text-right hidden lg:table-cell">{t('landing.benchmark.p95Latency')}</TableHead>
                        <TableHead className="font-semibold text-right">{t('landing.benchmark.errorRate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benchmarkData.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-emerald-500/[0.03] transition-colors">
                          <TableCell className="font-medium">{row.model}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                row.engine === 'vLLM'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }
                            >
                              {row.engine}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{row.scenario}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">{row.throughput}</TableCell>
                          <TableCell className="text-right font-mono hidden sm:table-cell">{row.firstTokenLatency}</TableCell>
                          <TableCell className="text-right font-mono hidden lg:table-cell">{row.p95Latency}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={row.errorRate > 0.15 ? 'text-amber-500' : 'text-emerald-500'}>
                              {row.errorRate}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* ── Resource Usage Section ── */}
      <Section id="resources" className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Activity className="h-3 w-3 mr-1" />
              {t('landing.resource.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.resource.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.resource.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {resourceData.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <Card className="border-border/50 hover:shadow-lg transition-shadow p-2">
                  <CardContent className="p-4 flex flex-col items-center">
                    <CircularProgress value={item.value} color={item.color} size={110} strokeWidth={9} />
                    <p className="text-sm font-semibold mt-3">{item.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Pricing Section ── */}
      <Section id="pricing">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {t('landing.pricing.title')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('landing.pricing.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('landing.pricing.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                tier: t('landing.pricing.free'),
                price: t('landing.pricing.freePrice'),
                features: t('landing.pricing.freeFeatures').split(','),
                accent: false,
                cta: t('landing.pricing.getStarted'),
                ctaVariant: 'outline' as const,
              },
              {
                tier: t('landing.pricing.pro'),
                price: t('landing.pricing.proPrice'),
                features: t('landing.pricing.proFeatures').split(','),
                accent: true,
                cta: t('landing.pricing.currentPlan'),
                ctaVariant: 'default' as const,
              },
              {
                tier: t('landing.pricing.enterprise'),
                price: t('landing.pricing.enterprisePrice'),
                features: t('landing.pricing.enterpriseFeatures').split(','),
                accent: false,
                cta: t('landing.pricing.contactSales'),
                ctaVariant: 'outline' as const,
              },
            ].map((plan, idx) => (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <Card className={`h-full relative overflow-hidden transition-all duration-300 ${
                  plan.accent
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                    : 'border-border/50 hover:border-emerald-500/30'
                }`}>
                  {plan.accent && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-amber-500" />
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-1">{plan.tier}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{t('landing.pricing.perMonth')}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat.trim()}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.ctaVariant}
                      className={`w-full ${
                        plan.accent
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'border-emerald-500/30 hover:bg-emerald-500/5'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Footer Section ── */}
      <footer className="border-t bg-muted/20 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">InferBench</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{t('landing.hero.description')}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {t('landing.footer.openSource')}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{t('landing.footer.license')}</span>
              </div>
            </div>

            {/* Links columns */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2">
                {[
                  { label: t('landing.features.quickTuning'), href: '#tuning' },
                  { label: t('landing.deploy.title'), href: '#deploy' },
                  { label: t('landing.perf.title'), href: '#performance' },
                  { label: t('landing.pricing.title'), href: '#pricing' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2">
                {[
                  { label: t('landing.footer.documentation'), icon: BookOpen },
                  { label: t('landing.footer.changelog'), icon: FileText },
                  { label: t('landing.footer.community'), icon: Users },
                  { label: t('landing.footer.github'), icon: Github },
                ].map((link) => (
                  <li key={link.label}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                      <link.icon className="h-3 w-3" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Engines</h4>
              <ul className="space-y-2">
                {['vLLM', 'SGLang', 'TensorRT-LLM', 'TGI'].map((engine) => (
                  <li key={engine}>
                    <span className="text-sm text-muted-foreground">{engine}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground/60">
              © 2024 InferBench. {t('landing.footer.license')}
            </span>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-emerald-500 transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-emerald-500 transition-colors">
                <BookOpen className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
