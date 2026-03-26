import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, CheckCircle2, Clock, Search, 
  Bell, User as UserIcon, ShoppingCart, CreditCard, ArrowLeft,
  MoreHorizontal, MapPin, Phone, Mail, ExternalLink, Trash2, Box, Globe, MessageSquare, DollarSign
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
import { DEFAULT_COURIER } from '../../services/shippingService';

interface AdminPackingDashboardProps {
  user: User;
  onViewWebsite?: () => void;
}

export default function AdminPackingDashboard({ user, onViewWebsite }: AdminPackingDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packing');
  const [hasCheckedIn, setHasCheckedIn] = useState(['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role));
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

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
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(fetchedOrders);
      if (fetchedOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(fetchedOrders[0].id);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders', false);
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
      unsubChats();
    };
  }, [selectedOrderId]);

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
    
    const newOrders = orders.filter(o => o.status === 'Packing');
    if (newOrders.length > 0) {
      newNotifications.push({
        id: 'new-orders',
        title: 'Antrean Packing',
        message: `Ada ${newOrders.length} pesanan perlu dipacking`,
        type: 'order',
        time: 'Baru saja',
        read: false,
        action: () => setActiveTab('packing')
      });
    }

    setNotifications(newNotifications);
  }, [orders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, id.startsWith('orders/') ? id : `orders/${id}`), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Hapus pesanan ini?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      if (selectedOrderId === id) {
        setSelectedOrderId(orders.find(o => o.id !== id)?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const stats = [
    { label: 'Perlu Packing', count: orders.filter(o => o.status === 'Produksi').length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sedang Packing', count: orders.filter(o => o.status === 'Packing').length, icon: Box, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Siap Kirim', count: orders.filter(o => o.status === 'Siap Kirim').length, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Selesai', count: orders.filter(o => ['Dikirim', 'Selesai'].includes(o.status)).length, icon: CheckCircle2, color: 'text-zinc-900', bg: 'bg-zinc-100' },
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
            <Box className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="font-bold text-lg leading-tight">Packing</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col gap-2 md:gap-1 ml-4 md:ml-0 overflow-x-auto md:overflow-visible hide-scrollbar">
          {[
            { id: 'packing', icon: Package, label: 'Antrian Packing', badge: orders.filter(o => o.status === 'Packing').length },
            { id: 'shipping', icon: Truck, label: 'Status Kirim' },
            { id: 'completed', icon: CheckCircle2, label: 'Riwayat Packing' },
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
              AK
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">Admin Packing</p>
              <p className="text-[10px] text-zinc-500 truncate">Warehouse A</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pusat Pengemasan</h2>
            <p className="text-sm text-zinc-500">Kelola antrean packing dan status pengiriman pesanan.</p>
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
            {activeTab === 'packing' && (
              <motion.div
                key="packing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left Column - Order List */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.slice(0, 2).map((stat, index) => (
                      <motion.div 
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white p-4 rounded-2xl border border-zinc-200/60 shadow-sm flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg, stat.color)}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-zinc-900">{stat.count}</p>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                      <h3 className="text-lg font-bold">Antrean Packing</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {orders.filter(o => ['Produksi', 'Packing'].includes(o.status)).map((order, index) => (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                            selectedOrderId === order.id 
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-md" 
                              : "border-zinc-100 hover:border-zinc-300 bg-zinc-50/50 hover:bg-white text-zinc-900"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                              selectedOrderId === order.id ? "bg-zinc-800" : "bg-white border border-zinc-200/60"
                            )}>
                              <Package className={cn("w-5 h-5", selectedOrderId === order.id ? "text-zinc-300" : "text-zinc-400")} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">#{order.id.slice(-6)}</p>
                              <p className={cn("text-xs truncate", selectedOrderId === order.id ? "text-zinc-400" : "text-zinc-500")}>
                                {order.customerName || 'Customer'} • {order.items.length} Items
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider self-start sm:self-auto shrink-0",
                            order.status === 'Packing' ? (selectedOrderId === order.id ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-50 text-orange-600') :
                            (selectedOrderId === order.id ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500')
                          )}>
                            {order.status === 'Produksi' ? 'Perlu Packing' : order.status}
                          </span>
                        </motion.div>
                      ))}
                      {orders.filter(o => ['Produksi', 'Packing'].includes(o.status)).length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-zinc-400"
                        >
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium">Tidak ada antrean packing.</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Order Details */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm h-full flex flex-col overflow-hidden">
                    {selectedOrder && ['Produksi', 'Packing'].includes(selectedOrder.status) ? (
                      <motion.div
                        key={selectedOrder.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                      >
                        <div className="p-4 md:p-6 border-b border-zinc-100 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold">Detail Packing</h3>
                            <p className="text-xs text-zinc-500 font-mono">#{selectedOrder.id}</p>
                          </div>
                          <div className="flex gap-2">
                            {selectedOrder.status === 'Produksi' && (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateStatus(selectedOrder.id, 'Packing')}
                                className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 whitespace-nowrap"
                              >
                                Mulai Packing
                              </motion.button>
                            )}
                            {selectedOrder.status === 'Packing' && (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateStatus(selectedOrder.id, 'Siap Kirim')}
                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                              >
                                Selesai Packing
                              </motion.button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                          {/* Customer Info */}
                          <section>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Tujuan Pengiriman</p>
                            <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100 space-y-3">
                              <div className="flex items-center gap-3">
                                <UserIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                                <span className="text-sm font-bold truncate">{selectedOrder.customerName || 'Customer'}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                <span className="text-sm text-zinc-600 leading-relaxed">{selectedOrder.address || 'Alamat tidak tersedia'}</span>
                              </div>
                              {selectedOrder.totalWeight && (
                                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                                  <Package className="w-4 h-4 text-zinc-400 shrink-0" />
                                  <span className="text-sm font-medium text-zinc-600">Total Berat: {selectedOrder.totalWeight}g</span>
                                </div>
                              )}
                            </div>
                          </section>

                          {/* Items */}
                          <section>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Item yang Harus Di-pack</p>
                            <div className="space-y-3">
                              {selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl border border-zinc-100 bg-white">
                                  <img src={getImageUrl(item.image) || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-zinc-50 shrink-0" referrerPolicy="no-referrer" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{item.name} {item.selectedSize && `(${item.selectedSize})`}</p>
                                    <p className="text-xs text-zinc-500">Jumlah: {item.quantity}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                        <Package className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Pilih pesanan di antrean packing untuk melihat detail</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'shipping' && (
              <motion.div
                key="shipping"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
              <div className="lg:col-span-7 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {stats.slice(2, 4).map((stat, index) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-5 rounded-3xl border border-zinc-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900">{stat.count}</p>
                        <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100">
                    <h3 className="text-lg font-bold">Status Pengiriman</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {orders.filter(o => ['Siap Kirim', 'Dikirim'].includes(o.status)).map((order, index) => (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={cn(
                            "p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                            selectedOrderId === order.id ? "border-zinc-900 bg-zinc-900 text-white shadow-md" : "border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <Truck className={cn("w-6 h-6", selectedOrderId === order.id ? "text-zinc-400" : "text-zinc-300")} />
                            <div>
                              <p className="font-bold text-sm">#{order.id.slice(-6)}</p>
                              <p className={cn("text-xs", selectedOrderId === order.id ? "text-zinc-400" : "text-zinc-500")}>{order.customerName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                              order.status === 'Siap Kirim' ? (selectedOrderId === order.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600') :
                              (selectedOrderId === order.id ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600')
                            )}>
                              {order.status}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      {orders.filter(o => ['Siap Kirim', 'Dikirim'].includes(o.status)).length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-zinc-400"
                        >
                          <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium">Tidak ada pengiriman aktif.</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm h-full overflow-hidden flex flex-col">
                  {selectedOrder && ['Siap Kirim', 'Dikirim'].includes(selectedOrder.status) ? (
                    <motion.div
                      key={selectedOrder.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold">Informasi Pengiriman</h3>
                        {selectedOrder.status === 'Siap Kirim' && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(selectedOrder.id, 'Dikirim')}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all"
                          >
                            Kirim Sekarang
                          </motion.button>
                        )}
                        {selectedOrder.status === 'Dikirim' && (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(selectedOrder.id, 'Selesai')}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                          >
                            Konfirmasi Sampai
                          </motion.button>
                        )}
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                              <UserIcon className="w-4 h-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">Penerima</p>
                              <p className="text-sm font-bold text-zinc-900">{selectedOrder.customerName}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">Alamat Tujuan</p>
                              <p className="text-sm text-zinc-600 leading-relaxed">{selectedOrder.address}</p>
                            </div>
                          </div>
                          {selectedOrder.shippingCost && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                <DollarSign className="w-4 h-4 text-zinc-500" />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">Ongkos Kirim</p>
                                <p className="text-sm font-bold text-zinc-900">Rp {selectedOrder.shippingCost.toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-6 border-t border-zinc-100">
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-4">Logistik</p>
                          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl border border-zinc-200 flex items-center justify-center">
                                <Truck className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{selectedOrder.shippingCourier || DEFAULT_COURIER}</p>
                                <p className="text-[10px] text-zinc-500">Reguler Service</p>
                              </div>
                            </div>
                            <button className="text-xs font-bold text-blue-600 hover:underline">Cek Resi</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                      <Truck className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">Pilih pesanan pengiriman untuk melihat detail</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">Riwayat Packing & Pengiriman</h3>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{orders.filter(o => o.status === 'Selesai').length} Pesanan Selesai</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Tanggal Selesai</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {orders.filter(o => o.status === 'Selesai').map((order, index) => (
                      <motion.tr 
                        key={order.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-zinc-50/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-zinc-900">#{order.id.slice(-8)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                              {order.customerName?.charAt(0) || 'C'}
                            </div>
                            <span className="text-sm font-medium text-zinc-700">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-zinc-900">Rp {order.total.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {orders.filter(o => o.status === 'Selesai').length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20 text-zinc-400"
                  >
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold text-zinc-900">Belum Ada Riwayat</p>
                    <p className="text-sm">Pesanan yang telah selesai akan muncul di sini.</p>
                  </motion.div>
                )}
              </div>
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
