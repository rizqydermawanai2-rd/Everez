import React, { useState, useEffect, FormEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy, where, getDocs } from 'firebase/firestore';
import { Product, Order, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash, Package, ShoppingBag, TrendingUp, Clock, CheckCircle, X, DollarSign, Search, Bell, LayoutDashboard, Globe, Loader2, ShieldCheck, Truck, RefreshCw, Star, UserCheck, Box } from 'lucide-react';
import { cn, getImageUrl } from '../../lib/utils';
import AttendanceForm from './AttendanceForm';
import { hasCheckedInToday } from '../../services/attendanceService';
import ImageUpload from '../ImageUpload';

const DEFAULT_FEATURES = [
  { id: 'warranty', title: 'Garansi 30 Hari', description: 'Jaminan kualitas produk', icon: ShieldCheck },
  { id: 'shipping', title: 'Gratis Ongkir', description: 'Seluruh Indonesia', icon: Truck },
  { id: 'return', title: 'Retur Mudah', description: 'Syarat & Ketentuan berlaku', icon: RefreshCw },
  { id: 'quality', title: 'Premium Quality', description: 'Bahan terbaik pilihan', icon: Star },
];

interface AdminDashboardProps {
  user: User;
  onViewWebsite?: () => void;
}

export default function AdminSalesDashboard({ user, onViewWebsite }: AdminDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: 'T-Shirt',
    stock: 0,
    description: '',
    image: '',
    images: ['', '', '', ''] as string[],
    features: DEFAULT_FEATURES.map(f => ({ ...f, enabled: false }))
  });

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

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => { unsubProducts(); unsubOrders(); };
  }, [user.uid]);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty image URLs and ensure at least the main image is set
      const filteredImages = newProduct.images.filter(img => img.trim() !== '');
      const productData = {
        ...newProduct,
        image: filteredImages[0] || newProduct.image,
        images: filteredImages,
        features: newProduct.features.map(({ icon, ...rest }: any) => rest)
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        setEditingProduct(null);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      setIsAddingProduct(false);
      setNewProduct({ 
        name: '', price: 0, category: 'Kaos', stock: 0, description: '', image: '', 
        images: ['', '', '', ''],
        features: DEFAULT_FEATURES.map(f => ({ ...f, enabled: false }))
      });
    } catch (err) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
      description: product.description,
      image: product.image,
      images: product.images && product.images.length > 0 
        ? [...product.images, ...Array(4 - product.images.length).fill('')].slice(0, 4)
        : [product.image, '', '', ''],
      features: DEFAULT_FEATURES.map(df => {
        const existing = product.features?.find(f => f.id === df.id);
        return existing ? { ...df, ...existing } : { ...df, enabled: false };
      })
    });
    setIsAddingProduct(true);
  };

  const removeImage = (index: number) => {
    const updatedImages = [...newProduct.images];
    updatedImages[index] = '';
    setNewProduct(prev => ({ ...prev, images: updatedImages }));
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Hapus produk ini?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Hapus pesanan ini?')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
      }
    }
  };

  const getStockIndicator = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' };
    if (stock <= 5) return { label: 'Sedikit', color: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' };
    return { label: 'Banyak', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' };
  };

  const stats = [
    { label: 'Total Penjualan', value: `Rp ${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Order Masuk', value: orders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Perlu Diproses', value: orders.filter(o => o.status === 'Diproses').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Stok Tersedia', value: `${products.reduce((acc, p) => acc + (p.stock || 0), 0)} Pcs`, icon: Box, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Selesai', value: orders.filter(o => o.status === 'Selesai').length, icon: CheckCircle, color: 'text-zinc-900', bg: 'bg-zinc-100' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-[85vh] bg-white md:rounded-[2rem] md:shadow-xl md:shadow-zinc-200/50 md:border border-zinc-200/60 overflow-hidden font-sans text-zinc-950">
      {/* Attendance Check */}
      {!hasCheckedIn && (
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
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="font-bold text-lg leading-tight">Sales</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col gap-2 md:gap-1 ml-4 md:ml-0 overflow-x-auto md:overflow-visible hide-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Ringkasan Penjualan' },
            { id: 'products', icon: Package, label: 'Manajemen Produk' },
            { id: 'orders', icon: ShoppingBag, label: 'Daftar Pesanan' },
            { id: 'absensi', icon: UserCheck, label: 'Absensi' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 focus:outline-none",
                activeTab === item.id 
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60" 
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
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
              AS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">Admin Sales</p>
              <p className="text-[10px] text-zinc-500 truncate">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pusat Penjualan</h2>
            <p className="text-sm text-zinc-500">Kelola katalog produk dan pantau transaksi masuk.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'products' && (
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-sm order-2 md:order-1"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk
              </button>
            )}
            <div className="relative flex-1 md:w-64 order-1 md:order-2 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 shadow-sm"
              />
            </div>
            <button className="w-10 h-10 shrink-0 bg-white border border-zinc-200/60 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 shadow-sm relative order-3">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{ willChange: 'transform' }}
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {stats.map((stat, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-4 md:p-5 rounded-3xl border border-zinc-200/60 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-bold text-zinc-900">{stat.value}</p>
                        <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-1">{stat.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Recent Orders */}
                  <div className="lg:col-span-12 bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                      <h3 className="text-lg font-bold">Pesanan Terbaru</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-zinc-500 hover:text-zinc-900">Lihat Semua</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {orders.slice(0, 10).map((order, index) => (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all bg-zinc-50/50 hover:bg-white flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-sm text-zinc-900 truncate">#{order.id.slice(-6)}</p>
                              <p className="text-xs text-zinc-500 truncate">{order.customerName || 'Customer'} • {order.items.length} Item</p>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shrink-0",
                              order.status === 'Diproses' ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-500"
                            )}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-zinc-100 gap-3">
                            <p className="text-sm font-bold text-zinc-900">Rp {order.total.toLocaleString('id-ID')}</p>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {order.status === 'Diproses' && (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateOrderStatus(order.id, 'Produksi')}
                                  className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
                                >
                                  Kirim ke Produksi
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
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
                <h3 className="text-lg font-bold">Manajemen Produk</h3>
                <span className="text-xs font-bold text-zinc-500">{products.length} Produk Terdaftar</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Kategori</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stok</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Indikator</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Harga</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</th>
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
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200/60 shrink-0">
                              <img src={getImageUrl(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-zinc-900 truncate">{p.name}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{p.description?.slice(0, 30)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{p.category}</span>
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
                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 whitespace-nowrap">Rp {p.price.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEditProduct(p)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"><Edit className="w-4 h-4" /></motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash className="w-4 h-4" /></motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
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
              className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]"
            >
              <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold">Daftar Pesanan</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-zinc-500">{orders.length} Total Pesanan</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pelanggan</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {orders.map((order, index) => (
                      <motion.tr 
                        key={order.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-zinc-900">#{order.id.slice(-8)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-zinc-900">{order.customerName}</p>
                            <p className="text-[10px] text-zinc-500">{order.items.length} Item</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            order.status === 'Diproses' ? "bg-blue-50 text-blue-600" :
                            order.status === 'Produksi' ? "bg-orange-50 text-orange-600" :
                            order.status === 'Selesai' ? "bg-emerald-50 text-emerald-600" :
                            "bg-zinc-100 text-zinc-500"
                          )}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-zinc-900">Rp {order.total.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            {order.status === 'Diproses' && (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateOrderStatus(order.id, 'Produksi')}
                                className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-800 transition-colors"
                              >
                                Produksi
                              </motion.button>
                            )}
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteOrder(order.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash className="w-4 h-4" /></motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'absensi' && (
            <motion.div
              key="absensi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              {hasCheckedIn ? (
                <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <CheckCircle className="w-8 h-8" />
                    <h3 className="text-lg font-bold">Anda sudah mengisi kehadiran hari ini</h3>
                  </div>
                  <div className="space-y-2 text-sm text-zinc-600">
                    <p><span className="font-bold">Status:</span> {attendanceRecord?.status}</p>
                    <p><span className="font-bold">Tanggal:</span> {attendanceRecord?.date}</p>
                    {attendanceRecord?.photoUrl && (
                      <div>
                        <p className="font-bold">Foto:</p>
                        <img src={getImageUrl(attendanceRecord.photoUrl)} alt="Attendance" className="w-full rounded-xl mt-1" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {attendanceRecord?.reason && (
                      <p><span className="font-bold">Alasan:</span> {attendanceRecord.reason}</p>
                    )}
                  </div>
                </div>
              ) : (
                <AttendanceForm user={user} onSuccess={() => {
                  setHasCheckedIn(true);
                  // Refresh attendance record
                  const checkAttendance = async () => {
                    const attendanceRef = collection(db, 'attendance');
                    const today = new Date().toISOString().split('T')[0];
                    const q = query(attendanceRef, where('userId', '==', user.uid), where('date', '==', today));
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                      setAttendanceRecord(snapshot.docs[0].data());
                    }
                  };
                  checkAttendance();
                }} />
              )}
            </motion.div>
          )}
        </div>
      </main>

      {isAddingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 md:space-y-8 border border-zinc-200/60 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl md:text-2xl font-bold">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input 
                  required 
                  placeholder="Nama Produk" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    required type="number" placeholder="Harga" 
                    value={newProduct.price || ''}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                  />
                  <input 
                    required type="number" placeholder="Stok" 
                    value={newProduct.stock || ''}
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                  />
                </div>
                <select 
                  value={newProduct.category}
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm"
                >
                  <option>T-Shirt</option>
                  <option>Reguler</option>
                  <option>Regular Fit</option>
                  <option>Oversized</option>
                  <option>Hoodie</option>
                  <option>Lainnya</option>
                </select>
                <textarea 
                  placeholder="Deskripsi" 
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[100px] text-sm" 
                />
                <div className="space-y-3">
                  <p className="text-sm font-bold text-zinc-700">Gambar Produk (Maksimal 4)</p>
                  <div className="grid grid-cols-2 gap-4">
                    {newProduct.images.map((img, idx) => (
                      <div key={idx}>
                        <ImageUpload
                          value={img}
                          onChange={(url) => {
                            const updatedImages = [...newProduct.images];
                            updatedImages[idx] = url;
                            setNewProduct(prev => ({ ...prev, images: updatedImages }));
                          }}
                          onRemove={() => removeImage(idx)}
                          folder="products"
                          label={idx === 0 ? 'Utama' : `Gambar ${idx + 1}`}
                          aspectRatio="square"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">* Gambar pertama akan digunakan sebagai foto utama produk.</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <p className="text-sm font-bold text-zinc-700">Keunggulan Pelayanan</p>
                  <div className="space-y-3">
                    {newProduct.features.map((feature, idx) => (
                      <div key={feature.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              feature.enabled ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-400"
                            )}>
                              {React.createElement(DEFAULT_FEATURES.find(df => df.id === feature.id)?.icon || Star, { className: "w-4 h-4" })}
                            </div>
                            <span className="text-sm font-bold text-zinc-900">{feature.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedFeatures = [...newProduct.features];
                              updatedFeatures[idx].enabled = !updatedFeatures[idx].enabled;
                              setNewProduct({ ...newProduct, features: updatedFeatures });
                            }}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative",
                              feature.enabled ? "bg-zinc-900" : "bg-zinc-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                              feature.enabled ? "left-6" : "left-1"
                            )} />
                          </button>
                        </div>
                        
                        {feature.enabled && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <input
                              placeholder="Judul Pelayanan"
                              value={feature.title}
                              onChange={e => {
                                const updatedFeatures = [...newProduct.features];
                                updatedFeatures[idx].title = e.target.value;
                                setNewProduct({ ...newProduct, features: updatedFeatures });
                              }}
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                            />
                            <textarea
                              placeholder="Detail Pelayanan"
                              value={feature.description}
                              onChange={e => {
                                const updatedFeatures = [...newProduct.features];
                                updatedFeatures[idx].description = e.target.value;
                                setNewProduct({ ...newProduct, features: updatedFeatures });
                              }}
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[60px]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full py-3 md:py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-md">
                  {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

      {/* Attendance Overlay */}
      {!hasCheckedIn && (
        <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-200/60 flex flex-col items-center gap-6">
            <h2 className="text-2xl font-bold text-zinc-900">Absensi Diperlukan</h2>
            <p className="text-zinc-600 text-center">Anda harus melakukan absensi terlebih dahulu sebelum dapat mengakses dashboard.</p>
            <AttendanceForm user={user} onSuccess={() => setHasCheckedIn(true)} />
          </div>
        </div>
      )}

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
