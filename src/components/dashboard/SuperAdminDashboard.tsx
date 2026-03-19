import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, ShoppingBag, DollarSign, 
  ArrowUpRight, ArrowDownRight, Package, Star,
  Search, Bell, Settings, LogOut, LayoutDashboard,
  Tag, BarChart3, Megaphone, Trash2, Shield, UserPlus, AlertTriangle, RefreshCcw, Phone, MapPin, FlaskConical, Box
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { User, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../../firebase';

const data = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

const pieData = [
  { name: 'Returning', value: 68 },
  { name: 'New', value: 32 },
];

const COLORS = ['#000000', '#e5e7eb'];

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'orders' | 'monitoring' | 'settings'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; userId: string; userName: string }>({ show: false, userId: '', userName: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'orders'));
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'orders');
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  };

  const fetchStats = async () => {
    try {
      const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'users'))
      ]);

      const totalSales = ordersSnap.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
      
      setStats({
        totalSales,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        totalCustomers: usersSnap.docs.filter(d => d.data().role === 'customer').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { approved: true });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, approved: true } : u));
      setToast({ show: true, message: "Admin berhasil disetujui.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.uid === userId);
    if (!userToDelete) return;

    if (userId === auth.currentUser?.uid) {
      setToast({ show: true, message: "Anda tidak bisa menghapus akun Anda sendiri.", type: 'error' });
      return;
    }

    if (userToDelete.role === 'super_admin') {
      setToast({ show: true, message: "Anda tidak bisa menghapus akun CEO.", type: 'error' });
      return;
    }

    setConfirmDelete({ show: true, userId, userName: userToDelete.name });
  };

  const confirmDeleteUser = async () => {
    const { userId } = confirmDelete;
    setConfirmDelete({ show: false, userId: '', userName: '' });
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus pengguna');
      }

      setUsers(prev => prev.filter(u => u.uid !== userId));
      setToast({ show: true, message: "Pengguna berhasil dihapus secara permanen.", type: 'success' });
      
      // Auto hide toast
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setToast({ show: true, message: `Gagal menghapus pengguna: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pesanan ini?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const resetAllData = async () => {
    if (!confirm("PERINGATAN: Ini akan menghapus SEMUA pesanan dan produk. Data pengguna (kecuali Super Admin) juga akan dihapus. Lanjutkan?")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Clear orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.forEach(d => batch.delete(d.ref));
      
      // Clear products
      const productsSnap = await getDocs(collection(db, 'products'));
      productsSnap.forEach(d => batch.delete(d.ref));
      
      // Clear users except current super admin
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        if (d.id !== auth.currentUser?.uid) {
          batch.delete(d.ref);
        }
      });
      
      await batch.commit();
      alert("Semua data telah direset berhasil.");
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert("Gagal mereset data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f4] font-sans text-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight">Everez Admin</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'monitoring', icon: BarChart3, label: 'Monitoring Staff' },
            { id: 'users', icon: Users, label: 'Staff & Pelanggan' },
            { id: 'orders', icon: ShoppingBag, label: 'Pesanan' },
            { id: 'settings', icon: Settings, label: 'Pengaturan' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex items-center justify-between mb-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Cari..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
              <div className="text-right">
                <p className="text-sm font-semibold">CEO Dashboard</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Owner</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold">
                CEO
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                  <p className="text-zinc-500">Ringkasan performa toko Anda hari ini.</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Penjualan', value: `Rp ${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                  { label: 'Total Pesanan', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600' },
                  { label: 'Total Pelanggan', value: stats.totalCustomers, icon: Users, color: 'text-orange-600' },
                  { label: 'Total Produk', value: stats.totalProducts, icon: Package, color: 'text-purple-600' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-xl bg-zinc-50", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-sm text-zinc-500 mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-8">Analisis Penjualan</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="sales" fill="#000000" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Retensi Pelanggan</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-8 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">68%</p>
                      <p className="text-xs text-zinc-400">Lama</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">32%</p>
                      <p className="text-xs text-zinc-400">Baru</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Monitoring Staff</h2>
                <p className="text-zinc-500">Pantau aktivitas produksi, packing, dan sales secara real-time.</p>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {/* Production Monitoring */}
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                        <FlaskConical className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Produksi</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin Produksi</span>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: 'Perlu Produksi', count: orders.filter(o => o.status === 'Diproses').length, color: 'bg-blue-500' },
                      { label: 'Sedang Produksi', count: orders.filter(o => o.status === 'Produksi').length, color: 'bg-orange-500' },
                      { label: 'Selesai Produksi', count: orders.filter(o => ['Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].includes(o.status)).length, color: 'bg-zinc-900' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-500">{s.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{s.count}</span>
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Packing Monitoring */}
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                        <Box className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Packing</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin Packing</span>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: 'Perlu Packing', count: orders.filter(o => o.status === 'Produksi').length, color: 'bg-blue-500' },
                      { label: 'Sedang Packing', count: orders.filter(o => o.status === 'Packing').length, color: 'bg-orange-500' },
                      { label: 'Siap Kirim', count: orders.filter(o => o.status === 'Siap Kirim').length, color: 'bg-emerald-500' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-500">{s.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{s.count}</span>
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales Monitoring */}
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Sales</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin Sales</span>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: 'Total Penjualan', value: `Rp ${stats.totalSales.toLocaleString()}`, color: 'bg-emerald-500' },
                      { label: 'Pesanan Baru', count: orders.filter(o => o.status === 'Diproses').length, color: 'bg-blue-500' },
                      { label: 'Pesanan Selesai', count: orders.filter(o => o.status === 'Selesai').length, color: 'bg-zinc-900' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-500">{s.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{s.value || s.count}</span>
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Aktivitas Pesanan Terkini</h3>
                  <div className="flex gap-2">
                    {['Semua', 'Produksi', 'Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].map(s => (
                      <button key={s} className="px-3 py-1 text-[10px] font-bold bg-zinc-50 text-zinc-500 rounded-lg hover:bg-zinc-100">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">ID Pesanan</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Pelanggan</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status Saat Ini</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Update Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.slice(0, 10).map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-zinc-400">
                          {o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : 'Baru'}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-zinc-500">#{o.id.slice(-6)}</td>
                        <td className="px-6 py-4 text-sm font-bold">{o.customerName || 'Pelanggan'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            o.status === 'Diproses' ? "bg-blue-50 text-blue-600" : 
                            o.status === 'Produksi' ? "bg-orange-50 text-orange-600" :
                            o.status === 'Packing' ? "bg-purple-50 text-purple-600" :
                            o.status === 'Siap Kirim' ? "bg-emerald-50 text-emerald-600" :
                            "bg-zinc-50 text-zinc-500"
                          )}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold">
                              {o.status.charAt(0)}
                            </div>
                            <span className="text-xs text-zinc-500">Updated by Staff</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h2>
                  <p className="text-zinc-500">Kelola staff admin dan pelanggan Anda secara terpisah.</p>
                </div>
              </div>

              {/* Pending Approval Section */}
              {users.some(u => u.role !== 'customer' && u.role !== 'super_admin' && u.approved === false) && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-6 h-6 text-orange-500" />
                    <h3 className="text-xl font-bold">Persetujuan Admin Baru</h3>
                  </div>
                  <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-orange-50/50 border-b border-orange-100">
                          <th className="px-6 py-4 text-xs font-bold text-orange-800 uppercase tracking-wider">Nama & Email</th>
                          <th className="px-6 py-4 text-xs font-bold text-orange-800 uppercase tracking-wider">Role Diminta</th>
                          <th className="px-6 py-4 text-xs font-bold text-orange-800 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-50">
                        {users.filter(u => u.role !== 'customer' && u.role !== 'super_admin' && u.approved === false).map((u) => (
                          <tr key={u.uid} className="hover:bg-orange-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{u.name}</p>
                                  <p className="text-xs text-zinc-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold px-3 py-1.5 bg-zinc-100 rounded-lg">
                                {u.role === 'admin_production' ? 'Admin Produksi' : 
                                 u.role === 'admin_packing' ? 'Admin Packing' : 
                                 u.role === 'admin_sales' ? 'Admin Sales' : u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => approveUser(u.uid)}
                                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                                >
                                  Setujui
                                </button>
                                <button 
                                  onClick={() => deleteUser(u.uid)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Staff Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-zinc-900" />
                  <h3 className="text-xl font-bold">Staff & CEO</h3>
                </div>
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Nama & Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Kontak & Lokasi</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {users.filter(u => u.role !== 'customer' && (u.approved !== false || u.role === 'super_admin')).map((u) => (
                        <tr key={u.uid} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-600">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{u.name}</p>
                                <p className="text-xs text-zinc-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {u.phone || '-'}
                              </p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {u.city || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {u.role === 'super_admin' ? (
                              <span className="text-xs font-bold px-3 py-1.5 bg-zinc-900 text-white rounded-lg">
                                CEO
                              </span>
                            ) : (
                              <select 
                                value={u.role}
                                onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                                className="text-xs font-bold px-3 py-1.5 bg-zinc-100 rounded-lg border-none focus:ring-2 focus:ring-zinc-900/5"
                              >
                                <option value="customer">Pelanggan</option>
                                <option value="admin_production">Admin Produksi</option>
                                <option value="admin_packing">Admin Packing</option>
                                <option value="admin_sales">Admin Sales</option>
                                <option value="super_admin">CEO</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'super_admin' && (
                              <button 
                                onClick={() => deleteUser(u.uid)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Customers Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-zinc-900" />
                  <h3 className="text-xl font-bold">Pelanggan</h3>
                </div>
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Nama & Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Kontak & Lokasi</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Alamat Lengkap</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {users.filter(u => u.role === 'customer').map((u) => (
                        <tr key={u.uid} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-600">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{u.name}</p>
                                <p className="text-xs text-zinc-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {u.phone || '-'}
                              </p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {u.city || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-zinc-500 max-w-[200px] truncate" title={u.address}>
                              {u.address || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                              className="text-xs font-bold px-3 py-1.5 bg-zinc-100 rounded-lg border-none focus:ring-2 focus:ring-zinc-900/5"
                            >
                              <option value="customer">Pelanggan</option>
                              <option value="admin_production">Admin Produksi</option>
                              <option value="admin_packing">Admin Packing</option>
                              <option value="admin_sales">Admin Sales</option>
                              <option value="super_admin">CEO</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => deleteUser(u.uid)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Manajemen Pesanan</h2>
                  <p className="text-zinc-500">Kelola dan hapus pesanan dari sistem.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">ID Pesanan</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Pelanggan</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-zinc-500">#{o.id.slice(-6)}</td>
                        <td className="px-6 py-4 text-sm font-bold">{o.customerName || 'Pelanggan'}</td>
                        <td className="px-6 py-4 text-sm font-bold">Rp {o.total.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            o.status === 'Diproses' ? "bg-blue-50 text-blue-600" : "bg-zinc-50 text-zinc-500"
                          )}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => deleteOrder(o.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 max-w-2xl"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
                <p className="text-zinc-500">Konfigurasi sistem dan manajemen data.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-8">
                <section>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-zinc-400" />
                    Keamanan
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">Pastikan hanya staff terpercaya yang memiliki akses admin.</p>
                </section>

                <div className="h-px bg-zinc-100" />

                <section className="p-6 bg-red-50 rounded-2xl border border-red-100">
                  <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-red-500 mb-6">Tindakan di bawah ini tidak dapat dibatalkan. Mohon berhati-hati.</p>
                  
                  <button 
                    onClick={resetAllData}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Reset Semua Data (Mulai dari 0)
                  </button>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-6 text-red-600">
                  <div className="p-3 bg-red-50 rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Hapus Pengguna?</h3>
                </div>
                <p className="text-zinc-500 mb-8">
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-zinc-900">{confirmDelete.userName}</span> secara permanen? Tindakan ini tidak dapat dibatalkan dan akan menghapus data di Auth & Firestore. Akun CEO tidak dapat dihapus.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete({ show: false, userId: '', userName: '' })}
                    className="flex-1 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={cn(
                "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3",
                toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              )}
            >
              {toast.type === 'success' ? <RefreshCcw className="w-5 h-5 animate-spin-slow" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="font-bold">{toast.message}</p>
              <button 
                onClick={() => setToast({ ...toast, show: false })}
                className="ml-4 hover:opacity-70"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <RefreshCcw className="w-10 h-10 text-zinc-900 animate-spin" />
              <p className="text-sm font-bold text-zinc-900">Memproses...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
