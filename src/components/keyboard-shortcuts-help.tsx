'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

// ─── Shortcut Data ──────────────────────────────────────────────────

interface ShortcutItem {
  descriptionKey: string
  keys: string[]
}

interface ShortcutGroup {
  titleKey: string
  items: ShortcutItem[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: 'shortcuts.group.navigation',
    items: [
      { descriptionKey: 'nav.dashboard', keys: ['⌘', '1'] },
      { descriptionKey: 'nav.models', keys: ['⌘', '2'] },
      { descriptionKey: 'nav.parameters', keys: ['⌘', '3'] },
      { descriptionKey: 'nav.benchmark', keys: ['⌘', '4'] },
      { descriptionKey: 'nav.reports', keys: ['⌘', '5'] },
      { descriptionKey: 'nav.analysis', keys: ['⌘', '6'] },
      { descriptionKey: 'nav.settings', keys: ['⌘', '7'] },
    ],
  },
  {
    titleKey: 'shortcuts.group.general',
    items: [
      { descriptionKey: 'shortcuts.commandPalette', keys: ['⌘', 'K'] },
      { descriptionKey: 'shortcuts.keyboardShortcuts', keys: ['?'] },
      { descriptionKey: 'shortcuts.toggleTheme', keys: ['⌘', '⇧', 'D'] },
    ],
  },
  {
    titleKey: 'shortcuts.group.actions',
    items: [
      { descriptionKey: 'shortcuts.newBenchmark', keys: ['⌘', 'B'] },
      { descriptionKey: 'shortcuts.addModel', keys: ['⌘', 'M'] },
    ],
  },
]

// ─── Kbd Component ──────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 items-center rounded border bg-muted px-2 font-mono text-xs text-muted-foreground shadow-sm">
      {children}
    </kbd>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function KeyboardShortcutsHelp() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Listen for "?" and Ctrl+/ and Esc keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when user is typing in an input field
      const target = e.target as HTMLElement
      const tagName = target.tagName
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      // Close on Escape
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        return
      }

      // Toggle on "?" key (without modifier)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }

      // Toggle on Ctrl+/ or Cmd+/
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="relative w-full max-w-[600px] rounded-xl border bg-background shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={t('shortcuts.title')}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('shortcuts.title')}</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {SHORTCUT_GROUPS.map((group) => (
                    <div key={group.titleKey}>
                      {/* Group Header */}
                      <h3 className="mb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {t(group.titleKey)}
                      </h3>

                      {/* Shortcut Rows */}
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.descriptionKey}
                            className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                          >
                            <span className="text-sm text-foreground">
                              {t(item.descriptionKey)}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.keys.map((key, i) => (
                                <React.Fragment key={`${item.descriptionKey}-${key}-${i}`}>
                                  {i > 0 && (
                                    <span className="text-xs text-muted-foreground">+</span>
                                  )}
                                  <Kbd>{key}</Kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-3">
                <p className="text-center text-xs text-muted-foreground">
                  {t('shortcuts.pressToClose')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
