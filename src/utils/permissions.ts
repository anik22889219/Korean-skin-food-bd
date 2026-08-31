import { UserRole } from '../types';

export type Permission =
  | 'VIEW_ADMIN_DASHBOARD'
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE'
  | 'VIEW_DUES'
  | 'MANAGE_DUES'
  | 'VIEW_REPORTS'
  | 'MANAGE_CREATORS'
  | 'MANAGE_USERS'
  | 'MANAGE_ORDERS'
  | 'USE_POS'
  | 'VIEW_POS_MONITOR'
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_INVENTORY'
  | 'MANAGE_SEO'
  | 'MANAGE_MARKETING'
  | 'VIEW_LEADS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_AI_AGENTS'
  | 'MANAGE_SLACK';

// Explicit mapping of 7 roles to their allowed permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'VIEW_DUES',
    'MANAGE_DUES',
    'VIEW_REPORTS',
    'MANAGE_CREATORS',
    'MANAGE_USERS',
    'MANAGE_ORDERS',
    'USE_POS',
    'VIEW_POS_MONITOR',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'MANAGE_SEO',
    'MANAGE_MARKETING',
    'VIEW_LEADS',
    'MANAGE_SETTINGS',
    'MANAGE_AI_AGENTS',
    'MANAGE_SLACK'
  ],
  admin: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'VIEW_DUES',
    'MANAGE_DUES',
    'VIEW_REPORTS',
    'MANAGE_CREATORS',
    'MANAGE_ORDERS',
    'USE_POS',
    'VIEW_POS_MONITOR',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'MANAGE_SEO',
    'MANAGE_MARKETING',
    'VIEW_LEADS',
    'MANAGE_SETTINGS',
    'MANAGE_AI_AGENTS'
  ],
  inventory_manager: [
    'VIEW_ADMIN_DASHBOARD',
    'MANAGE_ORDERS',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'USE_POS',
    'VIEW_POS_MONITOR',
    'VIEW_REPORTS'
  ],
  customer_support: [
    'VIEW_LEADS',
    'MANAGE_ORDERS'
  ],
  hr: [],
  creator: [],
  wholesale_customer: [],
  customer: []
};

// Route path to required permission mapping
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/admin': 'VIEW_ADMIN_DASHBOARD',
  '/admin/business-finance': 'VIEW_FINANCE',
  '/admin/finance': 'VIEW_FINANCE',
  '/admin/payments-due': 'VIEW_DUES',
  '/admin/dues': 'VIEW_DUES',
  '/admin/reports': 'VIEW_REPORTS',
  '/admin/creators': 'MANAGE_CREATORS',
  '/admin/users': 'MANAGE_USERS',
  '/admin/orders': 'MANAGE_ORDERS',
  '/admin/theme-editor': 'MANAGE_SETTINGS',
  '/admin/pos': 'USE_POS',
  '/admin/products': 'MANAGE_PRODUCTS',
  '/admin/seo': 'MANAGE_SEO',
  '/admin/social': 'MANAGE_MARKETING',
  '/admin/chat-leads': 'VIEW_LEADS',
  '/admin/slack': 'MANAGE_SLACK',
  '/admin/ai-agents': 'MANAGE_AI_AGENTS'
};

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Checks if a user role can access a specific admin path
 */
export function canAccessAdminRoute(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) return false;
  
  // Normalize path
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const requiredPermission = ROUTE_PERMISSION_MAP[cleanPath];

  if (!requiredPermission) {
    // If exact path not found, check if it starts with /admin
    if (cleanPath.startsWith('/admin')) {
      return hasPermission(role, 'VIEW_ADMIN_DASHBOARD');
    }
    return false;
  }

  return hasPermission(role, requiredPermission);
}

/**
 * Checks if a user has any administrative or staff access
 */
export function isStaffRole(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === 'super_admin' || role === 'admin' || role === 'inventory_manager' || role === 'customer_support';
}
