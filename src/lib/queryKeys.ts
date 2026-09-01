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
    // Movements: distinguish realtime recent (200 limit window) vs paginated historical vs filtered
    movementsAll: () => [...queryKeys.inventory.all, 'movements'] as const,
    movementsRecent: (filters?: Record<string, any>) => [...queryKeys.inventory.movementsAll(), 'recent', filters ? JSON.stringify(filters) : 'all'] as const,
    movementsPaginated: (params?: Record<string, any>) => [...queryKeys.inventory.movementsAll(), 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    movementsHistorical: (params?: Record<string, any>) => [...queryKeys.inventory.movementsAll(), 'historical', params ? JSON.stringify(params) : 'all'] as const,
    movements: (filters?: Record<string, any>) => [...queryKeys.inventory.movementsAll(), 'list', filters ? JSON.stringify(filters) : 'all'] as const,
    
    // Logs: distinguish realtime recent (200 limit window) vs paginated historical
    logsAll: () => [...queryKeys.inventory.all, 'logs'] as const,
    logsRecent: (productId?: string) => [...queryKeys.inventory.logsAll(), 'recent', productId || 'all'] as const,
    logsPaginated: (params?: Record<string, any>) => [...queryKeys.inventory.logsAll(), 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    logsHistorical: (params?: Record<string, any>) => [...queryKeys.inventory.logsAll(), 'historical', params ? JSON.stringify(params) : 'all'] as const,
    logs: (productId?: string) => [...queryKeys.inventory.logsAll(), 'list', productId || 'all'] as const,

    // Receipts: distinguish realtime recent (200 limit window) vs paginated historical
    receiptsAll: () => [...queryKeys.inventory.all, 'receipts'] as const,
    receiptsRecent: () => [...queryKeys.inventory.receiptsAll(), 'recent'] as const,
    receiptsPaginated: (params?: Record<string, any>) => [...queryKeys.inventory.receiptsAll(), 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    receiptsHistorical: (params?: Record<string, any>) => [...queryKeys.inventory.receiptsAll(), 'historical', params ? JSON.stringify(params) : 'all'] as const,
    receipts: () => [...queryKeys.inventory.receiptsAll(), 'list'] as const,

    stock: (productId?: string) => [...queryKeys.inventory.all, 'stock', productId || ''] as const,
  },
  orders: {
    all: ['orders'] as const,
    // Realtime / Recent 200-item listener window
    recent: () => [...queryKeys.orders.all, 'recent'] as const,
    realtime: () => [...queryKeys.orders.all, 'realtime'] as const,

    // Paginated / Historical records beyond 200-item window
    paginated: (params?: Record<string, any>) => [...queryKeys.orders.all, 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    historical: (params?: Record<string, any>) => [...queryKeys.orders.all, 'historical', params ? JSON.stringify(params) : 'all'] as const,

    // Standard list / filtered queries
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.orders.lists(), filters ? JSON.stringify(filters) : 'all'] as const,

    // Details
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (orderId?: string) => [...queryKeys.orders.details(), orderId || ''] as const,

    // Draft orders
    draftsAll: () => [...queryKeys.orders.all, 'drafts'] as const,
    draftsRecent: () => [...queryKeys.orders.draftsAll(), 'recent'] as const,
    draftsPaginated: (params?: Record<string, any>) => [...queryKeys.orders.draftsAll(), 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    drafts: () => [...queryKeys.orders.draftsAll(), 'list'] as const,
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
    runsRecent: (limitCount?: number) => [...queryKeys.agents.all, 'runs', 'recent', limitCount ?? 'default'] as const,
    runsPaginated: (params?: Record<string, any>) => [...queryKeys.agents.all, 'runs', 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    runs: (agentType?: string) => [...queryKeys.agents.all, 'runs', agentType || 'all'] as const,
  },
  finance: {
    all: ['finance'] as const,
    transactionsRecent: () => [...queryKeys.finance.all, 'transactions', 'recent'] as const,
    transactionsPaginated: (params?: Record<string, any>) => [...queryKeys.finance.all, 'transactions', 'paginated', params ? JSON.stringify(params) : 'all'] as const,
    paymentsRecent: () => [...queryKeys.finance.all, 'payments', 'recent'] as const,
    paymentsPaginated: (params?: Record<string, any>) => [...queryKeys.finance.all, 'payments', 'paginated', params ? JSON.stringify(params) : 'all'] as const,
  },
  pos: {
    all: ['pos'] as const,
    catalog: () => [...queryKeys.pos.all, 'catalog'] as const,
    barcode: (code?: string) => [...queryKeys.pos.all, 'barcode', code || ''] as const,
  },
};

