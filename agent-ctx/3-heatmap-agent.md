# Task ID: 3 - Parameter Sensitivity Heatmap Visualization

## Agent: full-stack-developer
## Date: 2024-01-XX

### Work Log

- Read existing `src/components/analysis/analysis-page.tsx` (1830 lines) to understand the structure: 4 existing tabs (Inflection Analysis, Correlation Heatmap, Optimization Suggestions, Sensitivity Analysis)
- Added new data constants: `SENSITIVITY_HEATMAP_PARAMS` (6 parameters: Max Num Sequences, GPU Mem Util, Max Model Length, Chunk Prefill, Block Size, Temperature) and `SENSITIVITY_HEATMAP_METRICS` (5 metrics: Throughput, Latency P99, TTFT, TPOT, Memory Usage)
- Added `generateSensitivityMatrix()` function with engine-specific sensitivity scores (VLLM vs SGLang vs Both) and realistic base values per requirements:
  - GPU Mem Util → Throughput: 85-90% (very high)
  - Max Num Sequences → Throughput: 70-75% (high)
  - Max Num Sequences → Latency: 78-80% (high)
  - Max Model Length → Memory: 82-85% (very high)
  - Chunk Prefill → TTFT: 60-65% (medium-high)
  - Block Size → most metrics: 10-22% (low)
  - Temperature → most metrics: 1-7% (very low)
- Added color functions: `getSensitivityColor()` (5-level gradient: teal/blue → green → amber → orange → red), `getSensitivityTextColor()`, `getSensitivityInterpretation()`, `getSensitivityLevel()`
- Added state: `heatmapEngine` (EngineType | 'both'), `sensitivityMatrix` (useMemo), `sensitivityHovered` state
- Added `sensitivityInsights` useMemo that finds top 3 most sensitive parameter-metric pairs
- Added new tab trigger "Sensitivity Heatmap" with Thermometer icon
- Built new TabsContent "sensitivity-heatmap" with:
  1. **Heatmap Card**: Custom grid with colored rounded cells, engine toggle (Both/VLLM/SGLang), vertical column headers, row labels, tooltip on each cell with parameter/metric/score/level/interpretation
  2. **Color Scale Legend**: Gradient bar from 0-100 with 5 level labels (Very Low through Very High)
  3. **Sensitivity Insights Card**: Top 3 most sensitive pairs as alert-style cards with Flame/AlertTriangle/Info icons, progress bars, level badges, and contextual descriptions
  4. **Engine Comparison Note Card**: Info card explaining what sensitivity scores mean and current engine context
- Added framer-motion entrance animations: fade-in + slide-up for cards, staggered row animations for heatmap, scale animations on hover
- Dark theme support: `dark:` prefix classes on engine toggle, insight cards; color functions produce valid colors for both themes
- Responsive: `overflow-x-auto` with `min-w-[640px]` for mobile horizontal scrolling
- Removed unused `useRef` import after cleanup
- Ran ESLint: 0 errors
- Dev server compiles and serves successfully

### Stage Summary

- Added "Sensitivity Heatmap" as 5th tab in the Analysis page
- Custom-built heatmap grid (NOT Recharts) using divs + Tailwind CSS
- 6 parameters × 5 metrics = 30 cells with color-coded sensitivity scores (0-100)
- Engine toggle switches between VLLM/SGLang/Both with different sensitivity data
- Rich tooltips showing parameter, metric, score, level, and interpretation
- Top 3 sensitivity insights with alert-style cards and progress bars
- Color legend with 5-level gradient and labels
- Full framer-motion animations and dark theme support
- Zero lint errors, dev server running successfully
