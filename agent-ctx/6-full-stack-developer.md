# Task 6: Update Reports page to use real API data

## Task Summary
Updated the Reports page (`src/components/reports/reports-page.tsx`) to use real API data instead of mock data.

## Key Changes
1. **Removed mock data**: Deleted `MOCK_RESULTS` (14 entries), `MODELS` hardcoded list, and `MockResult` interface
2. **Added API hooks**: `useResults()`, `useBenchmarks()`, `useModels()` from `@/hooks/use-api`
3. **Defined extended types**: `BenchmarkWithRelations`, `ResultWithTask`, `ReportResult` for mapping API data
4. **Field mappings**: `timeToFirstTokenMs→ttftMs`, `timePerOutputTokenMs→tpotMs`, `gpuMemoryUsedGb→gpuMemGb`, `gpuUtilization→gpuUtil`, `cpuUtilization→cpuUtil`
5. **Data joining**: Built taskMap from benchmarks data, used to enrich results with model name, engine, scenario, concurrency
6. **Loading/error/empty states**: Added skeleton components, error banner, empty data message
7. **Filter dropdowns**: Model filter now uses names from API data
8. **Export functions**: Added guard for empty data
9. **Cleanup**: Removed unused imports (TrendingDown, Zap, ArrowDown, Cpu, HardDrive, Line, ReferenceLine, Separator, VLLM_COLOR_LIGHT, SGLANG_COLOR_LIGHT)

## Verification
- ESLint: 0 errors (1 pre-existing warning in use-api.ts)
- Dev server compiles successfully
- API endpoints returning 200 status
