'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────

export interface TooltipEntry {
  /** Display label for the series */
  label: string
  /** Color of the dot indicator and border accent */
  color: string
  /** The formatted display value (e.g. "1,234") */
  value: string | number
  /** Unit suffix (e.g. "tokens/s", "ms") */
  unit?: string
  /** Optional comparison string (e.g. "↑ 12.3%") */
  comparison?: string
  /** Whether comparison is positive (green) or negative (red) */
  comparisonPositive?: boolean
  /** Optional visual bar fill percentage (0-100) */
  barPercent?: number
}

export interface CustomChartTooltipProps {
  /** Whether the tooltip is active/visible */
  active?: boolean
  /** Recharts payload array */
  payload?: Array<{
    value: number
    dataKey: string
    name: string
    color: string
    payload: Record<string, unknown>
  }>
  /** The label (usually x-axis value) */
  label?: string
  /** Custom label formatter (e.g. format date nicely) */
  labelFormatter?: (label: string, payload: unknown[]) => React.ReactNode
  /** Map dataKey → display metadata */
  seriesConfig?: Record<string, {
    label: string
    color: string
    unit?: string
  }>
  /** Manually constructed entries (overrides seriesConfig-based auto build) */
  entries?: TooltipEntry[]
  /** Show a "Click for details" hint at the bottom */
  showClickHint?: boolean
  /** Additional CSS class */
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────

export function CustomChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  seriesConfig,
  entries: manualEntries,
  showClickHint = false,
  className,
}: CustomChartTooltipProps) {
  if (!active || !payload?.length) return null

  // Build entries from payload + seriesConfig, or use manual entries
  const entries: TooltipEntry[] = manualEntries ?? payload.map((p) => {
    const cfg = seriesConfig?.[p.dataKey]
    return {
      label: cfg?.label ?? p.name ?? p.dataKey,
      color: cfg?.color ?? p.color ?? '#888',
      value: typeof p.value === 'number' ? p.value.toLocaleString() : String(p.value),
      unit: cfg?.unit,
    }
  })

  const renderedLabel = labelFormatter
    ? labelFormatter(label ?? '', payload)
    : label

  return (
    <div
      className={cn(
        'bg-popover border rounded-xl px-3.5 py-2.5 shadow-xl text-xs',
        'backdrop-blur-sm min-w-[10rem] max-w-[20rem]',
        className,
      )}
    >
      {/* Label */}
      {renderedLabel && (
        <p className="font-semibold text-sm mb-1.5 text-foreground">{renderedLabel}</p>
      )}

      {/* Entries */}
      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            {/* Colored dot */}
            <span
              className="mt-0.5 shrink-0 h-2.5 w-2.5 rounded-full ring-1 ring-offset-1 ring-offset-popover"
              style={{ backgroundColor: entry.color, ringColor: entry.color }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                {/* Label + value */}
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-mono font-medium text-foreground">
                  {entry.value}
                  {entry.unit && (
                    <span className="text-muted-foreground font-sans ml-0.5">{entry.unit}</span>
                  )}
                </span>
              </div>

              {/* Comparison indicator */}
              {entry.comparison && (
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    entry.comparisonPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {entry.comparison}
                </span>
              )}

              {/* Visual bar indicator */}
              {entry.barPercent !== undefined && entry.barPercent > 0 && (
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(entry.barPercent, 100)}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Click hint */}
      {showClickHint && (
        <div className="mt-2 pt-1.5 border-t border-border/50 text-center">
          <span className="text-[10px] text-muted-foreground/60">Click for details</span>
        </div>
      )}
    </div>
  )
}

// ─── Convenience: Dashboard Throughput Tooltip ─────────────────────

export function DashboardThroughputTooltip({
  active,
  payload,
  label,
  data,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string
  /** The full data array so we can compute % change from previous point */
  data?: Array<Record<string, unknown>>
}) {
  if (!active || !payload?.length) return null

  // Format label as date
  const formattedLabel = label ?? ''

  // Compute comparison to previous data point
  const entries: TooltipEntry[] = payload.map((p) => {
    const engineLabel = p.dataKey === 'vllm' ? 'VLLM' : 'SGLang'
    const engineColor = p.dataKey === 'vllm' ? '#10b981' : '#f59e0b'
    let comparison: string | undefined
    let comparisonPositive: boolean | undefined

    if (data && data.length > 1) {
      const currentIdx = data.findIndex((d) => d.name === label)
      if (currentIdx > 0) {
        const prevVal = data[currentIdx - 1][p.dataKey] as number | undefined
        const currVal = p.value
        if (prevVal !== undefined && prevVal > 0) {
          const pctChange = ((currVal - prevVal) / prevVal) * 100
          if (Math.abs(pctChange) >= 0.1) {
            comparison = pctChange >= 0 ? `↑ ${pctChange.toFixed(1)}%` : `↓ ${Math.abs(pctChange).toFixed(1)}%`
            comparisonPositive = pctChange >= 0
          }
        }
      }
    }

    return {
      label: engineLabel,
      color: engineColor,
      value: p.value.toLocaleString(),
      unit: 'tokens/s',
      comparison,
      comparisonPositive,
    }
  })

  return (
    <CustomChartTooltip
      active={active}
      payload={payload}
      label={formattedLabel}
      entries={entries}
    />
  )
}

// ─── Convenience: Dashboard Latency Tooltip ────────────────────────

export function DashboardLatencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  // Find max value for bar percentage
  const maxVal = Math.max(...payload.map((p) => p.value), 1)

  const entries: TooltipEntry[] = payload.map((p) => {
    const engineLabel = p.dataKey === 'vllm' ? 'VLLM' : 'SGLang'
    const engineColor = p.dataKey === 'vllm' ? '#10b981' : '#f59e0b'

    return {
      label: engineLabel,
      color: engineColor,
      value: p.value.toLocaleString(),
      unit: 'ms',
      barPercent: maxVal > 0 ? (p.value / maxVal) * 100 : 0,
    }
  })

  const percentileLabel = label ? `${label} Latency` : ''

  return (
    <CustomChartTooltip
      active={active}
      payload={payload}
      label={percentileLabel}
      entries={entries}
    />
  )
}
