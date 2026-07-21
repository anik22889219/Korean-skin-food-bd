import { Order } from '../types';
import { posService } from './posService';

export const orderService = {
  getOrders(): Order[] {
    return posService.getOrders();
  },

  createOnlineOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'isPaid' | 'sessionType'>): Order {
    return posService.createOnlineOrder(order);
  },

  updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    return posService.updateOrderStatus(orderId, status);
  }
};
