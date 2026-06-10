import type { EngineType, BenchmarkScenario } from '@/lib/types'

// ─── Report Data Types ─────────────────────────────────────────────
export interface ReportResultEntry {
  model: string
  engine: string
  scenario: string
  throughput: number
  latency: number
  ttft: number
  tpot: number
  grade: string
}

export interface ReportSummary {
  totalTests: number
  avgThroughput: number
  avgLatency: number
  bestThroughput: number
  bestLatency: number
  gradeDistribution: Record<string, number>
}

export interface ReportComparison {
  vllm: { avgThroughput: number; avgLatency: number; count: number }
  sglang: { avgThroughput: number; avgLatency: number; count: number }
}

export interface ReportFilters {
  model: string
  engine: string
  scenario: string
}

export interface ReportData {
  summary: ReportSummary
  results: ReportResultEntry[]
  comparison: ReportComparison
  generatedAt: string
  filters: ReportFilters
}

// ─── Color Helpers ──────────────────────────────────────────────────
function gradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return '#059669'
    case 'A': return '#10b981'
    case 'B': return '#0ea5e9'
    case 'C': return '#f59e0b'
    case 'D': return '#f97316'
    case 'F': return '#ef4444'
    default: return '#6b7280'
  }
}

function gradeBgColor(grade: string): string {
  switch (grade) {
    case 'A+': return '#d1fae5'
    case 'A': return '#ecfdf5'
    case 'B': return '#f0f9ff'
    case 'C': return '#fffbeb'
    case 'D': return '#fff7ed'
    case 'F': return '#fef2f2'
    default: return '#f9fafb'
  }
}

