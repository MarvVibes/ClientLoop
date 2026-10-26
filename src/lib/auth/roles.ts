// ====================================================================
// CLIENTLOOP ROLE-BASED ACCESS CONTROL (RBAC)
// ====================================================================

import { WorkspaceRole } from '../types/database'

export interface RolePermissions {
  canManageWorkspace: boolean
  canManageStaff: boolean
  canConfigureServices: boolean
  canConfigureReviewUrl: boolean
  canExportData: boolean
  canViewExecutiveAnalytics: boolean
  canRecordVisits: boolean
  canSendMessages: boolean
  canViewCustomerDirectory: boolean
  canManageOptOuts: boolean
}

export const ROLE_PERMISSIONS: Record<WorkspaceRole, RolePermissions> = {
  owner: {
    canManageWorkspace: true,
    canManageStaff: true,
    canConfigureServices: true,
    canConfigureReviewUrl: true,
    canExportData: true,
    canViewExecutiveAnalytics: true,
    canRecordVisits: true,
    canSendMessages: true,
    canViewCustomerDirectory: true,
    canManageOptOuts: true,
  },
  manager: {
    canManageWorkspace: false,
    canManageStaff: true,
    canConfigureServices: true,
    canConfigureReviewUrl: true,
    canExportData: true,
    canViewExecutiveAnalytics: true,
    canRecordVisits: true,
    canSendMessages: true,
    canViewCustomerDirectory: true,
    canManageOptOuts: true,
  },
  staff: {
    canManageWorkspace: false,
    canManageStaff: false,
    canConfigureServices: false,
    canConfigureReviewUrl: false,
    canExportData: false,
    canViewExecutiveAnalytics: false,
    canRecordVisits: true,
    canSendMessages: true,
    canViewCustomerDirectory: true,
    canManageOptOuts: true, // Staff can mark a customer as opted-out on request
  },
}

export function hasPermission(
  role: WorkspaceRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false
}
