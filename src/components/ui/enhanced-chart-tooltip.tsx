'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────

export interface EnhancedTooltipEntry {
  /** Display label for the series */
  label: string
  /** Color of the indicator square/circle */
  color: string
  /** The formatted display value (e.g. "1,234") */
  value: string | number
  /** Unit suffix (e.g. "tokens/s", "ms", "%") */
  unit?: string
  /** Optional comparison string (e.g. "↑ 12.3%") */
  comparison?: string
  /** Whether comparison is positive (green) or negative (red) */
  comparisonPositive?: boolean
  /** Optional visual bar fill percentage (0-100) */
  barPercent?: number
  /** Optional engine type badge ("VLLM" or "SGLang") */
  engineBadge?: 'VLLM' | 'SGLang'
}

export interface EnhancedChartTooltipProps {
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
  label?: string | number
  /** Custom label formatter */
  labelFormatter?: (label: string | number, payload: unknown[]) => React.ReactNode
  /** Color dot for the title row */
  titleDotColor?: string
  /** Map dataKey → display metadata */
  seriesConfig?: Record<string, {
    label: string
    color: string
    unit?: string
    engineBadge?: 'VLLM' | 'SGLang'
  }>
  /** Manually constructed entries (overrides seriesConfig-based auto build) */
  entries?: EnhancedTooltipEntry[]
  /** Footer text (e.g. "Click for details" or scenario name) */
  footer?: string
  /** Show a "Click for details" hint at the bottom */
  showClickHint?: boolean
  /** Compact mode for mobile */
  compact?: boolean
  /** Additional CSS class */
  className?: string
}

// ─── Format Helpers ────────────────────────────────────────────────

function formatValueWithCommas(value: number | string): string {
  if (typeof value === 'string') return value
  return value.toLocaleString()
}

function getUnitSuffix(unit?: string): string {
  if (!unit) return ''
  return unit
}

// ─── Engine Badge ──────────────────────────────────────────────────

function EngineBadge({ type, className }: { type: 'VLLM' | 'SGLang'; className?: string }) {
  const isVllm = type === 'VLLM'
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
        isVllm
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
        className,
      )}
    >
      {type}
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────

