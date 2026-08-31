export interface Product {
  id: string;
  name: string;
  nameBN: string;
  brand: string;
  category: string;
  skinTypes: string[];
  // Pricing Fields
  importPrice?: number;
  costPrice?: number;
  wholesalePrice?: number;
  wholesalePrice50Plus?: number;
  retailPrice?: number;
  discountRetailPrice?: number;
  // Legacy compatibility fields
  price: number;
  discountPrice?: number;
  ml?: string;
  image: string;
  images?: string[];
  stock: number;
  description: string;
  descriptionBN: string;
  rating: number;
  reviewsCount: number;
  barcode: string;
  barcodeNormalized?: string;
  sku?: string;
  lowStockThreshold?: number;
  qrCodeUrl?: string;
  generatedSeoContent?: string;
  generatedSocialPost?: string;
  autoDiscountReason?: string;
  isSlowMoving?: boolean;
}

export type OrderStatus = 'pending' | 'packing' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderSource = 'WEBSITE' | 'POS' | 'WHOLESALE' | 'MANUAL';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  scannedQuantity?: number;
  barcode?: string;
}

export interface CourierData {
  provider: 'steadfast';
  consignmentId: string;
  trackingCode: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled' | 'returned';
  codAmount: number;
  deliveryFee: number;
  trackingUrl: string;
  createdAt: string;
}

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' | 'VOID';

export type PaymentMethodType = 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT_DUE' | 'COD' | 'POS_In_Person';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  type: 'POS_PAYMENT' | 'POS_DUE_COLLECTION' | 'ONLINE_PAYMENT' | 'COD_SETTLEMENT' | 'REFUND' | 'WHOLESALE_PAYMENT';
  method: PaymentMethodType;
  amount: number;
  note?: string;
  receivedBy: string;
  receivedAt: string;
  source: 'POS' | 'WEBSITE' | 'WHOLESALE' | 'MANUAL';
  idempotencyKey?: string;
  accountCode?: string; // e.g. 'CASH_REGISTER', 'BKASH_MERCHANT', 'NAGAD_MERCHANT', 'BRAC_BANK'
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, any>;
}

export interface FinancialTransaction {
  id: string;
  transactionType: 'MONEY_IN' | 'MONEY_OUT' | 'EXPENSE' | 'COGS' | 'REFUND' | 'TRANSFER' | 'CAPITAL_IN' | 'WITHDRAWAL';
  category: 'REVENUE' | 'COGS' | 'OPERATING_EXPENSE' | 'SALARY' | 'MARKETING' | 'RENT' | 'SUPPLIER_PAYMENT' | 'COURIER_CHARGE' | 'PACKAGING' | 'CAPITAL' | 'WITHDRAWAL' | 'TAX' | 'UTILITY' | 'TRANSFER' | 'OTHER';
  amount: number;
  date: string; // ISO or YYYY-MM-DD
  referenceType?: 'ORDER' | 'STOCK_RECEIPT' | 'SUPPLIER_INVOICE' | 'EXPENSE_VOUCHER' | 'TRANSFER' | 'CAPITAL' | 'WITHDRAWAL' | 'MANUAL';
  referenceId?: string;
  accountCode: 'CASH_REGISTER' | 'BKASH_MERCHANT' | 'NAGAD_MERCHANT' | 'CITY_BANK' | 'BRAC_BANK' | 'PETTY_CASH' | 'ACCOUNTS_RECEIVABLE' | 'GENERAL';
  targetAccountCode?: 'CASH_REGISTER' | 'BKASH_MERCHANT' | 'NAGAD_MERCHANT' | 'CITY_BANK' | 'BRAC_BANK' | 'PETTY_CASH' | 'GENERAL';
  description: string;
  performedBy: string;
  createdAt: string;
  receiptUrl?: string;
  metadata?: Record<string, any>;
}

export interface InventoryCostLayer {
  id: string;
  productId: string;
  receiptId?: string;
  quantityRemaining: number;
  unitCostBDT: number;
  batchNumber?: string;
  createdAt: string;
}

