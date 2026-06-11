'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'
import { useAppStore } from '@/lib/store'

export function AuthBanner() {
  const { t } = useI18n()
  const { isAuthenticated, setActivePage } = useAppStore()
  const [dismissed, setDismissed] = useState(false)

  if (isAuthenticated || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-sm">
          <LogIn className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            {t('auth.banner.signInForFull')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setActivePage('auth')}
          >
            <LogIn className="h-3 w-3" />
            {t('auth.banner.signIn')}
          </Button>
          <button
            type="button"
            className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors p-0.5"
            onClick={() => setDismissed(true)}
            aria-label={t('auth.banner.dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
