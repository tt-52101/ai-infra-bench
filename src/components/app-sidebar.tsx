'use client'

import { Cpu, LayoutDashboard, Box, SlidersHorizontal, Play, BarChart3, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { PageKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const navItems: { key: PageKey; label: string; icon: React.ElementType; badge?: number }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'models', label: 'Models', icon: Box },
  { key: 'parameters', label: 'Parameters', icon: SlidersHorizontal },
  { key: 'benchmark', label: 'Benchmark', icon: Play, badge: 3 },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'analysis', label: 'Analysis', icon: TrendingUp },
]

export function AppSidebar() {
  const { activePage, setActivePage } = useAppStore()

  return (
    <Sidebar
      className="border-r-0 bg-gradient-to-b from-card via-card to-card/95"
      collapsible="icon"
    >
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight">InferBench</span>
            <span className="text-[11px] text-muted-foreground leading-none mt-0.5">Inference Engine Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="mx-4" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activePage === item.key
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setActivePage(item.key)}
                      tooltip={item.label}
                      className={cn(
                        'relative h-10 px-3 rounded-lg transition-all duration-200 hover:scale-[1.02]',
                        isActive
                          ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-full before:bg-emerald-600'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className={cn(
                        'h-[18px] w-[18px] transition-colors',
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                      )} />
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 border-t border-border/40 pt-3">
        <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">v1.0.0 · Inference Engine Platform</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
