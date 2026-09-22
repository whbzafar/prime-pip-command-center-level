import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gift,
  Copy,
  Check,
  MessageCircle,
  DollarSign,
  Calendar,
  Sparkles,
  Lock,
  Edit,
  Tag,
  Clock,
  Trash2,
  X,
  Cpu,
} from 'lucide-react';
import { UserAccount, ReferralRecord, AppointmentRecord, ModerationWarning } from '../types';
import { getStoredToken, apiChangePassword, isUserAdmin } from '../utils/authClient';
import {
  saveLocalStudent,
  getLocalStudents,
  deleteLocalStudent,
  setLocalAdminPassword,
  syncStudentsToCloud,
  syncStudentsFromCloud,
} from '../utils/localAuthStore';
import { EvolutionCommandCenter } from './evolution/EvolutionCommandCenter';

interface DeveloperAdminPanelProps {
  currentUser?: UserAccount;
  onClose?: () => void;
  onUserUpdated?: () => void;
}

export const DeveloperAdminPanel: React.FC<DeveloperAdminPanelProps> = ({ currentUser, onClose, onUserUpdated }) => {
  const isAuthorized = isUserAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'CREATE' | 'APPOINTMENTS' | 'MODERATION' | 'REFERRALS' | 'DEVELOPER_SECURITY' | 'EVOLUTION'>('CUSTOMERS');
  const [customers, setCustomers] = useState<UserAccount[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [moderationWarnings, setModerationWarnings] = useState<ModerationWarning[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);

  // Reschedule state modal
  const [rescheduleModalApt, setRescheduleModalApt] = useState<AppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Developer password change state
  const [devNewPassword, setDevNewPassword] = useState('');
  const [devConfirmPassword, setDevConfirmPassword] = useState('');
  const [devPasswordLoading, setDevPasswordLoading] = useState(false);
  const [devPasswordMessage, setDevPasswordMessage] = useState<string | null>(null);
  const [devPasswordError, setDevPasswordError] = useState<string | null>(null);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newReferralCode, setNewReferralCode] = useState('');
  const [newPrice, setNewPrice] = useState<number>(50);
  const [newIsLifetime, setNewIsLifetime] = useState<boolean>(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState<'UNPAID' | 'PENDING' | 'VERIFIED'>('VERIFIED');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'PAYMENT_REQUIRED' | 'LIFETIME'>('ACTIVE');
  const [newNotes, setNewNotes] = useState('');
  const [createdCredentialMessage, setCreatedCredentialMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; username: string } | null>(null);
  const [adminDataExpanded, setAdminDataExpanded] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    const token = getStoredToken();
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [resCust, resStats, resApts, resWarns] = await Promise.all([
        fetch('/api/admin/customers', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/stats', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/appointments', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/moderation/warnings', { headers, credentials: 'include' }).catch(() => null),
      ]);

      let localStudents = getLocalStudents();
      try {
        localStudents = await syncStudentsFromCloud();
      } catch (e) {
        // fallback to local
      }
      let serverCustomers: UserAccount[] = [];

      if (resCust && resCust.ok) {
        const contentType = resCust.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resCust.json();
          serverCustomers = data.customers || [];
        }
      }

      // Merge server customers and local students
      const mergedMap = new Map<string, UserAccount>();
      localStudents.forEach((st) => mergedMap.set(st.username.toLowerCase(), st));
      serverCustomers.forEach((sc) => mergedMap.set(sc.username.toLowerCase(), sc));
      setCustomers(Array.from(mergedMap.values()));

      if (resStats && resStats.ok) {
        const contentType = resStats.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resStats.json();
          setReferrals(data.stats?.referrals || []);
        }
      }
      if (resApts && resApts.ok) {
        const contentType = resApts.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resApts.json();
          setAppointments(data.appointments || []);
        }
      }
      if (resWarns && resWarns.ok) {
        const contentType = resWarns.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resWarns.json();
          setModerationWarnings(data.warnings || []);
        }
      }
    } catch (err) {
      console.warn('Error loading admin data from server, using local store:', err);
      setCustomers(getLocalStudents());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (
    id: string,
    status: 'REQUESTED' | 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED',
    notes?: string,
    rescheduledDateTime?: string
  ) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status, ownerNotes: notes, rescheduledDateTime }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionSuccess(`Appointment status set to ${status}!`);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Update appointment error:', err);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchAdminData();
  }, [isAuthorized]);

  const handleUpdateDevPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevPasswordError(null);
    setDevPasswordMessage(null);

    if (!devNewPassword || devNewPassword.length < 6) {
      setDevPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (devNewPassword !== devConfirmPassword) {
      setDevPasswordError('Passwords do not match.');
      return;
    }

    setDevPasswordLoading(true);
    try {
      const res = await apiChangePassword(devNewPassword);
      setDevPasswordLoading(false);
      if (res.ok) {
        setDevPasswordMessage('Admin password successfully updated. Persistent session remains active!');
        setDevNewPassword('');
        setDevConfirmPassword('');
        if (onUserUpdated) onUserUpdated();
      } else {
        setDevPasswordError(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      setDevPasswordLoading(false);
      setDevPasswordError(err?.message || 'Error updating password');
    }
  };

  const handleGeneratePassword = () => {
    const randomPass = `ppfx-${Math.random().toString(36).substring(2, 8)}`;
    setNewPassword(randomPass);
  };

  const handleCloudSyncNow = async () => {
    setIsCloudSyncing(true);
    setCloudSyncStatus(null);
    try {
      const ok = await syncStudentsToCloud();
      await syncStudentsFromCloud();
      await fetchAdminData();
      setCloudSyncStatus(ok ? 'Synced to Cloud (Vercel Ready)' : 'Sync completed');
      setTimeout(() => setCloudSyncStatus(null), 4000);
    } catch {
      setCloudSyncStatus('Sync attempt completed');
      setTimeout(() => setCloudSyncStatus(null), 4000);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreatedCredentialMessage(null);

    if (!newUsername.trim() || !newName.trim()) {
      setFormError('Name and username are required.');
      return;
    }

    const assignedPassword = newPassword.trim() || `ppfx-${Math.random().toString(36).substring(2, 8)}`;
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignedRefCode = (newReferralCode.trim() || `PPFX-${newUsername.trim().toUpperCase()}`).toUpperCase();

    // Instant local persistence for Vercel deployment support
    saveLocalStudent({
      id: studentId,
      name: newName.trim(),
      username: newUsername.trim().toLowerCase(),
      email: newEmail.trim() || undefined,
      role: 'CUSTOMER',
      subscriptionStatus: newStatus,
      subscriptionPrice: newPrice,
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: newIsLifetime ? '2099-12-31' : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      isLifetime: newIsLifetime,
      paymentStatus: newPaymentStatus,
      referralCode: assignedRefCode,
      adminNotes: newNotes,
      password: assignedPassword,
      originalPassword: assignedPassword,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    });

    const token = getStoredToken();
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          username: newUsername.trim(),
          password: assignedPassword,
          email: newEmail.trim() || undefined,
          referralCode: assignedRefCode,
          subscriptionPrice: newPrice,
          isLifetime: newIsLifetime,
          paymentStatus: newPaymentStatus,
          subscriptionStatus: newStatus,
          adminNotes: newNotes,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.ok && data.generatedPassword) {
          saveLocalStudent({
            id: data.user.id || studentId,
            name: data.user.name,
            username: data.user.username.toLowerCase(),
            role: 'CUSTOMER',
            subscriptionStatus: data.user.subscriptionStatus,
            subscriptionPrice: data.user.subscriptionPrice,
            isLifetime: data.user.isLifetime,
            paymentStatus: data.user.paymentStatus,
            referralCode: data.user.referralCode,
            password: data.generatedPassword,
            originalPassword: data.generatedPassword,
            createdAt: data.user.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      console.warn('Backend server unavailable, student registered locally for Vercel:', err);
    }

    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://primepipfx.vercel.app';
    const directLoginLink = `${originUrl}/?activate=${encodeURIComponent(newUsername.trim().toLowerCase())}&key=${encodeURIComponent(assignedPassword)}`;

    const msg = `*PrimePipFX Trading Command Center Login Credentials*\n\n` +
      `Assalam o Alaikum ${newName.trim()}! Your account has been activated.\n\n` +
      `• *Username:* ${newUsername.trim()}\n` +
      `• *Password:* ${assignedPassword}\n` +
      `• *Status:* ${newStatus}\n` +
      `• *Access Type:* ${newIsLifetime ? 'LIFETIME ACCESS' : 'Standard 30-Day Active'}\n` +
      `• *Your Personal Referral Code:* ${assignedRefCode}\n\n` +
      `🚀 *1-Click Instant Login Link (No typing required):*\n${directLoginLink}\n\n` +
      `_Rule: If you refer another trader who joins, you get Lifetime Free Access!_\n\n` +
      `WhatsApp Support: 03406671495`;

    setCreatedCredentialMessage(msg);
    setActionSuccess(`Customer ${newUsername.trim()} created successfully!`);
    // Reset form
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewReferralCode('');
    setNewNotes('');
    fetchAdminData();
  };

  const handleUpdateStatus = async (
    userId: string,
    updates: {
      name?: string;
      subscriptionStatus?: any;
      paymentStatus?: any;
      isLifetime?: boolean;
      expiryDate?: string;
      subscriptionPrice?: number;
      adminNotes?: string;
      adminData?: UserAccount['adminData'];
    }
  ) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`/api/admin/customers/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.ok) {
        setActionSuccess(`Customer ${data.user.username} updated!`);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`/api/admin/customers/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        const existing = customers.find((customer) =>
          customer.id === userId || customer.username.toLowerCase() === username.toLowerCase()
        );
        if (existing && data.password) {
          saveLocalStudent({
            ...existing,
            password: data.password,
            originalPassword: data.password,
            updatedAt: new Date().toISOString(),
          });
          await syncStudentsToCloud();
        }
        const msg = `*PrimePipFX Password Reset*\n\nUsername: ${username}\nNew Password: ${data.password}\n\nSupport: 03406671495`;
        setCreatedCredentialMessage(msg);
        setActionSuccess(`Password reset for ${username}! Message generated below.`);
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const handleDeleteCustomer = (userId: string, username: string) => {
    setCustomerToDelete({ id: userId, username });
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const { id: userId, username } = customerToDelete;

    // Delete locally immediately for Vercel deployment consistency
    deleteLocalStudent(userId);
    deleteLocalStudent(username);

    const token = getStoredToken();
    try {
      const res = await fetch(`/api/admin/customers/${userId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!data.ok) {
          console.warn('Backend delete returned error, deleted locally:', data.error);
        }
      }
    } catch (err: any) {
      console.warn('Backend delete network error, customer deleted locally:', err);
    }
    setActionSuccess(`Customer @${username} deleted permanently.`);
    setCustomerToDelete(null);
    fetchAdminData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.username || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.subscriptionStatus || '').toLowerCase().includes(q) ||
      (c.referralCode || '').toLowerCase().includes(q)
    );
  });

  // Calculate stats
  const regularCustomers = customers.filter((c) => !c.isDeveloper);
  const activeCount = regularCustomers.filter((c) => c.subscriptionStatus === 'ACTIVE' || c.subscriptionStatus === 'LIFETIME').length;
  const lifetimeCount = regularCustomers.filter((c) => c.subscriptionStatus === 'LIFETIME').length;
  const expiredCount = regularCustomers.filter((c) => c.subscriptionStatus === 'EXPIRED').length;
  const pendingPaymentCount = regularCustomers.filter((c) => c.paymentStatus === 'PENDING' || c.paymentStatus === 'UNPAID').length;
  const monthlyRevenueEstimate = activeCount * 50;
  const totalRevenue = regularCustomers
    .filter((c) => c.paymentStatus === 'VERIFIED')
    .reduce((acc, c) => acc + (c.subscriptionPrice || 50), 0);

  if (!isAuthorized) {
    return (
      <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-military font-bold text-rose-400 tracking-wider">
          403 FORBIDDEN — RESTRICTED ACCESS
        </h2>
        <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
          The Admin Panel belongs exclusively to the PrimePipFX Developer / Owner (<strong>primepipfx-admin</strong>). Customer accounts can NEVER become administrators.
        </p>
        <div className="pt-2 text-[11px] font-mono-code text-slate-500">
          Developer Official WhatsApp: 03406671495
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Developer Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-cyan-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-military font-bold tracking-wider text-slate-100 uppercase">
                  DEVELOPER & OWNER CONTROL PANEL
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-amber-300 border border-blue-500/40 text-[10px] font-mono-code font-bold">
                  MASTER PRIVILEGES
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Owner WhatsApp: <span className="text-cyan-400 font-bold">03406671495</span> • Full System & Customer Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-mono-code text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono-code text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-slate-200 text-xs">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Message Output Box (if generated) */}
      {createdCredentialMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-military font-bold text-xs uppercase">
              <MessageCircle className="w-4 h-4" />
              READY-TO-SEND WHATSAPP CREDENTIAL MESSAGE
            </div>
            <button
              onClick={() => copyToClipboard(createdCredentialMessage)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-military font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedText === createdCredentialMessage ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  COPIED!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  COPY FOR WHATSAPP
                </>
              )}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-xl text-emerald-300 font-mono-code text-xs whitespace-pre-wrap border border-slate-800 select-all">
            {createdCredentialMessage}
          </pre>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-code">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            Total Customers
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">{regularCustomers.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Enrolled Traders</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Active Subscriptions
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{lifetimeCount} Lifetime</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            Expired Accounts
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">{expiredCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{pendingPaymentCount} Pending Payment</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Est. Monthly Revenue
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">${monthlyRevenueEstimate}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">${totalRevenue} Verified Realized</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 font-military text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'CUSTOMERS'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          CUSTOMERS DIRECTORY ({regularCustomers.length})
        </button>

        <button
          onClick={() => setActiveTab('CREATE')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'CREATE'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          CREATE CUSTOMER
        </button>

        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'APPOINTMENTS'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          APPOINTMENTS & SESSIONS ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab('MODERATION')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'MODERATION'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          MODERATION LOGS ({moderationWarnings.length})
        </button>

        <button
          onClick={() => setActiveTab('REFERRALS')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'REFERRALS'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gift className="w-4 h-4" />
          REFERRALS & REWARDS ({referrals.length})
        </button>

        <button
          onClick={() => setActiveTab('DEVELOPER_SECURITY')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'DEVELOPER_SECURITY'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          DEVELOPER SECURITY
        </button>

        <button
          onClick={() => setActiveTab('EVOLUTION')}
          className={`pb-3 px-3 font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'EVOLUTION'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-emerald-300'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          EVOLUTION COMMAND CENTER
        </button>
      </div>

      {/* TAB 1: CUSTOMERS TABLE */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username, name, or status..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCloudSyncNow}
                disabled={isCloudSyncing}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-mono-code text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                title="Sync student accounts to the global cloud KV registry so they can log in on any device on Vercel"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Syncing...' : 'Sync Students to Cloud'}</span>
              </button>

              {cloudSyncStatus && (
                <span className="text-xs font-mono-code text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 animate-pulse">
                  {cloudSyncStatus}
                </span>
              )}

              <div className="text-xs font-mono-code text-slate-400">
                Showing {filteredCustomers.length} accounts
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-code text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Role / Status</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">Referral Code</th>
                  <th className="pb-3">Expiry Date</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((cust) => {
                  const isDev = cust.isDeveloper || cust.role === 'DEVELOPER';
                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{cust.name}</div>
                        <div className="text-slate-500 text-[11px]">@{cust.username}</div>
                      </td>

                      <td className="py-3">
                        {isDev ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-amber-300 border border-blue-500/40 text-[10px] font-bold">
                            DEVELOPER / OWNER
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              cust.subscriptionStatus === 'LIFETIME'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : cust.subscriptionStatus === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : cust.subscriptionStatus === 'SUSPENDED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {cust.subscriptionStatus}
                          </span>
                        )}
                      </td>

                      <td className="py-3 font-bold text-slate-300">
                        ${cust.subscriptionPrice || 50}
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            cust.paymentStatus === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : cust.paymentStatus === 'PENDING'
                              ? 'bg-blue-500/10 text-amber-300 border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {cust.paymentStatus || 'UNPAID'}
                        </span>
                      </td>

                      <td className="py-3 text-slate-300">
                        {cust.referralCode ? (
                          <span className="text-cyan-400 font-bold">{cust.referralCode}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 text-slate-400">
                        {cust.isLifetime ? (
                          <span className="text-purple-400 font-bold">LIFETIME</span>
                        ) : (
                          cust.expiryDate || '30 Days'
                        )}
                      </td>

                      <td className="py-3 text-right">
                        {!isDev && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate button */}
                            {cust.subscriptionStatus !== 'ACTIVE' && cust.subscriptionStatus !== 'LIFETIME' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(cust.id, {
                                    subscriptionStatus: 'ACTIVE',
                                    paymentStatus: 'VERIFIED',
                                  })
                                }
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] transition-colors"
                                title="Activate Customer Access"
                              >
                                Activate
                              </button>
                            )}

                            {/* Give Lifetime button */}
                            {cust.subscriptionStatus !== 'LIFETIME' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(cust.id, {
                                    subscriptionStatus: 'LIFETIME',
                                    isLifetime: true,
                                    paymentStatus: 'VERIFIED',
                                  })
                                }
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[10px] transition-colors"
                                title="Grant Lifetime Access"
                              >
                                Lifetime
                              </button>
                            )}

                            {/* Reset Password button */}
                            <button
                              onClick={() => handleResetPassword(cust.id, cust.username)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] transition-colors border border-slate-700"
                              title="Reset Password & Generate WhatsApp Message"
                            >
                              Reset Pass
                            </button>

                            {/* Suspend button */}
                            {cust.subscriptionStatus !== 'SUSPENDED' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(cust.id, {
                                    subscriptionStatus: 'SUSPENDED',
                                  })
                                }
                                className="px-2 py-1 bg-rose-900/50 hover:bg-rose-900 text-rose-300 rounded text-[10px] transition-colors"
                                title="Suspend Account"
                              >
                                Suspend
                              </button>
                            )}

                            {/* Edit Customer button */}
                            <button
                              onClick={() => setEditingUser(cust)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition-colors border border-slate-700 flex items-center gap-1"
                              title="Edit Customer Profile & Expiry"
                            >
                              <Edit className="w-3 h-3 text-cyan-400" />
                              Edit
                            </button>

                            {/* Delete Customer button */}
                            <button
                              onClick={() => handleDeleteCustomer(cust.id, cust.username)}
                              className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] transition-colors border border-rose-800/60 flex items-center gap-1"
                              title="Delete Customer Account"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400/80">
                          <Users className="w-7 h-7" />
                        </div>
                        <p className="text-base text-slate-200 font-mono-code font-bold">
                          No customer accounts have been created yet.
                        </p>
                        <p className="text-xs text-slate-400 font-mono-code max-w-md leading-relaxed">
                          Only the owner can create customer accounts. Use the "Create New Customer" tab to provision credentials and grant trading access.
                        </p>
                        <button
                          onClick={() => setActiveTab('CREATE')}
                          className="mt-3 px-5 py-2.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>CREATE FIRST CUSTOMER ACCOUNT</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CUSTOMER MODAL */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-950 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 font-mono-code text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-military font-bold text-base text-slate-100 tracking-wider">
                DELETE CUSTOMER ACCOUNT?
              </h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete customer{' '}
                <strong className="text-cyan-400">@{customerToDelete.username}</strong>?
              </p>
              <p className="text-[11px] text-rose-400/90 leading-relaxed pt-1">
                All associated login sessions and account records will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteCustomer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>CONFIRM PERMANENT DELETE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 font-mono-code text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Edit className="w-4 h-4 text-cyan-400" />
                  EDIT CUSTOMER: @{editingUser.username}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update customer name, subscription status, expiry date, or billing notes.
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Subscription Status</label>
                  <select
                    value={editingUser.subscriptionStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      setEditingUser({
                        ...editingUser,
                        subscriptionStatus: newStatus,
                        isLifetime: newStatus === 'LIFETIME',
                        expiryDate: newStatus === 'LIFETIME' ? '2099-12-31' : editingUser.expiryDate,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="LIFETIME">LIFETIME</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Payment Status</label>
                  <select
                    value={editingUser.paymentStatus || 'UNPAID'}
                    onChange={(e) => setEditingUser({ ...editingUser, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="UNPAID">UNPAID</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Subscription Expiry Date</label>
                  <input
                    type="date"
                    value={editingUser.expiryDate || ''}
                    disabled={editingUser.subscriptionStatus === 'LIFETIME'}
                    onChange={(e) => setEditingUser({ ...editingUser, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Subscription Price ($)</label>
                  <input
                    type="number"
                    value={editingUser.subscriptionPrice || 50}
                    onChange={(e) => setEditingUser({ ...editingUser, subscriptionPrice: parseFloat(e.target.value) || 50 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdminDataExpanded((v) => !v)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-blue-500/10 transition"
                >
                  <div>
                    <div className="text-cyan-300 font-bold uppercase tracking-wide">Admin Data</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Funds • Allocation • Reward • Editor assignment</div>
                  </div>
                  <span className="text-[10px] text-slate-400">{adminDataExpanded ? 'HIDE' : 'OPEN'}</span>
                </button>

                {adminDataExpanded && (
                  <div className="p-3 border-t border-blue-500/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingUser.adminData?.editorAssigned === true}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            adminData: {
                              ...(editingUser.adminData || { mode: 'ADMIN_REWARD' }),
                              editorAssigned: e.target.checked,
                              editorName: e.target.checked
                                ? (editingUser.adminData?.editorName || currentUser?.name || 'Assigned Editor')
                                : undefined,
                              updatedAt: new Date().toISOString(),
                            },
                          })}
                          className="accent-cyan-400"
                        />
                        <span className="text-xs font-bold">Editor Assigned</span>
                      </label>
                      <select
                        value={editingUser.adminData?.mode || 'ADMIN_REWARD'}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          adminData: {
                            ...(editingUser.adminData || { editorAssigned: false }),
                            mode: e.target.value as 'ADMIN_REWARD' | 'OPTIONAL',
                            updatedAt: new Date().toISOString(),
                          },
                        })}
                        className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="ADMIN_REWARD">ADMIN REWARD</option>
                        <option value="OPTIONAL">OPTIONAL</option>
                      </select>
                    </div>

                    {editingUser.adminData?.editorAssigned && (
                      <>
                        <input
                          type="text"
                          value={editingUser.adminData?.editorName || ''}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            adminData: {
                              ...(editingUser.adminData || { mode: 'ADMIN_REWARD', editorAssigned: true }),
                              editorAssigned: true,
                              editorName: e.target.value,
                              updatedAt: new Date().toISOString(),
                            },
                          })}
                          placeholder="Assigned editor name"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-slate-400 block mb-1">Funds</label>
                            <input
                              type="number"
                              step="any"
                              value={editingUser.adminData?.funds ?? ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                adminData: {
                                  ...(editingUser.adminData || { mode: 'ADMIN_REWARD', editorAssigned: true }),
                                  editorAssigned: true,
                                  funds: e.target.value === '' ? undefined : Number(e.target.value),
                                  updatedAt: new Date().toISOString(),
                                },
                              })}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Allocation</label>
                            <input
                              type="number"
                              step="any"
                              value={editingUser.adminData?.allocation ?? ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                adminData: {
                                  ...(editingUser.adminData || { mode: 'ADMIN_REWARD', editorAssigned: true }),
                                  editorAssigned: true,
                                  allocation: e.target.value === '' ? undefined : Number(e.target.value),
                                  updatedAt: new Date().toISOString(),
                                },
                              })}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Reward</label>
                            <input
                              type="number"
                              step="any"
                              value={editingUser.adminData?.reward ?? ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                adminData: {
                                  ...(editingUser.adminData || { mode: 'ADMIN_REWARD', editorAssigned: true }),
                                  editorAssigned: true,
                                  reward: e.target.value === '' ? undefined : Number(e.target.value),
                                  updatedAt: new Date().toISOString(),
                                },
                              })}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Admin values remain hidden from the student until the Admin option is opened. Optional mode lets the student enter their own values.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Admin Notes (Private)</label>
                <textarea
                  rows={2}
                  value={editingUser.adminNotes || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, adminNotes: e.target.value })}
                  placeholder="Notes on payment, customer relationship, or contact details"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleUpdateStatus(editingUser.id, {
                    name: editingUser.name,
                    subscriptionStatus: editingUser.subscriptionStatus,
                    paymentStatus: editingUser.paymentStatus,
                    isLifetime: editingUser.subscriptionStatus === 'LIFETIME',
                    expiryDate: editingUser.expiryDate,
                    subscriptionPrice: editingUser.subscriptionPrice,
                    adminNotes: editingUser.adminNotes,
                    adminData: editingUser.adminData,
                  });
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE CUSTOMER */}
      {activeTab === 'CREATE' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              CREATE NEW CUSTOMER ACCOUNT
            </h2>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Set customer credentials, pricing, and generate ready WhatsApp welcome text.
            </p>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateCustomer} className="space-y-4 font-mono-code text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tariq Khan"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. tariq01"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-bold">Password</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-cyan-400 hover:text-amber-300 text-[11px] underline"
                >
                  Generate Random Password
                </button>
              </div>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Referral Code Used</label>
                <input
                  type="text"
                  value={newReferralCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    setNewReferralCode(code);
                    if (code.trim()) {
                      setNewPrice(40); // Auto $40 with referral
                    } else {
                      setNewPrice(50);
                    }
                  }}
                  placeholder="e.g. PPFX-TARIQ-123"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Subscription Price ($)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 50)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Payment Status</label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="VERIFIED">VERIFIED (Paid on WhatsApp)</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNPAID">UNPAID</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Subscription Access</label>
                <select
                  value={newStatus}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNewStatus(val);
                    setNewIsLifetime(val === 'LIFETIME');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Standard 30-Day Period)</option>
                  <option value="LIFETIME">LIFETIME ACCESS (Never Expires)</option>
                  <option value="PAYMENT_REQUIRED">PAYMENT REQUIRED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Admin Notes (Private)</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Paid via Easypaisa / JazzCash / Bank transfer on 03406671495"
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-amber-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              CREATE CUSTOMER & PREPARE WHATSAPP MESSAGE
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: REFERRALS */}
      {activeTab === 'REFERRALS' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              REFERRALS & LIFETIME ACCESS REWARD AUDITOR
            </h2>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Rule: When a referred customer pays and is activated by the Developer, the referrer automatically receives <span className="text-cyan-400 font-bold">LIFETIME FREE ACCESS</span>.
            </p>
          </div>

          {referrals.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono-code text-xs">
              No referral transactions recorded yet. When customers join using referral codes, they will show up here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="pb-3">Referrer User</th>
                    <th className="pb-3">Referred Customer</th>
                    <th className="pb-3">Referral Code</th>
                    <th className="pb-3">Referred Payment</th>
                    <th className="pb-3">Reward Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-bold text-amber-300">@{ref.referrerUsername}</td>
                      <td className="py-3 text-slate-200">@{ref.referredUsername}</td>
                      <td className="py-3 text-slate-400">{ref.referralCode}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ref.paymentStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ref.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ref.rewardStatus === 'GRANTED_LIFETIME'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-blue-500/10 text-amber-300'
                        }`}>
                          {ref.rewardStatus}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">{new Date(ref.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPOINTMENTS */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                MENTORSHIP & CALL APPOINTMENT MANAGEMENT
              </h2>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Review, accept, reschedule, or complete 1-on-1 mentorship bookings from students.
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono-code text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono-code text-xs">
              No mentorship bookings submitted yet. When students book via the Mentorship portal, requests appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Program</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Fee / Duration</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Notes</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{apt.userName}</div>
                        {apt.userPhone && (
                          <div className="text-[11px] text-cyan-400/80 flex items-center gap-1">
                            <span>📞 {apt.userPhone}</span>
                          </div>
                        )}
                        {apt.userEmail && (
                          <div className="text-[10px] text-slate-500">{apt.userEmail}</div>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-300">{apt.sessionType}</div>
                      </td>

                      <td className="py-3">
                        <div className="text-slate-200 font-semibold">{apt.date}</div>
                        <div className="text-slate-400 text-[11px]">{apt.timeSlot}</div>
                        {apt.rescheduledDateTime && (
                          <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">
                            Rescheduled: {apt.rescheduledDateTime}
                          </div>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-emerald-400">${apt.price}</div>
                        <div className="text-[10px] text-slate-500">{apt.durationMinutes} mins</div>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : apt.status === 'RESCHEDULED'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : apt.status === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : apt.status === 'CANCELLED'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-blue-500/20 text-amber-300 border-blue-500/40 animate-pulse'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>

                      <td className="py-3 max-w-xs truncate text-slate-400 text-[11px]">
                        {apt.userNotes || 'No notes provided'}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {apt.status !== 'CONFIRMED' && apt.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'CONFIRMED')}
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold uppercase transition-colors"
                              title="Accept & Confirm appointment"
                            >
                              Accept
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setRescheduleModalApt(apt);
                              setRescheduleDate(apt.date);
                              setRescheduleTime(apt.timeSlot);
                            }}
                            className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold uppercase transition-colors"
                            title="Reschedule appointment"
                          >
                            Reschedule
                          </button>

                          {apt.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'COMPLETED')}
                              className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded text-[10px] font-bold uppercase transition-colors"
                              title="Mark session complete"
                            >
                              Complete
                            </button>
                          )}

                          {apt.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'CANCELLED')}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold uppercase transition-colors"
                              title="Reject or Cancel session"
                            >
                              Reject
                            </button>
                          )}

                          {apt.userPhone && (
                            <a
                              href={`https://wa.me/${apt.userPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hello ${apt.userName}, this is PrimePipFX Mentorship regarding your booking on ${apt.date} at ${apt.timeSlot}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] transition-colors"
                              title="Message Student on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MODERATION */}
      {activeTab === 'MODERATION' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              COMMUNITY REAL-TIME MODERATION AUDITOR & WARNING LOGS
            </h2>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Rule: Abusive language, contact sharing, scams, or sexual content triggers automated warnings. Reaching <strong>5 warnings automatically suspends</strong> the user.
            </p>
          </div>

          {moderationWarnings.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono-code text-xs">
              No moderation infractions recorded. All community channels are currently adhering to protocol.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-code text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="pb-3">Trader</th>
                    <th className="pb-3">Violation Category</th>
                    <th className="pb-3">Warning Tier</th>
                    <th className="pb-3">Message Snippet</th>
                    <th className="pb-3">Timestamp (PKT)</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {moderationWarnings.map((warn) => (
                    <tr key={warn.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{warn.userDisplayName || warn.username}</div>
                        <div className="text-slate-500 text-[11px]">@{warn.username}</div>
                      </td>

                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {warn.violationType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            warn.warningNumber >= 5
                              ? 'bg-rose-600 text-white font-black animate-pulse'
                              : 'bg-blue-500/20 text-amber-300'
                          }`}
                        >
                          Warning {warn.warningNumber} of 5 {warn.warningNumber >= 5 && '(SUSPENDED)'}
                        </span>
                      </td>

                      <td className="py-3 max-w-xs truncate text-slate-300 italic text-[11px]">
                        "{warn.messageSample}"
                      </td>

                      <td className="py-3 text-slate-400 text-[11px]">
                        {warn.datePkt} {warn.timePkt}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            const user = customers.find((c) => c.username === warn.username);
                            if (user) setEditingUser(user);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          Manage User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DEVELOPER SECURITY */}
      {activeTab === 'DEVELOPER_SECURITY' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              DEVELOPER & OWNER VAULT CREDENTIALS
            </h2>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Update the permanent backend master password for the Developer/Owner account (<strong>primepipfx-admin</strong>).
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 font-mono-code text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Master Username:</span>
              <span className="font-bold text-amber-300">primepipfx-admin</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Privilege Tier:</span>
              <span className="font-bold text-emerald-400 uppercase">Super-Admin / System Developer</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Support WhatsApp:</span>
              <span className="font-bold text-slate-200">03406671495</span>
            </div>
          </div>

          {devPasswordMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {devPasswordMessage}
            </div>
          )}

          {devPasswordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {devPasswordError}
            </div>
          )}

          <form onSubmit={handleUpdateDevPassword} className="space-y-4 font-mono-code text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">New Master Password *</label>
              <input
                type="password"
                required
                value={devNewPassword}
                onChange={(e) => setDevNewPassword(e.target.value)}
                placeholder="Enter new strong password (min 6 characters)"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={devConfirmPassword}
                onChange={(e) => setDevConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={devPasswordLoading}
              className="w-full py-3 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {devPasswordLoading ? 'UPDATING CREDENTIALS...' : 'SAVE NEW MASTER PASSWORD'}
            </button>
          </form>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono-code text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-cyan-300 uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reschedule Mentorship Session
              </h3>
              <button
                onClick={() => setRescheduleModalApt(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400">
              Rescheduling session for <strong className="text-slate-200">{rescheduleModalApt.userName}</strong> ({rescheduleModalApt.sessionType}).
            </p>

            <div>
              <label className="text-slate-300 font-bold block mb-1">New Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">New Time Slot (PKT)</label>
              <input
                type="text"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                placeholder="e.g. 08:00 PM - 09:00 PM PKT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalApt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (rescheduleModalApt) {
                    await handleUpdateAppointmentStatus(
                      rescheduleModalApt.id,
                      'RESCHEDULED',
                      `Rescheduled to ${rescheduleDate} at ${rescheduleTime}`,
                      `${rescheduleDate} at ${rescheduleTime}`
                    );
                    setRescheduleModalApt(null);
                  }
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: EVOLUTION COMMAND CENTER */}
      {activeTab === 'EVOLUTION' && (
        <EvolutionCommandCenter currentUser={currentUser} />
      )}
    </div>
  );
};
