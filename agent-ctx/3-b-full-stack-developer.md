# Task 3-b: Add Sankey Diagram to Reports Page

## Work Summary

Added a new "Sankey" chart tab to the Reports page (`src/components/reports/reports-page.tsx`) that visualizes the flow of inference requests through different processing stages using a custom SVG Sankey diagram.

## Changes Made

### Imports Added
- `useRef` from React (for SVG ref and ResizeObserver)
- `GitBranch` from lucide-react (for tab icon)
- `motion` from framer-motion (for entrance animations)

### State Variables Added
- `sankeyEngineFilter`: 'all' | 'vllm' | 'sglang' - filters Sankey flows by engine
- `sankeyFlowType`: 'volume' | 'latency' | 'throughput' - determines flow value calculation
- `sankeyHoveredLink`: string | null - tracks which link is hovered for highlight effect

### Data Computation (after `filtered` declaration)
- `sankeyFiltered`: applies additional engine filter to `filtered` data
- `sankeyData`: computes full Sankey graph with nodes (Input/Processing/Output) and links
- `sankeySummary`: computes Total Flow Volume, Dominant Path, Processing Efficiency, Bottleneck Stage

### SankeyDiagram Component
- Custom SVG component with responsive width (ResizeObserver)
- 3-column layout: Input → Processing → Output
- Cubic bezier path links between nodes
- Hover interaction with highlight/dim
- framer-motion entrance animations
- Tooltip showing source→target, flow value, percentage, engine

### Tab Integration
- "Sankey" tab trigger added between Waterfall and Radar
- Full TabsContent with controls, summary panel, diagram, and legend

## Verification
- ESLint: 0 errors
- Dev server: compiles successfully
