import { UserRole } from '@/types'

export const ROLE_PERMISSIONS = {
  super_admin: ['*'], // All permissions
  hr: [
    'view_dashboard',
    'view_distributions',
    'approve_employee_distributions',
    'view_reports',
    'view_activity_logs',
  ],
  manager: [
    'view_dashboard',
    'view_inventory',
    'view_stock_requests',
    'approve_stock_requests',
    'view_distributions',
    'approve_distributions',
    'manage_receivers',
    'view_reports',
    'view_activity_logs',
  ],
  inventory_requester: [
    'view_dashboard',
    'view_inventory',
    'create_stock_requests',
    'view_own_stock_requests',
    'create_distributions',
    'view_own_distributions',
    'view_receivers',
  ],
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  
  if (!permissions) return false
  
  // Super admin has all permissions
  if (permissions.includes('*')) return true
  
  return permissions.includes(permission)
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, string> = {
    '/dashboard': 'view_dashboard',
    '/inventory': 'view_inventory',
    '/stock-requests': 'view_stock_requests',
    '/distributions': 'view_distributions',
    '/receivers': 'view_receivers',
    '/reports': 'view_reports',
    '/activity-logs': 'view_activity_logs',
  }

  const permission = routePermissions[route]
  if (!permission) return false

  return hasPermission(userRole, permission)
}