function formatScenario(scenario: string): string {
  return scenario.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatNumber(n: number, decimals = 1): string {
  if (n === 0 || !isFinite(n)) return 'N/A'
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

// ─── HTML Generator ─────────────────────────────────────────────────
export function generateReportHTML(data: ReportData): string {
  const { summary, results, comparison, generatedAt, filters } = data
  const generatedDate = new Date(generatedAt).toLocaleString()

  // Filter labels
  const filterLabels: string[] = []
  if (filters.model && filters.model !== 'all') filterLabels.push(`Model: ${filters.model}`)
  if (filters.engine && filters.engine !== 'all') filterLabels.push(`Engine: ${filters.engine === 'vllm' ? 'VLLM' : 'SGLang'}`)
  if (filters.scenario && filters.scenario !== 'all') filterLabels.push(`Scenario: ${formatScenario(filters.scenario)}`)

  // Grade distribution rows
  const gradeEntries = ['A+', 'A', 'B', 'C', 'D', 'F'] as const
  const gradeRows = gradeEntries.map((g) => {
    const count = summary.gradeDistribution[g] || 0
    const pct = summary.totalTests > 0 ? ((count / summary.totalTests) * 100).toFixed(1) : '0.0'
    return `
      <tr>
        <td style="text-align:center;">
          <span style="display:inline-block;padding:2px 12px;border-radius:4px;font-weight:700;color:${gradeColor(g)};background:${gradeBgColor(g)};font-size:13px;">${g}</span>
        </td>
        <td style="text-align:center;font-variant-numeric:tabular-nums;">${count}</td>
        <td style="text-align:center;font-variant-numeric:tabular-nums;">${pct}%</td>
      </tr>`
  }).join('')

  // Detailed results rows
  const resultRows = results.map((r, i) => {
    const engineLabel = r.engine === 'vllm' ? 'VLLM' : 'SGLang'
    const engineColor = r.engine === 'vllm' ? '#10b981' : '#f59e0b'
    const bgRow = i % 2 === 0 ? '#ffffff' : '#f9fafb'
    return `
      <tr style="background:${bgRow};">
        <td style="padding:8px 12px;font-weight:500;font-size:13px;">${r.model}</td>
        <td style="padding:8px 12px;">
          <span style="display:inline-block;padding:1px 8px;border-radius:3px;font-size:11px;font-weight:600;color:${engineColor};border:1px solid ${engineColor};">${engineLabel}</span>
        </td>
        <td style="padding:8px 12px;font-size:13px;">${formatScenario(r.scenario)}</td>
        <td style="padding:8px 12px;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;">${formatNumber(r.throughput, 0)}</td>
        <td style="padding:8px 12px;font-variant-numeric:tabular-nums;font-size:13px;">${formatNumber(r.latency)}</td>
        <td style="padding:8px 12px;font-variant-numeric:tabular-nums;font-size:13px;">${formatNumber(r.ttft)}</td>
        <td style="padding:8px 12px;font-variant-numeric:tabular-nums;font-size:13px;">${formatNumber(r.tpot)}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="display:inline-block;padding:2px 10px;border-radius:4px;font-weight:700;color:${gradeColor(r.grade)};background:${gradeBgColor(r.grade)};font-size:12px;">${r.grade}</span>
        </td>
      </tr>`
  }).join('')

  // Comparison section
  const vllmCount = comparison.vllm.count
  const sglangCount = comparison.sglang.count
  const comparisonRows = [
    { label: 'Average Throughput', vllm: comparison.vllm.avgThroughput, sglang: comparison.sglang.avgThroughput, unit: 'tok/s', higher: true },
    { label: 'Average Latency P99', vllm: comparison.vllm.avgLatency, sglang: comparison.sglang.avgLatency, unit: 'ms', higher: false },
    { label: 'Result Count', vllm: vllmCount, sglang: sglangCount, unit: '', higher: true },
  ].map((m) => {
    const vllmWins = m.higher ? m.vllm > m.sglang : m.vllm < m.sglang
    const sglangWins = m.higher ? m.sglang > m.vllm : m.sglang < m.vllm
    const vllmVal = typeof m.vllm === 'number' && m.vllm > 0 ? formatNumber(m.vllm, m.unit === '' ? 0 : 1) : 'N/A'
    const sglangVal = typeof m.sglang === 'number' && m.sglang > 0 ? formatNumber(m.sglang, m.unit === '' ? 0 : 1) : 'N/A'
    return `
      <tr>
        <td style="padding:8px 14px;font-size:13px;font-weight:500;">${m.label}</td>
        <td style="padding:8px 14px;text-align:center;font-variant-numeric:tabular-nums;font-size:13px;${vllmWins ? 'color:#059669;font-weight:700;' : ''}">${vllmVal}${m.unit ? ' ' + m.unit : ''}</td>
        <td style="padding:8px 14px;text-align:center;font-variant-numeric:tabular-nums;font-size:13px;${sglangWins ? 'color:#d97706;font-weight:700;' : ''}">${sglangVal}${m.unit ? ' ' + m.unit : ''}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InferBench Performance Report</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 18mm 25mm 18mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      line-height: 1.6;
      font-size: 14px;
    }

    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* ─── Cover Page ──────────────────────────────────────── */
    .cover {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }

    .cover-logo {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .cover-logo svg {
      width: 36px;
      height: 36px;
      fill: #ffffff;
    }

    .cover h1 {
      font-size: 36px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .cover h2 {
      font-size: 18px;
      font-weight: 400;
      color: #6b7280;
      margin-bottom: 40px;
    }

    .cover-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      color: #4b5563;
    }

    .cover-meta span {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cover-meta .label {
      font-weight: 600;
      color: #374151;
      min-width: 100px;
      text-align: right;
    }

    .cover-divider {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #10b981, #f59e0b);
      border-radius: 2px;
      margin: 32px auto;
    }

    .cover-footer {
      position: absolute;
      bottom: 40px;
      font-size: 12px;
      color: #9ca3af;
    }

    /* ─── Section Headers ─────────────────────────────────── */
    .section {
      page-break-inside: avoid;
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title .icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    /* ─── Summary Cards ───────────────────────────────────── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }

    .summary-card .value {
      font-size: 28px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }

    .summary-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      font-weight: 500;
    }

    .summary-card .unit {
      font-size: 13px;
      font-weight: 400;
      color: #9ca3af;
    }

    /* ─── Tables ──────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      font-size: 13px;
    }

    thead th {
      background: #f3f4f6;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }

    tbody td {
      padding: 8px 14px;
      border-bottom: 1px solid #f3f4f6;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    /* ─── Comparison Section ──────────────────────────────── */
    .comparison-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0;
      align-items: center;
      margin-bottom: 16px;
    }

    .comparison-engine {
      text-align: center;
      padding: 12px;
      border-radius: 8px;
    }

    .comparison-engine.vllm {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }

    .comparison-engine.sglang {
      background: #fffbeb;
      border: 1px solid #fde68a;
    }

    .comparison-engine .name {
      font-weight: 700;
      font-size: 16px;
    }

    .comparison-vs {
      padding: 0 16px;
      font-weight: 700;
      color: #9ca3af;
      font-size: 14px;
    }

    /* ─── Footer ──────────────────────────────────────────── */
    .report-footer {
      text-align: center;
      padding: 16px 0;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      margin-top: 40px;
    }

    /* ─── Print Styles ────────────────────────────────────── */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .no-print {
        display: none !important;
      }

      .section {
        page-break-inside: avoid;
      }

      .cover {
        page-break-after: always;
        min-height: auto;
        padding: 60mm 0 40mm;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
      }

      thead {
        display: table-header-group;
      }
    }

    /* ─── Print Button ────────────────────────────────────── */
    .print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1f2937;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .print-bar button {
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
    }

    .print-bar .btn-print {
      background: #10b981;
      color: #ffffff;
    }

    .print-bar .btn-print:hover {
      background: #059669;
    }

    .print-bar .btn-close {
      background: #4b5563;
      color: #ffffff;
    }

    .print-bar .btn-close:hover {
      background: #374151;
    }

    .print-bar .info {
      font-size: 13px;
      color: #d1d5db;
    }

    /* Push content below the fixed bar */
    .page {
      padding-top: 60px;
    }

    @media print {
      .print-bar {
        display: none !important;
      }
      .page {
        padding-top: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Print Action Bar (hidden when printing) -->
  <div class="print-bar no-print">
    <span class="info">InferBench Performance Report</span>
    <div>
      <button class="btn-print" onclick="window.print()">Save as PDF</button>
      <button class="btn-close" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="page">
    <!-- ─── Cover Page ──────────────────────────────────────── -->
    <div class="cover">
      <div class="cover-logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z"/></svg>
      </div>
      <h1>InferBench</h1>
      <h2>Performance Report</h2>
      <div class="cover-divider"></div>
      <div class="cover-meta">
        <span><span class="label">Generated:</span> ${generatedDate}</span>
        <span><span class="label">Total Tests:</span> ${summary.totalTests}</span>
        ${filterLabels.length > 0 ? `<span><span class="label">Filters:</span> ${filterLabels.join(' · ')}</span>` : '<span><span class="label">Filters:</span> None (all data)</span>'}
      </div>
      <div class="cover-footer">Generated by InferBench Platform</div>
    </div>

    <!-- ─── Summary Section ─────────────────────────────────── -->
    <div class="section">
      <div class="section-title">
        <div class="icon" style="background:#ecfdf5;color:#059669;">&#x1F4CA;</div>
        Key Metrics Summary
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value" style="color:#059669;">${formatNumber(summary.bestThroughput, 0)}</div>
          <div class="label">Best Throughput <span class="unit">tok/s</span></div>
        </div>
        <div class="summary-card">
          <div class="value" style="color:#d97706;">${formatNumber(summary.bestLatency)}</div>
          <div class="label">Best Latency P99 <span class="unit">ms</span></div>
        </div>
        <div class="summary-card">
          <div class="value" style="color:#2563eb;">${summary.totalTests}</div>
          <div class="label">Total Tests</div>
        </div>
        <div class="summary-card">
          <div class="value" style="color:#7c3aed;">${formatNumber(summary.avgThroughput, 0)}</div>
          <div class="label">Avg Throughput <span class="unit">tok/s</span></div>
        </div>
      </div>
    </div>

    <!-- ─── Grade Distribution ──────────────────────────────── -->
    <div class="section">
      <div class="section-title">
        <div class="icon" style="background:#fffbeb;color:#d97706;">&#x1F3C6;</div>
        Grade Distribution
      </div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
        Performance grades weighted: Throughput 30%, Latency 25%, TTFT 20%, TPOT 15%, Reliability 10%
      </p>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;width:120px;">Grade</th>
            <th style="text-align:center;">Count</th>
            <th style="text-align:center;">Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${gradeRows}
        </tbody>
      </table>
    </div>

    <!-- ─── VLLM vs SGLang Comparison ──────────────────────── -->
    ${comparison.vllm.count > 0 || comparison.sglang.count > 0 ? `
    <div class="section">
      <div class="section-title">
        <div class="icon" style="background:#f0f9ff;color:#0284c7;">&#x2696;</div>
        VLLM vs SGLang Comparison
      </div>
      <div class="comparison-header">
        <div class="comparison-engine vllm">
          <div class="name" style="color:#059669;">VLLM</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${vllmCount} results</div>
        </div>
        <div class="comparison-vs">vs</div>
        <div class="comparison-engine sglang">
          <div class="name" style="color:#d97706;">SGLang</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${sglangCount} results</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th style="text-align:center;color:#059669;">VLLM</th>
            <th style="text-align:center;color:#d97706;">SGLang</th>
          </tr>
        </thead>
        <tbody>
          ${comparisonRows}
        </tbody>
      </table>
    </div>` : ''}

    <!-- ─── Detailed Results ─────────────────────────────────── -->
    <div class="section">
      <div class="section-title">
        <div class="icon" style="background:#faf5ff;color:#7c3aed;">&#x1F4CB;</div>
        Detailed Benchmark Results
      </div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
        ${results.length} benchmark results${filterLabels.length > 0 ? ` (filtered by ${filterLabels.join(', ')})` : ''}
      </p>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Engine</th>
            <th>Scenario</th>
            <th style="text-align:right;">Throughput (tok/s)</th>
            <th style="text-align:right;">Latency P99 (ms)</th>
            <th style="text-align:right;">TTFT (ms)</th>
            <th style="text-align:right;">TPOT (ms)</th>
            <th style="text-align:center;">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${resultRows}
        </tbody>
      </table>
    </div>

    <!-- ─── Footer ──────────────────────────────────────────── -->
    <div class="report-footer">
      Generated by InferBench Platform &mdash; ${generatedDate}
    </div>
  </div>
</body>
</html>`

  return html
}

// ─── API Data Fetching ──────────────────────────────────────────────
export async function fetchReportData(filters: {
  model: string
  engine: string
  scenario: string
}): Promise<ReportData> {
  const params = new URLSearchParams()
  if (filters.model && filters.model !== 'all') params.set('model', filters.model)
  if (filters.engine && filters.engine !== 'all') params.set('engine', filters.engine)
  if (filters.scenario && filters.scenario !== 'all') params.set('scenario', filters.scenario)

  const response = await fetch('/api/reports/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId: filters.model !== 'all' ? filters.model : undefined,
      engine: filters.engine !== 'all' ? filters.engine : undefined,
      scenario: filters.scenario !== 'all' ? filters.scenario : undefined,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch report data')
  }

  const json = await response.json()
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch report data')
  }

  return json.data as ReportData
}

// ─── Open Print Window ──────────────────────────────────────────────
export function openReportPrintWindow(html: string): Window | null {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return null
  }
  printWindow.document.write(html)
  printWindow.document.close()
  return printWindow
}
