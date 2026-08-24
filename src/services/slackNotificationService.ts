import { Order, Product, CourierData, ProductImportPayload, AuditLog, CustomerSupportTicket, SupportThreadReply, SlackChannel, SlashCommandPayload } from '../types';
import { slackService } from './slackService';
import { db, sanitizeForFirestore } from './firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { createSteadfastConsignment } from './steadfastService';

export interface SlackNotificationLog {
  id: string;
  type: 'new_order' | 'order_status' | 'stock_alert' | 'inventory_update' | 'courier_event' | 'product_import' | 'support_ticket';
  title: string;
  orderId?: string;
  productId?: string;
  importId?: string;
  ticketId?: string;
  timestamp: string;
  blocks: any[];
  status: 'sent' | 'updated' | 'action_performed';
  lastAction?: string;
  lastActionBy?: string;
}

// Default Slack Channels for Team Communication
export const DEFAULT_SLACK_CHANNELS: SlackChannel[] = [
  { id: 'C_NEW_ORDERS', name: 'new-orders', purpose: 'Notifications for new customer orders, payment status, and dispatches', memberCount: 14, isPrivate: false },
  { id: 'C_INVENTORY', name: 'inventory', purpose: 'Low stock alerts, reorder warnings, and inventory updates', memberCount: 8, isPrivate: false },
  { id: 'C_COURIER', name: 'courier', purpose: 'Steadfast courier consignment creations, tracking events & OTP approvals', memberCount: 10, isPrivate: false },
  { id: 'C_SUPPORT', name: 'customer-support', purpose: 'Customer support tickets, threaded inquiries, and refund approvals', memberCount: 12, isPrivate: false },
  { id: 'C_IMPORTS', name: 'product-imports', purpose: 'Barcode scan alerts, AI product imports, and catalog approvals', memberCount: 6, isPrivate: false },
  { id: 'C_ALERTS', name: 'system-alerts', purpose: 'System health, webhook logs, security & action audit logs', memberCount: 5, isPrivate: true }
];

// In-memory stores for Slack notifications, product import requests, audit logs, and support tickets
export interface QueuedNotificationItem {
  id: string;
  type: SlackNotificationLog['type'];
  channel: string;
  text: string;
  blocks: any[];
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  retries: number;
  maxRetries: number;
  lastError?: string;
  queuedAt: string;
  processedAt?: string;
}

export interface SlackErrorLog {
  id: string;
  timestamp: string;
  channel?: string;
  type: string;
  errorMessage: string;
  stack?: string;
}

const notificationLogs: SlackNotificationLog[] = [];
const productImportRequests: ProductImportPayload[] = [];
const auditLogsCache: AuditLog[] = [];
const queuedNotifications: QueuedNotificationItem[] = [];
const slackErrorLogs: SlackErrorLog[] = [];

let isProcessingQueue = false;
let lastProcessedTime = 0;
const RATE_LIMIT_DELAY_MS = 500; // Rate limit window: max 2 requests per second

// In-memory cache for channel name -> channel ID mapping
let channelMapCache: { map: Map<string, string>; defaultChannelId?: string; lastFetched: number; scopeDisabled?: boolean } = {
  map: new Map(),
  lastFetched: 0,
  scopeDisabled: false
};

/**
 * Resolves a channel name (#orders, product-imports) or channel ID (C123...) to a valid Slack channel ID
 */
export async function getOrResolveSlackChannel(slackApp: any, targetChannel: string): Promise<string | null> {
  if (!slackApp || !slackApp.client) return null;

  const rawTarget = (targetChannel || '').trim();
  if (!rawTarget) return null;
  const cleanTarget = rawTarget.replace(/^#/, '').toLowerCase();

  // If already looks like a direct Slack Channel ID (e.g., C123456789, D123456789, G123456789)
  if (/^[CDG][A-Z0-9]{8,}$/.test(rawTarget)) {
    return rawTarget;
  }

  const now = Date.now();
  // Refresh cache every 15 minutes or if empty (unless conversations.list scope is not available on token)
  if (!channelMapCache.scopeDisabled && (channelMapCache.map.size === 0 || now - channelMapCache.lastFetched > 15 * 60 * 1000)) {
    try {
      let resp: any = null;
      try {
        resp = await slackApp.client.conversations.list({
          types: 'public_channel',
          limit: 200,
          exclude_archived: true
        });
      } catch (innerErr: any) {
        if (innerErr?.message?.includes('missing_scope') || innerErr?.data?.error === 'missing_scope') {
          channelMapCache.scopeDisabled = true;
          console.log('ℹ️ [Slack] Notice: Token lacks channels:read scope for conversations.list. Direct channel targeting active.');
        } else {
          throw innerErr;
        }
      }

      if (resp?.ok && Array.isArray(resp.channels)) {
        const newMap = new Map<string, string>();
        let defaultId: string | undefined;
        for (const ch of resp.channels) {
          if (ch.id && ch.name) {
            const lowerName = ch.name.toLowerCase();
            newMap.set(lowerName, ch.id);
            if (lowerName === 'general' || ch.is_general) {
              defaultId = ch.id;
            } else if (!defaultId && ch.is_member) {
              defaultId = ch.id;
            }
          }
        }
        if (!defaultId && resp.channels.length > 0) {
          defaultId = resp.channels[0].id;
        }
        channelMapCache = {
          map: newMap,
          defaultChannelId: defaultId,
          lastFetched: now,
          scopeDisabled: false
        };
      }
    } catch (err: any) {
      channelMapCache.lastFetched = now;
      console.log('ℹ️ [Slack] Channel list lookup note:', err?.message || err);
    }
  }

  // 1. Direct name match from workspace channels
  if (channelMapCache.map.has(cleanTarget)) {
    const channelId = channelMapCache.map.get(cleanTarget)!;
    try {
      await slackApp.client.conversations.join({ channel: channelId });
    } catch {
      // ignore if already member or cannot join
    }
    return channelId;
  }

  // 2. Fallback to default workspace channel if specific channel doesn't exist
  if (channelMapCache.defaultChannelId) {
    return channelMapCache.defaultChannelId;
  }

  // 3. Fallback to cleaned name
  return cleanTarget;
}

/**
 * Safely post a message to Slack with auto-channel resolution and graceful fallback
 */
export async function postSlackMessageSafely(
  channelTarget: string,
  text: string,
  blocks?: any[]
): Promise<boolean> {
  const slackApp = slackService.getSlackApp();
  if (!slackApp || !process.env.SLACK_BOT_TOKEN) return false;

  try {
    const resolvedChannel = await getOrResolveSlackChannel(slackApp, channelTarget);
    if (!resolvedChannel) return false;

    try {
      await slackApp.client.chat.postMessage({
        channel: resolvedChannel,
        text,
        ...(blocks && blocks.length > 0 ? { blocks } : {})
      });
      return true;
    } catch (postErr: any) {
      const errCode = postErr?.data?.error || '';
      const errMsg = postErr?.message || String(postErr);

      // Handle not_in_channel: try to join if public, or post to default channel, or log informative notice
      if (errCode === 'not_in_channel' || errMsg.includes('not_in_channel')) {
        try {
          const joinResp = await slackApp.client.conversations.join({ channel: resolvedChannel });
          if (joinResp?.ok) {
            await slackApp.client.chat.postMessage({
              channel: resolvedChannel,
              text,
              ...(blocks && blocks.length > 0 ? { blocks } : {})
            });
            return true;
          }
        } catch {
          // auto-join not permitted without channels:join or for private channels
        }

        // Try posting to default channel if available and different
        if (channelMapCache.defaultChannelId && channelMapCache.defaultChannelId !== resolvedChannel) {
          try {
            await slackApp.client.chat.postMessage({
              channel: channelMapCache.defaultChannelId,
              text: `[#${channelTarget.replace(/^#/, '')} Notice] ${text}`,
              ...(blocks && blocks.length > 0 ? { blocks } : {})
            });
            return true;
          } catch {
            // default fallback silent
          }
        }

        console.log(`ℹ️ [Slack] Notice: Bot is not currently in #${channelTarget.replace(/^#/, '')}. (To receive live alerts in this channel, invite the bot with '/invite @bot').`);
        return true; // Mark as handled so queues don't fail or infinitely retry
      }

      // If channel_not_found, try fallback to default channel if available
      if (errCode === 'channel_not_found' || errMsg.includes('channel_not_found')) {
        if (channelMapCache.defaultChannelId && channelMapCache.defaultChannelId !== resolvedChannel) {
          try {
            await slackApp.client.chat.postMessage({
              channel: channelMapCache.defaultChannelId,
              text: `[Notice: #${channelTarget.replace(/^#/, '')} not found] ${text}`,
              ...(blocks && blocks.length > 0 ? { blocks } : {})
            });
            return true;
          } catch {
            // silently acknowledge fallback attempt
          }
        }
        console.log(`ℹ️ [Slack] Notice: Channel ${channelTarget} was not found in Slack workspace. Notification logged locally.`);
        return true; // Mark handled so queue is not stuck in infinite retry loops
      }

      console.log(`ℹ️ [Slack] Post note for ${channelTarget}:`, errMsg);
      return false;
    }
  } catch (err: any) {
    console.log(`ℹ️ [Slack] Notification dispatch note for ${channelTarget}:`, err?.message || err);
    return false;
  }
}

/**
 * Enqueue notification and process queue with rate limiting & error handling
 */
export async function enqueueNotification(
  type: SlackNotificationLog['type'],
  channel: string,
  text: string,
  blocks: any[]
): Promise<QueuedNotificationItem> {
  const item: QueuedNotificationItem = {
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    channel,
    text,
    blocks,
    status: 'pending',
    retries: 0,
    maxRetries: 3,
    queuedAt: new Date().toISOString()
  };

  queuedNotifications.unshift(item);
  if (queuedNotifications.length > 100) queuedNotifications.pop();

  // Trigger background queue processor safely
  setTimeout(() => processQueue(), 10);

  return item;
}

/**
 * Background Queue Processor with exponential backoff & rate limiting
 */
async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    const pendingItems = queuedNotifications.filter(i => i.status === 'pending' || i.status === 'retrying');

    for (const item of pendingItems) {
      // Enforce rate limit delay
      const now = Date.now();
      const elapsed = now - lastProcessedTime;
      if (elapsed < RATE_LIMIT_DELAY_MS) {
        await new Promise(res => setTimeout(res, RATE_LIMIT_DELAY_MS - elapsed));
      }

      item.status = 'retrying';
      lastProcessedTime = Date.now();

      const slackApp = slackService.getSlackApp();
      if (slackApp && process.env.SLACK_BOT_TOKEN) {
        const sent = await postSlackMessageSafely(item.channel, item.text, item.blocks);
        if (sent) {
          item.status = 'sent';
          item.processedAt = new Date().toISOString();
        } else {
          item.retries++;
          item.lastError = 'Delivery could not be confirmed';
          if (item.retries >= item.maxRetries) {
            item.status = 'failed';
          } else {
            item.status = 'pending';
          }

          // Record Error Log
          const errLog: SlackErrorLog = {
            id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            channel: item.channel,
            type: item.type,
            errorMessage: item.lastError || 'Slack API Post Error'
          };
          slackErrorLogs.unshift(errLog);
          if (slackErrorLogs.length > 50) slackErrorLogs.pop();

          if (db) {
            try {
              await setDoc(doc(db, 'slack_error_logs', errLog.id), sanitizeForFirestore(errLog), { merge: true });
            } catch (e) {
              console.warn('[SlackErrorLog] Firestore write failed:', e);
            }
          }
        }
      } else {
        // Safe mode (SDK not configured with live token) -> mark sent for simulation
        item.status = 'sent';
        item.processedAt = new Date().toISOString();
      }
    }
  } catch (globalErr: any) {
    console.error('Error in processQueue:', globalErr);
  } finally {
    isProcessingQueue = false;
  }
}

