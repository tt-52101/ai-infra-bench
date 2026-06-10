'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { PageKey } from '@/lib/types'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import ModelsPage from '@/components/models/models-page'
import ParametersPage from '@/components/parameters/parameters-page'
import BenchmarkPage from '@/components/benchmark/benchmark-page'
import ReportsPage from '@/components/reports/reports-page'
import AnalysisPage from '@/components/analysis/analysis-page'
import { AppSidebar } from '@/components/app-sidebar'
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

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  models: 'Model Management',
  parameters: 'Parameter Tuning',
  benchmark: 'Benchmark Testing',
  reports: 'Performance Reports',
  analysis: 'Inflection Point Analysis',
}

function PageContent({ page }: { page: PageKey }) {
  switch (page) {
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
    default:
      return <DashboardPage />
  }
}

export default function Home() {
  const { activePage } = useAppStore()
  const { theme, setTheme } = useTheme()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
          <div className="ml-auto">
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            <PageContent page={activePage} />
          </div>
        </main>
        <footer className="border-t py-3 px-4 text-center text-xs text-muted-foreground">
          InferBench v1.0.0 · VLLM / SGLang Inference Engine Adaptation Platform
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
