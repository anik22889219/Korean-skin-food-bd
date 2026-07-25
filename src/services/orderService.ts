import { Order } from '../types';
import { posService } from './posService';

export const orderService = {
  getOrders(): Order[] {
    return posService.getOrders();
  },

  createOnlineOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'isPaid' | 'sessionType' | 'order_source' | 'stock_deducted'>): Order {
    return posService.createOnlineOrder(order);
  },

  updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    return posService.updateOrderStatus(orderId, status);
  },

  startFulfillment(orderId: string) {
    return posService.startFulfillment(orderId);
  },

  verifyItemScan(orderId: string, scannedCode: string) {
    return posService.verifyItemScan(orderId, scannedCode);
  },

  confirmOrderFulfillment(orderId: string, staffName?: string) {
    return posService.confirmOrderFulfillment(orderId, staffName);
  },

  cancelOrder(orderId: string, reason?: string, staffName?: string) {
    return posService.cancelOrder(orderId, reason, staffName);
  }
};