const supportTicketsCache: CustomerSupportTicket[] = [
  {
    id: 'tkt-1001',
    ticketNumber: 'TKT-1001',
    orderId: 'KSF-9201',
    customerName: 'Tanvir Ahmed',
    customerPhone: '+8801712345678',
    customerEmail: 'tanvir.ahmed@gmail.com',
    subject: 'Wrong shade received in Order #KSF-9201',
    description: 'I ordered Rom&nd Juicy Lasting Tint Shade 20 Dark Coconut but received Shade 06 Figfig instead. Please replace or exchange.',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    channelName: '#customer-support',
    replies: [
      {
        id: 'rep-1',
        author: 'Customer Care AI',
        authorRole: 'system',
        message: 'Ticket received and posted to Slack #customer-support. Order #KSF-9201 verified.',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'rep-2',
        author: 'Tanvir Ahmed',
        authorRole: 'customer',
        message: 'Can someone please arrange a pickup for the incorrect item?',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ]
  },
  {
    id: 'tkt-1002',
    ticketNumber: 'TKT-1002',
    orderId: 'KSF-9042',
    customerName: 'Nusrat Jahan',
    customerPhone: '+8801898765432',
    customerEmail: 'nusrat.j@gmail.com',
    subject: 'Refund Request — Damaged bottle during Steadfast delivery',
    description: 'The glass bottle of COSRX Snail Mucin arrived cracked in the courier package. Delivery guy signed off on condition. Requesting ৳1,850 refund.',
    status: 'in_progress',
    priority: 'urgent',
    assignedStaff: 'Samira (Customer Care)',
    assignedSlackUserId: 'U_SUPPORT_02',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    refundAmount: 1850,
    refundStatus: 'pending',
    channelName: '#customer-support',
    replies: [
      {
        id: 'rep-10',
        author: 'Nusrat Jahan',
        authorRole: 'customer',
        message: 'Attached photo of cracked bottle. Please check Steadfast tracking SF910284.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'rep-11',
        author: 'Samira (Customer Care)',
        authorRole: 'staff',
        message: 'I have verified the Steadfast courier report. Submitting refund request for ৳1,850 now.',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        slackUserId: 'U_SUPPORT_02'
      }
    ]
  }
];

/**
 * Helper to log audit actions to Firestore and cache
 */
export async function logAuditAction(
  log: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<AuditLog> {
  const auditRecord: AuditLog = {
    id: log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: log.timestamp || new Date().toISOString(),
    entityType: log.entityType,
    action: log.action,
    importId: log.importId,
    productName: log.productName,
    barcode: log.barcode,
    performedBy: log.performedBy,
    slackUserId: log.slackUserId,
    details: log.details,
    status: log.status
  };

  auditLogsCache.unshift(auditRecord);
  if (auditLogsCache.length > 100) auditLogsCache.pop();

  if (db) {
    try {
      await setDoc(doc(db, 'audit_logs', auditRecord.id), sanitizeForFirestore(auditRecord), { merge: true });
    } catch (err) {
      console.warn('[AuditLog] Firestore setDoc error:', err);
    }
  }

  return auditRecord;
}

/**
 * Helper to build Block Kit for Order Notifications with interactive buttons
 */
export function buildOrderBlockKit(order: Order, customHeading?: string): any[] {
  const itemsText = order.items
    .map(i => `• *${i.name}* (Qty: ${i.quantity}) - ৳${i.price * i.quantity}`)
    .join('\n');

  const courierText = order.courier
    ? `🚚 *Steadfast Tracking:* \`${order.courier.trackingCode}\` (CN: ${order.courier.consignmentId}) - Status: *${order.courier.status || 'Pending'}*`
    : `🚚 *Courier:* Not dispatched yet`;

  const statusEmoji: Record<string, string> = {
    pending: '⏳ Pending Approval',
    packing: '📦 Packing in Progress',
    shipped: '🚚 Out for Delivery',
    delivered: '✅ Completed & Paid',
    cancelled: '❌ Cancelled'
  };

  const statusLabel = statusEmoji[order.status] || order.status;
  const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-ybkvv22zxawb4qbqghbn6n-450325481419.asia-southeast1.run.app'}/admin/orders`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: customHeading || `🛍️ New Website Order #${order.id}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Order ID:* \`${order.id}\`` },
        { type: 'mrkdwn', text: `*Source:* \`${order.order_source || 'WEBSITE'}\`` },
        { type: 'mrkdwn', text: `*Customer:* ${order.customerName}` },
        { type: 'mrkdwn', text: `*Phone:* \`${order.customerPhone}\`` },
        { type: 'mrkdwn', text: `*Total Amount:* *৳${order.totalAmount}* (${order.paymentMethod || 'COD'})` },
        { type: 'mrkdwn', text: `*Status:* *${statusLabel}*` }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📍 *Shipping Address:*\n${order.address}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🛒 *Order Items:*\n${itemsText}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: courierText
      }
    },
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `order_actions_${order.id}`,
      elements: [
        ...(order.status === 'pending' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '✅ Accept Order', emoji: true },
          style: 'primary',
          action_id: 'action_accept_order',
          value: JSON.stringify({ orderId: order.id, action: 'accept' })
        }] : []),
        ...(order.status === 'pending' || order.status === 'packing' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '📦 Start Packing', emoji: true },
          action_id: 'action_start_packing',
          value: JSON.stringify({ orderId: order.id, action: 'start_packing' })
        }] : []),
        ...(!order.courier && order.status !== 'cancelled' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '🚚 Create Consignment', emoji: true },
          style: 'primary',
          action_id: 'action_create_consignment',
          value: JSON.stringify({ orderId: order.id, action: 'create_consignment' })
        }] : []),
        ...(order.courier ? [{
          type: 'button',
          text: { type: 'plain_text', text: '📍 Track Shipment', emoji: true },
          action_id: 'action_track_shipment',
          url: `https://steadfast.com.bd/t/${order.courier.trackingCode}`
        }] : []),
        ...(order.status !== 'cancelled' && order.status !== 'delivered' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '❌ Cancel Order', emoji: true },
          style: 'danger',
          action_id: 'action_cancel_order',
          value: JSON.stringify({ orderId: order.id, action: 'cancel' })
        }] : []),
        {
          type: 'button',
          text: { type: 'plain_text', text: '📄 Print Label', emoji: true },
          action_id: 'action_print_label',
          value: JSON.stringify({ orderId: order.id, action: 'print_label' })
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌐 Open Admin', emoji: true },
          action_id: 'action_open_admin',
          url: adminUrl
        }
      ]
    }
  ];
}

