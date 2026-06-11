# Task 2 - i18n System Completion

## Task ID: 2
## Agent: Main Agent

## Summary

Completed the i18n (internationalization) system so that ALL user-visible strings use the `t()` translation function.

## Changes Made

### 1. `/home/z/my-project/src/lib/i18n.ts` - Added all missing translation keys

Added the following key categories for both `en` and `zh` locales:

- **Common keys**: `common.vllm`, `common.sglang`, `common.tokensPerSec`, `common.ms`, `common.gb`, `common.tokens`, `common.unexpectedError`, `common.minutesAgo`, `common.hoursAgo`, `common.daysAgo`, `common.user`, `common.failedToLoad`, `common.running`, `common.online`, `common.degraded`, `common.offline`
- **Chat keys**: `chat.title`, `chat.subtitle`, `chat.placeholder`, `chat.disclaimer`, `chat.openAssistant`, `chat.minimize`, `chat.send`
- **Notifications keys**: `notifications.title`, `notifications.markAllRead`, `notifications.empty`, `notifications.allCaughtUp`, `notifications.viewAll`, `notifications.benchmarkCompleted`, `notifications.modelDeployed`, `notifications.analysisReady`, `notifications.systemAlert`, `notifications.benchmarkFailed`, `notifications.profileUpdated`
- **Command Palette keys**: `commandPalette.title`, `commandPalette.description`, `commandPalette.placeholder`, `commandPalette.noResults`, `commandPalette.group.recent`, `commandPalette.group.navigation`, `commandPalette.group.actions`, `commandPalette.group.models`, `commandPalette.group.settings`, `commandPalette.goTo`, `commandPalette.toggleLight`, `commandPalette.toggleDark`
- **Keyboard Shortcuts keys**: `shortcuts.title`, `shortcuts.group.navigation`, `shortcuts.group.general`, `shortcuts.group.actions`, `shortcuts.commandPalette`, `shortcuts.keyboardShortcuts`, `shortcuts.toggleTheme`, `shortcuts.newBenchmark`, `shortcuts.addModel`, `shortcuts.pressToClose`
- **Sidebar/Nav keys**: `nav.brandName`, `nav.pro`, `nav.running`, `nav.statusOnline`, `nav.statusDegraded`, `nav.statusOffline`
- **Dashboard keys**: `dashboard.latencyMean`, `dashboard.latencyP50`, `dashboard.latencyP90`, `dashboard.latencyP99`
- **Model Comparison keys**: `models.comparingModels`, `models.backToModels`, `models.multiDimComparison`, `models.specsComparison`, `models.property`, `models.performanceMetrics`, `models.throughputTrend`, `models.noBenchmarkResults`, `models.noComparisonData`, `models.runBenchmarksHint`, `models.throughputLatencyComparison`, `models.modelUpdated`, `models.modelCreated`, `models.updateFailed`, `models.createFailed`
- **Reports keys**: `reports.sankey.input`, `reports.sankey.processing`, `reports.sankey.output`, `reports.flow`
- **Analysis keys**: `analysis.inflection.optimalConcurrency`, `analysis.inflection.optimalBatchSize`, `analysis.inflection.maxSafeSeqLen`, `analysis.inflection.optimalGpuMemUtil`, `analysis.inflection.safeInputLen`, `analysis.category.performanceOptimization`, `analysis.category.resourceEfficiency`, `analysis.category.riskWarnings`, `analysis.category.tradeoffAnalysis`
- **Settings toast keys**: `settings.connectionSuccess`, `settings.connectionFailed`, `settings.dataExported`, `settings.dataExportFailed`, `settings.dataImported`, `settings.invalidImportFile`, `settings.importParseFailed`, `settings.resultsCleared`, `settings.clearResultsFailed`, `settings.settingsReset`

### 2. Component Updates

- **`settings-page.tsx`**: Already had `useI18n`. Replaced ALL hardcoded English strings with `t()` calls including: card titles, descriptions, labels, descriptions, button text, alert dialog titles/descriptions/actions, toast messages. Fixed dependency arrays in `useCallback` hooks to include `t`.

- **`ai-chat-widget.tsx`**: Added `useI18n` import and `const { t } = useI18n()`. Replaced: "AI Assistant" → `t('chat.title')`, "InferBench Optimization Expert" → `t('chat.subtitle')`, "Ask about optimization..." → `t('chat.placeholder')`, "Open AI Assistant" aria-label → `t('chat.openAssistant')`, "Minimize chat" aria-label → `t('chat.minimize')`, "Send message" aria-label → `t('chat.send')`, disclaimer text → `t('chat.disclaimer')`.

- **`notification-center.tsx`**: Added `useI18n` import. Replaced: "Notifications" → `t('notifications.title')`, "Mark all read" → `t('notifications.markAllRead')`, "No notifications" → `t('notifications.empty')`, "You're all caught up!" → `t('notifications.allCaughtUp')`, "View all notifications" → `t('notifications.viewAll')`. Added `getNotificationTitle()` function using i18n keys. Updated `formatRelativeTime()` to use `t()` for time-ago strings.

- **`command-palette.tsx`**: Added `useI18n` import. Replaced: "Command Palette" → `t('commandPalette.title')`, description → `t('commandPalette.description')`, placeholder → `t('commandPalette.placeholder')`, "No results found." → `t('commandPalette.noResults')`, group headings → `t('commandPalette.group.*')`, navigation labels → `t('nav.*')`, action labels → `t()` calls, theme toggle label → `t('commandPalette.toggleLight/Dark')`, model engine labels → `t('common.vllm/sglang')`.

- **`keyboard-shortcuts-help.tsx`**: Added `useI18n` import. Converted static `SHORTCUT_GROUPS` to use i18n keys (`titleKey`, `descriptionKey`) instead of hardcoded strings. Replaced: "Keyboard Shortcuts" → `t('shortcuts.title')`, group titles → `t('shortcuts.group.*')`, description texts → `t()` calls with key references, "Close" aria-label → `t('common.close')`, footer text → `t('shortcuts.pressToClose')`.

- **`model-comparison.tsx`**: Added `useI18n` import. Replaced: "VLLM"/"SGLang" in EngineBadge → `t('common.vllm')`/`t('common.sglang')`, "Select models to compare" → `t('models.selectModels')`, "Back to Models" → `t('models.backToModels')`, "Model Comparison" → `t('models.compareModels')`, "Comparing N models" → `t('models.comparingModels', { count })`, section titles, table headers, metric labels, unit labels, empty state messages all use `t()`.

- **`app-sidebar.tsx`**: Already had `useI18n`. Replaced remaining hardcoded strings: "InferBench" → `t('nav.brandName')`, "Pro" → `t('nav.pro')`, "Inference Engine Platform" → `t('nav.inferenceEnginePlatform')`, "running" → `t('nav.running')` in RunningBadge, "Online"/"Degraded"/"Offline" → `t('nav.statusOnline/Degraded/Offline')` in SystemStatusIndicator. Updated component signatures to accept `t` parameter.

## Lint Status
✅ All lint errors resolved. `bun run lint` passes with zero errors.
