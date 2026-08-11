import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { posService } from '../services/posService';
import { ChatLead, ChatLeadItem, OrderItem } from '../types';
import { 
  MessageSquare, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  Search, 
  Trash2, 
  ArrowRight,
  Filter,
  DollarSign,
  X,
  Wand2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AdminChatLeads() {
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [selectedLeadForPopup, setSelectedLeadForPopup] = useState<ChatLead | null>(null);
  
  // Filters and search states
  const [activeTab, setActiveTab] = useState<'all' | 'needs_follow_up' | 'confirmed' | 'no_response' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setLoading(true);
    // Listen to chat_leads in real-time
    const q = query(collection(db, 'chat_leads'), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads: ChatLead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLeads.push({
          id: docSnap.id,
          customer_name: data.customer_name || 'WhatsApp Chat Lead',
          customer_phone: data.customer_phone || '',
          customer_address: data.customer_address || '',
          items: data.items || [],
          total: data.total || 0,
          conversation_summary: data.conversation_summary || '',
          status: data.status || 'sent_to_whatsapp',
          created_at: data.created_at,
          last_updated_at: data.last_updated_at
        });
      });
      setLeads(fetchedLeads);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error subscribing to chat_leads:", err);
      setError("Permission denied or Firestore collection missing. Please make sure you are logged in with a staff account.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show temporary toast notification
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Format date helper supporting ISO, JS Date and Firestore Timestamp
  const formatDateTime = (dateVal: any) => {
    if (!dateVal) return '';
    let d: Date;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  // Format time ago
  const formatTimeAgo = (dateVal: any) => {
    if (!dateVal) return '';
    let d: Date;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Status badge style helper
  const getStatusBadgeStyle = (status: ChatLead['status']) => {
    switch (status) {
      case 'sent_to_whatsapp':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'no_response':
        return 'bg-gray-100 text-gray-700 border border-gray-300';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  // Human-friendly status labels
  const getStatusLabel = (status: ChatLead['status']) => {
    switch (status) {
      case 'sent_to_whatsapp':
        return 'Sent to WhatsApp';
      case 'confirmed':
        return 'Confirmed';
      case 'no_response':
        return 'No Response';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Update status in Firestore
  const handleUpdateStatus = async (leadId: string, newStatus: ChatLead['status']) => {
    try {
      const docRef = doc(db, 'chat_leads', leadId);
      await updateDoc(docRef, {
        status: newStatus,
        last_updated_at: new Date()
      });
      showToast(`Status updated to "${getStatusLabel(newStatus)}"`);
    } catch (err: any) {
      console.error("Error updating lead status:", err);
      showToast("Failed to update status. Permissions verified?", "error");
    }
  };

  // Delete lead (with prompt)
  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead? This cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'chat_leads', leadId));
      showToast("Lead successfully deleted");
    } catch (err: any) {
      console.error("Error deleting lead:", err);
      showToast("Failed to delete lead.", "error");
    }
  };

  // Convert ChatLead to Real E-Commerce Order
  const handleConvertToOrder = async (lead: ChatLead) => {
    try {
      const orderItems: OrderItem[] = lead.items.map(it => ({
        productId: it.product_id,
        name: it.name_en,
        price: it.unit_price,
        quantity: it.quantity
      }));

      // Call posService's standard order creator
      const newOrder = posService.createOnlineOrder({
        customerName: lead.customer_name === "WhatsApp Chat Lead" ? `WhatsApp Lead (${lead.customer_phone})` : lead.customer_name,
        customerPhone: lead.customer_phone,
        address: lead.customer_address,
        items: orderItems,
        totalAmount: lead.total,
        paymentMethod: 'COD'
      });

      // Update lead status to confirmed in Firestore
      const docRef = doc(db, 'chat_leads', lead.id);
      await updateDoc(docRef, {
        status: 'confirmed',
        last_updated_at: new Date()
      });

      showToast(`Successfully converted to Order: ${newOrder.id}! Stock updated and logged.`);
    } catch (err: any) {
      console.error("Error converting lead to order:", err);
      showToast("Error converting lead. Please double check product IDs.", "error");
    }
  };

  // Stats aggregation
  const getStats = () => {
    const now = new Date();
    const todayLeads = leads.filter(l => {
      let d: Date;
      if (l.created_at?.toDate) {
        d = l.created_at.toDate();
      } else if (l.created_at instanceof Date) {
        d = l.created_at;
      } else {
        d = new Date(l.created_at);
      }
      return d.getDate() === now.getDate() &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    });

    const confirmedLeads = leads.filter(l => l.status === 'confirmed');
    const totalCount = leads.length;
    const confirmedCount = confirmedLeads.length;
    
    const conversionRate = totalCount > 0 ? ((confirmedCount / totalCount) * 100).toFixed(1) : '0';
    
    const totalConfirmedValue = confirmedLeads.reduce((sum, l) => sum + l.total, 0);
    const avgConfirmedValue = confirmedCount > 0 ? Math.round(totalConfirmedValue / confirmedCount) : 0;

    return {
      todayCount: todayLeads.length,
      conversionRate,
      avgConfirmedValue,
      totalCount
    };
  };

  const stats = getStats();

  // Filter logic
  const filteredLeads = leads.filter((lead) => {
    // 1. Tab Status Filter
    if (activeTab === 'needs_follow_up' && lead.status !== 'sent_to_whatsapp') return false;
    if (activeTab === 'confirmed' && lead.status !== 'confirmed') return false;
    if (activeTab === 'no_response' && lead.status !== 'no_response') return false;
    if (activeTab === 'cancelled' && lead.status !== 'cancelled') return false;

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = lead.customer_name.toLowerCase().includes(q);
      const matchPhone = lead.customer_phone.toLowerCase().includes(q);
      const matchAddress = lead.customer_address.toLowerCase().includes(q);
      const matchSummary = lead.conversation_summary.toLowerCase().includes(q);
      const matchItems = lead.items.some(it => it.name_en.toLowerCase().includes(q));
      
      return matchName || matchPhone || matchAddress || matchSummary || matchItems;
    }

    return true;
  });

  return (
    <div className="space-y-6" id="admin-chat-leads-panel">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle size={18} className={toastMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={22} className="text-[#E91E8C]" />
            <span>Chatbot Conversational Leads Desk</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Monitor and process inbound customers consulting with your K-Beauty skin AI before committing to orders.
          </p>
        </div>
      </div>

      {/* STATS TILES BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stat 1: Total Leads */}
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Inbound Leads</span>
          <div className="text-2xl font-black text-gray-950">{stats.totalCount} Leads</div>
          <span className="text-[10px] text-[#E91E8C] font-semibold block">All-time conversations logged</span>
          <div className="absolute right-4 bottom-4 text-pink-100">
            <MessageSquare size={48} strokeWidth={1} />
          </div>
        </div>

        {/* Stat 2: Leads Today */}
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Captured Today</span>
          <div className="text-2xl font-black text-[#E91E8C]">{stats.todayCount} New</div>
          <span className="text-[10px] text-gray-400 font-medium block">Since midnight local time</span>
          <div className="absolute right-4 bottom-4 text-pink-100">
            <Clock size={48} strokeWidth={1} />
          </div>
        </div>

        {/* Stat 3: Conversion Rate */}
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Conversion Rate</span>
          <div className="text-2xl font-black text-emerald-600">{stats.conversionRate}%</div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Confirmed / Total lead value</span>
          <div className="absolute right-4 bottom-4 text-emerald-100">
            <CheckCircle size={48} strokeWidth={1} />
          </div>
        </div>

        {/* Stat 4: Avg Order Value */}
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Avg Confirmed Value</span>
          <div className="text-2xl font-black text-gray-950">৳{stats.avgConfirmedValue.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400 font-medium block">Excluding delivery charge</span>
          <div className="absolute right-4 bottom-4 text-pink-100">
            <DollarSign size={48} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-[24px] border border-pink-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        {/* Filters Tab Row */}
        <div className="flex bg-pink-50/40 p-1 rounded-xl border border-pink-100/50 self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition ${
              activeTab === 'all' 
                ? 'bg-[#E91E8C] text-white shadow-sm' 
                : 'text-pink-700/70 hover:text-pink-700 hover:bg-pink-50/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('needs_follow_up')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition flex items-center gap-1 ${
              activeTab === 'needs_follow_up' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'text-amber-700/70 hover:text-amber-700 hover:bg-amber-50/50'
            }`}
          >
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            Needs Follow-up
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition ${
              activeTab === 'confirmed' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-emerald-750 hover:text-emerald-800 hover:bg-emerald-50/50'
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setActiveTab('no_response')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition ${
              activeTab === 'no_response' 
                ? 'bg-gray-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/50'
            }`}
          >
            No Response
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition ${
              activeTab === 'cancelled' 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50/50'
            }`}
          >
            Cancelled
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-pink-50/20 text-xs text-gray-800 border border-pink-100 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#E91E8C] focus:ring-1 focus:ring-[#E91E8C]"
          />
        </div>
      </div>

      {/* LEADS LIST PANEL */}
      <div className="bg-white rounded-[24px] border border-pink-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="animate-spin text-[#E91E8C]" size={28} />
            <p className="text-xs text-gray-500 font-medium">Loading conversation leads stream...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <AlertCircle className="text-rose-500 mx-auto" size={36} />
            <p className="text-sm text-gray-600 font-medium max-w-md mx-auto">{error}</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-2">
            <MessageSquare className="text-pink-100 mx-auto" size={48} />
            <p className="text-sm font-bold text-gray-800">No conversational leads match your selection</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'Leads appear here automatically when customer details are verified by the skin assistant chatbot.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table: shown only on lg and up */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-pink-50 bg-pink-50/10 text-pink-700/85 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-2">Customer Info</th>
                    <th className="py-3.5 px-2">Items Recommended</th>
                    <th className="py-3.5 px-2">Total Value</th>
                    <th className="py-3.5 px-2">Status</th>
                    <th className="py-3.5 px-2">Time Ago</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50/50">
                  {filteredLeads.map((lead) => {
                    const isExpanded = expandedLeadId === lead.id;
                    
                    return (
                      <React.Fragment key={lead.id}>
                        {/* Clickable Header Row */}
                        <tr 
                          onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                          className={`hover:bg-pink-50/15 cursor-pointer transition ${isExpanded ? 'bg-pink-50/10 font-medium' : ''}`}
                        >
                          {/* Chevron Trigger */}
                          <td className="py-4 px-4 text-gray-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>

                          {/* Customer Info Column */}
                          <td className="py-4 px-2">
                            <span className="font-bold text-gray-900 block text-[13px] hover:text-[#E91E8C] transition">
                              {lead.customer_name}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-gray-400" />
                              {lead.customer_phone || 'No phone'}
                            </span>
                          </td>

                          {/* Items Column */}
                          <td className="py-4 px-2">
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {lead.items.length === 0 ? (
                                <span className="text-gray-400 italic">No products in lead</span>
                              ) : (
                                lead.items.map((it, idx) => (
                                  <span 
                                    key={idx} 
                                    className="inline-block bg-pink-50/50 text-pink-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-pink-100 max-w-[150px] truncate"
                                    title={`${it.quantity}x ${it.name_en}`}
                                  >
                                    {it.quantity}x {it.name_en}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Total Column */}
                          <td className="py-4 px-2 font-black font-mono text-gray-900 text-[13px]">
                            ৳{lead.total.toLocaleString()}
                          </td>

                          {/* Status Badge Column */}
                          <td className="py-4 px-2">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wide ${getStatusBadgeStyle(lead.status)}`}>
                              {getStatusLabel(lead.status)}
                            </span>
                          </td>

                          {/* Time Ago Column */}
                          <td className="py-4 px-2 text-gray-500 font-medium" title={formatDateTime(lead.created_at)}>
                            {formatTimeAgo(lead.created_at)}
                          </td>

                          {/* Simple row action */}
                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLeadForPopup(lead)}
                                className="p-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 rounded-lg cursor-pointer transition"
                                title="Quick View Popup Details"
                              >
                                <Eye size={12} />
                              </button>
                              {lead.status !== 'confirmed' && (
                                <button
                                  onClick={() => handleConvertToOrder(lead)}
                                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px] shadow-sm transition"
                                  title="Convert to standard POS/Online order"
                                >
                                  <ShoppingBag size={12} className="fill-white/10" />
                                  <span>Convert</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50/50 transition"
                                title="Delete Lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-pink-50/5 p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-pink-50/50"
                                >
                                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-pink-50/5">
                                    {/* LHS: Lead & Conversation Metadata */}
                                    <div className="md:col-span-7 space-y-4">
                                      {/* Conversation Summary Box */}
                                      <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                                        <h5 className="text-[11px] font-extrabold text-pink-700 uppercase tracking-widest flex items-center gap-1.5">
                                          <MessageSquare size={12} />
                                          <span>AI Conversation Log Summary</span>
                                        </h5>
                                        <p className="text-xs text-gray-700 leading-relaxed italic bg-pink-50/20 p-3 rounded-xl border border-pink-100/50">
                                          "{lead.conversation_summary || 'No summary registered. Customer explored various skincare products without submitting explicit needs.'}"
                                        </p>
                                      </div>

                                      {/* Logistics & Delivery details */}
                                      <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                                        <h5 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <MapPin size={12} />
                                          <span>Delivery Address details</span>
                                        </h5>
                                        <p className="text-xs text-gray-800 font-semibold bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                          {lead.customer_address || 'No address provided in conversation yet.'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* RHS: Item Detail Grid & Status modifiers */}
                                    <div className="md:col-span-5 space-y-4">
                                      {/* Full Itemized Order List */}
                                      <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-2">
                                        <h5 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                                          Itemized Products
                                        </h5>
                                        <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                          {lead.items.map((it, idx) => (
                                            <div key={idx} className="py-2 flex justify-between items-center text-xs text-gray-700 font-medium">
                                              <span>
                                                {it.name_en} <span className="text-pink-500">×{it.quantity}</span>
                                              </span>
                                              <span className="font-mono font-bold">
                                                ৳{(it.unit_price * it.quantity).toLocaleString()}
                                              </span>
                                            </div>
                                          ))}
                                          <div className="pt-2 flex justify-between items-center text-xs font-black text-gray-900 border-t border-dashed border-pink-100">
                                            <span>Subtotal + Est. Delivery</span>
                                            <span className="text-emerald-700 font-mono">
                                              ৳{lead.total.toLocaleString()} BDT
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Manual Status Overrides */}
                                      <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                                        <h5 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                                          Manage Follow-up Status
                                        </h5>
                                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                                          <label className="text-[11px] text-gray-500 font-semibold uppercase shrink-0">
                                            Change Status:
                                          </label>
                                          <select
                                            value={lead.status}
                                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as ChatLead['status'])}
                                            className="w-full bg-pink-50/20 text-xs text-gray-800 border border-pink-100 rounded-xl px-3 py-2 outline-none focus:border-[#E91E8C]"
                                          >
                                            <option value="sent_to_whatsapp">Sent to WhatsApp (Needs Follow-up)</option>
                                            <option value="confirmed">Confirmed (Processed)</option>
                                            <option value="no_response">No Response (Cold Lead)</option>
                                            <option value="cancelled">Cancelled</option>
                                          </select>
                                        </div>
                                        
                                        <div className="text-[10px] text-gray-400 font-medium flex gap-1 items-center leading-normal">
                                          <Clock size={12} className="shrink-0" />
                                          <span>Last Updated: {formatDateTime(lead.last_updated_at)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid: 2 columns on mobile */}
            <div className="lg:hidden grid grid-cols-2 gap-2 sm:gap-4 p-1">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  onClick={() => setSelectedLeadForPopup(lead)}
                  className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-3 cursor-pointer hover:border-[#E91E8C] transition relative"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold text-gray-900 text-sm block">
                        {lead.customer_name}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-[#E91E8C]" />
                        {lead.customer_phone || 'No phone'}
                      </span>
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wide ${getStatusBadgeStyle(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">Recommended Items:</span>
                    <div className="flex flex-wrap gap-1">
                      {lead.items.length === 0 ? (
                        <span className="text-gray-400 italic text-[11px]">No products in lead</span>
                      ) : (
                        lead.items.map((it, idx) => (
                          <span 
                            key={idx} 
                            className="inline-block bg-pink-50/50 text-pink-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-pink-100 max-w-[140px] truncate"
                          >
                            {it.quantity}x {it.name_en}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-pink-50/50">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase">Total Amount:</span>
                      <span className="font-black font-mono text-gray-950 text-xs">
                        ৳{lead.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block uppercase">Captured:</span>
                      <span className="text-[10px] text-gray-500 font-medium font-mono">
                        {formatTimeAgo(lead.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Card Action Buttons */}
                  <div className="flex gap-2 justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedLeadForPopup(lead)}
                      className="bg-pink-50 text-[#E91E8C] font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 border border-pink-100 transition active:scale-95 cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>Details Popup</span>
                    </button>

                    {lead.status !== 'confirmed' && (
                      <button
                        onClick={() => handleConvertToOrder(lead)}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[10px] shadow-sm transition cursor-pointer"
                      >
                        <ShoppingBag size={11} />
                        <span>Convert</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Lead Details Popup Modal */}
      <AnimatePresence>
        {selectedLeadForPopup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-lg w-full shadow-2xl flex flex-col justify-between max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-pink-50 flex justify-between items-center bg-white">
                <span className="text-xs font-black text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#E91E8C]" />
                  <span>Lead Profile Details</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setSelectedLeadForPopup(null)} 
                  className="text-gray-400 hover:text-pink-600 cursor-pointer p-1 rounded-full hover:bg-pink-50 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-white">
                
                {/* Customer Profile Card */}
                <div className="bg-pink-50/15 p-4 rounded-2xl border border-pink-100/50 space-y-2">
                  <span className="text-[10px] uppercase font-black text-pink-700 tracking-wider">Customer Identity</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-gray-900">{selectedLeadForPopup.customer_name}</h4>
                    <p className="text-xs text-gray-600 font-mono flex items-center gap-1.5">
                      <Phone size={11} className="text-gray-400" />
                      <span>{selectedLeadForPopup.customer_phone || 'No Phone Registered'}</span>
                    </p>
                  </div>
                </div>

                {/* AI Conversation Summary */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-pink-700 tracking-wider flex items-center gap-1">
                    <Wand2 size={11} className="text-[#E91E8C]" />
                    <span>AI Consultation Summary</span>
                  </span>
                  <div className="bg-pink-50/10 p-3.5 rounded-2xl border border-pink-100/30 text-gray-700 italic leading-relaxed">
                    "{selectedLeadForPopup.conversation_summary || 'No summary registered. Customer explored various skincare products without submitting explicit needs.'}"
                  </div>
                </div>

                {/* Delivery Logistics */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider flex items-center gap-1">
                    <MapPin size={11} className="text-[#E91E8C]" />
                    <span>Inferred Delivery Address</span>
                  </span>
                  <div className="bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100 text-gray-850 font-semibold leading-relaxed">
                    {selectedLeadForPopup.customer_address || 'No address provided in conversation yet.'}
                  </div>
                </div>

                {/* Itemized Recommended Products */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Recommended Products</span>
                  <div className="border border-pink-50/80 rounded-2xl overflow-hidden divide-y divide-pink-50 bg-white">
                    {selectedLeadForPopup.items.map((it, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center text-xs font-medium text-gray-800">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-gray-900 block">{it.name_en}</span>
                          <span className="text-[10px] text-gray-400 font-mono">৳{it.unit_price.toLocaleString()} × {it.quantity}</span>
                        </div>
                        <span className="font-mono font-bold text-[#E91E8C]">
                          ৳{(it.unit_price * it.quantity).toLocaleString()} BDT
                        </span>
                      </div>
                    ))}
                    <div className="p-3.5 bg-pink-50/20 flex justify-between items-center text-xs font-black text-gray-900 border-t border-dashed border-pink-100">
                      <span>Subtotal + Est. Delivery</span>
                      <span className="text-emerald-700 font-mono">
                        ৳{selectedLeadForPopup.total.toLocaleString()} BDT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lead Status Manager */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                  <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider block">Modify Lead Status</span>
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                    <label className="text-[10px] text-gray-500 font-bold uppercase shrink-0">Current Status:</label>
                    <select
                      value={selectedLeadForPopup.status}
                      onChange={(e) => {
                        handleUpdateStatus(selectedLeadForPopup.id, e.target.value as ChatLead['status']);
                        setSelectedLeadForPopup({
                          ...selectedLeadForPopup,
                          status: e.target.value as ChatLead['status']
                        });
                      }}
                      className="w-full bg-white text-xs text-gray-850 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E91E8C]"
                    >
                      <option value="sent_to_whatsapp">Sent to WhatsApp (Needs Follow-up)</option>
                      <option value="confirmed">Confirmed (Processed)</option>
                      <option value="no_response">No Response (Cold Lead)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="text-[9px] text-gray-400 font-mono flex gap-1 items-center">
                    <Clock size={11} />
                    <span>Last Synced: {formatDateTime(selectedLeadForPopup.last_updated_at)}</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-pink-50/10 border-t border-pink-50 flex flex-wrap gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setSelectedLeadForPopup(null)} 
                  className="px-4 py-2 bg-transparent hover:bg-pink-50 text-gray-500 hover:text-pink-750 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>

                {selectedLeadForPopup.status !== 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertToOrder(selectedLeadForPopup);
                      setSelectedLeadForPopup(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 shadow"
                  >
                    <ShoppingBag size={13} />
                    <span>Convert to Order</span>
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
