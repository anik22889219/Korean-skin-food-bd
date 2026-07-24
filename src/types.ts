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

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
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
  createdAt: string;
  paymentMethod: 'COD' | 'POS_In_Person';
  sessionType: 'Online' | 'POS';
  isPaid: boolean;
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
  role: 'admin' | 'inventory_manager' | 'customer_support';
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

export interface UserProfile {
  uid: string;
  phone?: string;
  email?: string;
  name: string;
  role: 'customer' | 'admin' | 'super_admin' | 'inventory_manager' | 'customer_support';
  loyaltyPoints?: number;
  photoURL?: string;
  address?: string;
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