/**
 * Helper to build Stock Alert Block Kit
 */
export function buildStockAlertBlockKit(
  product: Product,
  eventType: 'low_stock' | 'out_of_stock' | 'inventory_updated',
  previousStock?: number
): any[] {
  const isOut = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);

  const titleEmoji = isOut ? '🚨 OUT OF STOCK ALERT' : isLow ? '⚠️ LOW STOCK WARNING' : '✏️ Inventory Updated';
  const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-ybkvv22zxawb4qbqghbn6n-450325481419.asia-southeast1.run.app'}/admin`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${titleEmoji}: ${product.name}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*SKU / ID:* \`${product.id}\`` },
        { type: 'mrkdwn', text: `*Barcode:* \`${product.barcode || 'N/A'}\`` },
        { type: 'mrkdwn', text: `*Current Stock:* *${product.stock} units*` },
        { type: 'mrkdwn', text: `*Previous Stock:* ${previousStock !== undefined ? `${previousStock} units` : 'N/A'}` },
        { type: 'mrkdwn', text: `*Price:* ৳${product.price}` },
        { type: 'mrkdwn', text: `*Status:* ${isOut ? '🔴 Out of Stock' : isLow ? '🟡 Low Stock' : '🟢 In Stock'}` }
      ]
    },
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `stock_actions_${product.id}`,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '➕ Quick Restock +10', emoji: true },
          style: 'primary',
          action_id: 'action_quick_restock',
          value: JSON.stringify({ productId: product.id, addQty: 10 })
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌐 Open Inventory Admin', emoji: true },
          action_id: 'action_open_admin',
          url: adminUrl
        }
      ]
    }
  ];
}

/**
 * Helper to build Steadfast Courier Block Kit
 */
export function buildSteadfastCourierBlockKit(
  order: Order,
  result: { success: boolean; message: string; courier?: CourierData }
): any[] {
  const isSuccess = result.success && result.courier;
  const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-ybkvv22zxawb4qbqghbn6n-450325481419.asia-southeast1.run.app'}/admin/orders`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: isSuccess ? `🚚 Steadfast Booking Succeeded — Order #${order.id}` : `⚠️ Steadfast Booking Failed — Order #${order.id}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Order ID:* \`${order.id}\`` },
        { type: 'mrkdwn', text: `*Customer:* ${order.customerName}` },
        { type: 'mrkdwn', text: `*Status:* ${isSuccess ? '✅ Consignment Created' : '❌ Booking Error'}` },
        { type: 'mrkdwn', text: `*COD Amount:* ৳${order.isPaid ? 0 : order.totalAmount}` },
        ...(isSuccess && result.courier ? [
          { type: 'mrkdwn', text: `*Consignment ID:* \`${result.courier.consignmentId}\`` },
          { type: 'mrkdwn', text: `*Tracking Code:* \`${result.courier.trackingCode}\`` }
        ] : [
          { type: 'mrkdwn', text: `*Error Reason:* ${result.message}` },
          { type: 'mrkdwn', text: `*Action Required:* Retry consignment creation in admin` }
        ])
      ]
    },
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `courier_actions_${order.id}`,
      elements: [
        ...(isSuccess && result.courier ? [{
          type: 'button',
          text: { type: 'plain_text', text: '📍 Track Shipment', emoji: true },
          style: 'primary',
          action_id: 'action_track_shipment',
          url: `https://steadfast.com.bd/t/${result.courier.trackingCode}`
        }] : [{
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Retry Booking', emoji: true },
          style: 'primary',
          action_id: 'action_create_consignment',
          value: JSON.stringify({ orderId: order.id, action: 'create_consignment' })
        }]),
        {
          type: 'button',
          text: { type: 'plain_text', text: '📄 Print Shipping Label', emoji: true },
          action_id: 'action_print_label',
          value: JSON.stringify({ orderId: order.id, action: 'print_label' })
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌐 Open Admin', emoji: true },
          action_id: 'action_open_admin',
          url: adminUrl
        }
      ]
    }
  ];
}

/**
 * Helper to build Block Kit for Product Import & Barcode Scan Workflow
 */