export interface WholesaleCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  storeName?: string;
  address?: string;
  tradeLicenseNumber?: string;
  creditLimit: number;
  currentDue: number;
  status: 'active' | 'suspended' | 'pending';
  totalPurchasedBDT: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customer_uid?: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  status: OrderStatus;
  order_source: OrderSource;
  stock_deducted: boolean;
  stock_restored?: boolean;
  cancelReason?: string;
  createdAt: string;
  paymentMethod: 'COD' | 'POS_In_Person' | PaymentMethodType;
  sessionType: 'Online' | 'POS';
  isPaid: boolean;
  paymentStatus?: PaymentStatus;
  totalPaid?: number;
  dueAmount?: number;
  changeAmount?: number;
  cogsAmount?: number;
  grossProfit?: number;
  paymentTransactions?: PaymentTransaction[];
  courier?: CourierData;
  attribution?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    creator_id?: string;
    ref?: string;
  };
  analytics?: {
    purchaseEventId?: string;
    purchaseTracked?: boolean;
    purchaseTrackedAt?: string;
  };
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  orderId?: string;
  quantity: number; // Negative for sale/deduction, positive for return/restock
  type: 'sale' | 'return' | 'restock' | 'adjustment' | 'stock_in';
  source: OrderSource;
  createdAt: string;
  performedBy: string;
  previousStock?: number;
  newStock?: number;
  reason?: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'stock_in' | 'sale' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface StockReceiptItem {
  productId: string;
  productName: string;
  barcode?: string;
  brand?: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  importCost?: number;
}

export interface StockReceipt {
  id: string;
  receiptNumber: string;
  receivedBy: string;
  supplier?: string;
  batchNumber?: string;
  notes?: string;
  totalQuantity: number;
  totalItemsCount: number;
  totalCost?: number;
  items: StockReceiptItem[];
  createdAt: string;
  status: 'completed' | 'cancelled';
}

export type PosDeviceType = 'mobile' | 'tablet' | 'desktop';
export type PosAllowedRole = 'admin' | 'super_admin' | 'inventory_manager';

export interface PosSessionNotification {
  id: string;
  notificationId: string;
  type: 'POS_SESSION_STARTED';
  sessionId: string;
  userId: string;
  userName: string;
  userRole: PosAllowedRole | string;
  deviceType: PosDeviceType;
  createdAt: string;
  read?: boolean;
  readBy?: string[];
  dismissedBy?: string[];
}

export interface PosSession {
  id: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  userRole?: PosAllowedRole | string;
  deviceType?: PosDeviceType;
  status: 'active' | 'completed' | 'open' | 'closed';
  startedAt?: string;
  lastSeenAt?: string;
  name: string;
  computerJoined?: boolean;
  lastScanTime?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  operatorName?: string;
  operatorEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerArea?: string;
  scannerConnected?: boolean;
  mobileScannerId?: string | null;
  mobileScannerUserId?: string | null;
  mobileScannerName?: string | null;
  scannerConnectedAt?: string | null;
  scannerLastSeenAt?: string | null;
  pendingScannerRequest?: {
    mobileScannerId: string;
    mobileScannerName: string;
    requestedAt: string;
  } | null;
  items?: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'inventory_manager' | 'hr' | 'super_admin';
  active: boolean;
}

export interface AdPerformance {
  date: string;
  spend: number;
  clicks: number;
  purchases: number;
  roas: number;
  reach?: number;
  impressions?: number;
  ctr?: number;
  cpc?: number;
  revenue?: number;
  isMock?: boolean;
}

export type UserRole = 'customer' | 'creator' | 'admin' | 'super_admin' | 'hr' | 'inventory_manager' | 'wholesale_customer';

export type CreatorStatus = 'pending' | 'approved' | 'suspended';

export type CreatorReelStatus = 'pending' | 'approved' | 'rejected' | 'published';

export type MetricsSource = 'facebook_api' | 'admin_verified' | 'none';

export interface CreatorLevelThreshold {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
}

