# Task 3: Parameter Sensitivity Preview Charts

## Task Description
Enhance the Parameter Tuning page (`src/components/parameters/parameters-page.tsx`) with a **Live Chart Preview** feature. When the user adjusts parameter sliders, real-time mini-charts should update showing predicted performance curves.

## Work Log

### Changes Made (only to `src/components/parameters/parameters-page.tsx`)

1. **Added new imports**:
   - `TrendingUp`, `Activity` from `lucide-react` (chart section icons)
   - `motion` from `framer-motion` (entrance animation)
   - `AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine` from `recharts`
   - `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `@/components/ui/chart`

2. **Added `SENSITIVITY_PARAM_CONFIG` constant** (lines 297-311):
   - Maps parameter keys to their display labels, min/max/step ranges, and optional units
   - Supports 5 parameters: `maxNumSeqs`, `gpuMemoryUtil`, `maxNumBatchedTokens`, `maxModelLen`, `swapSpace`

3. **Added `generateSensitivityData` function** (lines 313-403):
   - Takes current params, engine type, and a parameter key
   - Generates 40 data points varying the selected parameter from min to max
   - Each point includes `paramValue`, `paramLabel`, `throughput`, and `latency`
   - Realistic curve generation per parameter type:
     - **maxNumSeqs / maxNumBatchedTokens**: Throughput follows logistic curve with saturation + diminishing returns; Latency is linear + exponential after saturation point
     - **gpuMemoryUtil**: Throughput increases with power-law scaling; Latency decreases with more GPU memory
     - **maxModelLen**: Throughput decreases (more memory per sequence); Latency increases linearly
     - **swapSpace**: Throughput benefits initially then declines; Latency increases with heavy swapping

4. **Added state and computed values** in ParametersPage:
   - `sensitivityParam` state (default: `'maxNumSeqs'`)
   - `sensitivityData` useMemo that regenerates on param/engine/sensitivityParam changes
   - `currentSensitivityLabel` useMemo that finds the closest data point label to the current slider value (for ReferenceLine positioning)

5. **Added "Parameter Sensitivity Preview" section** (after "Live Impact Preview", before "Saved Profiles Table"):
   - Section header with title + info tooltip explaining the prediction model
   - Dropdown selector for X-axis parameter (5 options)
   - Two mini-charts side by side (responsive grid: 1 col on mobile, 2 on lg+):
     - **Throughput Prediction**: AreaChart with emerald (#10b981) gradient fill, ReferenceLine at current value with "Current" label
     - **Latency Prediction**: AreaChart with amber (#f59e0b) gradient fill, ReferenceLine at current value with "Current" label
   - Both charts use ChartContainer for shadcn/ui integration, ChartTooltip for hover details
   - Recharts animation: `animationDuration={400}`, `animationEasing="ease-out"`
   - framer-motion entrance animation: fade-in + slide-up

## Verification
- ESLint: zero errors
- Dev server: compiles successfully
- All existing functionality preserved intact
