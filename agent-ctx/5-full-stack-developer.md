# Task 5 - Update Benchmark Page to Use Real API Data

## Agent: full-stack-developer

## Summary
Updated the Benchmark page (`src/components/benchmark/benchmark-page.tsx`) to use real API data via hooks from `@/hooks/use-api` instead of hardcoded mock data and Zustand store.

## Key Changes

### Data Source Migration
- **Before**: Mock data (MOCK_MODELS, MOCK_PROFILES, MOCK_TASKS, MOCK_RESULTS) initialized via Zustand store
- **After**: Real API data via `useBenchmarks()`, `useResults()`, `useModels()`, `useProfiles()` hooks

### API Operations
- **Create benchmark**: `addBenchmark()` API → `editBenchmark()` to set status='running' → client-side simulation → `editBenchmark()` to set completed + `addResult()` to save result
- **Delete benchmark**: `removeBenchmark()` API
- **Duplicate benchmark**: `addBenchmark()` API with copied task data
- **Stop benchmark**: `editBenchmark()` to set status='failed'

### Type Mapping
- API returns benchmarks with nested `model`, `profile`, `results` objects
- Created `BenchmarkWithRelations` interface and `mapBenchmarkTask()` function to flatten to `BenchmarkTaskInfo`

### Simulation Mechanism
- Running benchmark simulation stays client-side (no real inference engine)
- Uses local `runningProgress` state instead of updating server every 200ms
- Uses `throughputHistoryRef` (useRef) to avoid stale closure issues in setInterval
- On completion: persists result and status via API calls

### UI Enhancements
- Loading skeleton (`TableSkeleton`) shown during data fetching
- Toast notifications (sonner) for all async operation success/error
- JSON.parse safety with try/catch for detailJson

## Lint Result
- 0 errors, 1 pre-existing warning in use-api.ts (not in benchmark code)
