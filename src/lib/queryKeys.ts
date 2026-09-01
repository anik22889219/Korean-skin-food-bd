export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.products.lists(), filters ? JSON.stringify(filters) : 'all'] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (productId?: string) => [...queryKeys.products.details(), productId || ''] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  brands: {
    all: ['brands'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    movements: (filters?: Record<string, any>) => [...queryKeys.inventory.all, 'movements', filters ? JSON.stringify(filters) : 'all'] as const,
    logs: (productId?: string) => [...queryKeys.inventory.all, 'logs', productId || 'all'] as const,
    receipts: () => [...queryKeys.inventory.all, 'receipts'] as const,
    stock: (productId?: string) => [...queryKeys.inventory.all, 'stock', productId || ''] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.orders.lists(), filters ? JSON.stringify(filters) : 'all'] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (orderId?: string) => [...queryKeys.orders.details(), orderId || ''] as const,
    drafts: () => [...queryKeys.orders.all, 'drafts'] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (uid?: string) => [...queryKeys.users.details(), uid || ''] as const,
  },
  settings: {
    all: ['settings'] as const,
    globalTheme: () => [...queryKeys.settings.all, 'theme_global'] as const,
    homeTheme: () => [...queryKeys.settings.all, 'theme_home'] as const,
    shopTheme: () => [...queryKeys.settings.all, 'theme_shop'] as const,
    site: () => [...queryKeys.settings.all, 'site'] as const,
  },
  creators: {
    all: ['creators'] as const,
    list: (status?: string) => [...queryKeys.creators.all, 'list', status || 'all'] as const,
    detail: (id?: string) => [...queryKeys.creators.all, 'detail', id || ''] as const,
    leaderboard: (period?: string) => [...queryKeys.creators.all, 'leaderboard', period || 'all_time'] as const,
    reels: (filters?: Record<string, any>) => [...queryKeys.creators.all, 'reels', filters ? JSON.stringify(filters) : 'all'] as const,
  },
  agents: {
    all: ['agents'] as const,
    logs: () => [...queryKeys.agents.all, 'logs'] as const,
    runs: (agentType?: string) => [...queryKeys.agents.all, 'runs', agentType || 'all'] as const,
  },
  pos: {
    all: ['pos'] as const,
    catalog: () => [...queryKeys.pos.all, 'catalog'] as const,
    barcode: (code?: string) => [...queryKeys.pos.all, 'barcode', code || ''] as const,
  },
};
