export interface Product {
  id: string;
  name: string;
  nameBN: string;
  brand: string;
  category: string;
  skinTypes: string[];
  price: number;
  discountPrice?: number;
  importPrice?: number;
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
  qrCodeUrl: string;
  generatedSeoContent?: string;
  generatedSocialPost?: string;
  autoDiscountReason?: string;
  isSlowMoving?: boolean;
}

export type OrderStatus = 'pending' | 'packing' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderSource = 'WEBSITE' | 'POS';

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
  createdAt: string;
  paymentMethod: 'COD' | 'POS_In_Person';
  sessionType: 'Online' | 'POS';
  isPaid: boolean;
  courier?: CourierData;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  orderId?: string;
  quantity: number; // Negative for sale/deduction, positive for return/restock
  type: 'sale' | 'return' | 'restock' | 'adjustment' | 'stock_in';
  source: 'WEBSITE' | 'POS' | 'MANUAL';
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

export interface PosSession {
  id: string;
  name: string;
  status: 'active' | 'completed';
  computerJoined: boolean;
  lastScanTime: string;
  items: {
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
  role: 'admin' | 'inventory_manager' | 'customer_support' | 'hr' | 'super_admin';
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

export type UserRole = 'customer' | 'admin' | 'super_admin' | 'hr' | 'inventory_manager' | 'customer_support';

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

export type SlackRole = 'customer' | 'admin' | 'super_admin' | 'inventory_manager' | 'customer_support';

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


