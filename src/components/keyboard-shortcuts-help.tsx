'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

// ─── Shortcut Data ──────────────────────────────────────────────────

interface ShortcutItem {
  description: string
  keys: string[]
}

interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { description: 'Dashboard', keys: ['⌘', '1'] },
      { description: 'Models', keys: ['⌘', '2'] },
      { description: 'Parameters', keys: ['⌘', '3'] },
      { description: 'Benchmark', keys: ['⌘', '4'] },
      { description: 'Reports', keys: ['⌘', '5'] },
      { description: 'Analysis', keys: ['⌘', '6'] },
      { description: 'Settings', keys: ['⌘', '7'] },
    ],
  },
  {
    title: 'General',
    items: [
      { description: 'Command Palette', keys: ['⌘', 'K'] },
      { description: 'Keyboard Shortcuts', keys: ['?'] },
      { description: 'Toggle Theme', keys: ['⌘', '⇧', 'D'] },
    ],
  },
  {
    title: 'Actions',
    items: [
      { description: 'New Benchmark', keys: ['⌘', 'B'] },
      { description: 'Add Model', keys: ['⌘', 'M'] },
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
              aria-label="Keyboard Shortcuts"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {SHORTCUT_GROUPS.map((group) => (
                    <div key={group.title}>
                      {/* Group Header */}
                      <h3 className="mb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {group.title}
                      </h3>

                      {/* Shortcut Rows */}
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.description}
                            className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                          >
                            <span className="text-sm text-foreground">
                              {item.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.keys.map((key, i) => (
                                <React.Fragment key={`${item.description}-${key}-${i}`}>
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
                  Press{' '}
                  <Kbd>?</Kbd>
                  {' '}or{' '}
                  <Kbd>Esc</Kbd>
                  {' '}to close
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