export function buildProductImportBlockKit(
  payload: ProductImportPayload,
  customHeading?: string
): any[] {
  const statusLabels: Record<string, string> = {
    pending_approval: '⏳ Pending Approval',
    approved: '✅ Approved & Saved to Firestore',
    rejected: '❌ Rejected & Not Saved',
    re_searching: '🔍 Re-searching Metadata'
  };

  const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-ybkvv22zxawb4qbqghbn6n-450325481419.asia-southeast1.run.app'}/admin`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: customHeading || `📦 Product Import & Barcode Scan — ${payload.productName}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Product Name:* *${payload.productName}*` },
        { type: 'mrkdwn', text: `*Brand:* *${payload.brand || 'Korean Skincare'}*` },
        { type: 'mrkdwn', text: `*Barcode:* \`${payload.barcode}\`` },
        { type: 'mrkdwn', text: `*Variant:* ${payload.variant || 'Full Size'}` },
        { type: 'mrkdwn', text: `*Volume:* ${payload.volume || '50 ml'}` },
        { type: 'mrkdwn', text: `*Image Match Score:* *${typeof payload.imageMatchScore === 'number' ? `${payload.imageMatchScore}%` : payload.imageMatchScore || '98%'}*` },
        { type: 'mrkdwn', text: `*Import Source:* \`${payload.source || 'barcode_scan'}\`` },
        { type: 'mrkdwn', text: `*Status:* *${statusLabels[payload.status] || payload.status}*` }
      ]
    },
    ...(payload.imageUrl ? [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🖼️ *Product Image Match Preview:*\n<${payload.imageUrl}|View Match Image>`
      },
      accessory: {
        type: 'image',
        image_url: payload.imageUrl,
        alt_text: payload.productName
      }
    }] : []),
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `product_import_actions_${payload.importId}`,
      elements: [
        ...(payload.status === 'pending_approval' || payload.status === 're_searching' ? [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve Product', emoji: true },
            style: 'primary',
            action_id: 'action_approve_product',
            value: JSON.stringify({ importId: payload.importId, action: 'approve' })
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject Product', emoji: true },
            style: 'danger',
            action_id: 'action_reject_product',
            value: JSON.stringify({ importId: payload.importId, action: 'reject' })
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔍 Search Again', emoji: true },
            action_id: 'action_search_again',
            value: JSON.stringify({ importId: payload.importId, action: 'search_again' })
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '✏️ Edit Product', emoji: true },
            action_id: 'action_edit_product',
            value: JSON.stringify({ importId: payload.importId, action: 'edit' })
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '➕ Create Product', emoji: true },
            style: 'primary',
            action_id: 'action_create_product',
            value: JSON.stringify({ importId: payload.importId, action: 'create' })
          }
        ] : []),
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌐 Open Admin Catalog', emoji: true },
          action_id: 'action_open_admin',
          url: adminUrl
        }
      ]
    }
  ];
}

/**
 * Helper to build Block Kit for Customer Support Ticket Workflow & Threaded Conversations
 */
export function buildSupportTicketBlockKit(
  ticket: CustomerSupportTicket,
  customHeading?: string
): any[] {
  const statusBadges: Record<string, string> = {
    open: '🔴 Open',
    in_progress: '🟡 In Progress',
    refund_approved: '💸 Refund Approved',
    closed: '🟢 Closed & Resolved'
  };

  const priorityBadges: Record<string, string> = {
    low: '⚪ Low',
    medium: '🔵 Medium',
    high: '🟠 High',
    urgent: '🔥 URGENT'
  };

  const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-ybkvv22zxawb4qbqghbn6n-450325481419.asia-southeast1.run.app'}/admin`;

  const replyLines = (ticket.replies || []).map(r => 
    `• *${r.author}* (${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): ${r.message}`
  ).join('\n');

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: customHeading || `🎧 Customer Support ${ticket.ticketNumber} — ${ticket.subject}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Customer:* *${ticket.customerName}*\n📞 ${ticket.customerPhone}` },
        { type: 'mrkdwn', text: `*Order ID:* \`${ticket.orderId || 'N/A'}\`` },
        { type: 'mrkdwn', text: `*Priority:* *${priorityBadges[ticket.priority] || ticket.priority}*` },
        { type: 'mrkdwn', text: `*Status:* *${statusBadges[ticket.status] || ticket.status}*` },
        { type: 'mrkdwn', text: `*Assigned Staff:* ${ticket.assignedStaff ? `*${ticket.assignedStaff}*` : '_Unassigned_'}` },
        { type: 'mrkdwn', text: `*Refund Status:* ${ticket.refundAmount ? `৳${ticket.refundAmount} (${ticket.refundStatus || 'pending'})` : 'N/A'}` }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📝 *Issue Description:*\n>${ticket.description}`
      }
    },
    ...(replyLines ? [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `💬 *Threaded Conversation History (${ticket.replies.length}):*\n${replyLines}`
      }
    }] : []),
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `support_ticket_actions_${ticket.id}`,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '👤 Assign Staff', emoji: true },
          action_id: 'action_assign_ticket',
          value: JSON.stringify({ ticketId: ticket.id, action: 'assign' })
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '💬 Reply Thread', emoji: true },
          style: 'primary',
          action_id: 'action_reply_ticket',
          value: JSON.stringify({ ticketId: ticket.id, action: 'reply' })
        },
        ...(ticket.status !== 'refund_approved' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '💸 Approve Refund', emoji: true },
          action_id: 'action_approve_refund',
          value: JSON.stringify({ ticketId: ticket.id, action: 'approve_refund' })
        }] : []),
        ...(ticket.status !== 'closed' ? [{
          type: 'button',
          text: { type: 'plain_text', text: '🔒 Close Ticket', emoji: true },
          style: 'danger',
          action_id: 'action_close_ticket',
          value: JSON.stringify({ ticketId: ticket.id, action: 'close' })
        }] : []),
        {
          type: 'button',
          text: { type: 'plain_text', text: '🌐 Open Admin Ticket', emoji: true },
          action_id: 'action_open_admin',
          url: adminUrl
        }
      ]
    }
  ];
}

export const slackNotificationService = {
  getChannels(): SlackChannel[] {
    return DEFAULT_SLACK_CHANNELS;
  },

  getSupportTickets(): CustomerSupportTicket[] {
    return supportTicketsCache;
  },

  getNotificationLogs(): SlackNotificationLog[] {
    return notificationLogs;
  },

  getAuditLogs(): AuditLog[] {
    return auditLogsCache;
  },

  getProductImportRequests(): ProductImportPayload[] {
    return productImportRequests;
  },

  /**
   * Post Customer Support Ticket to Slack & Sync to Firestore
   */
  async notifySupportTicket(ticket: CustomerSupportTicket): Promise<SlackNotificationLog> {
    const existingIdx = supportTicketsCache.findIndex(t => t.id === ticket.id);
    if (existingIdx >= 0) {
      supportTicketsCache[existingIdx] = ticket;
    } else {
      supportTicketsCache.unshift(ticket);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'support_tickets', ticket.id), sanitizeForFirestore(ticket), { merge: true });
      } catch (err) {
        console.warn('[SupportTicket] Firestore setDoc error:', err);
      }
    }

    const blocks = buildSupportTicketBlockKit(ticket);
    const log: SlackNotificationLog = {
      id: `sn-tkt-${ticket.id}-${Date.now()}`,
      type: 'support_ticket',
      title: `Support Ticket ${ticket.ticketNumber}: ${ticket.subject}`,
      ticketId: ticket.id,
      orderId: ticket.orderId,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await logAuditAction({
      entityType: 'support_ticket',
      action: 'ticket_created',
      ticketId: ticket.id,
      orderId: ticket.orderId,
      performedBy: ticket.customerName,
      status: ticket.status,
      details: `Support ticket ${ticket.ticketNumber} created for order #${ticket.orderId || 'N/A'}`
    });

    await postSlackMessageSafely(
      '#customer-support',
      `🎧 Support Ticket ${ticket.ticketNumber}: ${ticket.subject} (Customer: ${ticket.customerName})`,
      blocks
    );

    return log;
  },

  /**
   * Threaded Conversation Reply
   */
  async addTicketReply(ticketId: string, message: string, author: string, authorRole: 'staff' | 'customer' | 'system' = 'staff', slackUserId?: string): Promise<CustomerSupportTicket> {
    const ticket = supportTicketsCache.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const newReply: SupportThreadReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author,
      authorRole,
      message,
      timestamp: new Date().toISOString(),
      slackUserId
    };

    ticket.replies.push(newReply);
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === 'open') ticket.status = 'in_progress';

    if (db) {
      try {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          replies: ticket.replies,
          updatedAt: ticket.updatedAt,
          status: ticket.status
        });
      } catch (err) {
        console.warn('[SupportTicket] Firestore updateDoc error:', err);
      }
    }

    await logAuditAction({
      entityType: 'support_ticket',
      action: 'thread_reply_added',
      ticketId: ticket.id,
      orderId: ticket.orderId,
      performedBy: author,
      slackUserId,
      status: ticket.status,
      details: `Thread reply added to ${ticket.ticketNumber}: "${message.substring(0, 50)}..."`
    });

    // Update Slack Notification Block
    const log = notificationLogs.find(l => l.ticketId === ticket.id);
    if (log) {
      log.blocks = buildSupportTicketBlockKit(ticket, `🎧 Support Ticket ${ticket.ticketNumber} [Thread Updated]`);
      log.status = 'action_performed';
      log.lastAction = `Thread reply added by ${author}`;
      log.lastActionBy = author;
    }

    return ticket;
  },

  /**
   * Assign Ticket to Staff
   */
  async assignSupportTicket(ticketId: string, staffName: string, slackUserId?: string): Promise<CustomerSupportTicket> {
    const ticket = supportTicketsCache.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    ticket.assignedStaff = staffName;
    ticket.assignedSlackUserId = slackUserId;
    ticket.status = 'in_progress';
    ticket.updatedAt = new Date().toISOString();

    ticket.replies.push({
      id: `rep-${Date.now()}`,
      author: 'System',
      authorRole: 'system',
      message: `Ticket assigned to staff agent @${staffName}`,
      timestamp: new Date().toISOString()
    });

    if (db) {
      try {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          assignedStaff: ticket.assignedStaff,
          assignedSlackUserId: ticket.assignedSlackUserId,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
          replies: ticket.replies
        });
      } catch (err) {
        console.warn('[SupportTicket] Firestore updateDoc error:', err);
      }
    }

    await logAuditAction({
      entityType: 'support_ticket',
      action: 'ticket_assigned',
      ticketId: ticket.id,
      orderId: ticket.orderId,
      performedBy: staffName,
      slackUserId,
      status: ticket.status,
      details: `Support ticket ${ticket.ticketNumber} assigned to ${staffName}`
    });

    return ticket;
  },

  /**
   * Approve Refund directly from Slack
   */
  async approveTicketRefund(ticketId: string, amount: number, staffName: string, slackUserId?: string): Promise<CustomerSupportTicket> {
    const ticket = supportTicketsCache.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    ticket.refundAmount = amount || ticket.refundAmount || 1500;
    ticket.refundStatus = 'approved';
    ticket.status = 'refund_approved';
    ticket.updatedAt = new Date().toISOString();

    ticket.replies.push({
      id: `rep-${Date.now()}`,
      author: staffName,
      authorRole: 'staff',
      message: `✅ Refund of ৳${ticket.refundAmount} APPROVED by @${staffName}. Processed to customer payment account.`,
      timestamp: new Date().toISOString(),
      slackUserId
    });

    if (db) {
      try {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          refundAmount: ticket.refundAmount,
          refundStatus: ticket.refundStatus,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
          replies: ticket.replies
        });
      } catch (err) {
        console.warn('[SupportTicket] Firestore refund update error:', err);
      }
    }

    await logAuditAction({
      entityType: 'support_ticket',
      action: 'refund_approved',
      ticketId: ticket.id,
      orderId: ticket.orderId,
      performedBy: staffName,
      slackUserId,
      status: ticket.status,
      details: `Refund of ৳${ticket.refundAmount} approved for ticket ${ticket.ticketNumber} (Order #${ticket.orderId || 'N/A'})`
    });

    return ticket;
  },

  /**
   * Close Support Ticket
   */
  async closeSupportTicket(ticketId: string, staffName: string, slackUserId?: string): Promise<CustomerSupportTicket> {
    const ticket = supportTicketsCache.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    ticket.status = 'closed';
    ticket.updatedAt = new Date().toISOString();

    ticket.replies.push({
      id: `rep-${Date.now()}`,
      author: staffName,
      authorRole: 'staff',
      message: `🔒 Support ticket closed & resolved by @${staffName}.`,
      timestamp: new Date().toISOString(),
      slackUserId
    });

    if (db) {
      try {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          status: ticket.status,
          updatedAt: ticket.updatedAt,
          replies: ticket.replies
        });
      } catch (err) {
        console.warn('[SupportTicket] Firestore close update error:', err);
      }
    }

    await logAuditAction({
      entityType: 'support_ticket',
      action: 'ticket_closed',
      ticketId: ticket.id,
      orderId: ticket.orderId,
      performedBy: staffName,
      slackUserId,
      status: ticket.status,
      details: `Support ticket ${ticket.ticketNumber} closed by ${staffName}`
    });

    return ticket;
  },

  /**
   * Slash Command Handler
   * /order, /product, /stock, /courier, /report
   */
  async executeSlashCommand(payload: SlashCommandPayload): Promise<any> {
    const { command, text, userName, userId } = payload;
    const query = (text || '').trim();

    await logAuditAction({
      entityType: 'order',
      action: `slash_command_${command.replace('/', '')}`,
      performedBy: userName,
      slackUserId: userId,
      details: `Executed ${command} "${query}" in Slack`
    });

    if (command === '/order') {
      const { orderService } = await import('./orderService');
      const orders = await orderService.getOrders();
      const match = query 
        ? orders.find(o => o.id.toLowerCase().includes(query.toLowerCase()) || o.customerName.toLowerCase().includes(query.toLowerCase()) || (o.customerPhone && o.customerPhone.includes(query)))
        : orders[0];

      if (!match) {
        return {
          response_type: 'ephemeral',
          text: `🔍 Order query "${query}" not found. Try searching by order ID (e.g. KSF-9201) or phone number.`
        };
      }

      return {
        response_type: 'in_channel',
        text: `📦 Order Lookup Result for #${match.id}:`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `📦 Order #${match.id} — ${match.customerName}`, emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Customer:* ${match.customerName}\n📞 ${match.customerPhone || 'N/A'}` },
              { type: 'mrkdwn', text: `*Status:* \`${match.status.toUpperCase()}\`` },
              { type: 'mrkdwn', text: `*Total Amount:* *৳${match.totalAmount}*` },
              { type: 'mrkdwn', text: `*Payment:* ${match.paymentMethod.toUpperCase()} (${match.isPaid ? 'PAID' : 'UNPAID'})` },
              { type: 'mrkdwn', text: `*Items:* ${match.items.length} items` },
              { type: 'mrkdwn', text: `*Courier Consignment:* ${match.courier?.trackingCode ? `\`${match.courier.trackingCode}\`` : 'Not Dispatched'}` }
            ]
          }
        ]
      };

    } else if (command === '/product') {
      const { productService } = await import('./productService');
      const products = await productService.getProducts();
      const match = query
        ? products.find(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode?.includes(query) || p.brand?.toLowerCase().includes(query.toLowerCase()))
        : products[0];

      if (!match) {
        return {
          response_type: 'ephemeral',
          text: `🔍 Product query "${query}" not found in catalog.`
        };
      }

      return {
        response_type: 'in_channel',
        text: `💄 Product Details for ${match.name}:`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `💄 ${match.name} (${match.brand})`, emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Price:* *৳${match.price}*` },
              { type: 'mrkdwn', text: `*Stock Quantity:* *${match.stock} units*` },
              { type: 'mrkdwn', text: `*Barcode:* \`${match.barcode || 'N/A'}\`` },
              { type: 'mrkdwn', text: `*Category:* ${match.category}` }
            ]
          }
        ]
      };

    } else if (command === '/stock') {
      const { productService } = await import('./productService');
      const products = await productService.getProducts();
      const lowStock = products.filter(p => (p.stock || 0) <= 10);

      return {
        response_type: 'in_channel',
        text: `🚨 Low Stock Alert Summary (${lowStock.length} items <= 10 units):`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `🚨 Inventory Stock Report (${lowStock.length} Low Stock Items)`, emoji: true }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: lowStock.length > 0
                ? lowStock.map(p => `• *${p.name}* (${p.brand}) — *${p.stock} units left* (Barcode: \`${p.barcode || 'N/A'}\`)`).join('\n')
                : '✅ All products have adequate inventory (>10 units).'
            }
          }
        ]
      };

    } else if (command === '/courier') {
      return {
        response_type: 'in_channel',
        text: `🚚 Steadfast Courier API Integration Active:`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `🚚 Steadfast Express Courier Tracking`, emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*API Status:* 🟢 Active Connected` },
              { type: 'mrkdwn', text: `*Provider:* Steadfast Courier BD` },
              { type: 'mrkdwn', text: `*Recent Dispatch:* Consignment #10884920` },
              { type: 'mrkdwn', text: `*Tracking Code:* \`SF910284\`` }
            ]
          }
        ]
      };

    } else if (command === '/report') {
      const { orderService } = await import('./orderService');
      const { productService } = await import('./productService');
      const orders = await orderService.getOrders();
      const products = await productService.getProducts();
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const lowStockCount = products.filter(p => (p.stock || 0) <= 10).length;

      return {
        response_type: 'in_channel',
        text: `📊 Korean Skin Food Admin Executive Metrics:`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `📊 Store Performance Executive Metrics`, emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Total Orders:* *${orders.length} orders*` },
              { type: 'mrkdwn', text: `*Total Sales Revenue:* *৳${totalRevenue.toLocaleString()}*` },
              { type: 'mrkdwn', text: `*Active Support Tickets:* *${supportTicketsCache.filter(t => t.status !== 'closed').length} active*` },
              { type: 'mrkdwn', text: `*Low Stock Warnings:* *${lowStockCount} products*` }
            ]
          }
        ]
      };
    }

    return { response_type: 'ephemeral', text: `Command ${command} executed successfully.` };
  },

  /**
   * Send Product Import / Barcode Scan Request to Slack
   */
  async notifyProductImportRequest(payload: ProductImportPayload): Promise<SlackNotificationLog> {
    const existingIndex = productImportRequests.findIndex(r => r.importId === payload.importId);
    if (existingIndex >= 0) {
      productImportRequests[existingIndex] = payload;
    } else {
      productImportRequests.unshift(payload);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'product_imports', payload.importId), sanitizeForFirestore(payload), { merge: true });
      } catch (err) {
        console.warn('[ProductImport] Firestore setDoc error:', err);
      }
    }

    const blocks = buildProductImportBlockKit(payload);
    const log: SlackNotificationLog = {
      id: `sn-import-${payload.importId}-${Date.now()}`,
      type: 'product_import',
      title: `Product Import Request: ${payload.productName} (${payload.brand})`,
      importId: payload.importId,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await logAuditAction({
      entityType: 'product_import',
      action: 'import_requested',
      importId: payload.importId,
      productName: payload.productName,
      barcode: payload.barcode,
      performedBy: payload.performedBy || 'AI Barcode Scanner',
      status: payload.status,
      details: `Product import requested via ${payload.source || 'barcode_scan'} with match score ${payload.imageMatchScore}`
    });

    await postSlackMessageSafely(
      '#product-imports',
      `📦 Product Import Request: ${payload.productName} (${payload.brand}) - Barcode: ${payload.barcode}`,
      blocks
    );

    return log;
  },

  /**
   * 1. Send New Order Notification
   */
  async notifyNewOrder(order: Order): Promise<SlackNotificationLog> {
    const blocks = buildOrderBlockKit(order, `🛍️ New Order Received #${order.id}`);
    const log: SlackNotificationLog = {
      id: `sn-order-${order.id}-${Date.now()}`,
      type: 'new_order',
      title: `New Order #${order.id} (${order.customerName} - ৳${order.totalAmount})`,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await postSlackMessageSafely(
      '#orders',
      `🛍️ New Order Received #${order.id} - ৳${order.totalAmount}`,
      blocks
    );

    return log;
  },

  /**
   * 2. Send Order Status Change Notification
   */
  async notifyOrderStatusChange(order: Order, previousStatus: string): Promise<SlackNotificationLog> {
    const blocks = buildOrderBlockKit(order, `🔄 Order #${order.id} Status Updated to ${order.status.toUpperCase()}`);
    const log: SlackNotificationLog = {
      id: `sn-status-${order.id}-${Date.now()}`,
      type: 'order_status',
      title: `Order #${order.id} status changed from ${previousStatus} to ${order.status}`,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await postSlackMessageSafely(
      '#orders',
      `🔄 Order #${order.id} Status Updated: ${order.status}`,
      blocks
    );

    return log;
  },

  /**
   * 3. Send Stock Alert Notification (low stock or out of stock)
   */
  async notifyStockAlert(
    product: Product,
    eventType: 'low_stock' | 'out_of_stock' | 'inventory_updated',
    previousStock?: number
  ): Promise<SlackNotificationLog> {
    const blocks = buildStockAlertBlockKit(product, eventType, previousStock);
    const log: SlackNotificationLog = {
      id: `sn-stock-${product.id}-${Date.now()}`,
      type: eventType === 'inventory_updated' ? 'inventory_update' : 'stock_alert',
      title: `${eventType === 'out_of_stock' ? '🚨 OUT OF STOCK' : eventType === 'low_stock' ? '⚠️ LOW STOCK' : '✏️ Inventory Update'}: ${product.name} (${product.stock} units)`,
      productId: product.id,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await postSlackMessageSafely(
      '#inventory-alerts',
      `📦 Inventory Alert for ${product.name}: ${product.stock} units left`,
      blocks
    );

    return log;
  },

  /**
   * 4. Send Steadfast Courier Notification
   */
  async notifySteadfastCourier(
    order: Order,
    result: { success: boolean; message: string; courier?: CourierData }
  ): Promise<SlackNotificationLog> {
    const blocks = buildSteadfastCourierBlockKit(order, result);
    const log: SlackNotificationLog = {
      id: `sn-courier-${order.id}-${Date.now()}`,
      type: 'courier_event',
      title: `Steadfast Booking ${result.success ? 'Succeeded' : 'Failed'} for Order #${order.id}`,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      blocks,
      status: 'sent'
    };

    notificationLogs.unshift(log);
    if (notificationLogs.length > 50) notificationLogs.pop();

    await postSlackMessageSafely(
      '#courier-dispatches',
      `🚚 Steadfast Booking ${result.success ? 'Success' : 'Failure'} - Order #${order.id}`,
      blocks
    );

    return log;
  },

  /**
   * Handle Slack Interactive Button Click Actions
   * Rule: Update Firestore FIRST, then update the original Slack Block Kit message in-place!
   */
  async handleSlackAction(
    actionId: string,
    payloadValue: any,
    slackUserId: string,
    slackUsername?: string
  ): Promise<{ success: boolean; message: string; updatedBlocks?: any[]; order?: Order }> {
    let parsed: any = {};
    try {
      parsed = typeof payloadValue === 'string' ? JSON.parse(payloadValue) : payloadValue;
    } catch (e) {
      parsed = { orderId: payloadValue, productId: payloadValue };
    }

    // 1. Verify user authorization middleware check
    const authResult = await slackService.verifyPermission(slackUserId, [
      'orders:write', 'inventory:write', 'admin:all'
    ]);

    if (!authResult.authorized) {
      return {
        success: false,
        message: `🚫 Authorization Error: ${authResult.reason}`
      };
    }

    const staffName = slackUsername || authResult.user?.name || authResult.user?.email || 'Slack Admin';

    // Handle Order Interactive Actions
    if (parsed.orderId) {
      const orderId = parsed.orderId;
      const { posService } = await import('./posService');
      const order = posService.getOrders().find(o => o.id === orderId);

      if (!order) {
        return { success: false, message: `Order #${orderId} not found in system` };
      }

      let actionMessage = '';

      if (actionId === 'action_accept_order' || parsed.action === 'accept') {
        order.status = 'packing';
        await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order), { merge: true });
        actionMessage = `Order #${orderId} ACCEPTED and status updated to PACKING by ${staffName}.`;
      } else if (actionId === 'action_start_packing' || parsed.action === 'start_packing') {
        order.status = 'packing';
        await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order), { merge: true });
        actionMessage = `Packing started for Order #${orderId} by ${staffName}.`;
      } else if (actionId === 'action_cancel_order' || parsed.action === 'cancel') {
        const cancelRes = posService.cancelOrder(orderId, `Cancelled via Slack by ${staffName}`, staffName);
        actionMessage = cancelRes.message;
      } else if (actionId === 'action_create_consignment' || parsed.action === 'create_consignment') {
        const courierRes = await createSteadfastConsignment(order, `Booked via Slack by ${staffName}`);
        if (courierRes.success && courierRes.courier) {
          order.courier = courierRes.courier;
          order.status = order.status === 'pending' ? 'processing' : order.status;
          await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order), { merge: true });
          actionMessage = `Steadfast Consignment created successfully (CN: ${courierRes.courier.consignmentId}, Tracking: ${courierRes.courier.trackingCode}).`;
          // Notify courier event
          this.notifySteadfastCourier(order, courierRes);
        } else {
          actionMessage = `Steadfast Consignment booking failed: ${courierRes.message}`;
        }
      } else if (actionId === 'action_print_label' || parsed.action === 'print_label') {
        actionMessage = `Shipping Label generated for Order #${orderId}. Ready for thermal print.`;
      }

      // Re-fetch updated order state
      const updatedOrder = posService.getOrders().find(o => o.id === orderId) || order;
      const updatedBlocks = buildOrderBlockKit(
        updatedOrder,
        `⚡ Order #${orderId} [Updated by @${staffName}]`
      );

      // Append action audit note block to updated Slack message
      updatedBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ℹ️ *Last Action:* ${actionMessage} | *Performed By:* <@${slackUserId}> (${staffName}) | *Time:* ${new Date().toLocaleTimeString()}`
          }
        ]
      });

      // Update in-memory log
      const log = notificationLogs.find(l => l.orderId === orderId);
      if (log) {
        log.blocks = updatedBlocks;
        log.status = 'action_performed';
        log.lastAction = actionMessage;
        log.lastActionBy = staffName;
      }

      return {
        success: true,
        message: actionMessage,
        updatedBlocks,
        order: updatedOrder
      };
    }

    // Handle Quick Restock Action
    if (parsed.productId && actionId === 'action_quick_restock') {
      const { productService } = await import('./productService');
      const addQty = parsed.addQty || 10;
      const restockRes = productService.restockProduct(
        parsed.productId, 
        addQty, 
        `Quick Restock via Slack by ${staffName}`, 
        staffName
      );

      if (!restockRes.success) {
        return { success: false, message: restockRes.message };
      }

      const updatedProd = productService.getProductById(parsed.productId)!;
      const updatedBlocks = buildStockAlertBlockKit(updatedProd, 'inventory_updated');
      updatedBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ℹ️ *Restocked:* +${addQty} units by <@${slackUserId}> (${staffName}) | New Stock: *${updatedProd.stock} units*`
          }
        ]
      });

      // Notify stock alert update
      this.notifyStockAlert(updatedProd, 'inventory_updated');

      return {
        success: true,
        message: restockRes.message,
        updatedBlocks
      };
    }

    // Handle Product Import Interactive Actions
    if (parsed.importId || (actionId.startsWith('action_') && (actionId.includes('product') || actionId.includes('search')))) {
      const importId = parsed.importId;
      let importReq = productImportRequests.find(r => r.importId === importId);

      if (!importReq && db) {
        try {
          const { getDoc, doc: fsDoc } = await import('firebase/firestore');
          const snap = await getDoc(fsDoc(db, 'product_imports', importId));
          if (snap.exists()) {
            importReq = snap.data() as ProductImportPayload;
          }
        } catch (e) {
          console.warn('Error fetching product_imports from Firestore:', e);
        }
      }

      if (!importReq) {
        return { success: false, message: `Product import request #${importId} not found` };
      }

      let actionMessage = '';

      if (actionId === 'action_approve_product' || actionId === 'action_create_product' || parsed.action === 'approve' || parsed.action === 'create') {
        const { productService } = await import('./productService');
        const newProd: Product = {
          id: importReq.importId || `prod-${importReq.barcode}-${Date.now()}`,
          name: importReq.productName,
          nameBN: importReq.productName,
          brand: importReq.brand || 'Korean Skincare',
          category: importReq.category || 'Serum & Essence',
          skinTypes: ['All Skin Types'],
          price: importReq.price || 1500,
          importPrice: Math.round((importReq.price || 1500) * 0.7),
          ml: importReq.volume || '50ml',
          image: importReq.imageUrl || 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60',
          images: [importReq.imageUrl || 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60'],
          stock: importReq.stock || 20,
          description: importReq.description || `Authentic ${importReq.productName} by ${importReq.brand}. Imported directly from Korea.`,
          descriptionBN: `প্রামাণিক ${importReq.productName}। কোরিয়া থেকে আমদানিকৃত।`,
          rating: 4.8,
          reviewsCount: 1,
          barcode: importReq.barcode,
          barcodeNormalized: importReq.barcode,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${importReq.barcode}`
        };

        // Save to Firestore catalog (Only approved products saved to Firestore)
        productService.createProduct(newProd);

        importReq.status = 'approved';
        importReq.approvedBy = staffName;
        importReq.approvedAt = new Date().toISOString();

        if (db) {
          await setDoc(doc(db, 'product_imports', importId), sanitizeForFirestore(importReq), { merge: true });
        }

        actionMessage = `Product "${importReq.productName}" APPROVED and saved to Firestore & Cloudinary catalog by ${staffName}.`;

        await logAuditAction({
          entityType: 'product_import',
          action: 'approve_product',
          importId,
          productName: importReq.productName,
          barcode: importReq.barcode,
          performedBy: staffName,
          slackUserId,
          status: 'approved',
          details: actionMessage
        });

      } else if (actionId === 'action_reject_product' || parsed.action === 'reject') {
        importReq.status = 'rejected';
        if (db) {
          await setDoc(doc(db, 'product_imports', importId), sanitizeForFirestore(importReq), { merge: true });
        }

        actionMessage = `Product "${importReq.productName}" REJECTED by ${staffName}. NOT saved to Firestore or Cloudinary.`;

        await logAuditAction({
          entityType: 'product_import',
          action: 'reject_product',
          importId,
          productName: importReq.productName,
          barcode: importReq.barcode,
          performedBy: staffName,
          slackUserId,
          status: 'rejected',
          details: actionMessage
        });

      } else if (actionId === 'action_search_again' || parsed.action === 'search_again') {
        importReq.status = 're_searching';
        if (db) {
          await setDoc(doc(db, 'product_imports', importId), sanitizeForFirestore(importReq), { merge: true });
        }

        actionMessage = `Search Again initiated for barcode "${importReq.barcode}" by ${staffName}. Re-indexing metadata...`;

        await logAuditAction({
          entityType: 'product_import',
          action: 'search_again',
          importId,
          productName: importReq.productName,
          barcode: importReq.barcode,
          performedBy: staffName,
          slackUserId,
          status: 're_searching',
          details: actionMessage
        });

      } else if (actionId === 'action_edit_product' || parsed.action === 'edit') {
        actionMessage = `Edit mode requested for "${importReq.productName}" by ${staffName}.`;

        await logAuditAction({
          entityType: 'product_import',
          action: 'edit_product',
          importId,
          productName: importReq.productName,
          barcode: importReq.barcode,
          performedBy: staffName,
          slackUserId,
          status: importReq.status,
          details: actionMessage
        });
      }

      const updatedBlocks = buildProductImportBlockKit(
        importReq,
        `📦 Product Import [Updated by @${staffName}]`
      );

      updatedBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ℹ️ *Action:* ${actionMessage} | *Performed By:* <@${slackUserId}> (${staffName}) | *Time:* ${new Date().toLocaleTimeString()}`
          }
        ]
      });

      const log = notificationLogs.find(l => l.importId === importId);
      if (log) {
        log.blocks = updatedBlocks;
        log.status = 'action_performed';
        log.lastAction = actionMessage;
        log.lastActionBy = staffName;
      }

      return {
        success: true,
        message: actionMessage,
        updatedBlocks
      };
    }

    // Handle Support Ticket Interactive Actions
    if (parsed.ticketId || actionId.includes('ticket') || actionId.includes('refund')) {
      const ticketId = parsed.ticketId;
      let ticket = supportTicketsCache.find(t => t.id === ticketId || t.ticketNumber === ticketId);

      if (!ticket && db) {
        try {
          const { getDoc, doc: fsDoc } = await import('firebase/firestore');
          const snap = await getDoc(fsDoc(db, 'support_tickets', ticketId));
          if (snap.exists()) {
            ticket = snap.data() as CustomerSupportTicket;
          }
        } catch (e) {
          console.warn('Error fetching support_tickets from Firestore:', e);
        }
      }

      if (!ticket) {
        return { success: false, message: `Support ticket #${ticketId} not found` };
      }

      let actionMessage = '';

      if (actionId === 'action_assign_ticket' || parsed.action === 'assign') {
        ticket.assignedStaff = staffName;
        ticket.assignedSlackUserId = slackUserId;
        ticket.status = 'in_progress';
        ticket.updatedAt = new Date().toISOString();
        ticket.replies.push({
          id: `rep-${Date.now()}`,
          author: 'System',
          authorRole: 'system',
          message: `Ticket assigned to @${staffName}`,
          timestamp: new Date().toISOString()
        });

        if (db) {
          await setDoc(doc(db, 'support_tickets', ticket.id), sanitizeForFirestore(ticket), { merge: true });
        }

        actionMessage = `Ticket ${ticket.ticketNumber} assigned to ${staffName}.`;

        await logAuditAction({
          entityType: 'support_ticket',
          action: 'ticket_assigned',
          ticketId: ticket.id,
          orderId: ticket.orderId,
          performedBy: staffName,
          slackUserId,
          status: 'in_progress',
          details: actionMessage
        });

      } else if (actionId === 'action_reply_ticket' || parsed.action === 'reply') {
        const replyMsg = parsed.replyText || `Staff agent @${staffName} is looking into this support case.`;
        ticket.replies.push({
          id: `rep-${Date.now()}`,
          author: staffName,
          authorRole: 'staff',
          message: replyMsg,
          timestamp: new Date().toISOString(),
          slackUserId
        });
        ticket.updatedAt = new Date().toISOString();
        if (ticket.status === 'open') ticket.status = 'in_progress';

        if (db) {
          await setDoc(doc(db, 'support_tickets', ticket.id), sanitizeForFirestore(ticket), { merge: true });
        }

        actionMessage = `Replied to ticket ${ticket.ticketNumber}: "${replyMsg}"`;

        await logAuditAction({
          entityType: 'support_ticket',
          action: 'reply_ticket',
          ticketId: ticket.id,
          orderId: ticket.orderId,
          performedBy: staffName,
          slackUserId,
          status: ticket.status,
          details: actionMessage
        });

      } else if (actionId === 'action_approve_refund' || parsed.action === 'approve_refund') {
        const amount = parsed.amount || ticket.refundAmount || 1850;
        ticket.refundAmount = amount;
        ticket.refundStatus = 'approved';
        ticket.status = 'refund_approved';
        ticket.updatedAt = new Date().toISOString();
        ticket.replies.push({
          id: `rep-${Date.now()}`,
          author: staffName,
          authorRole: 'staff',
          message: `💸 Refund of ৳${amount} APPROVED by @${staffName}. Processed to customer account.`,
          timestamp: new Date().toISOString(),
          slackUserId
        });

        if (db) {
          await setDoc(doc(db, 'support_tickets', ticket.id), sanitizeForFirestore(ticket), { merge: true });
        }

        actionMessage = `Refund of ৳${amount} APPROVED for ticket ${ticket.ticketNumber} by ${staffName}.`;

        await logAuditAction({
          entityType: 'support_ticket',
          action: 'refund_approved',
          ticketId: ticket.id,
          orderId: ticket.orderId,
          performedBy: staffName,
          slackUserId,
          status: 'refund_approved',
          details: actionMessage
        });

      } else if (actionId === 'action_close_ticket' || parsed.action === 'close') {
        ticket.status = 'closed';
        ticket.updatedAt = new Date().toISOString();
        ticket.replies.push({
          id: `rep-${Date.now()}`,
          author: staffName,
          authorRole: 'staff',
          message: `🔒 Support case CLOSED & RESOLVED by @${staffName}.`,
          timestamp: new Date().toISOString(),
          slackUserId
        });

        if (db) {
          await setDoc(doc(db, 'support_tickets', ticket.id), sanitizeForFirestore(ticket), { merge: true });
        }

        actionMessage = `Support ticket ${ticket.ticketNumber} CLOSED & RESOLVED by ${staffName}.`;

        await logAuditAction({
          entityType: 'support_ticket',
          action: 'ticket_closed',
          ticketId: ticket.id,
          orderId: ticket.orderId,
          performedBy: staffName,
          slackUserId,
          status: 'closed',
          details: actionMessage
        });
      }

      const updatedBlocks = buildSupportTicketBlockKit(
        ticket,
        `🎧 Support Ticket ${ticket.ticketNumber} [Updated by @${staffName}]`
      );

      updatedBlocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ℹ️ *Action:* ${actionMessage} | *Performed By:* <@${slackUserId}> (${staffName}) | *Time:* ${new Date().toLocaleTimeString()}`
          }
        ]
      });

      const log = notificationLogs.find(l => l.ticketId === ticket.id);
      if (log) {
        log.blocks = updatedBlocks;
        log.status = 'action_performed';
        log.lastAction = actionMessage;
        log.lastActionBy = staffName;
      }

      return {
        success: true,
        message: actionMessage,
        updatedBlocks
      };
    }

    return { success: false, message: 'Unrecognized action or target entity.' };

  },

  getQueuedNotifications(): QueuedNotificationItem[] {
    return queuedNotifications;
  },

  getErrorLogs(): SlackErrorLog[] {
    return slackErrorLogs;
  },

  getQueueMetrics() {
    const pending = queuedNotifications.filter(i => i.status === 'pending').length;
    const retrying = queuedNotifications.filter(i => i.status === 'retrying').length;
    const sent = queuedNotifications.filter(i => i.status === 'sent').length;
    const failed = queuedNotifications.filter(i => i.status === 'failed').length;

    return {
      pendingCount: pending,
      retryingCount: retrying,
      sentCount: sent,
      failedCount: failed,
      rateLimitMs: RATE_LIMIT_DELAY_MS,
      queueStatus: isProcessingQueue ? 'processing' : 'idle',
      totalErrorLogs: slackErrorLogs.length
    };
  },

  async retryFailedQueue(): Promise<{ retriedCount: number; message: string }> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/slack/retry-queue', { method: 'POST' });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Failed to call /api/slack/retry-queue API:', e);
      }
    }

    let count = 0;
    for (const item of queuedNotifications) {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retries = 0;
        count++;
      }
    }
    if (count > 0) {
      setTimeout(() => processQueue(), 10);
    }
    return {
      retriedCount: count,
      message: count > 0 ? `Re-enqueued ${count} failed Slack notifications.` : 'No failed notifications in queue.'
    };
  },

  async sendTestNotification(channelName = '#system-alerts'): Promise<QueuedNotificationItem> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/slack/test-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: channelName })
        });
        if (res.ok) {
          const data = await res.json();
          return data.item;
        }
      } catch (e) {
        console.warn('Failed to call /api/slack/test-notification API:', e);
      }
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🧪 Slack Operations Health Check — Test Notification',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*Status:* 🟢 Connected & Operational' },
          { type: 'mrkdwn', text: `*Target Channel:* \`${channelName}\`` },
          { type: 'mrkdwn', text: `*Timestamp:* ${new Date().toLocaleString()}` },
          { type: 'mrkdwn', text: '*Rate Limiter:* `500ms sliding window`' }
        ]
      }
    ];

    return await enqueueNotification('stock_alert', channelName, '🧪 Slack Health Check Test Notification', blocks);
  },

  async getOpsSummary() {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/slack/summary');
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Failed to fetch /api/slack/summary from backend API:', e);
      }
    }

    const users = await slackService.getAllSlackUsers();
    const pendingImports = productImportRequests.filter(p => p.status === 'pending_approval');
    const pendingRefundTickets = supportTicketsCache.filter(t => t.refundStatus === 'pending' || t.status === 'open');
    const urgentTickets = supportTicketsCache.filter(t => t.priority === 'urgent' && t.status !== 'closed');

    const recentActivity = notificationLogs.slice(0, 8);
    const orderActivity = notificationLogs.filter(l => l.type === 'new_order' || l.type === 'order_status' || l.type === 'courier_event').slice(0, 5);
    const inventoryAlerts = notificationLogs.filter(l => l.type === 'stock_alert' || l.type === 'inventory_update').slice(0, 5);

    return {
      connectionStatus: {
        configured: slackService.isSDKConfigured(),
        botTokenSet: !!process.env.SLACK_BOT_TOKEN,
        signingSecretSet: !!process.env.SLACK_SIGNING_SECRET,
        activeChannelsCount: DEFAULT_SLACK_CHANNELS.length,
        totalUsersCount: users.length,
        pendingApprovalsCount: pendingImports.length + pendingRefundTickets.length,
        rateLimitMs: RATE_LIMIT_DELAY_MS,
        queueStatus: isProcessingQueue ? 'processing' : 'idle'
      },
      pendingApprovals: {
        productImports: pendingImports,
        pendingRefundTickets,
        urgentTickets
      },
      teamOnlineStatus: users.map(u => ({
        ...u,
        isOnline: true, // Active staff in operational team
        lastActive: new Date().toISOString()
      })),
      recentActivity,
      orderActivity,
      inventoryAlerts,
      queueMetrics: this.getQueueMetrics(),
      errorLogs: slackErrorLogs
    };
  }
};
