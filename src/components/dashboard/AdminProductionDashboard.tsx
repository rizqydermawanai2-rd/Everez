import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Search, Bell, Settings, LogOut, LayoutDashboard,
  ClipboardList, Package, Users, Plus, 
  Clock, CheckCircle2, AlertCircle, Droplets, FlaskConical, Box, Trash2, Globe, MessageSquare
} from 'lucide-react';
import { cn, getImageUrl } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, where, getDocs } from 'firebase/firestore';
import { Order, User } from '../../types';
import AttendanceForm from './AttendanceForm';
import { hasCheckedInToday } from '../../services/attendanceService';
import NotificationDropdown, { Notification } from './NotificationDropdown';
import AdminChat from './AdminChat';

const pieData = [
  { name: 'Returning', value: 9 },
  { name: 'New', value: 2 },
];

const COLORS = ['#09090b', '#e4e4e7'];

interface AdminProductionDashboardProps {
  user: User;
  onViewWebsite?: () => void;
}

export default function AdminProductionDashboard({ user, onViewWebsite }: AdminProductionDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hasCheckedIn, setHasCheckedIn] = useState(['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role));
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const checkAttendance = async () => {
      const attendanceRef = collection(db, 'attendance');
      const today = new Date().toISOString().split('T')[0];
      const q = query(attendanceRef, where('userId', '==', user.uid), where('date', '==', today));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setHasCheckedIn(true);
        setAttendanceRecord(snapshot.docs[0].data());
      }
    };
    checkAttendance();

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', false);
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory', false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products', false);
    });

    const unsubChats = onSnapshot(collection(db, 'chats'), (snapshot) => {
      let totalUnread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadAdmin) {
          totalUnread += data.unreadAdmin;
        }
      });
      setUnreadChatCount(totalUnread);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats', false);
    });

    return () => {
      unsubOrders();
      unsubInventory();
      unsubProducts();
      unsubChats();
    };
  }, []);

  useEffect(() => {
    const newNotifications: Notification[] = [];
    
    if (unreadChatCount > 0) {
      newNotifications.push({
        id: 'unread-chats',
        title: 'Pesan Baru',
        message: `Ada ${unreadChatCount} pesan belum dibaca`,
        type: 'chat',
        time: 'Baru saja',
        read: false,
        action: () => setActiveTab('chat')
      });
    }
    
    inventory.forEach(item => {
      if (item.stock <= 5) {
        newNotifications.push({
          id: `stock-${item.id}`,
          title: 'Stok Menipis',
          message: `${item.name} tersisa ${item.stock} pcs`,
          type: 'stock',
          time: 'Baru saja',
          read: false,
          action: () => setActiveTab('inventory')
        });
      }
    });

    const newOrders = orders.filter(o => o.status === 'Produksi');
    if (newOrders.length > 0) {
      newNotifications.push({
        id: 'new-orders',
        title: 'Antrean Produksi',
        message: `Ada ${newOrders.length} pesanan perlu diproduksi`,
        type: 'order',
        time: 'Baru saja',
        read: false,
        action: () => setActiveTab('orders')
      });
    }

    setNotifications(newNotifications);
  }, [inventory, orders]);

  const getStockIndicator = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' };
    if (stock <= 5) return { label: 'Sedikit', color: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' };
    return { label: 'Banyak', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' };
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Hapus pesanan ini?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const stats = [
    { label: 'Perlu Produksi', count: orders.filter(o => o.status === 'Diproses').length, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sedang Produksi', count: orders.filter(o => o.status === 'Produksi').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Stok Tersedia', count: products.reduce((acc, p) => acc + (p.stock || 0), 0), icon: Box, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Selesai Produksi', count: orders.filter(o => ['Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].includes(o.status)).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-[85vh] bg-white md:rounded-[2rem] md:shadow-xl md:shadow-zinc-200/50 md:border border-zinc-200/60 overflow-hidden font-sans text-zinc-950">
      {/* Attendance Check */}
      {!hasCheckedIn && !['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role) && (
        <div className="fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h3 className="text-xl font-bold">Absensi Masuk</h3>
              <p className="text-sm text-zinc-500">Silakan lakukan absensi sebelum memulai pekerjaan.</p>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <AttendanceForm 
                user={user} 
                onSuccess={(record) => {
                  setHasCheckedIn(true);
                  setAttendanceRecord(record);
                }} 
              />
            </div>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-50/50 border-b md:border-b-0 md:border-r border-zinc-100 flex flex-row md:flex-col p-4 md:p-6 shrink-0 overflow-x-auto md:overflow-visible">
        <div className="flex items-center gap-3 md:mb-10 px-2 shrink-0">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="font-bold text-lg leading-tight">Produksi</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col gap-2 md:gap-1 ml-4 md:ml-0 overflow-x-auto md:overflow-visible hide-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Ringkasan Produksi' },
            { id: 'orders', icon: ClipboardList, label: 'Antrian Produksi', badge: orders.filter(o => o.status === 'Produksi').length },
            { id: 'products', icon: Package, label: 'Katalog Produk' },
            { id: 'inventory', icon: Droplets, label: 'Stok Bahan' },
            { id: 'chat', icon: MessageSquare, label: 'Live Chat', badge: unreadChatCount > 0 ? unreadChatCount : undefined },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0",
                activeTab === item.id 
                  ? "bg-zinc-900 text-white shadow-md" 
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "text-zinc-400")} />
                <span className="hidden md:inline">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full",
                  activeTab === item.id ? "bg-white text-zinc-900" : "bg-red-500 text-white"
                )}>
                  {item.badge}
                </span>
              ) : null}
            </motion.button>
          ))}
          
          {onViewWebsite && (
            <button
              onClick={onViewWebsite}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden md:inline">Lihat Website</span>
            </button>
          )}
        </nav>

        <div className="hidden md:block mt-auto pt-6 border-t border-zinc-200/60">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
              AP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">Admin Produksi</p>
              <p className="text-[10px] text-zinc-500 truncate">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pusat Produksi</h2>
            <p className="text-sm text-zinc-500">Pantau antrean produksi dan ketersediaan stok bahan.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari pesanan..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 shadow-sm"
              />
            </div>
            <NotificationDropdown notifications={notifications} />
          </div>
        </header>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {stats.map((status, index) => (
                      <motion.div 
                        key={status.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white p-5 rounded-3xl border border-zinc-200/60 shadow-sm flex flex-row sm:flex-col items-center sm:items-start gap-4 hover:shadow-md transition-shadow"
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", status.bg, status.color)}>
                          <status.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{status.count}</p>
                          <p className="text-xs font-medium text-zinc-500 mt-1">{status.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Orders Section */}
                  <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                      <h3 className="text-lg font-bold">Antrean Produksi Terbaru</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-zinc-500 hover:text-zinc-900">Lihat Semua</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                      <div className="space-y-4">
                        {orders.filter(o => ['Diproses', 'Produksi'].includes(o.status)).slice(0, 5).map((order, index) => (
                          <motion.div 
                            key={order.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group p-4 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all bg-zinc-50/50 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl border border-zinc-200/60 flex items-center justify-center shadow-sm shrink-0">
                                <Package className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-zinc-900 truncate">#{order.id.slice(-6)}</p>
                                <p className="text-xs text-zinc-500 truncate">{order.customerName || 'Customer'} • {order.items.length} Items</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <span className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0",
                                order.status === 'Diproses' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                              )}>
                                {order.status}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Supply Summary */}
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold">Stok Kritis</h3>
                      <button onClick={() => setActiveTab('inventory')} className="text-xs font-bold text-zinc-500 hover:text-zinc-900">Detail</button>
                    </div>
                    <div className="space-y-5">
                      {inventory.filter(item => item.stock <= item.minStock).slice(0, 3).map((item) => (
                        <div key={item.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-zinc-700">{item.name}</span>
                            <span className="text-zinc-500 font-mono text-xs">{item.stock} {item.unit}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((item.stock / (item.minStock * 2)) * 100, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full rounded-full bg-red-500" 
                            />
                          </div>
                        </div>
                      ))}
                      {inventory.filter(item => item.stock <= item.minStock).length === 0 && (
                        <p className="text-xs text-zinc-400 italic">Semua stok aman.</p>
                      )}
                    </div>
                  </div>

                  {/* Total Customer Chart */}
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold mb-6">Tipe Pesanan</h3>
                    <div className="h-40 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-zinc-900" />
                        <span className="text-xs text-zinc-500 font-medium">Custom (9)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-zinc-200" />
                        <span className="text-xs text-zinc-500 font-medium">Ready (2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden"
              >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">Daftar Antrean Produksi</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {orders.filter(o => o.status === 'Diproses').length} Perlu Produksi
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {orders.filter(o => o.status === 'Produksi').length} Sedang Produksi
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {orders.filter(o => ['Diproses', 'Produksi'].includes(o.status)).map((order, index) => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group p-6 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all bg-zinc-50/50 hover:bg-white flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-zinc-200/60 flex items-center justify-center shadow-sm shrink-0">
                          <Package className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-bold text-lg text-zinc-900">#{order.id.slice(-6)}</p>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider",
                              order.status === 'Diproses' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                            )}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500">{order.customerName || 'Customer'} • {order.items.length} Items • {order.totalWeight || 0}g • {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium">
                            {item.name} {item.selectedSize && `(${item.selectedSize})`} ({item.quantity}x)
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        {order.status === 'Diproses' && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(order.id, 'Produksi')}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
                          >
                            Mulai Produksi
                          </motion.button>
                        )}
                        {order.status === 'Produksi' && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(order.id, 'Packing')}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            Selesai Produksi
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {orders.filter(o => ['Diproses', 'Produksi'].includes(o.status)).length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-20 text-zinc-400"
                    >
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-bold text-zinc-900">Antrean Kosong</p>
                      <p className="text-sm">Semua pesanan telah diproses atau belum ada pesanan baru.</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]"
            >
              <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold">Katalog Produk & Status Stok</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Banyak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sedikit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Habis</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Kategori</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Berat</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stok</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Indikator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {products.map((p, index) => (
                      <motion.tr 
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden border border-zinc-200/60 shrink-0">
                              <img src={getImageUrl(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <p className="font-bold text-sm text-zinc-900">{p.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{p.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-zinc-600">{p.weight || 0}g</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-sm font-medium",
                            p.stock <= 5 ? "text-red-600 font-bold" : "text-zinc-600"
                          )}>{p.stock} Pcs</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", getStockIndicator(p.stock).dot)} />
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", getStockIndicator(p.stock).color)}>
                              {getStockIndicator(p.stock).label}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {inventory.length > 0 ? (
                inventory.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{item.category}</p>
                        <h4 className="font-bold text-zinc-900">{item.name}</h4>
                      </div>
                      {item.stock <= item.minStock && (
                        <span className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-zinc-900">{item.stock} {item.unit}</p>
                      <p className="text-xs font-bold text-zinc-500">
                        {Math.round(Math.min((item.stock / (item.minStock * 2)) * 100, 100))}% Tersedia
                      </p>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.stock / (item.minStock * 2)) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full", 
                          item.stock <= item.minStock ? "bg-red-500" : "bg-zinc-900"
                        )} 
                      />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2 bg-zinc-50 text-zinc-600 text-xs font-bold rounded-xl hover:bg-zinc-100 transition-all"
                    >
                      Update Stok
                    </motion.button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <Droplets className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium">Belum ada data inventaris.</p>
                </div>
              )}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center p-8 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm">Tambah Bahan Baru</p>
              </motion.button>
            </motion.div>
          )}
          
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-[calc(100vh-12rem)]"
            >
              <AdminChat user={user} />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200/60 flex flex-col items-center gap-6">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                y: [0, -10, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2, 
                ease: "easeInOut" 
              }}
            >
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-900">
                <circle cx="12" cy="12" r="10" />
                <motion.path 
                  d="M8 14s1.5 2 4 2 4-2 4-2" 
                  animate={{ d: ["M8 14s1.5 2 4 2 4-2 4-2", "M8 15s1.5 3 4 3 4-3 4-3", "M8 14s1.5 2 4 2 4-2 4-2"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </motion.div>
            <p className="text-sm font-bold text-zinc-900">Memproses...</p>
          </div>
        </div>
      )}
    </div>
  );
}
