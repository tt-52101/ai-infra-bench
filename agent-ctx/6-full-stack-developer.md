# Task ID: 6
# Agent: full-stack-developer
# Task: Add Performance History Trend section to Model Detail Sheet

## Work Log

- Read worklog.md to understand project context (InferBench - VLLM/SGLang inference engine platform)
- Read models-page.tsx (1497 lines) to understand existing structure: ModelCard, ModelFormDialog, ModelDetailSheet (with Performance Radar), ModelsPage
- Updated Recharts imports: added ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid
- Updated Lucide imports: added TrendingUp, TrendingDown, Activity, Calendar
- Created `generatePerformanceHistory()` function with realistic data generation:
  - Infers model size from name (70B/72B/671B = large, 34B/32B/14B = medium, 7B/8B/3B = small)
  - Base throughput varies by model size (large=1200, medium=2800, small=5500 tok/s)
  - SGLang engines get 8% throughput boost
  - GPU count scales throughput (+15% per additional GPU)
  - Seeded pseudo-random for consistent data per model (using model.id as seed)
  - Weekend dips (15% lower throughput on Sat/Sun)
  - Improvement trend (up to 8% improvement over the period - model optimizations)
  - Day-to-day correlation (30% previous + 70% target) for smooth curves
  - Latency inversely correlated with throughput + independent noise
- Created `PerformanceHistorySection` component with:
  - Time range selector (7d / 30d / 90d) as pill buttons with primary/ghost styling
  - ComposedChart with:
    - X-axis: Date (format MM/DD, interval adapts to time range)
    - Left Y-axis: Throughput (tok/s) as Area chart with emerald (#10b981) color
    - Right Y-axis: Latency P99 (ms) as dashed Line with amber (#f59e0b) color
    - CartesianGrid, Tooltip with dark mode support, Legend
  - Summary stats grid (2x2):
    - Avg Throughput with trend indicator (↑/↓ with percentage)
    - Peak Throughput
    - Avg Latency P99 with trend indicator (inverted - lower is better)
    - Lowest Latency
  - Trend calculation: compares first half vs second half of period
  - Framer-motion entrance animation (opacity 0→1, y 12→0, 0.4s delay 0.1s)
- Inserted PerformanceHistorySection into ModelDetailSheet between Performance Radar and detail rows
- Widened Sheet from sm:max-w-lg to sm:max-w-xl to better accommodate the chart
- Ran ESLint: 0 errors
- Dev server compiles successfully

## Stage Summary

- Added Performance History Trend section to ModelDetailSheet with ComposedChart (Area + Line)
- Realistic data generation with model-size-aware throughput, weekend dips, improvement trends, seeded randomness
- Time range selector (7d/30d/90d) as pill buttons
- Summary stats with trend indicators and color-coded values
- Framer-motion entrance animation
- Dark mode fully supported via CSS variables
- Sheet widened to sm:max-w-xl for better chart display
- Zero lint errors, dev server running without issues
