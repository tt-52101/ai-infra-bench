# Task 2: Update Dashboard to Use Real API Data

## Work Summary
Updated the Dashboard page (`src/components/dashboard/dashboard-page.tsx`) to use real API data from backend hooks instead of hardcoded mock data.

## Changes Made

### File: `src/components/dashboard/dashboard-page.tsx`
Complete rewrite to integrate API hooks:

1. **Added imports**: `useMemo` from React, `useDashboardStats`, `useModels`, `useBenchmarks`, `useResults` from hooks
2. **Removed unused imports**: `Activity`, `AlertTriangle` (lucide), `LineChart`, `Line`, `Legend` (recharts), `CardAction` (card)
3. **Extended types**: `BenchmarkWithModel` and `ResultWithTask` interfaces for API responses with included relations
4. **Stats cards**: Computed from `useDashboardStats()` — Total Models, Active Benchmarks, Avg Throughput from API; Avg Latency P99 computed from results
5. **Throughput chart**: `useMemo` from `useResults()` data, grouped by date and engine
6. **Engine distribution**: `useMemo` from `useModels()` data, counting vllm vs sglang models
7. **Latency distribution**: `useMemo` from `useResults()` data, avg Mean/P50/P90/P99 per engine
8. **Recent results table**: `useMemo` from `useBenchmarks()` data with model info and results
9. **Loading states**: `SkeletonCard` and `SkeletonChart` components with animate-pulse
10. **Empty states**: Helpful messages when no data is available
11. **Helper functions**: `formatNumber`, `formatDate`, `formatScenario`, `getResultEngine`
12. **Preserved**: System Health and Recent Activity sections unchanged, same visual design and animations

## Verification
- Database seeded with 5 models, 4 profiles, 5 benchmarks, 4 results, 5 analyses
- All API endpoints verified returning correct data
- ESLint: 0 errors (1 pre-existing warning in use-api.ts, not in dashboard code)
- Dev server compiles and serves successfully
