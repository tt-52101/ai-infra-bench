# Task ID: 5 - Waterfall Chart Visualization

## Agent: full-stack-developer

## Task: Add Waterfall chart visualization to Reports page

## Work Log:
- Read existing reports-page.tsx (~2200 lines) to understand current structure: 5 chart tabs (Throughput, Latency, Scatter, TTFT & TPOT, Radar), API hooks, data transformations, comparison sheet, export functions
- Read use-api.ts hooks (useResults, useBenchmarks, useModels) and types.ts (BenchmarkResultInfo, BenchmarkTaskInfo)
- Read chart.tsx for ChartContainer/ChartConfig support

### Implementation:
1. **Added Waterfall tab trigger** after "TTFT & TPOT" and before "Radar" in the TabsList
2. **Added state**: `waterfallResultId` for tracking which benchmark result to visualize
3. **Added `WATERFALL_COLORS` constant**: Queue=slate-400 (#94a3b8), Tokenization=sky-400 (#38bdf8), Prefill=emerald-400 (#34d399), Decode=amber-400 (#fbbf24), Post-processing=violet-400 (#a78bfa)
4. **Added TypeScript interfaces**: `WaterfallStage` (name, start, duration, color) and `WaterfallRow` (label, stages, totalMs)
5. **Implemented `generateWaterfallData()` function**:
   - Takes a ReportResult and produces 6-8 request stages
   - Uses seeded random (based on result ID) for deterministic but varied data
   - Maps TTFT to Prefill+Tokenization+Queue components
   - Maps TPOT * outputTokens to Decode time
   - Each stage has start position and duration for proper waterfall positioning
6. **Added computed waterfall data** via useMemo hooks:
   - `waterfallResult`: resolves selected result, defaults to first filtered result
   - `waterfallData`: generates waterfall rows from selected result
   - `waterfallChartData`: transforms to Recharts-friendly stacked bar format
   - `waterfallSummary`: computes avg total latency, avg queue/prefill/decode percentages, and hotspot detection
7. **Added `WaterfallTooltip` component**: Shows stage name, duration (ms), and percentage of total latency
8. **Added `WATERFALL_STAGE_COLORS` and `WATERFALL_STAGE_LABELS`** lookup maps for tooltip rendering
9. **Created Waterfall tab content** with:
   - Result selector dropdown (model · engine · scenario)
   - Summary stats cards (5 cards): Avg Total Latency, Avg Queue Wait %, Avg Prefill Time %, Avg Decode Time %, Hotspot indicator with warning badge
   - Horizontal stacked BarChart (layout="vertical") with 5 stacked bar segments
   - Custom legend with color-coded items at bottom
   - Empty state handling when no data available

## Stage Summary:
- Added "Waterfall" as 6th chart tab on Reports page
- Full waterfall visualization with 5 latency components stacked horizontally
- Interactive tooltip showing stage name, duration, and percentage
- Summary stats with hotspot detection (highlights the stage taking the most time)
- Dropdown selector to switch between benchmark results
- Color palette: Queue=slate-400, Tokenization=sky-400, Prefill=emerald-400, Decode=amber-400, Post-processing=violet-400
- Dark theme support via CSS variables
- Responsive design
- Zero lint errors, successful compilation
