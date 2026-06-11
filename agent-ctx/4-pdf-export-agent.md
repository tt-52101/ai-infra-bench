# Task 4: Add PDF Report Export to the Reports Page

## Work Completed

### Files Created
1. **`src/lib/generate-report-html.ts`** - HTML report generation utility
   - TypeScript interfaces for report data (ReportData, ReportSummary, ReportComparison, etc.)
   - `generateReportHTML()` - Produces complete standalone HTML document for print/PDF
   - `fetchReportData()` - Fetches report data from `/api/reports/export` API
   - `openReportPrintWindow()` - Opens generated HTML in new browser tab
   - Professional styling: cover page, summary cards, grade distribution, VLLM vs SGLang comparison, detailed results table
   - Print-ready CSS with @media print, page-break hints, fixed action bar

### Files Modified
2. **`src/components/reports/reports-page.tsx`**
   - Added `FileDown` icon import from lucide-react
   - Added import of `generateReportHTML`, `fetchReportData`, `openReportPrintWindow`
   - Added `exportAsPDF()` async function with loading toast, error handling, popup blocked detection
   - Added "Export PDF" as first option in Export dropdown menu with FileDown icon

### Technical Approach
- Browser print dialog (window.print()) approach instead of server-side Python/PDF generation
- Data fetched from existing `/api/reports/export` POST endpoint with current filter state
- Print action bar with "Save as PDF" button auto-hides during print via CSS

### Verification
- ESLint: 0 errors
- Dev server compiles successfully
- `/api/reports/export` endpoint verified returning 200
