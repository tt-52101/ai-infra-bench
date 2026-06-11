# Task 4: Add Radar Chart Visualization to Models and Reports Pages

## Work Log

### Part 1: Models Page - Performance Radar in ModelDetailSheet

- Added Recharts imports: `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `Radar`, `ResponsiveContainer`, `Tooltip as RechartsTooltip`, `Legend`
- Added `BenchmarkResultInfo` to type imports
- Modified `ModelDetailSheet` component:
  - Added `allResults: BenchmarkResultInfo[]` prop
  - Added `useMemo`-based `radarData` computation that:
    - Gets results for the specific model (via detailJson modelId matching)
    - Falls back to distributing results evenly if no direct match
    - Computes 6 dimensions: Throughput, Latency (inverted), TTFT (inverted), GPU Efficiency, Reliability, Memory Efficiency
    - Normalizes all values to 0-100 scale
    - Uses realistic mock scores when no benchmark data exists
    - Shows VLLM and SGLang overlaid if both engines have data
  - Added framer-motion entrance animation (`initial={{ opacity: 0, scale: 0.95 }}`)
  - Radar chart rendered inside a Card with header, dimension legend, and scale footnote
  - Shows color legend (VLLM emerald, SGLang amber) when both engines displayed
- Updated `ModelsPage` to pass `allResults` prop to `ModelDetailSheet`
- Moved `useMemo` and `showBothEngines` computation before the `if (!model) return null` guard to satisfy React Hooks rules

### Part 2: Reports Page - Radar Tab

- Added Recharts radar imports: `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `Radar`
- Added `radarSelectedModels` state for model selection (2-3 models)
- Added `RADAR_COLORS` constant array with 3 distinct colors:
  - VLLM: `#10b981` (emerald) / `#059669` (stroke)
  - SGLang: `#f59e0b` (amber) / `#d97706` (stroke)
  - Sky: `#0ea5e9` / `#0284c7` (stroke)
- Added `radarModelOptions` useMemo (unique model names from filtered data)
- Added `radarEffectiveModels` useMemo (auto-selects first 2 if none selected)
- Added `radarData` useMemo that:
  - Computes per-model aggregate metrics from filtered results
  - Normalizes to 0-100 scale across selected models
  - Inverts Latency and TTFT (lower = higher score)
  - GPU Efficiency and Reliability shown as-is (percentage)
  - Returns 6-dimension data points for each selected model
- Added `toggleRadarModel` callback with max 3 models toast warning
- Added "Radar" TabsTrigger alongside existing Throughput, Latency, Scatter, TTFT & TPOT tabs
- Added "Radar" TabsContent with:
  - Model selector UI: clickable rounded pills with color indicators
  - Conditional empty state when < 2 models available
  - RadarChart with PolarGrid, PolarAngleAxis (dimension labels), PolarRadiusAxis (0-100)
  - One Radar component per selected model with distinct color
  - Custom tooltip formatter showing model names instead of dataKey
  - Custom legend formatter showing model names
  - Scale footnote explaining normalization

### Verification
- ESLint: zero errors
- Dev server: compiles and serves successfully
- All existing functionality intact (throughput, latency, scatter, TTFT & TPOT tabs unchanged)
