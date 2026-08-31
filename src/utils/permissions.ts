import { UserRole } from '../types';

export type Permission =
  | 'VIEW_ADMIN_DASHBOARD'
  | 'VIEW_ORDERS'
  | 'MANAGE_ORDERS'
  | 'USE_POS'
  | 'VIEW_POS_HISTORY'
  | 'MANAGE_PRODUCTS'
  | 'REGISTER_PRODUCT'
  | 'MANAGE_INVENTORY'
  | 'VIEW_INVENTORY_VALUATION'
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE'
  | 'VIEW_DUES'
  | 'MANAGE_DUES'
  | 'VIEW_REPORTS'
  | 'MANAGE_CREATORS'
  | 'VIEW_USERS'
  | 'MANAGE_USERS'
  | 'VIEW_LEADS'
  | 'MANAGE_AI_AGENTS'
  | 'MANAGE_SEO'
  | 'MANAGE_MARKETING'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_SLACK';

// Explicit mapping of 7 roles to their allowed permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_ORDERS',
    'MANAGE_ORDERS',
    'USE_POS',
    'VIEW_POS_HISTORY',
    'MANAGE_PRODUCTS',
    'REGISTER_PRODUCT',
    'MANAGE_INVENTORY',
    'VIEW_INVENTORY_VALUATION',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'VIEW_DUES',
    'MANAGE_DUES',
    'VIEW_REPORTS',
    'MANAGE_CREATORS',
    'VIEW_USERS',
    'MANAGE_USERS',
    'VIEW_LEADS',
    'MANAGE_AI_AGENTS',
    'MANAGE_SEO',
    'MANAGE_MARKETING',
    'MANAGE_SETTINGS',
    'MANAGE_SLACK'
  ],
  admin: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_ORDERS',
    'MANAGE_ORDERS',
    'USE_POS',
    'VIEW_POS_HISTORY',
    'MANAGE_PRODUCTS',
    'REGISTER_PRODUCT',
    'MANAGE_INVENTORY',
    'VIEW_INVENTORY_VALUATION',
    'VIEW_FINANCE',
    'MANAGE_FINANCE',
    'VIEW_DUES',
    'MANAGE_DUES',
    'VIEW_REPORTS',
    'MANAGE_CREATORS',
    'VIEW_USERS',
    'VIEW_LEADS',
    'MANAGE_AI_AGENTS',
    'MANAGE_SEO',
    'MANAGE_MARKETING',
    'MANAGE_SETTINGS'
  ],
  inventory_manager: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_ORDERS',
    'MANAGE_ORDERS',
    'USE_POS',
    'VIEW_POS_HISTORY',
    'MANAGE_PRODUCTS',
    'REGISTER_PRODUCT',
    'MANAGE_INVENTORY',
    'VIEW_INVENTORY_VALUATION',
    'VIEW_REPORTS'
  ],
  hr: [
    'VIEW_ADMIN_DASHBOARD',
    'VIEW_USERS',
    'MANAGE_USERS',
    'VIEW_REPORTS'
  ],
  creator: [],
  wholesale_customer: [],
  customer: []
};

// Complete Route path to required permission mapping
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/admin': 'VIEW_ADMIN_DASHBOARD',
  '/admin/orders': 'VIEW_ORDERS',
  '/admin/users': 'MANAGE_USERS',
  '/admin/products': 'MANAGE_PRODUCTS',
  '/admin/product-registration': 'REGISTER_PRODUCT',
  '/admin/pos': 'USE_POS',
  '/admin/pos-history': 'VIEW_POS_HISTORY',
  '/admin/inventory': 'MANAGE_INVENTORY',
  '/admin/inventory/valuation': 'VIEW_INVENTORY_VALUATION',
  '/admin/business-finance': 'VIEW_FINANCE',
  '/admin/finance': 'VIEW_FINANCE',
  '/admin/payments-due': 'VIEW_DUES',
  '/admin/dues': 'VIEW_DUES',
  '/admin/reports': 'VIEW_REPORTS',
  '/admin/creators': 'MANAGE_CREATORS',
  '/admin/chat-leads': 'VIEW_LEADS',
  '/admin/ai-agents': 'MANAGE_AI_AGENTS',
  '/admin/seo': 'MANAGE_SEO',
  '/admin/theme-editor': 'MANAGE_SETTINGS',
  '/admin/theme': 'MANAGE_SETTINGS',
  '/admin/social': 'MANAGE_MARKETING',
  '/admin/slack': 'MANAGE_SLACK'
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
 * Unknown /admin routes strictly default to DENY (fail-closed)
 */
export function canAccessAdminRoute(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  
  // Normalize path (remove trailing slash)
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const requiredPermission = ROUTE_PERMISSION_MAP[cleanPath];

  // Unknown route -> STRICT DENY
  if (!requiredPermission) {
    return false;
  }

  return hasPermission(role, requiredPermission);
}

/**
 * Checks if a user has any operational administrative or staff access
 */
export function isStaffRole(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === 'super_admin' || role === 'admin' || role === 'inventory_manager';
}