export function EnhancedChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  titleDotColor,
  seriesConfig,
  entries: manualEntries,
  footer,
  showClickHint = false,
  compact = false,
  className,
}: EnhancedChartTooltipProps) {
  if (!active || !payload?.length) return null

  // Build entries from payload + seriesConfig, or use manual entries
  const entries: EnhancedTooltipEntry[] = manualEntries ?? payload.map((p) => {
    const cfg = seriesConfig?.[p.dataKey]
    return {
      label: cfg?.label ?? p.name ?? p.dataKey,
      color: cfg?.color ?? p.color ?? '#888',
      value: typeof p.value === 'number' ? p.value.toLocaleString() : String(p.value),
      unit: cfg?.unit,
      engineBadge: cfg?.engineBadge,
    }
  })

  const renderedLabel = labelFormatter
    ? labelFormatter(label ?? '', payload)
    : typeof label === 'number'
      ? label.toLocaleString()
      : label

  const displayFooter = footer ?? (showClickHint ? 'Click for details' : undefined)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl',
          'min-w-[12rem] max-w-[22rem]',
          'dark:bg-popover/90 dark:border-border/40',
          compact ? 'px-3 py-2' : 'px-4 py-3',
          className,
        )}
      >
        {/* Title Row */}
        {renderedLabel && (
          <div className="flex items-center gap-2 mb-2">
            {titleDotColor && (
              <span
                className="shrink-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: titleDotColor }}
              />
            )}
            <p className={cn(
              'font-semibold text-foreground truncate',
              compact ? 'text-xs' : 'text-sm',
            )}>
              {renderedLabel}
            </p>
          </div>
        )}

        {/* Metric Rows */}
        <div className={cn('space-y-1.5', compact ? 'space-y-1' : 'space-y-1.5')}>
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2">
              {/* Colored square indicator */}
              <span
                className="mt-0.5 shrink-0 rounded-sm ring-1 ring-offset-1 ring-offset-popover"
                style={{
                  backgroundColor: entry.color,
                  ringColor: entry.color,
                  width: compact ? 8 : 10,
                  height: compact ? 8 : 10,
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  {/* Label + engine badge */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      'text-muted-foreground truncate',
                      compact ? 'text-[10px]' : 'text-xs',
                    )}>
                      {entry.label}
                    </span>
                    {entry.engineBadge && (
                      <EngineBadge type={entry.engineBadge} />
                    )}
                  </div>

                  {/* Value + unit */}
                  <span className={cn(
                    'font-mono font-medium text-foreground whitespace-nowrap',
                    compact ? 'text-[10px]' : 'text-xs',
                  )}>
                    {formatValueWithCommas(entry.value)}
                    {entry.unit && (
                      <span className="text-muted-foreground font-sans ml-0.5 text-[10px]">
                        {getUnitSuffix(entry.unit)}
                      </span>
                    )}
                  </span>
                </div>

                {/* Comparison indicator */}
                {entry.comparison && (
                  <span
                    className={cn(
                      'font-medium',
                      compact ? 'text-[9px]' : 'text-[10px]',
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
                  <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
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

        {/* Footer Row */}
        {displayFooter && (
          <div className={cn(
            'mt-2 pt-1.5 border-t border-border/40 text-center',
            compact ? 'mt-1.5 pt-1' : 'mt-2 pt-1.5',
          )}>
            <span className="text-[10px] text-muted-foreground/60">{displayFooter}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Convenience: Dashboard Throughput Tooltip ─────────────────────

export function EnhancedDashboardThroughputTooltip({
  active,
  payload,
  label,
  data,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string | number
  /** The full data array so we can compute % change from previous point */
  data?: Array<Record<string, unknown>>
}) {
  if (!active || !payload?.length) return null

  const entries: EnhancedTooltipEntry[] = payload.map((p) => {
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
      engineBadge: p.dataKey === 'vllm' ? 'VLLM' : 'SGLang',
    }
  })

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={label}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Dashboard Latency Tooltip ────────────────────────

export function EnhancedDashboardLatencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const maxVal = Math.max(...payload.map((p) => p.value), 1)

  const entries: EnhancedTooltipEntry[] = payload.map((p) => {
    const engineLabel = p.dataKey === 'vllm' ? 'VLLM' : 'SGLang'
    const engineColor = p.dataKey === 'vllm' ? '#10b981' : '#f59e0b'

    return {
      label: engineLabel,
      color: engineColor,
      value: p.value.toLocaleString(),
      unit: 'ms',
      barPercent: maxVal > 0 ? (p.value / maxVal) * 100 : 0,
      engineBadge: p.dataKey === 'vllm' ? 'VLLM' : 'SGLang',
    }
  })

  const percentileLabel = label ? `${label} Latency` : ''

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={percentileLabel}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Reports Throughput Tooltip ───────────────────────

export function EnhancedReportsThroughputTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const entries: EnhancedTooltipEntry[] = payload.map((p) => ({
    label: p.dataKey === 'vllm' ? 'VLLM' : 'SGLang',
    color: p.dataKey === 'vllm' ? '#10b981' : '#f59e0b',
    value: p.value.toLocaleString(),
    unit: 'tokens/s',
    engineBadge: p.dataKey === 'vllm' ? 'VLLM' : 'SGLang',
  }))

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={typeof label === 'string' ? label : String(label ?? '')}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Reports Scatter Tooltip ──────────────────────────

export function EnhancedScatterTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: Record<string, unknown> }>
}) {
  if (!active || !payload?.length) return null

  const d = payload[0].payload as Record<string, unknown>
  const engine = (d.engine as string) ?? 'vllm'

  const entries: EnhancedTooltipEntry[] = [
    {
      label: engine === 'vllm' ? 'VLLM' : 'SGLang',
      color: engine === 'vllm' ? '#10b981' : '#f59e0b',
      value: Number(d.throughputTokensPerSec ?? 0).toLocaleString(),
      unit: 'tokens/s',
      engineBadge: engine === 'vllm' ? 'VLLM' : 'SGLang',
    },
    {
      label: 'Latency P99',
      color: '#ef4444',
      value: String(d.latencyP99Ms ?? 0),
      unit: 'ms',
    },
    {
      label: 'Concurrency',
      color: '#94a3b8',
      value: String(d.concurrency ?? 0),
    },
  ]

  return (
    <EnhancedChartTooltip
      active={active}
      payload={[]}
      label={String(d.model ?? '')}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Reports Latency Tooltip ──────────────────────────

export function EnhancedReportsLatencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const entries: EnhancedTooltipEntry[] = payload.map((p) => {
    const unitSuffix = 'ms'
    let displayColor = p.color
    let displayLabel = p.dataKey

    if (p.dataKey === 'p50') { displayLabel = 'P50'; displayColor = '#94a3b8' }
    else if (p.dataKey === 'p90') { displayLabel = 'P90'; displayColor = '#f59e0b' }
    else if (p.dataKey === 'p99') { displayLabel = 'P99'; displayColor = '#ef4444' }

    return {
      label: displayLabel,
      color: displayColor,
      value: p.value.toLocaleString(),
      unit: unitSuffix,
    }
  })

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={typeof label === 'string' ? label : String(label ?? '')}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Reports TTFT/TPOT Tooltip ───────────────────────

export function EnhancedReportsTtftTpotTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  const colorMap: Record<string, { color: string; label: string; engineBadge?: 'VLLM' | 'SGLang' }> = {
    'VLLM TTFT': { color: '#10b981', label: 'VLLM TTFT', engineBadge: 'VLLM' },
    'SGLang TTFT': { color: '#f59e0b', label: 'SGLang TTFT', engineBadge: 'SGLang' },
    'VLLM TPOT': { color: '#6ee7b7', label: 'VLLM TPOT', engineBadge: 'VLLM' },
    'SGLang TPOT': { color: '#fcd34d', label: 'SGLang TPOT', engineBadge: 'SGLang' },
  }

  const entries: EnhancedTooltipEntry[] = payload.map((p) => {
    const cfg = colorMap[p.dataKey]
    return {
      label: cfg?.label ?? p.dataKey,
      color: cfg?.color ?? p.color ?? '#888',
      value: p.value.toLocaleString(),
      unit: 'ms',
      engineBadge: cfg?.engineBadge,
    }
  })

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={typeof label === 'string' ? label : String(label ?? '')}
      entries={entries}
      showClickHint
    />
  )
}

// ─── Convenience: Analysis Tooltip ─────────────────────────────────

export function EnhancedAnalysisTooltip({
  active,
  payload,
  label,
  yLabel,
  dimension,
  engineBadge,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; payload: Record<string, unknown> }>
  label?: number | string
  yLabel: string
  dimension?: string
  engineBadge?: 'VLLM' | 'SGLang'
}) {
  if (!active || !payload?.length) return null

  // Determine unit from yLabel
  let unit = ''
  if (yLabel.includes('ms')) unit = 'ms'
  else if (yLabel.includes('GB')) unit = 'GB'
  else if (yLabel.includes('%')) unit = '%'
  else if (yLabel.includes('tok/s') || yLabel.includes('tokens')) unit = 'tokens/s'

  const entries: EnhancedTooltipEntry[] = payload.map((p) => {
    const isVllm = p.dataKey === 'VLLM'
    const isSglang = p.dataKey === 'SGLang'
    let badge: 'VLLM' | 'SGLang' | undefined
    if (isVllm) badge = 'VLLM'
    else if (isSglang) badge = 'SGLang'
    else badge = engineBadge

    return {
      label: p.dataKey,
      color: p.color,
      value: p.value.toLocaleString(),
      unit,
      engineBadge: badge,
    }
  })

  // Format label based on dimension
  let formattedLabel = label
  if (typeof label === 'number') {
    if (dimension === 'gpumem_performance') {
      formattedLabel = `${(label * 100).toFixed(0)}%`
    } else if (label >= 1000) {
      formattedLabel = label.toLocaleString()
    }
  }

  return (
    <EnhancedChartTooltip
      active={active}
      payload={payload}
      label={formattedLabel}
      entries={entries}
      footer={yLabel}
    />
  )
}

// ─── Click-to-Highlight Hook ──────────────────────────────────────

export interface HighlightedPoint {
  dataKey: string
  index: number
  value: number
  label: string | number
  x?: number
  y?: number
}

export function useChartHighlight() {
  const [highlighted, setHighlighted] = React.useState<HighlightedPoint | null>(null)

  const handleChartClick = React.useCallback(
    (state: { activePayload?: Array<{ dataKey: string; value: number; payload: Record<string, unknown> }>; activeLabel?: string | number } | null) => {
      if (!state?.activePayload?.length) {
        setHighlighted(null)
        return
      }

      const firstPayload = state.activePayload[0]
      const label = state.activeLabel ?? ''

      // Toggle off if clicking same point
      if (
        highlighted &&
        highlighted.label === label &&
        highlighted.dataKey === firstPayload.dataKey
      ) {
        setHighlighted(null)
        return
      }

      setHighlighted({
        dataKey: firstPayload.dataKey,
        index: 0,
        value: firstPayload.value,
        label,
      })
    },
    [highlighted],
  )

  const clearHighlight = React.useCallback(() => {
    setHighlighted(null)
  }, [])

  return { highlighted, handleChartClick, clearHighlight }
}

// ─── Persistent Highlight Card ─────────────────────────────────────

export function HighlightCard({
  point,
  seriesConfig,
  onClose,
}: {
  point: HighlightedPoint
  seriesConfig?: Record<string, { label: string; color: string; unit?: string }>
  onClose: () => void
}) {
  const cfg = seriesConfig?.[point.dataKey]
  const displayLabel = cfg?.label ?? point.dataKey
  const displayColor = cfg?.color ?? '#888'
  const unit = cfg?.unit ?? ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute z-50 pointer-events-auto"
      style={{ top: 8, right: 8 }}
    >
      <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 min-w-[140px]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: displayColor }}
            />
            <span className="text-xs font-semibold text-foreground">{displayLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm font-mono font-bold text-foreground">
          {point.value.toLocaleString()}
          {unit && <span className="text-muted-foreground font-sans text-xs ml-0.5">{unit}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {typeof point.label === 'number' ? point.label.toLocaleString() : point.label}
        </p>
      </div>
    </motion.div>
  )
}
