'use client'

import React, { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Check,
  AlertTriangle,
  Info,
  XCircle,
  CheckCheck,
  Zap,
  BarChart3,
  Settings2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { Notification, NotificationType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// --- Icon mapping by notification type ---
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'benchmark_completed':
      return <Check className="h-4 w-4" />
    case 'benchmark_failed':
      return <XCircle className="h-4 w-4" />
    case 'model_deployed':
      return <Zap className="h-4 w-4" />
    case 'analysis_ready':
      return <BarChart3 className="h-4 w-4" />
    case 'system_alert':
      return <AlertTriangle className="h-4 w-4" />
    case 'profile_updated':
      return <Settings2 className="h-4 w-4" />
    default:
      return <Info className="h-4 w-4" />
  }
}

function getNotificationIconColor(type: NotificationType) {
  switch (type) {
    case 'benchmark_completed':
      return 'text-emerald-500'
    case 'benchmark_failed':
      return 'text-red-500'
    case 'model_deployed':
      return 'text-blue-500'
    case 'analysis_ready':
      return 'text-violet-500'
    case 'system_alert':
      return 'text-amber-500'
    case 'profile_updated':
      return 'text-sky-500'
    default:
      return 'text-muted-foreground'
  }
}

function getNotificationIconBg(type: NotificationType) {
  switch (type) {
    case 'benchmark_completed':
      return 'bg-emerald-500/10 dark:bg-emerald-500/20'
    case 'benchmark_failed':
      return 'bg-red-500/10 dark:bg-red-500/20'
    case 'model_deployed':
      return 'bg-blue-500/10 dark:bg-blue-500/20'
    case 'analysis_ready':
      return 'bg-violet-500/10 dark:bg-violet-500/20'
    case 'system_alert':
      return 'bg-amber-500/10 dark:bg-amber-500/20'
    case 'profile_updated':
      return 'bg-sky-500/10 dark:bg-sky-500/20'
    default:
      return 'bg-muted'
  }
}

function getNotificationBorderAccent(type: NotificationType) {
  switch (type) {
    case 'benchmark_completed':
      return 'border-l-emerald-500'
    case 'benchmark_failed':
      return 'border-l-red-500'
    case 'model_deployed':
      return 'border-l-blue-500'
    case 'analysis_ready':
      return 'border-l-violet-500'
    case 'system_alert':
      return 'border-l-amber-500'
    case 'profile_updated':
      return 'border-l-sky-500'
    default:
      return 'border-l-muted-foreground'
  }
}

// --- Relative time formatting ---
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = now - time

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// --- Mock notifications ---
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'benchmark_completed',
    title: 'Benchmark completed',
    description: 'Qwen2.5-72B Multi-Stream test finished successfully',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    read: false,
    link: 'benchmark',
  },
  {
    id: 'notif-2',
    type: 'model_deployed',
    title: 'Model deployed',
    description: 'Llama-3.1-70B is now available for benchmarking',
    timestamp: new Date(Date.now() - 23 * 60 * 1000).toISOString(), // 23 min ago
    read: false,
    link: 'models',
  },
  {
    id: 'notif-3',
    type: 'analysis_ready',
    title: 'Analysis ready',
    description: 'Concurrency vs Throughput analysis results are available',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    read: true,
    link: 'analysis',
  },
  {
    id: 'notif-4',
    type: 'system_alert',
    title: 'System alert',
    description: 'Memory pool usage at 73% — consider scaling resources',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    read: false,
    link: 'dashboard',
  },
  {
    id: 'notif-5',
    type: 'benchmark_failed',
    title: 'Benchmark failed',
    description: 'DeepSeek-V3 Burst Test encountered an error and stopped',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
    read: true,
    link: 'benchmark',
  },
  {
    id: 'notif-6',
    type: 'profile_updated',
    title: 'Profile updated',
    description: 'High Throughput preset parameters have been modified',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
    read: true,
    link: 'parameters',
  },
]

// --- Notification Item Component ---
function NotificationItem({
  notification,
  onRead,
  onClick,
}: {
  notification: Notification
  onRead: (id: string) => void
  onClick: (notification: Notification) => void
}) {
  const { type, title, description, read, id } = notification
  const icon = getNotificationIcon(type)
  const iconColor = getNotificationIconColor(type)
  const iconBg = getNotificationIconBg(type)
  const borderAccent = getNotificationBorderAccent(type)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        border-l-[3px] transition-colors
        hover:bg-accent/50
        ${read ? 'border-l-transparent' : borderAccent}
      `}
      onClick={() => {
        if (!read) onRead(id)
        onClick(notification)
      }}
    >
      {/* Unread dot indicator */}
      {!read && (
        <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}

      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-sm font-medium leading-tight ${read ? 'text-muted-foreground' : 'text-foreground'}`}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
    </motion.div>
  )
}

// --- Main Notification Center Component ---
export function NotificationCenter() {
  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    setActivePage,
  } = useAppStore()

  // Initialize mock notifications once
  useEffect(() => {
    if (notifications.length === 0) {
      setNotifications(MOCK_NOTIFICATIONS)
    }
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const handleClickNotification = (notification: Notification) => {
    if (notification.link) {
      setActivePage(notification.link)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
          {unreadCount > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ opacity: 0.3 }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/60 mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onClick={handleClickNotification}
                />
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="border-t">
          <button
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/50"
            onClick={() => setActivePage('dashboard')}
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
