'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  Settings,
  Palette,
  Gauge,
  Bell,
  Database,
  Globe,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Server,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'

// ── Settings Interfaces ─────────────────────────────────────────────────────

interface GeneralSettings {
  platformName: string
  defaultEngine: 'vllm' | 'sglang' | 'both'
  defaultBenchmarkDuration: number
  autoRefreshData: boolean
  refreshInterval: number
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  compactMode: boolean
  showKeyboardShortcuts: boolean
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none'
}

interface BenchmarkDefaults {
  defaultScenario: 'single_stream' | 'multi_stream' | 'burst' | 'serving' | 'custom'
  defaultConcurrency: number
  defaultNumRequests: number
  defaultInputTokenLength: number
  defaultOutputTokenLength: number
  autoSaveResults: boolean
  showLiveProgress: boolean
}

interface NotificationSettings {
  enableNotifications: boolean
  notifyBenchmarkComplete: boolean
  notifyBenchmarkFailed: boolean
  notifySystemAlerts: boolean
  notifyModelDeployed: boolean
  soundEffects: boolean
}

interface ApiConfigSettings {
  vllmApiEndpoint: string
  sglangApiEndpoint: string
  websocketEndpoint: string
  apiTimeout: number
}

interface AllSettings {
  general: GeneralSettings
  appearance: AppearanceSettings
  benchmarkDefaults: BenchmarkDefaults
  notifications: NotificationSettings
  apiConfig: ApiConfigSettings
}

// ── Default Settings ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AllSettings = {
  general: {
    platformName: 'InferBench',
    defaultEngine: 'both',
    defaultBenchmarkDuration: 120,
    autoRefreshData: true,
    refreshInterval: 30,
  },
  appearance: {
    theme: 'system',
    compactMode: false,
    showKeyboardShortcuts: true,
    animationSpeed: 'normal',
  },
  benchmarkDefaults: {
    defaultScenario: 'single_stream',
    defaultConcurrency: 16,
    defaultNumRequests: 1000,
    defaultInputTokenLength: 512,
    defaultOutputTokenLength: 256,
    autoSaveResults: true,
    showLiveProgress: true,
  },
  notifications: {
    enableNotifications: true,
    notifyBenchmarkComplete: true,
    notifyBenchmarkFailed: true,
    notifySystemAlerts: true,
    notifyModelDeployed: false,
    soundEffects: false,
  },
  apiConfig: {
    vllmApiEndpoint: 'http://localhost:8000',
    sglangApiEndpoint: 'http://localhost:30000',
    websocketEndpoint: 'ws://localhost:3003',
    apiTimeout: 30,
  },
}

// ── localStorage helpers ────────────────────────────────────────────────────

const SETTINGS_KEY = 'inferbench-settings'

