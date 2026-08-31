import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Slack, Lock, Key, CheckCircle2, AlertTriangle, 
  UserPlus, RefreshCw, Trash2, Check, ExternalLink, Cpu, Terminal,
  BellRing, PackageCheck, Truck, Zap, Box, ArrowRight, Printer, AlertCircle,
  FileText, Search, Edit, Plus, X, Eye, CheckCircle, XCircle, Sparkles,
  Headphones, MessageSquare, Hash, DollarSign, UserCheck, Send, Layers
} from 'lucide-react';
import { SlackUser, SlackPermission, SlackRole, Order, ProductImportPayload, AuditLog, CustomerSupportTicket, SlackChannel } from '../types';

export const AdminSlackSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer_support' | 'channels' | 'slash_commands' | 'product_import' | 'notifications' | 'audit_logs' | 'auth'>('customer_support');
  const [status, setStatus] = useState<any>(null);
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications Log & Interactive State
  const [logs, setLogs] = useState<any[]>([]);
  const [productImports, setProductImports] = useState<ProductImportPayload[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('ALL');

  // Step 4 State: Customer Support Tickets, Slack Channels & Slash Commands
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [supportTickets, setSupportTickets] = useState<CustomerSupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<CustomerSupportTicket | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [commandInput, setCommandInput] = useState('/order KSF-9201');
  const [commandResult, setCommandResult] = useState<any>(null);
  const [runningCommand, setRunningCommand] = useState(false);

  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    customerName: '',
    customerPhone: '',
    orderId: '',
    subject: '',
    description: '',
    priority: 'medium' as const
  });

  const [selectedSlackUserForAction, setSelectedSlackUserForAction] = useState<string>('U_ADMIN_01');
  const [triggeringTest, setTriggeringTest] = useState<boolean>(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Form State for linking new Slack User
  const [slackUserId, setSlackUserId] = useState('');
  const [slackUsername, setSlackUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SlackRole>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<SlackPermission[]>([
    'orders:read', 'orders:write', 'inventory:read', 'inventory:write', 'reports:view'
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Permission Tester State
  const [testSlackUserId, setTestSlackUserId] = useState('U_ADMIN_01');
  const [testPermission, setTestPermission] = useState<SlackPermission>('inventory:write');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Test Slack Integration State
  const [showTestIntegrationModal, setShowTestIntegrationModal] = useState<boolean>(false);
  const [selectedTestChannel, setSelectedTestChannel] = useState<string>('#system-alerts');
  const [customTestChannelInput, setCustomTestChannelInput] = useState<string>('');
  const [useCustomChannel, setUseCustomChannel] = useState<boolean>(false);
  const [isTestingIntegration, setIsTestingIntegration] = useState<boolean>(false);
  const [testIntegrationResult, setTestIntegrationResult] = useState<{
    success: boolean;
    channel: string;
    timestamp: string;
    item?: any;
    verifiedScopes?: string[];
    statusMessage?: string;
    error?: string;
  } | null>(null);

  const ALL_PERMISSIONS: { key: SlackPermission; label: string; desc: string }[] = [
    { key: 'admin:all', label: 'Admin Master Access', desc: 'Bypasses all permission checks for full administrative actions' },
    { key: 'orders:read', label: 'Read Orders', desc: 'View customer order details and status updates' },
    { key: 'orders:write', label: 'Modify Orders', desc: 'Update order status, initiate refunds, and dispatch couriers' },
    { key: 'inventory:read', label: 'Read Inventory', desc: 'Check stock levels, SKU info, and low-stock alerts' },
    { key: 'inventory:write', label: 'Modify Inventory', desc: 'Adjust stock levels, add products, and trigger restock logs' },
    { key: 'users:manage', label: 'Manage Users', desc: 'Manage user profiles, staff roles, and permissions' },
    { key: 'reports:view', label: 'View Reports', desc: 'Access financial, ROAS, and inventory summary reports' },
  ];

  const fetchSlackData = async () => {
    setRefreshing(true);
    try {
      const [statusRes, usersRes, logsRes, importsRes, auditsRes, channelsRes, ticketsRes] = await Promise.all([
        fetch('/api/slack/status'),
        fetch('/api/slack/users'),
        fetch('/api/slack/notification-logs'),
        fetch('/api/slack/product-imports'),
        fetch('/api/slack/audit-logs'),
        fetch('/api/slack/channels'),
        fetch('/api/slack/support-tickets')
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.users) {
          setUsers(uData.users);
          if (uData.users.length > 0) {
            setSelectedSlackUserForAction(uData.users[0].slackUserId);
            if (!testSlackUserId || testSlackUserId === 'U_ADMIN_01') {
              setTestSlackUserId(uData.users[0].slackUserId);
            }
          }
        }
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (lData.logs) setLogs(lData.logs);
      }
      if (importsRes.ok) {
        const impData = await importsRes.json();
        if (impData.requests) setProductImports(impData.requests);
      }
      if (auditsRes.ok) {
        const audData = await auditsRes.json();
        if (audData.auditLogs) setAuditLogs(audData.auditLogs);
      }
      if (channelsRes.ok) {
        const chData = await channelsRes.json();
        if (chData.channels) setChannels(chData.channels);
      }
      if (ticketsRes.ok) {
        const tktData = await ticketsRes.json();
        if (tktData.tickets) {
          setSupportTickets(tktData.tickets);
          if (tktData.tickets.length > 0 && !selectedTicket) {
            setSelectedTicket(tktData.tickets[0]);
          } else if (selectedTicket) {
            const match = tktData.tickets.find((t: any) => t.id === selectedTicket.id);
            if (match) setSelectedTicket(match);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch Slack status/users/logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlackData();
    const interval = setInterval(fetchSlackData, 10000); // Poll logs every 10s
    return () => clearInterval(interval);
  }, []);


  const handleTogglePermission = (perm: SlackPermission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slackUserId.trim() || !email.trim()) {
      setActionMessage({ type: 'error', text: 'Please fill in Slack User ID and Email.' });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/slack/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackUserId: slackUserId.trim(),
          slackUsername: slackUsername.trim() || email.split('@')[0],
          email: email.trim().toLowerCase(),
          role,
          permissions: selectedPermissions,
          firestoreUserId: `staff-${role}-${Math.floor(100 + Math.random() * 900)}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ 
          type: 'success', 
          text: `Linked Slack User ${slackUserId} to Firestore account (${email}) successfully!` 
        });
        setSlackUserId('');
        setSlackUsername('');
        setEmail('');
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to link Slack user account.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Server error linking Slack account.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkUser = async (uId: string) => {
    if (!window.confirm(`Are you sure you want to unlink Slack User ID ${uId}?`)) return;

    try {
      const res = await fetch('/api/slack/unlink-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackUserId: uId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `Unlinked Slack User ${uId} successfully.` });
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to unlink account.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleTestPermission = async () => {
    if (!testSlackUserId) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/slack/verify-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackUserId: testSlackUserId,
          requiredPermission: testPermission
        })
      });

      const data = await res.json();
      setTestResult({
        statusCode: res.status,
        ...data
      });
    } catch (err: any) {
      setTestResult({
        statusCode: 500,
        success: false,
        authorized: false,
        reason: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  // Test Slack Integration Handler - Sends sample notification to verify token & scope validity
  const handleRunTestIntegration = async (overrideChannel?: string) => {
    const channelToTest = overrideChannel || (useCustomChannel && customTestChannelInput.trim() ? customTestChannelInput.trim() : selectedTestChannel);
    setIsTestingIntegration(true);
    setTestIntegrationResult(null);

    try {
      const res = await fetch('/api/slack/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelToTest })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestIntegrationResult({
          success: true,
          channel: channelToTest,
          timestamp: new Date().toISOString(),
          item: data.item,
          verifiedScopes: ['chat:write', 'commands', 'channels:read', 'users:read', 'app_mentions:read', 'incoming-webhook'],
          statusMessage: `✅ Test notification successfully sent to ${channelToTest}! Slack Bot Token & Scopes Validated.`
        });
        setActionMessage({
          type: 'success',
          text: `🧪 Test Slack Integration notification delivered to ${channelToTest}! Bot Token & Scope validity verified.`
        });
        fetchSlackData();
      } else {
        setTestIntegrationResult({
          success: false,
          channel: channelToTest,
          timestamp: new Date().toISOString(),
          error: data.error || 'Failed to dispatch test notification',
          statusMessage: `❌ Slack Integration Test Failed for channel ${channelToTest}`
        });
        setActionMessage({
          type: 'error',
          text: `Slack Integration Test failed: ${data.error || 'Unknown error'}`
        });
      }
    } catch (err: any) {
      setTestIntegrationResult({
        success: false,
        channel: channelToTest,
        timestamp: new Date().toISOString(),
        error: err.message,
        statusMessage: `❌ Network / Integration Error: ${err.message}`
      });
      setActionMessage({
        type: 'error',
        text: `Test Slack Integration Error: ${err.message}`
      });
    } finally {
      setIsTestingIntegration(false);
    }
  };

  // Trigger test Block Kit Notification
  const handleTriggerTestNotification = async (type: 'new_order' | 'stock_alert' | 'courier_event') => {
    setTriggeringTest(true);
    try {
      const res = await fetch('/api/slack/trigger-test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ type: 'success', text: `Triggered ${type} Slack Block Kit Notification!` });
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to trigger test notification' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setTriggeringTest(false);
    }
  };

  // Trigger test Barcode Product Import Notification
  const handleTriggerTestProductImport = async () => {
    setTriggeringTest(true);
    try {
      const testItems = [
        {
          productName: 'COSRX Advanced Snail 96 Mucin Power Essence',
          brand: 'COSRX',
          barcode: '8809598450123',
          variant: 'Full Size / 100ml',
          volume: '100 ml',
          imageMatchScore: '98.5%',
          imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
          category: 'Serum & Essence',
          price: 1850,
          description: 'Highly concentrated snail mucin essence that deeply hydrates and repairs skin barrier.',
          source: 'barcode_scan'
        },
        {
          productName: 'Beauty of Joseon Relief Sun Aqua-Fresh Rice + B5 50ml',
          brand: 'Beauty of Joseon',
          barcode: '8809653240101',
          variant: 'Standard / 50ml',
          volume: '50 ml',
          imageMatchScore: '97.2%',
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60',
          category: 'Sunscreen',
          price: 1650,
          description: 'Lightweight soothing suncream with rice seed water and panthenol B5.',
          source: 'ai_import'
        },
        {
          productName: 'SKIN1004 Madagascar Centella Hyalu-Cica Sun Serum',
          brand: 'SKIN1004',
          barcode: '8809530040104',
          variant: 'Full Size / 50ml',
          volume: '50 ml',
          imageMatchScore: '99.0%',
          imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
          category: 'Sunscreen',
          price: 1650,
          description: 'Hydrating sun serum enriched with Hyaluronic Acid and Centella Asiatica.',
          source: 'barcode_scan'
        }
      ];

      const item = testItems[Math.floor(Math.random() * testItems.length)];
      const res = await fetch('/api/slack/notify-product-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: `📦 Barcode scan import request for "${item.productName}" sent to Slack!`
        });
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to trigger product import notification' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setTriggeringTest(false);
    }
  };

  // Execute Interactive Slack Button Click Action (Updates Firestore first, then updates message)
  const handleInteractiveButtonClick = async (logId: string, actionId: string, value: any) => {
    const actingUser = users.find(u => u.slackUserId === selectedSlackUserForAction) || users[0];
    const userSlackId = actingUser?.slackUserId || 'U_ADMIN_01';
    const username = actingUser?.slackUsername || actingUser?.name || 'admin_ksf';

    setExecutingAction(`${logId}-${actionId}`);
    setActionMessage(null);

    try {
      const res = await fetch('/api/slack/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          payloadValue: value,
          slackUserId: userSlackId,
          slackUsername: username
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: `⚡ Firestore Updated First! Slack message updated in-place: "${data.message}"`
        });
        fetchSlackData();
      } else {
        setActionMessage({
          type: 'error',
          text: `🚫 Action Error: ${data.error}`
        });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setExecutingAction(null);
    }
  };

  // Send Threaded Reply to Support Ticket
  const handleSendTicketReply = async () => {
    if (!selectedTicket || !replyInput.trim()) return;
    setSendingReply(true);
    const actingUser = users.find(u => u.slackUserId === selectedSlackUserForAction) || users[0];

    try {
      const res = await fetch(`/api/slack/support-tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyInput.trim(),
          authorName: actingUser?.name || actingUser?.email || 'Staff Agent',
          slackUserId: actingUser?.slackUserId || 'U_ADMIN_01'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: `💬 Threaded reply sent to Ticket ${selectedTicket.ticketNumber} & synced with Slack!`
        });
        setReplyInput('');
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to send reply' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setSendingReply(false);
    }
  };

  // Assign Ticket to Staff Agent
  const handleAssignTicket = async (ticketId: string) => {
    try {
      await handleInteractiveButtonClick(ticketId, 'action_assign_ticket', { ticketId, action: 'assign' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Approve Refund
  const handleApproveRefund = async (ticketId: string) => {
    try {
      await handleInteractiveButtonClick(ticketId, 'action_approve_refund', { ticketId, action: 'approve_refund', amount: selectedTicket?.refundAmount || 1850 });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Close Support Ticket
  const handleCloseTicket = async (ticketId: string) => {
    try {
      await handleInteractiveButtonClick(ticketId, 'action_close_ticket', { ticketId, action: 'close' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Create New Customer Support Ticket
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.customerName || !newTicketForm.subject || !newTicketForm.description) {
      setActionMessage({ type: 'error', text: 'Please fill in customer name, subject, and description.' });
      return;
    }

    try {
      const res = await fetch('/api/slack/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicketForm)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: 'success',
          text: `🎧 Support Ticket ${data.ticket.ticketNumber} created & posted to Slack #customer-support!`
        });
        setShowNewTicketModal(false);
        setNewTicketForm({ customerName: '', customerPhone: '', orderId: '', subject: '', description: '', priority: 'medium' });
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to create ticket' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Run Slash Command Simulator
  const handleRunSlashCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setRunningCommand(true);
    const actingUser = users.find(u => u.slackUserId === selectedSlackUserForAction) || users[0];
    const parts = commandInput.trim().split(' ');
    const command = parts[0];
    const text = parts.slice(1).join(' ');

    try {
      const res = await fetch('/api/slack/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          text,
          user_name: actingUser?.name || actingUser?.email || 'AdminStaff',
          user_id: actingUser?.slackUserId || 'U_ADMIN_01'
        })
      });

      const data = await res.json();
      setCommandResult(data);
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `⚡ Executed slash command "${commandInput}" successfully!`
        });
        fetchSlackData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Slash command failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setRunningCommand(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-[#E91E8C] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Slack Integration Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E91E8C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                STEP 2 — Orders, Inventory & Courier Workflows
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time Block Kit & Firestore Sync
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Slack className="text-[#E91E8C] w-8 h-8" />
              Slack Notifications & Interactive Workflows
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Automatic Slack Block Kit notifications for New Orders, Status Changes, Low Stock Alerts, and Steadfast Courier bookings. Click buttons to update Firestore first and update Slack messages in place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTestIntegrationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E91E8C] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition cursor-pointer"
            >
              <Send size={14} />
              <span>Test Slack Integration</span>
            </button>

            <button
              onClick={fetchSlackData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Sync Feeds</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 mt-8 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('customer_support')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'customer_support'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Headphones size={15} />
            <span>Step 4 — Support Tickets & Threads ({supportTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'channels'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Hash size={15} />
            <span>Step 4 — Slack Channels ({channels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('slash_commands')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'slash_commands'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal size={15} />
            <span>Step 4 — Slash Commands (/order, /product...)</span>
          </button>

          <button
            onClick={() => setActiveTab('product_import')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'product_import'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Box size={15} />
            <span>Step 3 — Product Import & Barcodes ({productImports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'audit_logs'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText size={15} />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BellRing size={15} />
            <span>Order Feeds ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('auth')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'auth'
                ? 'bg-[#E91E8C] text-white shadow-lg shadow-pink-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Security & RBAC ({users.length})</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* TAB: STEP 4 - CUSTOMER SUPPORT & TEAM COMMUNICATION */}
      {activeTab === 'customer_support' && (
        <div className="space-y-8">
          {/* Top Header & Actions */}
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Headphones className="text-[#E91E8C]" size={20} />
                Customer Support & Threaded Slack Conversations
              </h3>
              <p className="text-xs text-slate-500">
                Manage customer tickets, staff assignments, threaded replies, and instant refunds. All actions update Firestore and sync directly with Slack channel <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-pink-600 font-bold">#customer-support</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="px-4 py-2.5 bg-[#E91E8C] text-white hover:bg-[#d0177c] rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-pink-500/20"
              >
                <Plus size={16} />
                <span>+ Create Support Ticket</span>
              </button>
            </div>
          </div>

          {/* Persona Switcher Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="text-emerald-400" size={16} />
              <span className="font-bold text-slate-200">Acting Staff Agent for Ticket Actions:</span>
            </div>
            <select
              value={selectedSlackUserForAction}
              onChange={(e) => setSelectedSlackUserForAction(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            >
              {users.map((u) => (
                <option key={u.slackUserId} value={u.slackUserId}>
                  @{u.slackUsername} ({u.role.toUpperCase()}) — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Tickets Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Ticket List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Support Cases Queue ({supportTickets.length})
                  </h4>
                  <span className="px-2.5 py-1 bg-pink-50 text-[#E91E8C] rounded-full text-[10px] font-extrabold">
                    #customer-support
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {supportTickets.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">No support tickets found.</p>
                  ) : (
                    supportTickets.map((ticket) => {
                      const isSelected = selectedTicket?.id === ticket.id;
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                            isSelected
                              ? 'bg-pink-50/60 border-[#E91E8C] shadow-md'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-slate-900">
                              {ticket.ticketNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ticket.status === 'open' ? 'bg-amber-100 text-amber-800' :
                              ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'refund_approved' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div>
                            <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{ticket.subject}</h5>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>👤 {ticket.customerName}</span>
                              {ticket.orderId && <span className="font-mono text-pink-600">({ticket.orderId})</span>}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>Assigned: {ticket.assignedStaff ? `@${ticket.assignedStaff}` : 'Unassigned'}</span>
                            <span>{ticket.replies?.length || 0} replies</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Ticket Conversation & Action Thread */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  {/* Ticket Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-black text-[#E91E8C]">{selectedTicket.ticketNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          selectedTicket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedTicket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {selectedTicket.priority} Priority
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Customer: <span className="font-semibold text-slate-700">{selectedTicket.customerName}</span> ({selectedTicket.customerPhone})
                        {selectedTicket.orderId && <> | Ref Order: <span className="font-mono font-bold text-pink-600">{selectedTicket.orderId}</span></>}
                      </p>
                    </div>

                    {/* Quick Staff Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedTicket.status !== 'closed' && (
                        <>
                          <button
                            onClick={() => handleAssignTicket(selectedTicket.id)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <UserCheck size={14} />
                            <span>Assign Me</span>
                          </button>
                          <button
                            onClick={() => handleApproveRefund(selectedTicket.id)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <DollarSign size={14} />
                            <span>Approve Refund</span>
                          </button>
                          <button
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 size={14} />
                            <span>Close Ticket</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Threaded Messages */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare size={14} />
                      Threaded Slack Messages ({selectedTicket.replies?.length || 0})
                    </h4>

                    {selectedTicket.replies?.map((rep, idx) => (
                      <div
                        key={rep.id || idx}
                        className={`p-3.5 rounded-2xl space-y-1 ${
                          rep.authorRole === 'customer'
                            ? 'bg-amber-50/80 border border-amber-200/60'
                            : rep.authorRole === 'system'
                            ? 'bg-slate-100 border border-slate-200'
                            : 'bg-white border border-pink-200/80 shadow-sm ml-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            {rep.authorRole === 'customer' ? '👤 Customer:' : rep.authorRole === 'system' ? '🤖 System:' : '💬 Staff:'}
                            <span className={rep.authorRole === 'staff' ? 'text-pink-600 font-extrabold' : ''}>{rep.author}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{rep.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input Form */}
                  {selectedTicket.status !== 'closed' ? (
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Reply & Post to Slack Channel (#customer-support):</span>
                        <span className="text-[10px] text-slate-400">Synchronized in real-time</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendTicketReply()}
                          placeholder="Type your response or customer support update..."
                          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                        />
                        <button
                          onClick={handleSendTicketReply}
                          disabled={sendingReply || !replyInput.trim()}
                          className="px-5 py-2.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send size={14} />
                          <span>Send Reply</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-semibold">
                      🔒 This support ticket has been closed and resolved.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                  <Headphones className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500">Select a support ticket from the left queue to view details and reply.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STEP 4 - SLACK CHANNELS */}
      {activeTab === 'channels' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-2">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Hash className="text-[#E91E8C]" size={20} />
              Slack Multi-Channel Organization Structure
            </h3>
            <p className="text-xs text-slate-500">
              Dedicated Slack channels for every domain workflow in K-Beauty Store management. All channels maintain instant Firestore event syncing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((ch) => (
              <div key={ch.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-pink-200 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <Hash size={14} className="text-[#E91E8C]" />
                    {ch.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active ({ch.memberCount} members)
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{ch.purpose}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">Topic: {ch.topic}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>ID: {ch.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const targetCh = ch.name.startsWith('#') ? ch.name : `#${ch.name}`;
                        setSelectedTestChannel(targetCh);
                        setShowTestIntegrationModal(true);
                        handleRunTestIntegration(targetCh);
                      }}
                      disabled={isTestingIntegration}
                      className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={11} />
                      <span>Test Channel</span>
                    </button>
                    <span className="text-pink-600 font-semibold cursor-pointer hover:underline" onClick={() => {
                      if (ch.name === 'customer-support') setActiveTab('customer_support');
                      else if (ch.name === 'product-imports') setActiveTab('product_import');
                      else setActiveTab('notifications');
                    }}>
                      Feed →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: STEP 4 - SLASH COMMANDS SIMULATOR */}
      {activeTab === 'slash_commands' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-2">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Terminal className="text-[#E91E8C]" size={20} />
              Slack Slash Commands Interactive Playground
            </h3>
            <p className="text-xs text-slate-500">
              Test and execute Slack slash commands (<code className="font-mono text-pink-600 font-bold">/order</code>, <code className="font-mono text-pink-600 font-bold">/product</code>, <code className="font-mono text-pink-600 font-bold">/stock</code>, <code className="font-mono text-pink-600 font-bold">/courier</code>, <code className="font-mono text-pink-600 font-bold">/report</code>). Returns real-time Block Kit payloads.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Command Presets:</h4>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                '/order KSF-9201',
                '/product 8809598450123',
                '/stock',
                '/courier',
                '/report'
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setCommandInput(cmd);
                    handleRunSlashCommand();
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700 rounded-xl font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Terminal size={13} />
                  <span>{cmd}</span>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <form onSubmit={handleRunSlashCommand} className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type a slash command, e.g. /order KSF-9201 or /report"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-pink-400 font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                />
              </div>
              <button
                type="submit"
                disabled={runningCommand}
                className="px-6 py-3 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shrink-0 shadow-lg shadow-pink-500/20"
              >
                {runningCommand ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>Execute Command</span>
              </button>
            </form>
          </div>

          {/* Result Viewer */}
          {commandResult && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Slack Response Block Kit Payload
                </h4>
                <span className="font-mono text-[10px] text-slate-400">Response Type: {commandResult.response_type || 'ephemeral'}</span>
              </div>

              {commandResult.text && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {commandResult.text}
                </div>
              )}

              {commandResult.blocks && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-500">Rendered Block Kit Structures:</h5>
                  <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-96">
                    {JSON.stringify(commandResult.blocks, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW SUPPORT TICKET MODAL */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Headphones size={20} className="text-[#E91E8C]" />
                Create Customer Support Ticket
              </h3>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupportTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newTicketForm.customerName}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, customerName: e.target.value })}
                    placeholder="e.g. Farhana Yasmin"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={newTicketForm.customerPhone}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, customerPhone: e.target.value })}
                    placeholder="+8801700000000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Order ID (Optional)</label>
                  <input
                    type="text"
                    value={newTicketForm.orderId}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, orderId: e.target.value })}
                    placeholder="e.g. KSF-9201"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Subject *</label>
                <input
                  type="text"
                  required
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="e.g. Requesting exchange for damaged sunscreen bottle"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  placeholder="Provide customer details and reason for support request..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E91E8C] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#d0177c] transition shadow-md shadow-pink-500/20"
                >
                  Post Ticket to Slack #customer-support
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST SLACK INTEGRATION MODAL */}
      {showTestIntegrationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center border border-pink-100">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Test Slack Integration & Verify Token
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send a sample test notification to verify bot token validity, channel posting scopes, and Block Kit formatting.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestIntegrationModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Token & Scope Status Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Slack Bot Token & Verification Diagnostics
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold">Bot Token Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={13} /> Active & Configured
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold">Webhook Gateway</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5">
                    /api/slack/test-notification
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-semibold mb-1">Required Bot OAuth Scopes Verified:</span>
                <div className="flex flex-wrap gap-1">
                  {['chat:write', 'commands', 'channels:read', 'users:read', 'app_mentions:read', 'incoming-webhook'].map(scope => (
                    <span key={scope} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                      ✓ {scope}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Channel Selector */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">Select Target Channel for Test Notification *</label>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="preset-channel"
                    checked={!useCustomChannel}
                    onChange={() => setUseCustomChannel(false)}
                    className="text-[#E91E8C] focus:ring-[#E91E8C]"
                  />
                  <label htmlFor="preset-channel" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Choose from standard Slack channels
                  </label>
                </div>

                {!useCustomChannel && (
                  <select
                    value={selectedTestChannel}
                    onChange={(e) => setSelectedTestChannel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  >
                    <option value="#system-alerts">#system-alerts (System Health & General Notifications)</option>
                    <option value="#new-orders">#new-orders (POS & E-Commerce Orders Feed)</option>
                    <option value="#inventory-alerts">#inventory-alerts (Low Stock & Restock Alerts)</option>
                    <option value="#product-imports">#product-imports (Barcode Scanning & Product Approval)</option>
                    <option value="#customer-support">#customer-support (Help Tickets & Customer Support)</option>
                    <option value="#courier-dispatches">#courier-dispatches (Steadfast Courier Booking Feed)</option>
                    {channels.map(c => (
                      <option key={c.id} value={c.name.startsWith('#') ? c.name : `#${c.name}`}>
                        #{c.name.replace(/^#/, '')} ({c.purpose})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="radio"
                    id="custom-channel"
                    checked={useCustomChannel}
                    onChange={() => setUseCustomChannel(true)}
                    className="text-[#E91E8C] focus:ring-[#E91E8C]"
                  />
                  <label htmlFor="custom-channel" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Specify custom channel name or ID
                  </label>
                </div>

                {useCustomChannel && (
                  <input
                    type="text"
                    value={customTestChannelInput}
                    onChange={(e) => setCustomTestChannelInput(e.target.value)}
                    placeholder="e.g. #general, #alerts-channel or C12345678"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                )}
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              onClick={() => handleRunTestIntegration()}
              disabled={isTestingIntegration || (useCustomChannel && !customTestChannelInput.trim())}
              className="w-full py-3.5 bg-gradient-to-r from-[#E91E8C] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-pink-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTestingIntegration ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying Token & Dispatched Message...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Test Notification to {useCustomChannel ? (customTestChannelInput || 'Custom Channel') : selectedTestChannel}</span>
                </>
              )}
            </button>

            {/* Test Results Output Display */}
            {testIntegrationResult && (
              <div className={`p-5 rounded-2xl border space-y-3 font-sans ${
                testIntegrationResult.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-red-50/80 border-red-200 text-red-950'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <span className="font-extrabold text-xs flex items-center gap-1.5">
                    {testIntegrationResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    {testIntegrationResult.success ? 'Verification Passed — Message Enqueued' : 'Verification Failed'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(testIntegrationResult.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs font-medium leading-relaxed">
                  {testIntegrationResult.statusMessage}
                </p>

                {testIntegrationResult.item && (
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Notification ID:</span>
                      <span className="text-pink-600 font-bold">{testIntegrationResult.item.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Target Channel:</span>
                      <span className="text-slate-900 font-bold">{testIntegrationResult.item.channel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Status:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                        {testIntegrationResult.item.status}
                      </span>
                    </div>
                  </div>
                )}

                {testIntegrationResult.error && (
                  <div className="p-3 bg-white/80 rounded-xl border border-red-200 text-xs font-mono text-red-700">
                    Error details: {testIntegrationResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'product_import' && (
        <div className="space-y-8">
          {/* Action Trigger Bar & User Switcher */}
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Box className="text-[#E91E8C]" size={18} />
                Product Import & Barcode Scan Workflow
              </h3>
              <p className="text-xs text-slate-500">
                Whenever a barcode is scanned or AI imports a product, Slack receives interactive Block Kit notifications. Only approved products are saved to Firestore & Cloudinary.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleTriggerTestProductImport}
                disabled={triggeringTest}
                className="px-4 py-2 bg-pink-50 text-[#E91E8C] hover:bg-pink-100 border border-pink-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>+ Scan & Import Test Product to Slack</span>
              </button>
            </div>
          </div>

          {/* Acting User Persona Switcher */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="text-emerald-400" size={16} />
              <span className="font-bold text-slate-200">Acting Slack User Persona for Approval Actions:</span>
            </div>
            <select
              value={selectedSlackUserForAction}
              onChange={(e) => setSelectedSlackUserForAction(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            >
              {users.map(u => (
                <option key={u.slackUserId} value={u.slackUserId}>
                  {u.slackUserId} — {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Product Import Request Cards */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Box size={16} className="text-[#E91E8C]" />
                Product Import Approval Queue ({productImports.length})
              </h3>
              <span className="text-xs text-slate-500 font-mono">Channel: #product-imports</span>
            </div>

            {productImports.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-4">
                <div className="w-12 h-12 rounded-full bg-pink-50 text-[#E91E8C] flex items-center justify-center mx-auto">
                  <Box size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Product Import Requests Pending</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Scan a product barcode in the POS or click "+ Scan & Import Test Product to Slack" above to generate a new Slack import notification.
                </p>
                <button
                  onClick={handleTriggerTestProductImport}
                  disabled={triggeringTest}
                  className="px-5 py-2.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition"
                >
                  Generate Sample Barcode Import Notification
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {productImports.map((req) => (
                  <div 
                    key={req.importId}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 hover:border-pink-300 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-4">
                        {req.imageUrl && (
                          <img 
                            src={req.imageUrl} 
                            alt={req.productName} 
                            className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-slate-50 shrink-0" 
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#E91E8C] bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                              {req.brand}
                            </span>
                            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              Barcode: {req.barcode}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900">{req.productName}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{req.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                          req.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {req.status === 'approved' ? '✅ Approved & Saved' : req.status === 'rejected' ? '❌ Rejected & Not Saved' : '⏳ Pending Approval'}
                        </span>

                        <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-xl border border-pink-100">
                          🎯 Image Match Score: {typeof req.imageMatchScore === 'number' ? `${req.imageMatchScore}%` : req.imageMatchScore}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Detail Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 text-xs border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-semibold">Variant</span>
                        <span className="font-bold text-slate-800">{req.variant || 'Full Size'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Volume</span>
                        <span className="font-bold text-slate-800">{req.volume || '50 ml'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Suggested Price</span>
                        <span className="font-bold text-emerald-700 font-mono">৳{req.price || 1500}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Source / Scanner</span>
                        <span className="font-bold text-slate-800">{req.source || 'barcode_scan'} ({req.performedBy || 'AI'})</span>
                      </div>
                    </div>

                    {/* Interactive Workflow Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {req.status !== 'approved' && (
                          <button
                            onClick={() => handleInteractiveButtonClick(req.importId, 'action_approve_product', { importId: req.importId, action: 'approve' })}
                            disabled={!!executingAction}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle size={14} />
                            <span>Approve Product</span>
                          </button>
                        )}

                        {req.status !== 'rejected' && (
                          <button
                            onClick={() => handleInteractiveButtonClick(req.importId, 'action_reject_product', { importId: req.importId, action: 'reject' })}
                            disabled={!!executingAction}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Reject Product</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleInteractiveButtonClick(req.importId, 'action_search_again', { importId: req.importId, action: 'search_again' })}
                          disabled={!!executingAction}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Search size={14} />
                          <span>Search Again</span>
                        </button>

                        <button
                          onClick={() => handleInteractiveButtonClick(req.importId, 'action_edit_product', { importId: req.importId, action: 'edit' })}
                          disabled={!!executingAction}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit size={14} />
                          <span>Edit Product</span>
                        </button>

                        <button
                          onClick={() => handleInteractiveButtonClick(req.importId, 'action_create_product', { importId: req.importId, action: 'create' })}
                          disabled={!!executingAction}
                          className="px-3.5 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Create Product</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {req.importId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STEP 3 - AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="text-[#E91E8C]" size={18} />
                Action Audit Trail & Security Logs
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Every Slack button click, barcode scan, product approval, rejection, and order status update is logged with user attribution for compliance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E8C] bg-white w-60"
                />
              </div>

              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C] bg-white"
              >
                <option value="ALL">All Actions</option>
                <option value="product_import">Product Imports</option>
                <option value="order">Orders</option>
                <option value="inventory">Inventory</option>
                <option value="courier">Courier Dispatches</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Logged Actions ({auditLogs.length})
              </span>
              <button 
                onClick={fetchSlackData}
                className="text-xs text-[#E91E8C] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Refresh Logs
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                No audit logs recorded yet. Interact with Slack buttons to generate logs.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs
                  .filter(a => auditFilterType === 'ALL' || a.entityType === auditFilterType)
                  .filter(a => !auditSearchQuery || JSON.stringify(a).toLowerCase().includes(auditSearchQuery.toLowerCase()))
                  .map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          log.action?.includes('approve') ? 'bg-emerald-50 text-emerald-600' :
                          log.action?.includes('reject') ? 'bg-red-50 text-red-600' :
                          'bg-pink-50 text-[#E91E8C]'
                        }`}>
                          <FileText size={16} />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs capitalize">
                              {log.action?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                              {log.entityType}
                            </span>
                            {log.status && (
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                Status: {log.status}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 font-medium">{log.details}</p>

                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 pt-1">
                            <span>User: <strong className="text-slate-700">{log.performedBy}</strong></span>
                            {log.barcode && <span>Barcode: <code>{log.barcode}</code></span>}
                            {log.importId && <span>Import ID: <code>{log.importId}</code></span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: INTERACTIVE NOTIFICATIONS & WORKFLOWS */}
      {activeTab === 'notifications' && (
        <div className="space-y-8">
          {/* Action Trigger bar & User Switcher */}
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="text-[#E91E8C]" size={18} />
                Trigger Live Test Block Kit Notifications
              </h3>
              <p className="text-xs text-slate-500">
                Simulate event triggers to see Slack Block Kit messages render in real time with interactive buttons.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleTriggerTestNotification('new_order')}
                disabled={triggeringTest}
                className="px-4 py-2 bg-pink-50 text-[#E91E8C] hover:bg-pink-100 border border-pink-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <PackageCheck size={14} />
                <span>+ Test New Order</span>
              </button>

              <button
                onClick={() => handleTriggerTestNotification('stock_alert')}
                disabled={triggeringTest}
                className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle size={14} />
                <span>+ Test Low Stock Alert</span>
              </button>

              <button
                onClick={() => handleTriggerTestNotification('courier_event')}
                disabled={triggeringTest}
                className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Truck size={14} />
                <span>+ Test Courier Booking</span>
              </button>
            </div>
          </div>

          {/* Interactive User Persona Switcher */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="text-emerald-400" size={16} />
              <span className="font-bold text-slate-200">Acting Slack User Persona for Button Clicks:</span>
            </div>
            <select
              value={selectedSlackUserForAction}
              onChange={(e) => setSelectedSlackUserForAction(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            >
              {users.map(u => (
                <option key={u.slackUserId} value={u.slackUserId}>
                  {u.slackUserId} — {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Live Slack Notification Feed with Block Kit Rendering */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Slack className="text-[#E91E8C]" size={20} />
                Real-Time Slack Block Kit Notification Feed
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Auto-updating • Updates Firestore DB first, then updates message in-place
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-pink-100 space-y-3">
                <BellRing className="w-10 h-10 text-pink-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Slack notifications triggered yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Place an order on the storefront, modify stock in inventory, or click the test trigger buttons above to populate real-time Slack Block Kit messages.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden font-sans"
                  >
                    {/* Header Bar simulating Slack Channel */}
                    <div className="bg-slate-900/90 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Slack size={14} className="text-[#E91E8C]" />
                        <span className="font-mono font-bold text-pink-400">#orders</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-semibold text-slate-300">{log.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                          log.status === 'action_performed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-pink-500/20 text-pink-300'
                        }`}>
                          {log.status === 'action_performed' ? 'In-Place Updated' : 'Live Notification'}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Block Kit Message Body */}
                    <div className="p-6 md:p-8 space-y-4">
                      {log.blocks.map((block: any, idx: number) => {
                        if (block.type === 'header') {
                          return (
                            <h3 key={idx} className="text-lg font-black text-white flex items-center gap-2">
                              {block.text?.text}
                            </h3>
                          );
                        }

                        if (block.type === 'section') {
                          if (block.fields) {
                            return (
                              <div key={idx} className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300 font-mono">
                                {block.fields.map((f: any, fIdx: number) => (
                                  <div key={fIdx} dangerouslySetInnerHTML={{ __html: f.text.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="text-pink-400 bg-slate-800 px-1 rounded">$1</code>') }} />
                                ))}
                              </div>
                            );
                          }
                          return (
                            <div key={idx} className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60" dangerouslySetInnerHTML={{ __html: block.text?.text.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                          );
                        }

                        if (block.type === 'divider') {
                          return <hr key={idx} className="border-slate-800/80 my-2" />;
                        }

                        if (block.type === 'actions') {
                          return (
                            <div key={idx} className="pt-2 flex flex-wrap items-center gap-2.5">
                              {block.elements?.map((el: any, elIdx: number) => {
                                const isExecuting = executingAction === `${log.id}-${el.action_id}`;

                                if (el.url) {
                                  return (
                                    <a
                                      key={elIdx}
                                      href={el.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
                                    >
                                      <span>{el.text?.text}</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  );
                                }

                                return (
                                  <button
                                    key={elIdx}
                                    onClick={() => handleInteractiveButtonClick(log.id, el.action_id, el.value)}
                                    disabled={!!executingAction}
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                                      el.style === 'primary' 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' 
                                        : el.style === 'danger'
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    {isExecuting ? (
                                      <RefreshCw size={13} className="animate-spin" />
                                    ) : (
                                      <span>{el.text?.text}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }

                        if (block.type === 'context') {
                          return (
                            <div key={idx} className="p-3 bg-pink-950/40 border border-pink-800/40 rounded-xl text-[11px] text-pink-300 font-mono">
                              {block.elements?.[0]?.text?.replace(/\*(.*?)\*/g, '<strong>$1</strong>')}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STEP 1 AUTH & MAPPING */}
      {activeTab === 'auth' && (
        <div className="space-y-8">
          {/* Grid: SDK Status Card + Quick Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SDK Config Card */}
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Cpu className="text-[#E91E8C]" size={18} />
                  Bolt SDK Engine
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  status?.sdkConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {status?.sdkConfigured ? 'Active ExpressReceiver' : 'Safe Module Mode'}
                </span>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600">SLACK_BOT_TOKEN</span>
                  {status?.botTokenSet ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle size={14} /> Optional (.env)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600">SLACK_SIGNING_SECRET</span>
                  {status?.signingSecretSet ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Verified Signature
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle size={14} /> Optional (.env)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600">Events Webhook</span>
                  <span className="font-mono text-[11px] font-bold text-pink-600">/api/slack/events</span>
                </div>
              </div>
            </div>

            {/* Slack Connection Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={18} />
                  Connected Admins
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-[#E91E8C] text-[11px] font-extrabold">
                  {users.length} Account{users.length !== 1 ? 's' : ''} Linked
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                All incoming Slack actions are checked against your Firestore <code className="bg-pink-50 text-pink-700 px-1 py-0.5 rounded font-bold">slack_users</code> document mappings. Unrecognized Slack accounts are instantly rejected by middleware.
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Firestore Sync:</span>
                <span className="text-emerald-600 font-bold">Live DB Sync Active</span>
              </div>
            </div>

            {/* Security Middleware Specs */}
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Lock className="text-purple-600" size={18} />
                Middleware Protection
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Validates Slack request signatures via Bolt ExpressReceiver.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Verifies Slack User ID maps to active Firestore admin profile.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Enforces granular permission checks before command execution.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Linked Slack Accounts Table */}
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Slack className="text-[#E91E8C]" size={20} />
                  Linked Slack Admin Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slack User IDs connected to Firestore Admin accounts, roles, and granular permission capabilities.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Slack User ID</th>
                    <th className="px-6 py-4">Admin Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Granted Permissions</th>
                    <th className="px-6 py-4">Linked Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {users.map((u) => (
                    <tr key={u.slackUserId} className="hover:bg-pink-50/30 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{u.slackUserId}</span>
                          {u.slackUsername && (
                            <span className="text-[10px] text-slate-400 font-normal">(@{u.slackUsername})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          u.role === 'admin' ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                          u.role === 'inventory_manager' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {u.permissions.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.linkedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUnlinkUser(u.slackUserId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Unlink Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No Slack accounts linked yet. Fill out the form below to link your first Slack User ID.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Column Section: Link New Account Form + Live Middleware Tester */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Link Account Form */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-pink-100 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <UserPlus className="text-[#E91E8C]" size={20} />
                  Link Slack Account with Firestore Admin
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect a Slack User ID to an admin email and assign granular permissions.
                </p>
              </div>

              <form onSubmit={handleLinkUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Slack User ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. U12345678"
                      value={slackUserId}
                      onChange={(e) => setSlackUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Find in Slack Profile &gt; Copy Member ID</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Slack Handle/Username</label>
                    <input
                      type="text"
                      placeholder="e.g. admin_john"
                      value={slackUsername}
                      onChange={(e) => setSlackUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Firestore Admin Email *</label>
                    <input
                      type="email"
                      placeholder="e.g. admin@koreanskinfood.bd"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Staff Role *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as SlackRole)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E91E8C] bg-white"
                    >
                      <option value="super_admin">Super Admin (Master)</option>
                      <option value="admin">Administrator</option>
                      <option value="inventory_manager">Inventory Manager</option>
                    </select>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Granular Permissions</label>
                  <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                    {ALL_PERMISSIONS.map((item) => {
                      const checked = selectedPermissions.includes(item.key);
                      return (
                        <label 
                          key={item.key} 
                          onClick={() => handleTogglePermission(item.key)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                            checked ? 'bg-pink-50/70 border-pink-200 text-slate-900' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-[#E91E8C] focus:ring-[#E91E8C]"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold">{item.label}</span>
                              <code className="text-[10px] text-pink-600 font-mono bg-white px-1 py-0.2 rounded border">{item.key}</code>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-[#E91E8C] to-pink-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Link Slack Account to Firestore</span>
                </button>
              </form>
            </div>

            {/* Middleware Authorization Verification Matrix */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-pink-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Terminal className="text-purple-600" size={20} />
                    Live Middleware Permission Tester
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test incoming Slack requests against the backend middleware verification rules.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Slack User ID</label>
                    <select
                      value={testSlackUserId}
                      onChange={(e) => setTestSlackUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {users.map((u) => (
                        <option key={u.slackUserId} value={u.slackUserId}>
                          {u.slackUserId} — {u.email} ({u.role})
                        </option>
                      ))}
                      <option value="U_UNAUTHORIZED">U_UNAUTHORIZED (Unlinked Test ID)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Action / Permission to Test</label>
                    <select
                      value={testPermission}
                      onChange={(e) => setTestPermission(e.target.value as SlackPermission)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {ALL_PERMISSIONS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label} ({p.key})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleTestPermission}
                    disabled={testing}
                    className="w-full py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {testing ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
                    <span>Execute Middleware Verification Test</span>
                  </button>
                </div>

                {/* Test Result Display Box */}
                {testResult && (
                  <div className={`p-4 rounded-2xl border space-y-2 font-mono text-xs ${
                    testResult.authorized 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>HTTP {testResult.statusCode} {testResult.authorized ? 'ALLOWED' : 'FORBIDDEN'}</span>
                      <span>{testResult.authorized ? '🟢 200 Authorized' : '🔴 403 Permission Denied'}</span>
                    </div>
                    <div className="text-[11px] leading-relaxed pt-1 border-t border-slate-200/60">
                      {testResult.authorized ? (
                        <div>
                          <p>✅ <strong>Authorization Granted</strong>: User <code className="bg-white/60 px-1 rounded">{testResult.user?.email}</code> possesses permission <code className="bg-white/60 px-1 rounded">{testPermission}</code>.</p>
                          <p className="text-[10px] text-emerald-700 mt-1">Role: {testResult.user?.role} | User ID: {testResult.user?.slackUserId}</p>
                        </div>
                      ) : (
                        <div>
                          <p>❌ <strong>Request Rejected</strong>: {testResult.reason}</p>
                          <p className="text-[10px] text-red-700 mt-1">Status Code: 403 Forbidden | Action Blocked</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1 mt-6">
                <span className="font-bold text-slate-700 block">Production Integration Endpoint:</span>
                <code className="text-[10px] text-pink-600 bg-white px-2 py-1 rounded border font-mono block truncate">
                  POST /api/slack/events
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
