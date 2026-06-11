'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  Box,
  SlidersHorizontal,
  Gauge,
  FileBarChart,
  TrendingUp,
  Plus,
  Download,
  Upload,
  Sparkles,
  Sun,
  Moon,
  Search,
  Settings,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useModels } from '@/hooks/use-api'
import type { PageKey } from '@/lib/types'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'
import { useI18n } from '@/hooks/use-i18n'

// ── Recent Actions (localStorage) ──────────────────────────────────────────

const RECENT_KEY = 'inferbench-recent-commands'
const MAX_RECENT = 5

interface RecentCommand {
  id: string
  label: string
  timestamp: number
}

function getRecentCommands(): RecentCommand[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentCommand(id: string, label: string) {
  try {
    const recent = getRecentCommands().filter((r) => r.id !== id)
    recent.unshift({ id, label, timestamp: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // Ignore localStorage errors
  }
}

// ── Navigation Items ────────────────────────────────────────────────────────

const NAV_ITEMS: { id: PageKey; icon: React.ReactNode; shortcut?: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard className="size-4 text-emerald-500" /> },
  { id: 'models', icon: <Box className="size-4 text-emerald-500" /> },
  { id: 'parameters', icon: <SlidersHorizontal className="size-4 text-emerald-500" /> },
  { id: 'benchmark', icon: <Gauge className="size-4 text-amber-500" /> },
  { id: 'reports', icon: <FileBarChart className="size-4 text-amber-500" /> },
  { id: 'analysis', icon: <TrendingUp className="size-4 text-amber-500" /> },
  { id: 'settings', icon: <Settings className="size-4 text-muted-foreground" /> },
]

// ── Action Items ────────────────────────────────────────────────────────────

const ACTION_ITEMS: { id: string; icon: React.ReactNode; shortcut?: string }[] = [
  { id: 'new_benchmark', icon: <Plus className="size-4 text-amber-500" />, shortcut: '⌘B' },
  { id: 'add_model', icon: <Plus className="size-4 text-emerald-500" />, shortcut: '⌘M' },
  { id: 'import_presets', icon: <Upload className="size-4 text-emerald-500" /> },
  { id: 'export_report', icon: <Download className="size-4 text-amber-500" /> },
  { id: 'new_analysis', icon: <Sparkles className="size-4 text-amber-500" /> },
]

// ── Action label mapping ────────────────────────────────────────────────────

function getActionLabel(id: string, t: (key: string) => string): string {
  switch (id) {
    case 'new_benchmark': return t('shortcuts.newBenchmark')
    case 'add_model': return t('shortcuts.addModel')
    case 'import_presets': return t('parameters.importPresets')
    case 'export_report': return t('common.export')
    case 'new_analysis': return t('analysis.newAnalysis')
    default: return id
  }
}

function getNavLabel(id: PageKey, t: (key: string) => string): string {
  return t(`nav.${id}`)
}

// ── Command Palette Component ───────────────────────────────────────────────

export function CommandPalette() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>(() => getRecentCommands())
  const { theme, setTheme } = useTheme()
  const { setActivePage, setPendingAction } = useAppStore()
  const { data: models } = useModels()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Execute a command
  const executeCommand = useCallback(
    (commandId: string, label: string) => {
      // Add to recent
      addRecentCommand(commandId, label)
      setRecentCommands(getRecentCommands())

      // Navigation commands
      const navItem = NAV_ITEMS.find((n) => n.id === commandId)
      if (navItem) {
        setActivePage(navItem.id)
        setOpen(false)
        return
      }

      // Action commands
      switch (commandId) {
        case 'new_benchmark':
          setActivePage('benchmark')
          setPendingAction('new_benchmark')
          break
        case 'add_model':
          setActivePage('models')
          setPendingAction('add_model')
          break
        case 'import_presets':
          setActivePage('parameters')
          setPendingAction('import_presets')
          break
        case 'export_report':
          setActivePage('reports')
          setPendingAction('export_report')
          break
        case 'new_analysis':
          setActivePage('analysis')
          setPendingAction('new_analysis')
          break
        case 'toggle_theme':
          setTheme(theme === 'dark' ? 'light' : 'dark')
          break
        default:
          // Model navigation: navigate to models page
          if (commandId.startsWith('model:')) {
            setActivePage('models')
            setPendingAction(commandId)
          }
          break
      }

      setOpen(false)
    },
    [setActivePage, setPendingAction, setTheme, theme]
  )

  // Build recent command items with icons
  const recentItems = recentCommands.map((rc) => {
    const navItem = NAV_ITEMS.find((n) => n.id === rc.id)
    const actionItem = ACTION_ITEMS.find((a) => a.id === rc.id)
    const icon = navItem?.icon ?? actionItem?.icon ?? <Search className="size-4 text-muted-foreground" />
    return { id: rc.id, label: rc.label, icon }
  })

  // Build model search items
  const modelItems =
    models?.map((m) => ({
      id: `model:${m.id}`,
      label: m.name,
      icon:
        m.engine === 'vllm' ? (
          <Box className="size-4 text-emerald-500" />
        ) : (
          <Box className="size-4 text-amber-500" />
        ),
      keywords: `${m.name} ${m.engine} ${m.modelPath}`,
    })) ?? []

  const toggleThemeLabel = theme === 'dark' ? t('commandPalette.toggleLight') : t('commandPalette.toggleDark')

  return (
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('commandPalette.title')}
        description={t('commandPalette.description')}
        className="sm:max-w-lg"
      >
        <CommandInput placeholder={t('commandPalette.placeholder')} />
        <CommandList className="max-h-[360px]">
          <CommandEmpty>{t('commandPalette.noResults')}</CommandEmpty>

          {/* Recent Commands */}
          {recentItems.length > 0 && (
            <CommandGroup heading={t('commandPalette.group.recent')}>
              {recentItems.map((item) => (
                <CommandItem
                  key={`recent-${item.id}`}
                  value={`recent-${item.label}`}
                  onSelect={() => executeCommand(item.id, item.label)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Navigation */}
          <CommandGroup heading={t('commandPalette.group.navigation')}>
            {NAV_ITEMS.map((item) => {
              const label = getNavLabel(item.id, t)
              return (
                <CommandItem
                  key={item.id}
                  value={`nav-${label}`}
                  onSelect={() => executeCommand(item.id, label)}
                >
                  {item.icon}
                  <span>{t('commandPalette.goTo', { page: label })}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading={t('commandPalette.group.actions')}>
            {ACTION_ITEMS.map((item) => {
              const label = getActionLabel(item.id, t)
              return (
                <CommandItem
                  key={item.id}
                  value={`action-${label}`}
                  onSelect={() => executeCommand(item.id, label)}
                >
                  {item.icon}
                  <span>{label}</span>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Search Models */}
          {modelItems.length > 0 && (
            <CommandGroup heading={t('commandPalette.group.models')}>
              {modelItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`model-${item.label} ${item.keywords}`}
                  onSelect={() => executeCommand(item.id, item.label)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {item.keywords.includes('vllm') ? `(${t('common.vllm')})` : `(${t('common.sglang')})`}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Settings */}
          <CommandGroup heading={t('commandPalette.group.settings')}>
            <CommandItem
              value="setting-toggle-theme"
              onSelect={() => executeCommand('toggle_theme', toggleThemeLabel)}
            >
              {theme === 'dark' ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-indigo-400" />
              )}
              <span>{toggleThemeLabel}</span>
              <CommandShortcut>⌘⇧D</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>

        {/* Footer hint */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ↵
            </kbd>{' '}
            to select
          </span>
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ↑↓
            </kbd>{' '}
            to navigate
          </span>
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              esc
            </kbd>{' '}
            to close
          </span>
        </div>
      </CommandDialog>
  )
}
