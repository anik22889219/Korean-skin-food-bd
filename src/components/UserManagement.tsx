import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { 
  Users, ShieldAlert, Search, Filter, UserCheck, Shield, UserPlus, 
  Edit3, Trash2, Award, Mail, Phone, Lock, Sparkles, CheckCircle2, 
  XCircle, ChevronDown, RefreshCw, AlertCircle, Building2, Crown, BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for adding/editing user
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('customer');
  const [formDepartment, setFormDepartment] = useState('');
  const [formLoyaltyPoints, setFormLoyaltyPoints] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formWholesaleAccess, setFormWholesaleAccess] = useState<boolean>(false);
  const [selectedWholesaleFilter, setSelectedWholesaleFilter] = useState<'all' | 'wholesale' | 'retail'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly check if current user is Super Admin
  const isAuthorized = profile?.role === 'super_admin';

  // Show auto-clearing toast
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const usersRef = collection(db, 'users');
    
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        userList.push({
          uid: docSnap.id,
          name: data.name || 'Unnamed User',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'customer',
          loyaltyPoints: data.loyaltyPoints || 0,
          photoURL: data.photoURL || '',
          address: data.address || '',
          createdAt: data.createdAt,
          department: data.department || '',
          status: data.status || 'active',
          wholesaleAccess: data.wholesaleAccess === true,
        });
      });

      // Sort by Super Admin > HR > Admin > Creator > Inventory Manager > Customer
      const rolePriority: Record<string, number> = {
        super_admin: 1,
        hr: 2,
        admin: 3,
        creator: 4,
        inventory_manager: 5,
        customer: 6,
      };

      userList.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

      setUsers(userList);
      setLoading(false);
    }, (error) => {
      console.error('[UserManagement] Error loading users:', error);
      handleFirestoreError(error, OperationType.LIST, 'users', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // Handle Quick Role Change directly in table
  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: serverTimestamp() 
      });
      showToast('success', `User role updated to ${newRole.replace('_', ' ').toUpperCase()}`);
    } catch (err) {
      console.error('Failed to update role:', err);
      showToast('error', 'Failed to update user role. Check permissions.');
    }
  };

  // Handle Quick Wholesale Access toggle directly in table
  const handleToggleWholesale = async (targetUid: string, nextStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, { 
        wholesaleAccess: nextStatus,
        updatedAt: serverTimestamp() 
      });
      showToast('success', `Wholesale access ${nextStatus ? 'GRANTED' : 'REVOKED'} for user.`);
    } catch (err) {
      console.error('Failed to toggle wholesale access:', err);
      showToast('error', 'Failed to update wholesale access. Check permissions.');
    }
  };

  // Open edit modal
  const openEditModal = (userItem: UserProfile) => {
    setEditingUser(userItem);
    setFormName(userItem.name || '');
    setFormEmail(userItem.email || '');
    setFormPhone(userItem.phone || '');
    setFormRole(userItem.role || 'customer');
    setFormDepartment(userItem.department || '');
    setFormLoyaltyPoints(userItem.loyaltyPoints || 0);
    setFormStatus(userItem.status || 'active');
    setFormWholesaleAccess(userItem.wholesaleAccess === true);
  };

  // Submit edit form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        department: formDepartment,
        loyaltyPoints: Number(formLoyaltyPoints),
        status: formStatus,
        wholesaleAccess: formWholesaleAccess,
        updatedAt: serverTimestamp()
      });

      showToast('success', `User profile for "${formName}" updated successfully.`);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      showToast('error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new user / staff member
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) {
      showToast('error', 'Name and Email are required.');
      return;
    }
    setIsSubmitting(true);

    try {
      // Generate a document ID from email or timestamp
      const customUid = 'usr_' + Date.now();
      const newUserRef = doc(db, 'users', customUid);

      const newUserData = {
        uid: customUid,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        role: formRole,
        department: formDepartment.trim(),
        loyaltyPoints: Number(formLoyaltyPoints) || 0,
        status: formStatus,
        wholesaleAccess: formWholesaleAccess,
        createdAt: serverTimestamp(),
      };

      await setDoc(newUserRef, newUserData);
      showToast('success', `New user "${formName}" added successfully.`);
      setIsAddUserOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error adding user:', err);
      showToast('error', 'Failed to create user record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete user document
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);

    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      showToast('success', `User account "${userToDelete.name}" deleted.`);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('error', 'Failed to delete user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('customer');
    setFormDepartment('');
    setFormLoyaltyPoints(0);
    setFormStatus('active');
    setFormWholesaleAccess(false);
  };

  // Filtered users calculation
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;
    const matchesWholesale = 
      selectedWholesaleFilter === 'all' || 
      (selectedWholesaleFilter === 'wholesale' && u.wholesaleAccess === true) ||
      (selectedWholesaleFilter === 'retail' && !u.wholesaleAccess);

    return matchesSearch && matchesRole && matchesStatus && matchesWholesale;
  });

  // Calculate quick metrics
  const totalUsers = users.length;
  const superAdminsCount = users.filter((u) => u.role === 'super_admin').length;
  const hrCount = users.filter((u) => u.role === 'hr').length;
  const creatorsCount = users.filter((u) => u.role === 'creator').length;
  const staffCount = users.filter((u) => ['admin', 'inventory_manager'].includes(u.role)).length;
  const customersCount = users.filter((u) => u.role === 'customer').length;
  const wholesaleCount = users.filter((u) => u.wholesaleAccess === true).length;

  // Role Badge helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300">
            <Crown size={12} className="text-purple-600" /> Super Admin
          </span>
        );
      case 'hr':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Building2 size={12} className="text-indigo-600" /> HR Manager
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-pink-100 text-pink-800 border border-pink-300">
            <Shield size={12} className="text-pink-600" /> Store Admin
          </span>
        );
      case 'creator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            <Sparkles size={12} className="text-rose-600" /> Creator
          </span>
        );
      case 'inventory_manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
            <BadgeCheck size={12} className="text-amber-600" /> Inventory Mgr
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            Customer
          </span>
        );
    }
  };

  // RESTRICTED ACCESS SCREEN IF NOT SUPER ADMIN OR HR
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xl shadow-rose-100/50"
        >
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 border border-rose-200">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Restricted Area</h2>
          <div className="inline-block px-3 py-1 bg-rose-50 text-rose-700 text-xs font-black uppercase tracking-wider rounded-full border border-rose-200 mb-4">
            Super Admin & HR Access Only
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            You do not have sufficient permissions to view or manage user accounts and executive roles. 
            Please contact your HR Administrator or Super Admin if you require credentials.
          </p>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] font-mono text-slate-500">
            Current Account Role: <span className="font-extrabold text-slate-800 uppercase">{profile?.role || 'Guest'}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold ${
              notification.type === 'success' 
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Crown size={12} className="text-amber-400" /> Executive HR Deck
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                Live Synchronization
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="text-indigo-400" size={26} />
              User & Access Control Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Manage accounts, assign staff permissions, adjust loyalty tiers, and enforce access controls across the platform.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddUserOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
          >
            <UserPlus size={16} />
            <span>Add / Invite Staff Member</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Users</span>
            <Users size={16} className="text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{totalUsers}</div>
          <span className="text-[10px] text-slate-400 font-medium">Registered in DB</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-300/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Wholesale</span>
            <Building2 size={16} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-950">{wholesaleCount}</div>
          <span className="text-[10px] text-amber-700/80 font-bold">Wholesale Buyers</span>
        </div>

        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Super Admins</span>
            <Crown size={16} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900">{superAdminsCount}</div>
          <span className="text-[10px] text-purple-600/80 font-medium">Full Governance</span>
        </div>

        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">HR Managers</span>
            <Building2 size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">{hrCount}</div>
          <span className="text-[10px] text-indigo-600/80 font-medium">People & Roles</span>
        </div>

        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Creators</span>
            <Sparkles size={16} className="text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-900">{creatorsCount}</div>
          <span className="text-[10px] text-rose-600/80 font-medium">K-Skin Creators</span>
        </div>

        <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-200 shadow-sm">
          <div className="flex items-center justify-between text-pink-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Ops Staff</span>
            <Shield size={16} className="text-pink-600" />
          </div>
          <div className="text-xl font-black text-pink-900">{staffCount}</div>
          <span className="text-[10px] text-pink-600/80 font-medium">Admin & Support</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Customers</span>
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900">{customersCount}</div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Store Buyers</span>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Wholesale Filter Toggle */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedWholesaleFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedWholesaleFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Access
            </button>
            <button
              type="button"
              onClick={() => setSelectedWholesaleFilter('wholesale')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedWholesaleFilter === 'wholesale'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <Building2 size={12} />
              <span>Wholesale Only</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedWholesaleFilter('retail')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedWholesaleFilter === 'retail'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Retail Only
            </button>
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0 flex items-center gap-1">
              <Filter size={12} /> Filter Role:
            </span>
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'super_admin', label: 'Super Admin' },
              { id: 'hr', label: 'HR' },
              { id: 'admin', label: 'Admin' },
              { id: 'creator', label: 'Creators' },
              { id: 'inventory_manager', label: 'Inventory' },
              { id: 'customer', label: 'Customers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedRole(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
                  selectedRole === tab.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              User Roster
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
              Showing {filteredUsers.length} of {users.length}
            </span>
          </div>

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold animate-pulse">
              <RefreshCw size={14} className="animate-spin" /> Syncing database...
            </div>
          )}
        </div>

        {/* User Cards Grid System */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              {loading ? 'Loading user database...' : 'No users match your criteria.'}
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.uid} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Avatar, Name & UID */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-xs overflow-hidden text-sm">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name?.slice(0, 2).toUpperCase() || 'US'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-sm truncate">{u.name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                          u.status === 'suspended' 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.status === 'suspended' ? <XCircle size={9} /> : <CheckCircle2 size={9} />}
                          {u.status || 'active'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">UID: {u.uid.slice(0, 16)}...</span>
                    </div>
                  </div>

                  {/* Role Selector & Badge */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Role Tier</span>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(u.role)}
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        title="Change User Role"
                      >
                        <option value="customer">Customer</option>
                        <option value="creator">Creator</option>
                        <option value="inventory_manager">Inventory Manager</option>
                        <option value="admin">Store Admin</option>
                        <option value="hr">HR Manager</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Info & Department */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 font-semibold truncate">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{u.email || 'No Email'}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                    {u.department && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100/80">
                        Dept: <span className="font-bold text-slate-700">{u.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Wholesale Access Control */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-slate-50 border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className={u.wholesaleAccess ? 'text-amber-600' : 'text-slate-400'} />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block text-slate-700">
                          Wholesale Access
                        </span>
                        <span className={`text-[10px] font-bold ${u.wholesaleAccess ? 'text-amber-700' : 'text-slate-400'}`}>
                          {u.wholesaleAccess ? 'Authorized (Tier 1 & 2 Active)' : 'Standard Retail Only'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWholesale(u.uid, !u.wholesaleAccess)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                        u.wholesaleAccess
                          ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={u.wholesaleAccess ? 'Click to revoke wholesale pricing' : 'Click to grant wholesale pricing'}
                    >
                      {u.wholesaleAccess ? 'Active' : 'Grant'}
                    </button>
                  </div>
                </div>

                {/* Footer: Loyalty Points & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 font-black text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Award size={13} className="text-amber-500" />
                    {u.loyaltyPoints || 0} Points
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                      title="Edit User Profile"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete Account"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="text-indigo-600" size={20} />
                  <h3 className="text-base font-black text-slate-900">Edit User Account</h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="creator">Creator (K-Beauty Creator)</option>
                      <option value="inventory_manager">Inventory Manager</option>
                      <option value="admin">Store Admin</option>
                      <option value="hr">HR Manager</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales, Logistics, HR"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loyalty Points</label>
                    <input
                      type="number"
                      min={0}
                      value={formLoyaltyPoints}
                      onChange={(e) => setFormLoyaltyPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'active' | 'suspended')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Wholesale Access Authorization Toggle */}
                <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-amber-700 shrink-0" size={18} />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Wholesale Pricing Access</span>
                      <span className="text-[11px] text-amber-900 font-medium block">
                        Enable tiered wholesale pricing (1–49 and 50+ units) for this user.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formWholesaleAccess}
                      onChange={(e) => setFormWholesaleAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save User Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="text-indigo-600" size={20} />
                  <h3 className="text-base font-black text-slate-900">Add / Invite New Staff</h3>
                </div>
                <button
                  onClick={() => setIsAddUserOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Hossain"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="01711223344"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="creator">Creator (K-Beauty Creator)</option>
                      <option value="inventory_manager">Inventory Manager</option>
                      <option value="admin">Store Admin</option>
                      <option value="hr">HR Manager</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Executive, Operations"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Wholesale Access Authorization Toggle */}
                <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-amber-700 shrink-0" size={18} />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Grant Wholesale Pricing</span>
                      <span className="text-[11px] text-amber-900 font-medium block">
                        Allow wholesale pricing tiers (1–49 & 50+ units) upon account creation.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formWholesaleAccess}
                      onChange={(e) => setFormWholesaleAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-600">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">Delete User Account?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to delete <span className="font-extrabold text-slate-800">"{userToDelete.name}"</span>? 
                This will remove their profile record from Firestore.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
