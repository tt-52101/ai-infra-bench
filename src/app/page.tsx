'use client'

import React from 'react'
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
