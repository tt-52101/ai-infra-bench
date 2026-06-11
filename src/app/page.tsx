'use client'

import React, { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { I18nProvider, useI18n } from '@/hooks/use-i18n'
import type { PageKey } from '@/lib/types'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { LandingPage } from '@/components/landing/landing-page'
import ModelsPage from '@/components/models/models-page'
import ParametersPage from '@/components/parameters/parameters-page'
import BenchmarkPage from '@/components/benchmark/benchmark-page'
import ReportsPage from '@/components/reports/reports-page'
import AnalysisPage from '@/components/analysis/analysis-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { ApiDocsPage } from '@/components/api-docs/api-docs-page'
import { AuthPage } from '@/components/auth/auth-page'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import { NotificationCenter } from '@/components/notification-center'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'
import { AIChatWidget } from '@/components/chat/ai-chat-widget'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

function usePageTitles() {
  const { t } = useI18n()
  return {
    landing: t('page.landing'),
    dashboard: t('page.dashboard'),
    models: t('page.models'),
    parameters: t('page.parameters'),
    benchmark: t('page.benchmark'),
    reports: t('page.reports'),
    analysis: t('page.analysis'),
    settings: t('page.settings'),
    apiDocs: t('page.apiDocs'),
    auth: t('page.auth'),
  } as Record<PageKey, string>
}

function PageContent({ page }: { page: PageKey }) {
  switch (page) {
    case 'landing':
      return <LandingPage />
    case 'dashboard':
      return <DashboardPage />
    case 'models':
      return <ModelsPage />
    case 'parameters':
      return <ParametersPage />
    case 'benchmark':
      return <BenchmarkPage />
    case 'reports':
      return <ReportsPage />
    case 'analysis':
      return <AnalysisPage />
    case 'settings':
      return <SettingsPage />
    case 'apiDocs':
      return <ApiDocsPage />
    case 'auth':
      return <AuthPage />
    default:
      return <DashboardPage />
  }
}

function GradientTopBar() {
  return (
    <div className="h-[2px] w-full overflow-hidden relative">
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, #10b981, #f59e0b, #10b981, #f59e0b, #10b981)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '200% 0%'],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}

function HomeContent() {
  const { activePage, setActivePage } = useAppStore()
  const { theme, setTheme } = useTheme()
  const { t, locale, setLocale } = useI18n()
  const PAGE_TITLES = usePageTitles()

  // Keyboard shortcuts: Cmd+1-6 (or Ctrl+1-6) for sidebar navigation
  useEffect(() => {
    const SHORTCUT_MAP: Record<string, PageKey> = {
      '0': 'landing',
      '1': 'dashboard',
      '2': 'models',
      '3': 'parameters',
      '4': 'benchmark',
      '5': 'reports',
      '6': 'analysis',
      '7': 'settings',
      '8': 'apiDocs',
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Cmd (Mac) or Ctrl (Windows/Linux) + number 1-7
      if (!(e.metaKey || e.ctrlKey)) return
      const page = SHORTCUT_MAP[e.key]
      if (!page) return

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

      // Prevent default browser behavior (e.g., Ctrl+1-8 switch browser tabs)
      e.preventDefault()
      setActivePage(page)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setActivePage])

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="flex w-full min-h-screen flex-col">
        <GradientTopBar />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex flex-col">
            {activePage === 'landing' ? (
              /* Landing page gets full-screen treatment with minimal header */
              <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 !h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-sm font-medium">
                        {PAGE_TITLES[activePage]}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-1">
                  <NotificationCenter />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
                    aria-label={locale === 'en' ? '切换到中文' : 'Switch to English'}
                    title={locale === 'en' ? '切换中文' : 'Switch to English'}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold ml-0.5">{locale === 'en' ? '中' : 'EN'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </div>
              </header>
            ) : (
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 !h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-sm font-medium">
                        {PAGE_TITLES[activePage]}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-1">
                  <NotificationCenter />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
                    aria-label={locale === 'en' ? '切换到中文' : 'Switch to English'}
                    title={locale === 'en' ? '切换中文' : 'Switch to English'}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px] font-bold ml-0.5">{locale === 'en' ? '中' : 'EN'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </div>
              </header>
            )}
            <main className="flex-1 overflow-y-auto">
              {activePage === 'landing' ? (
                <PageContent page={activePage} />
              ) : (
                <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
                  <PageContent page={activePage} />
                </div>
              )}
            </main>
            {activePage !== 'landing' && (
              <footer className="border-t py-3 px-4">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      InferBench <span className="font-semibold text-foreground/80">v1.0.0</span>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/60">
                    {t('footer.platform')}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {t('footer.poweredBy')} <span className="font-medium text-muted-foreground/70">InferBench Pro</span>
                  </span>
                </div>
              </footer>
            )}
          </SidebarInset>
        </div>
      </div>
      <AIChatWidget />
      <KeyboardShortcutsHelp />
    </SidebarProvider>
  )
}

export default function Home() {
  return (
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
  )
}