export interface CreatorPointSettings {
  viewsPerPoint: number;
  likesPerPoint: number;
  pointsPerLikeBlock: number;
  commentsPerPoint: number;
  pointsPerComment: number;
  levels: CreatorLevelThreshold[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface ReelMetricAuditLog {
  id?: string;
  auditLogId?: string;
  creatorReelId: string;
  adminId: string;
  previousPerformance?: CreatorReelPerformance;
  newPerformance?: CreatorReelPerformance;
  previousValues?: { views: number; likes: number; comments: number; points: number };
  newValues?: { views: number; likes: number; comments: number; points: number };
  reason?: string;
  timestamp: string;
}

export interface CreatorReelPerformance {
  views: number;
  likes: number;
  comments: number;
  points: number;
  viewPoints?: number;
  likePoints?: number;
  commentPoints?: number;
  metricsSource?: MetricsSource;
  metricsUpdatedAt?: string;
  facebookPostId?: string;
}

export interface CreatorReel {
  creatorReelId: string;
  creatorId: string;
  creatorUserId: string;

  videoUrl: string;
  thumbnailUrl: string;

  // Cloudinary Video Metadata
  cloudinaryPublicId?: string;
  secureUrl?: string;
  resourceType?: 'video' | 'image';
  duration?: number;
  width?: number;
  height?: number;
  videoMetadata?: {
    format?: string;
    bytes?: number;
    aspectRatio?: string;
    fps?: number;
    [key: string]: any;
  };

  caption: string;
  description?: string;

  facebookPostUrl: string;
  normalizedFacebookUrl?: string;
  facebookPostId?: string;
  metricsSource?: MetricsSource;
  metricsUpdatedAt?: string;

  productIds?: string[];
  productNames?: string[];

  status: CreatorReelStatus;

  adminNote?: string;

  performance: CreatorReelPerformance;

  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
}

export interface CreatorProfile {
  creatorId: string;
  userId: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio: string;
  email: string;
  phone: string;
  facebookUrl?: string;
  instagramUrl?: string;
  niche?: string;
  shippingAddress?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
  status: CreatorStatus;
  role: 'creator';

  // Statistics
  totalReels: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalPoints: number;

  // Level
  level: number;
  levelName: string;
  levelProgress: number;
  nextLevelPoints: number;
  pointsRemaining?: number;
  nextLevelName?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PublicCreatorProfile {
  creatorId: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio?: string;
  level: number;
  levelName: string;
  totalPoints: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReels: number;
  rank?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  phone?: string;
  email?: string;
  name: string;
  role: UserRole;
  loyaltyPoints?: number;
  photoURL?: string;
  address?: string;
  createdAt?: any;
  department?: string;
  status?: 'active' | 'suspended';
  creatorId?: string;
  wholesaleAccess?: boolean;
}

export interface ChatLeadItem {
  product_id: string;
  name_en: string;
  quantity: number;
  unit_price: number;
}

export interface ChatLead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: ChatLeadItem[];
  total: number;
  conversation_summary: string;
  status: 'sent_to_whatsapp' | 'confirmed' | 'no_response' | 'cancelled';
  created_at: any; // Can be Firebase Timestamp or JS Date/ISO string
  last_updated_at: any; // Can be Firebase Timestamp or JS Date/ISO string
}

export interface ProductReview {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  rating: number;
  title?: string;
  comment: string;
  photos?: string[];
  isVerifiedPurchaser: boolean;
  createdAt: string;
  helpfulCount?: number;
  helpfulVoters?: string[];
}

export type SlackRole = 'customer' | 'admin' | 'super_admin' | 'inventory_manager';

export type SlackPermission = 
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'users:manage'
  | 'reports:view'
  | 'admin:all';

export interface SlackUser {
  slackUserId: string;
  firestoreUserId: string;
  email: string;
  role: SlackRole;
  permissions: SlackPermission[];
  slackUsername?: string;
  slackTeamId?: string;
  linkedAt: string;
  updatedAt?: string;
  name?: string;
}

export interface ProductImportPayload {
  importId: string;
  productName: string;
  brand: string;
  barcode: string;
  variant: string;
  volume: string;
  imageMatchScore: string | number;
  imageUrl?: string;
  category?: string;
  price?: number;
  stock?: number;
  description?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 're_searching';
  source?: 'barcode_scan' | 'ai_import' | 'manual_scan';
  timestamp: string;
  performedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuditLog {
  id: string;
  entityType: 'product_import' | 'order' | 'inventory' | 'courier' | 'support_ticket';
  action: string;
  importId?: string;
  productName?: string;
  barcode?: string;
  orderId?: string;
  ticketId?: string;
  performedBy: string;
  slackUserId?: string;
  timestamp: string;
  details?: string;
  status?: string;
}

export interface SupportThreadReply {
  id: string;
  author: string;
  authorRole: 'staff' | 'customer' | 'system';
  message: string;
  timestamp: string;
  slackUserId?: string;
}

export interface CustomerSupportTicket {
  id: string;
  ticketNumber: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'refund_approved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedStaff?: string;
  assignedSlackUserId?: string;
  createdAt: string;
  updatedAt: string;
  replies: SupportThreadReply[];
  refundAmount?: number;
  refundStatus?: 'none' | 'pending' | 'approved' | 'processed';
  channelName?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  purpose: string;
  memberCount: number;
  isPrivate: boolean;
}

export interface SlashCommandPayload {
  command: '/order' | '/product' | '/stock' | '/courier' | '/report';
  text: string;
  userId: string;
  userName: string;
}


