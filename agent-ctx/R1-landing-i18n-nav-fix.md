# Task R1: Landing Page i18n & Navigation Fix

## Summary
Fixed hardcoded English strings and connected buttons to actual navigation in the landing page component.

## Changes Made

### 1. `/home/z/my-project/src/lib/i18n.ts`
Added 16 new i18n keys to both `en` and `zh` sections:
- `landing.hero.githubStars`, `landing.hero.activeUsers`, `landing.hero.benchmarksRun`, `landing.hero.modelsSupported`
- `landing.perf.latencyTrend`, `landing.perf.latencyVsConcurrency`
- `landing.inflection.throughputVsConcurrency`, `landing.inflection.concurrencyLevel`
- `landing.tuning.maxModelLenDesc`, `landing.tuning.gpuMemoryUtilDesc`, `landing.tuning.tensorParallelDesc`, `landing.tuning.maxNumSeqsDesc`, `landing.tuning.maxNumBatchedTokensDesc`, `landing.tuning.enablePrefixCachingDesc`, `landing.tuning.enableChunkedPrefillDesc`, `landing.tuning.swapSpaceDesc`

### 2. `/home/z/my-project/src/components/landing/landing-page.tsx`
- **Import**: Added `import { useAppStore } from '@/lib/store'`
- **Store hook**: Added `const { setActivePage } = useAppStore()` inside `LandingPage`
- **Moved `tuningParams` inside component**: Now uses `t()` for all descriptions
- **Moved `resourceData` inside component**: Now uses `t()` directly for labels
- **Resource render**: Changed `t(item.label)` → `item.label` (already translated)
- **Hardcoded → i18n**:
  - `"Open Source · Apache-2.0"` → `{t('landing.footer.openSource')} · Apache-2.0`
  - Stats labels: `'GitHub Stars'` etc. → `t('landing.hero.githubStars')` etc.
  - vLLM tech badges → `t('landing.architecture.pagedAttention')` etc.
  - SGLang tech badges → `t('landing.architecture.radixAttention')` etc.
  - `"Latency Trend"` → `{t('landing.perf.latencyTrend')}`
  - `"Latency vs Concurrency Level"` → `{t('landing.perf.latencyVsConcurrency')}`
  - `"Throughput vs Concurrency"` → `{t('landing.inflection.throughputVsConcurrency')}`
  - `"concurrency level"` → `{t('landing.inflection.concurrencyLevel')}`
- **Button navigation**:
  - "Get Started" → `onClick={() => setActivePage('dashboard')}`
  - "View Demo" → `onClick={() => setActivePage('benchmark')}`
  - "Apply & Run" → `onClick={() => setActivePage('parameters')}`

## Lint: Passed ✅
## Dev Server: Compiled successfully ✅
