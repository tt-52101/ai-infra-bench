'use client'

import { Cpu, LayoutDashboard, Box, SlidersHorizontal, Play, BarChart3, TrendingUp, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const navItems: { key: PageKey; label: string; icon: React.ElementType; badge?: number; shortcut?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
  { key: 'models', label: 'Models', icon: Box, shortcut: '⌘2' },
  { key: 'parameters', label: 'Parameters', icon: SlidersHorizontal, shortcut: '⌘3' },
  { key: 'benchmark', label: 'Benchmark', icon: Play, badge: 3, shortcut: '⌘4' },
  { key: 'reports', label: 'Reports', icon: BarChart3, shortcut: '⌘5' },
  { key: 'analysis', label: 'Analysis', icon: TrendingUp, shortcut: '⌘6' },
  { key: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘7' },
]

export function AppSidebar() {
  const { activePage, setActivePage } = useAppStore()

  return (
    <Sidebar
      className="border-r-0 bg-gradient-to-b from-card via-card to-card/95 dark:from-[oklch(0.17_0.005_260)] dark:via-[oklch(0.15_0.008_260)] dark:to-[oklch(0.13_0.01_260)]"
      collapsible="icon"
    >
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight">InferBench</span>
            <span className="inline-flex items-center rounded-md bg-gradient-to-r from-emerald-600 to-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white shadow-sm">
              Pro
            </span>
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden mt-1">
          <span className="text-[11px] text-muted-foreground leading-none">Inference Engine Platform</span>
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
                        'relative h-10 px-3 rounded-lg transition-all duration-300 ease-out',
                        'hover:scale-[1.02] active:scale-[0.98]',
                        isActive
                          ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      {/* Animated gradient border on the left side for active item */}
                      <AnimatePresence mode="wait">
                        {isActive && (
                          <motion.div
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{ scaleY: 1, opacity: 1 }}
                            exit={{ scaleY: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[4px] rounded-full overflow-hidden shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          >
                            <motion.div
                              className="h-full w-full bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-400"
                              animate={{
                                backgroundPosition: ['0% 0%', '0% 100%', '0% 0%'],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                              style={{ backgroundSize: '100% 200%' }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Icon className={cn(
                        'h-[18px] w-[18px] transition-all duration-300',
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                      )} />
                      <span className="transition-all duration-300">{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono group-data-[collapsible=icon]:hidden">
                          {item.shortcut}
                        </span>
                      )}
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
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">v1.0.0 · Inference Engine Platform</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
