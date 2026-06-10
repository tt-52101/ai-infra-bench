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

const NAV_ITEMS: { id: PageKey; label: string; icon: React.ReactNode; shortcut?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4 text-emerald-500" /> },
  { id: 'models', label: 'Models', icon: <Box className="size-4 text-emerald-500" /> },
  { id: 'parameters', label: 'Parameters', icon: <SlidersHorizontal className="size-4 text-emerald-500" /> },
  { id: 'benchmark', label: 'Benchmark', icon: <Gauge className="size-4 text-amber-500" /> },
  { id: 'reports', label: 'Reports', icon: <FileBarChart className="size-4 text-amber-500" /> },
  { id: 'analysis', label: 'Analysis', icon: <TrendingUp className="size-4 text-amber-500" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="size-4 text-muted-foreground" /> },
]

// ── Action Items ────────────────────────────────────────────────────────────

const ACTION_ITEMS: { id: string; label: string; icon: React.ReactNode; shortcut?: string }[] = [
  { id: 'new_benchmark', label: 'New Benchmark', icon: <Plus className="size-4 text-amber-500" />, shortcut: '⌘B' },
  { id: 'add_model', label: 'Add Model', icon: <Plus className="size-4 text-emerald-500" />, shortcut: '⌘M' },
  { id: 'import_presets', label: 'Import Presets', icon: <Upload className="size-4 text-emerald-500" /> },
  { id: 'export_report', label: 'Export Report', icon: <Download className="size-4 text-amber-500" /> },
  { id: 'new_analysis', label: 'New Analysis', icon: <Sparkles className="size-4 text-amber-500" /> },
]

// ── Command Palette Component ───────────────────────────────────────────────

export function CommandPalette() {
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

  const toggleThemeLabel = theme === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode'

  return (
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Palette"
        description="Search for a command to run..."
        className="sm:max-w-lg"
      >
        <CommandInput placeholder="Type a command or search models..." />
        <CommandList className="max-h-[360px]">
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Recent Commands */}
          {recentItems.length > 0 && (
            <CommandGroup heading="Recent">
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
          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.id}
                value={`nav-${item.label}`}
                onSelect={() => executeCommand(item.id, item.label)}
              >
                {item.icon}
                <span>Go to {item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions */}
          <CommandGroup heading="Actions">
            {ACTION_ITEMS.map((item) => (
              <CommandItem
                key={item.id}
                value={`action-${item.label}`}
                onSelect={() => executeCommand(item.id, item.label)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Search Models */}
          {modelItems.length > 0 && (
            <CommandGroup heading="Models">
              {modelItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`model-${item.label} ${item.keywords}`}
                  onSelect={() => executeCommand(item.id, item.label)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {item.keywords.includes('vllm') ? '(vLLM)' : '(SGLang)'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Settings */}
          <CommandGroup heading="Settings">
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
