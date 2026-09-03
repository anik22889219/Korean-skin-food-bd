#!/bin/bash
cat << 'INNER_EOF' >> src/services/wholesaleService.ts

export const wholesaleLedgerService = {
  async addPayment(paymentData: {
    wholesaleCustomerId: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    note?: string;
    createdBy: string;
    orderId?: string;
  }) {
    const res = await fetch('/api/wholesale/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add payment');
    return data.payment;
  },

  async getPayments(wholesaleCustomerId: string) {
    const res = await fetch(`/api/wholesale/payments/${wholesaleCustomerId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch payments');
    return data.payments;
  }
};
INNER_EOF
