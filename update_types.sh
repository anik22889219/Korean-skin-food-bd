#!/bin/bash
sed -i '/export interface WholesaleCustomer {/a \  totalOrders?: number;\n  totalWholesalePurchase?: number;\n  totalPaid?: number;\n  totalDue?: number;' src/types.ts