function loadSettings(): AllSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle missing keys from older versions
      return {
        general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
        benchmarkDefaults: { ...DEFAULT_SETTINGS.benchmarkDefaults, ...parsed.benchmarkDefaults },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
        apiConfig: { ...DEFAULT_SETTINGS.apiConfig, ...parsed.apiConfig },
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: AllSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

// ── Connection Test States ──────────────────────────────────────────────────

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed'

// ── Animation Variants ──────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

// ── Settings Page Component ─────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useI18n()
  const [settings, setSettings] = useState<AllSettings>(() => {
    if (typeof window !== 'undefined') return loadSettings()
    return DEFAULT_SETTINGS
  })
  const [vllmStatus, setVllmStatus] = useState<ConnectionStatus>('idle')
  const [sglangStatus, setSglangStatus] = useState<ConnectionStatus>('idle')
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setTheme } = useTheme()

  // Auto-save with debounce
  const updateSettings = useCallback((newSettings: AllSettings) => {
    setSettings(newSettings)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(newSettings)
    }, 500)
  }, [])

  // Helper to update nested sections
  const updateSection = useCallback(<K extends keyof AllSettings>(
    section: K,
    updates: Partial<AllSettings[K]>
  ) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [section]: { ...prev[section], ...updates },
      }
      // Save immediately too
      saveSettings(newSettings)
      return newSettings
    })
  }, [])

  // Apply theme when appearance settings change
  useEffect(() => {
    setTheme(settings.appearance.theme)
  }, [settings.appearance.theme, setTheme])

  // ── Connection Testing ──────────────────────────────────────────────────

  const testConnection = useCallback(async (
    endpoint: string,
    setStatus: (status: ConnectionStatus) => void
  ) => {
    setStatus('testing')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), settings.apiConfig.apiTimeout * 1000)
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // Allow testing endpoints that don't support CORS
      })
      clearTimeout(timeout)
      // no-cors mode returns opaque response, so we just check it didn't throw
      setStatus('connected')
      toast.success(t('settings.connectionSuccess', { status: endpoint }))
    } catch {
      setStatus('failed')
      toast.error(t('settings.connectionFailed', { error: endpoint }))
    }
  }, [settings.apiConfig.apiTimeout, t])

  // ── Data Management ─────────────────────────────────────────────────────

  const handleExportAllData = useCallback(() => {
    try {
      const allData: Record<string, unknown> = {
        settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      }

      // Try to gather additional data from localStorage
      try {
        const recentCommands = localStorage.getItem('inferbench-recent-commands')
        if (recentCommands) allData.recentCommands = JSON.parse(recentCommands)
      } catch {
        // Ignore
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inferbench-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t('settings.dataExported'))
    } catch {
      toast.error(t('settings.dataExportFailed'))
    }
  }, [settings, t])

  const handleImportData = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.settings) {
          const newSettings: AllSettings = {
            general: { ...DEFAULT_SETTINGS.general, ...data.settings.general },
            appearance: { ...DEFAULT_SETTINGS.appearance, ...data.settings.appearance },
            benchmarkDefaults: { ...DEFAULT_SETTINGS.benchmarkDefaults, ...data.settings.benchmarkDefaults },
            notifications: { ...DEFAULT_SETTINGS.notifications, ...data.settings.notifications },
            apiConfig: { ...DEFAULT_SETTINGS.apiConfig, ...data.settings.apiConfig },
          }
          setSettings(newSettings)
          saveSettings(newSettings)
          toast.success(t('settings.dataImported'))
        } else {
          toast.error(t('settings.invalidImportFile'))
        }
      } catch {
        toast.error(t('settings.importParseFailed'))
      }
    }
    input.click()
  }, [t])

  const handleClearBenchmarkResults = useCallback(() => {
    try {
      // Clear benchmark-related localStorage keys if any
      localStorage.removeItem('inferbench-benchmark-results')
      toast.success(t('settings.resultsCleared'))
    } catch {
      toast.error(t('settings.clearResultsFailed'))
    }
  }, [t])

  const handleResetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    toast.success(t('settings.settingsReset'))
  }, [t])

  // ── Connection Status Icon ──────────────────────────────────────────────

  function renderConnectionStatus(status: ConnectionStatus) {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const compact = settings.appearance.compactMode
  const sectionGap = compact ? 'gap-4' : 'gap-6'
  const cardPadding = compact ? '' : ''

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
          <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${sectionGap}`}>
        {/* ── General Settings ──────────────────────────────────────────────── */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.general')}</CardTitle>
              </div>
              <CardDescription>{t('settings.generalDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Platform Name */}
              <div className="space-y-2">
                <Label htmlFor="platform-name">{t('settings.platformName')}</Label>
                <Input
                  id="platform-name"
                  value={settings.general.platformName}
                  onChange={(e) => updateSection('general', { platformName: e.target.value })}
                  className="max-w-xs"
                />
              </div>

              {/* Default Engine */}
              <div className="space-y-2">
                <Label>{t('settings.defaultEngine')}</Label>
                <Select
                  value={settings.general.defaultEngine}
                  onValueChange={(v) => updateSection('general', { defaultEngine: v as GeneralSettings['defaultEngine'] })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vllm">VLLM</SelectItem>
                    <SelectItem value="sglang">SGLang</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Benchmark Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.defaultBenchmarkDuration')}</Label>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {settings.general.defaultBenchmarkDuration}s
                  </span>
                </div>
                <Slider
                  value={[settings.general.defaultBenchmarkDuration]}
                  onValueChange={([v]) => updateSection('general', { defaultBenchmarkDuration: v })}
                  min={30}
                  max={600}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30s</span>
                  <span>600s</span>
                </div>
              </div>

              {/* Auto-refresh Data */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.autoRefreshData')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.autoRefreshDataDesc')}</p>
                </div>
                <Switch
                  checked={settings.general.autoRefreshData}
                  onCheckedChange={(v) => updateSection('general', { autoRefreshData: v })}
                />
              </div>

              {/* Refresh Interval */}
              {settings.general.autoRefreshData && (
                <div className="space-y-2">
                  <Label>{t('settings.refreshInterval')}</Label>
                  <Select
                    value={String(settings.general.refreshInterval)}
                    onValueChange={(v) => updateSection('general', { refreshInterval: Number(v) })}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Appearance ────────────────────────────────────────────────────── */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.appearance')}</CardTitle>
              </div>
              <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Theme */}
              <div className="space-y-2">
                <Label>{t('settings.theme')}</Label>
                <Select
                  value={settings.appearance.theme}
                  onValueChange={(v) => updateSection('appearance', { theme: v as AppearanceSettings['theme'] })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.compactMode')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.compactModeDesc')}</p>
                </div>
                <Switch
                  checked={settings.appearance.compactMode}
                  onCheckedChange={(v) => updateSection('appearance', { compactMode: v })}
                />
              </div>

              {/* Show Keyboard Shortcuts */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.showKeyboardShortcuts')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.showKeyboardShortcutsDesc')}</p>
                </div>
                <Switch
                  checked={settings.appearance.showKeyboardShortcuts}
                  onCheckedChange={(v) => updateSection('appearance', { showKeyboardShortcuts: v })}
                />
              </div>

              {/* Animation Speed */}
              <div className="space-y-2">
                <Label>{t('settings.animationSpeed')}</Label>
                <Select
                  value={settings.appearance.animationSpeed}
                  onValueChange={(v) => updateSection('appearance', { animationSpeed: v as AppearanceSettings['animationSpeed'] })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Benchmark Defaults ────────────────────────────────────────────── */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.benchmarkDefaults')}</CardTitle>
              </div>
              <CardDescription>{t('settings.benchmarkDefaultsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Default Scenario */}
              <div className="space-y-2">
                <Label>{t('settings.defaultScenario')}</Label>
                <Select
                  value={settings.benchmarkDefaults.defaultScenario}
                  onValueChange={(v) => updateSection('benchmarkDefaults', { defaultScenario: v as BenchmarkDefaults['defaultScenario'] })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_stream">Single-Stream</SelectItem>
                    <SelectItem value="multi_stream">Multi-Stream</SelectItem>
                    <SelectItem value="burst">Burst</SelectItem>
                    <SelectItem value="serving">Serving</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Concurrency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.defaultConcurrency')}</Label>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {settings.benchmarkDefaults.defaultConcurrency}
                  </span>
                </div>
                <Slider
                  value={[settings.benchmarkDefaults.defaultConcurrency]}
                  onValueChange={([v]) => updateSection('benchmarkDefaults', { defaultConcurrency: v })}
                  min={1}
                  max={128}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>128</span>
                </div>
              </div>

              {/* Default Num Requests */}
              <div className="space-y-2">
                <Label htmlFor="default-num-requests">{t('settings.defaultNumRequests')}</Label>
                <Input
                  id="default-num-requests"
                  type="number"
                  value={settings.benchmarkDefaults.defaultNumRequests}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val > 0) {
                      updateSection('benchmarkDefaults', { defaultNumRequests: val })
                    }
                  }}
                  className="max-w-xs"
                />
              </div>

              {/* Default Input Token Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.defaultInputTokenLength')}</Label>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {settings.benchmarkDefaults.defaultInputTokenLength}
                  </span>
                </div>
                <Slider
                  value={[settings.benchmarkDefaults.defaultInputTokenLength]}
                  onValueChange={([v]) => updateSection('benchmarkDefaults', { defaultInputTokenLength: v })}
                  min={32}
                  max={8192}
                  step={32}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>32</span>
                  <span>8192</span>
                </div>
              </div>

              {/* Default Output Token Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.defaultOutputTokenLength')}</Label>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {settings.benchmarkDefaults.defaultOutputTokenLength}
                  </span>
                </div>
                <Slider
                  value={[settings.benchmarkDefaults.defaultOutputTokenLength]}
                  onValueChange={([v]) => updateSection('benchmarkDefaults', { defaultOutputTokenLength: v })}
                  min={32}
                  max={8192}
                  step={32}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>32</span>
                  <span>8192</span>
                </div>
              </div>

              <Separator />

              {/* Auto-save Results */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.autoSaveResults')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.autoSaveResultsDesc')}</p>
                </div>
                <Switch
                  checked={settings.benchmarkDefaults.autoSaveResults}
                  onCheckedChange={(v) => updateSection('benchmarkDefaults', { autoSaveResults: v })}
                />
              </div>

              {/* Show Live Progress */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.showLiveProgress')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.showLiveProgressDesc')}</p>
                </div>
                <Switch
                  checked={settings.benchmarkDefaults.showLiveProgress}
                  onCheckedChange={(v) => updateSection('benchmarkDefaults', { showLiveProgress: v })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.notifications')}</CardTitle>
              </div>
              <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.enableNotifications')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.enableNotificationsDesc')}</p>
                </div>
                <Switch
                  checked={settings.notifications.enableNotifications}
                  onCheckedChange={(v) => updateSection('notifications', { enableNotifications: v })}
                />
              </div>

              <Separator />

              {/* Sub-notifications (disabled when master is off) */}
              <div className={`space-y-4 ${!settings.notifications.enableNotifications ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <Label>{t('settings.notifyBenchmarkComplete')}</Label>
                  <Switch
                    checked={settings.notifications.notifyBenchmarkComplete}
                    onCheckedChange={(v) => updateSection('notifications', { notifyBenchmarkComplete: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('settings.notifyBenchmarkFailed')}</Label>
                  <Switch
                    checked={settings.notifications.notifyBenchmarkFailed}
                    onCheckedChange={(v) => updateSection('notifications', { notifyBenchmarkFailed: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('settings.notifySystemAlerts')}</Label>
                  <Switch
                    checked={settings.notifications.notifySystemAlerts}
                    onCheckedChange={(v) => updateSection('notifications', { notifySystemAlerts: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t('settings.notifyModelDeployed')}</Label>
                  <Switch
                    checked={settings.notifications.notifyModelDeployed}
                    onCheckedChange={(v) => updateSection('notifications', { notifyModelDeployed: v })}
                  />
                </div>
              </div>

              <Separator />

              {/* Sound Effects */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.soundEffects')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.soundEffectsDesc')}</p>
                </div>
                <Switch
                  checked={settings.notifications.soundEffects}
                  onCheckedChange={(v) => updateSection('notifications', { soundEffects: v })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Data Management ───────────────────────────────────────────────── */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.dataManagement')}</CardTitle>
              </div>
              <CardDescription>{t('settings.dataManagementDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Export All Data */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.exportAllData')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.exportAllDataDesc')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportAllData}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('common.export')}
                </Button>
              </div>

              <Separator />

              {/* Import Data */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.importData')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.importDataDesc')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleImportData}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('common.import')}
                </Button>
              </div>

              <Separator />

              {/* Clear All Benchmark Results */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.clearBenchmarkResults')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.clearBenchmarkResultsDesc')}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.clearResultsConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.clearResultsWarning')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearBenchmarkResults}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {t('settings.clearResults')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Separator />

              {/* Reset to Defaults */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.resetToDefaults')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.resetToDefaultsDesc')}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t('common.reset')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.resetConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.resetWarning')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetToDefaults}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {t('settings.resetToDefaults')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── API Configuration ─────────────────────────────────────────────── */}
        <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
          <Card className={cardPadding}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">{t('settings.apiConfig')}</CardTitle>
              </div>
              <CardDescription>{t('settings.apiConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* VLLM API Endpoint */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-emerald-500" />
                  <Label htmlFor="vllm-endpoint">{t('settings.vllmEndpoint')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="vllm-endpoint"
                    value={settings.apiConfig.vllmApiEndpoint}
                    onChange={(e) => updateSection('apiConfig', { vllmApiEndpoint: e.target.value })}
                    placeholder="http://localhost:8000"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    {renderConnectionStatus(vllmStatus)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(settings.apiConfig.vllmApiEndpoint, setVllmStatus)}
                      disabled={vllmStatus === 'testing'}
                    >
                      {vllmStatus === 'testing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : vllmStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* SGLang API Endpoint */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-amber-500" />
                  <Label htmlFor="sglang-endpoint">{t('settings.sglangEndpoint')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="sglang-endpoint"
                    value={settings.apiConfig.sglangApiEndpoint}
                    onChange={(e) => updateSection('apiConfig', { sglangApiEndpoint: e.target.value })}
                    placeholder="http://localhost:30000"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    {renderConnectionStatus(sglangStatus)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(settings.apiConfig.sglangApiEndpoint, setSglangStatus)}
                      disabled={sglangStatus === 'testing'}
                    >
                      {sglangStatus === 'testing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : sglangStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* WebSocket Endpoint */}
              <div className="space-y-2">
                <Label htmlFor="ws-endpoint">{t('settings.wsEndpoint')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ws-endpoint"
                    value={settings.apiConfig.websocketEndpoint}
                    onChange={(e) => updateSection('apiConfig', { websocketEndpoint: e.target.value })}
                    placeholder="ws://localhost:3003"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    {renderConnectionStatus(wsStatus)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // WebSocket test: try to connect
                        setWsStatus('testing')
                        try {
                          const ws = new WebSocket(settings.apiConfig.websocketEndpoint)
                          const timeout = setTimeout(() => {
                            ws.close()
                            setWsStatus('failed')
                            toast.error(`WebSocket connection failed: ${settings.apiConfig.websocketEndpoint}`)
                          }, settings.apiConfig.apiTimeout * 1000)
                          ws.onopen = () => {
                            clearTimeout(timeout)
                            ws.close()
                            setWsStatus('connected')
                            toast.success(`WebSocket connected: ${settings.apiConfig.websocketEndpoint}`)
                          }
                          ws.onerror = () => {
                            clearTimeout(timeout)
                            setWsStatus('failed')
                            toast.error(`WebSocket connection failed: ${settings.apiConfig.websocketEndpoint}`)
                          }
                        } catch {
                          setWsStatus('failed')
                          toast.error(`WebSocket connection failed: ${settings.apiConfig.websocketEndpoint}`)
                        }
                      }}
                      disabled={wsStatus === 'testing'}
                    >
                      {wsStatus === 'testing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : wsStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* API Timeout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.apiTimeout')}</Label>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {settings.apiConfig.apiTimeout}s
                  </span>
                </div>
                <Slider
                  value={[settings.apiConfig.apiTimeout]}
                  onValueChange={([v]) => updateSection('apiConfig', { apiTimeout: v })}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>120s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
