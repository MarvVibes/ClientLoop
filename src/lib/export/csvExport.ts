// ====================================================================
// CLIENTLOOP ROLE-PROTECTED, FORMULA-INJECTION-SAFE CSV EXPORT SERVICE
// Mitigates CWE-1236 (CSV Injection) & Enforces Workspace RBAC
// ====================================================================

import { store } from '../services/store'
import { WorkspaceRole } from '../types/database'
import { hasPermission } from '../auth/roles'

/**
 * Escapes a cell value against CSV formula injection (DDE injection).
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', prefix with single quote "'".
 * Encloses strings with commas, quotes, or newlines in standard RFC 4180 quotes.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  let str = String(value)

  // Formula injection dangerous prefix characters
  const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r']
  if (DANGEROUS_PREFIXES.some(prefix => str.startsWith(prefix))) {
    str = `'${str}`
  }

  // RFC 4180 escaping: if contains comma, quote, or newline, escape quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Converts a 2D array of cells into a valid CSV string with UTF-8 BOM
 */
export function buildCsvString(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(',')
  const rowLines = rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(','))
  
  // UTF-8 BOM (\uFEFF) ensures Excel properly decodes Unicode characters (e.g. Nigerian names, Naira symbols)
  return `\uFEFF${[headerLine, ...rowLines].join('\r\n')}`
}

/**
 * Exports tenant customers list to CSV with role verification
 */
export function exportCustomersCsv(businessId: string, role: WorkspaceRole): { filename: string; csv: string } {
  if (!hasPermission(role, 'canExportData')) {
    throw new Error('UNAUTHORIZED_EXPORT: Role does not have permission to export customer data')
  }

  const business = store.getBusinessById(businessId)
  const customers = store.getCustomersByBusiness(businessId)
  const visits = store.getVisitsByBusiness(businessId)

  const headers = [
    'Customer ID',
    'Full Name',
    'Normalized Phone (E.164)',
    'Country Code',
    'Consent Status',
    'First Discovery Source',
    'Total Recorded Visits',
    'First Seen Date',
    'Last Seen Date',
    'Notes'
  ]

  const rows = customers.map(c => {
    const custVisits = visits.filter(v => v.customer_id === c.id)
    return [
      c.id,
      c.name || 'Unnamed Guest',
      c.normalized_phone,
      c.country_code,
      c.consent_status,
      c.first_discovery_source || 'Unknown',
      custVisits.length,
      c.first_seen_at ? new Date(c.first_seen_at).toISOString().split('T')[0] : '',
      c.last_seen_at ? new Date(c.last_seen_at).toISOString().split('T')[0] : '',
      c.notes || ''
    ]
  })

  // Audit log export event
  store.recordAuditEvent(businessId, `user_${role}`, 'export_customers_csv', 'customers', {
    rowCount: customers.length,
    role
  })

  const slug = business?.slug || businessId
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${slug}_customers_${dateStr}.csv`

  return { filename, csv: buildCsvString(headers, rows) }
}

/**
 * Exports tenant visits ledger to CSV with role verification
 */
export function exportVisitsCsv(
  businessId: string, 
  role: WorkspaceRole,
  dateRange?: { startDate: string; endDate: string }
): { filename: string; csv: string } {
  if (!hasPermission(role, 'canExportData')) {
    throw new Error('UNAUTHORIZED_EXPORT: Role does not have permission to export visit ledger')
  }

  const business = store.getBusinessById(businessId)
  let visits = store.getVisitsByBusiness(businessId)
  const customers = store.getCustomersByBusiness(businessId)

  if (dateRange) {
    const start = new Date(dateRange.startDate).getTime()
    const end = new Date(dateRange.endDate).getTime()
    visits = visits.filter(v => {
      const t = new Date(v.visit_timestamp || v.created_at).getTime()
      return t >= start && t <= end
    })
  }

  const headers = [
    'Visit ID',
    'Visit Date',
    'Customer Name',
    'Customer Phone',
    'Service Rendered',
    'Questionnaire Status',
    'Visit Status'
  ]

  const rows = visits.map(v => {
    const customer = customers.find(c => c.id === v.customer_id)
    return [
      v.id,
      v.visit_timestamp ? new Date(v.visit_timestamp).toISOString() : new Date(v.created_at).toISOString(),
      customer?.name || 'Unnamed Guest',
      customer?.normalized_phone || '',
      v.service,
      v.questionnaire_status,
      v.status
    ]
  })

  // Audit log export event
  store.recordAuditEvent(businessId, `user_${role}`, 'export_visits_csv', 'visits', {
    rowCount: visits.length,
    role
  })

  const slug = business?.slug || businessId
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${slug}_visits_${dateStr}.csv`

  return { filename, csv: buildCsvString(headers, rows) }
}

/**
 * Browser-friendly CSV trigger for instant file download
 */
export function triggerCsvDownload(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
