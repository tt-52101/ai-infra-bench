'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { translations, type Locale } from '@/lib/i18n'

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('inferbench-locale') as Locale | null
    if (saved && (saved === 'en' || saved === 'zh')) {
      return saved
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'en'
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('inferbench-locale', newLocale)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale] || translations.en
      let value = dict[key] || translations.en[key] || key

      // Replace {param} placeholders with actual values
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value.replace(
            new RegExp(`\\{${paramKey}\\}`, 'g'),
            String(paramValue)
          )
        })
      }

      return value
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
