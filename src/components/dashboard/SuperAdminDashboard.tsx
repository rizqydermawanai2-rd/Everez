import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, ShoppingBag, DollarSign, 
  ArrowUpRight, ArrowDownRight, Package, Star,
  Search, Bell, Settings, LogOut, LayoutDashboard,
  Tag, BarChart3, Megaphone, Trash2, Shield, ShieldCheck, UserPlus, AlertTriangle, RefreshCcw, RefreshCw, Phone, MapPin, FlaskConical, Box, X, CheckCircle, Globe, Edit, Plus, Droplets, Clock, Calendar, UserCheck, Eye, Award, Truck, Loader2, Upload, MessageCircle, CreditCard
} from 'lucide-react';
import AdminChat from './AdminChat';
import { cn, getImageUrl } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from '../../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, writeBatch, addDoc, onSnapshot } from 'firebase/firestore';
import { User, UserRole, Product, ShippingPromo } from '../../types';
import { handleFirestoreError, OperationType } from '../../firebase';
import { hasCheckedInToday } from '../../services/attendanceService';
import AttendanceForm from './AttendanceForm';
import PaymentMethodManager from './PaymentMethodManager';
import ImageUpload from '../ImageUpload';
import NotificationDropdown, { Notification } from './NotificationDropdown';

const DEFAULT_FEATURES = [
  { id: 'warranty', title: 'Garansi 30 Hari', description: 'Jaminan kualitas produk', icon: ShieldCheck },
  { id: 'shipping', title: 'Gratis Ongkir', description: 'Seluruh Indonesia', icon: Truck },
  { id: 'return', title: 'Retur Mudah', description: 'Syarat & Ketentuan berlaku', icon: RefreshCw },
  { id: 'quality', title: 'Premium Quality', description: 'Bahan terbaik pilihan', icon: Star },
];

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

interface SuperAdminDashboardProps {
  user: User;
  onViewWebsite?: () => void;
}

function ProductDiscountRow({ product, onUpdate, index }: { product: any, onUpdate: (id: string, price: number, label: string, discountType?: 'percentage' | 'fixed', discountValue?: number, bundleBadgeText?: string) => Promise<void>, index: number, key?: any }) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(product.discountType || 'fixed');
  const [discountValue, setDiscountValue] = useState(product.discountValue || 0);
  const [discountPrice, setDiscountPrice] = useState(product.discountPrice || 0);
  const [promoLabel, setPromoLabel] = useState(product.promoLabel || '');
  const [bundleBadgeText, setBundleBadgeText] = useState(product.bundleBadgeText || 'Bundle');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (discountType === 'percentage') {
      const calculated = product.price - (product.price * discountValue / 100);
      setDiscountPrice(Math.round(Math.max(0, calculated)));
    } else {
      setDiscountPrice(discountValue);
    }
  }, [discountType, discountValue, product.price]);

  return (
    <motion.tr 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="hover:bg-zinc-50/50 transition-colors"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden border border-zinc-200/60">
            <img src={getImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900">{product.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{product.category}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-zinc-600">Rp {product.price.toLocaleString('id-ID')}</p>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg w-fit">
              <button 
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                  discountType === 'fixed' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                )}
              >
                Rp
              </button>
              <button 
                onClick={() => setDiscountType('percentage')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                  discountType === 'percentage' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                )}
              >
                %
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <input 
                type="number" 
                value={discountValue || ''} 
                onChange={e => setDiscountValue(Number(e.target.value))}
                className="w-32 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                placeholder={discountType === 'percentage' ? "Persen..." : "Harga diskon..."}
              />
              {discountType === 'percentage' && discountValue > 0 && (
                <p className="text-[10px] text-zinc-400 font-medium italic">
                  Harga akhir: Rp {discountPrice.toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <p className={cn("text-sm font-bold", discountPrice > 0 ? "text-red-600" : "text-zinc-400")}>
              {discountPrice > 0 ? `Rp ${discountPrice.toLocaleString('id-ID')}` : 'Tidak ada diskon'}
            </p>
            {discountType === 'percentage' && discountValue > 0 && (
              <span className="text-[10px] text-zinc-400 font-medium italic">Diskon {discountValue}%</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              value={promoLabel} 
              onChange={e => setPromoLabel(e.target.value)}
              className="w-24 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              placeholder="Label..."
            />
            {product.isBundle && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Badge Bundle</label>
                <select 
                  value={bundleBadgeText} 
                  onChange={e => setBundleBadgeText(e.target.value)}
                  className="w-24 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-900/5"
                >
                  <option value="Bundle">Bundle</option>
                  <option value="Bundle Exclusive">Bundle Exclusive</option>
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {promoLabel && (
              <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider w-fit">
                {promoLabel}
              </span>
            )}
            {product.isBundle && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider w-fit">
                {bundleBadgeText}
              </span>
            )}
            {!promoLabel && !product.isBundle && (
              <span className="text-[10px] text-zinc-400 font-medium italic">Tanpa label</span>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        {isEditing ? (
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => { onUpdate(product.id, discountPrice, promoLabel, discountType, discountValue, bundleBadgeText); setIsEditing(false); }}
              className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-800 transition-all"
            >
              Simpan
            </button>
            <button 
              onClick={() => { 
                setDiscountType(product.discountType || 'fixed');
                setDiscountValue(product.discountValue || 0);
                setDiscountPrice(product.discountPrice || 0); 
                setPromoLabel(product.promoLabel || ''); 
                setIsEditing(false); 
              }}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-lg hover:bg-zinc-200 transition-all"
            >
              Batal
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </td>
    </motion.tr>
  );
}

function ShippingPromoRow({ promo, onUpdate, onDelete }: { promo: ShippingPromo, onUpdate: (id: string, data: Partial<ShippingPromo>) => Promise<void>, onDelete: (id: string) => Promise<void>, key?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: promo.title,
    description: promo.description,
    minPurchase: promo.minPurchase,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    isActive: promo.isActive
  });

  return (
    <div className="grid grid-cols-12 gap-4 p-4 md:p-6 items-center hover:bg-zinc-50 transition-colors">
      <div className="col-span-3">
        {isEditing ? (
          <input 
            value={editData.title}
            onChange={e => setEditData({...editData, title: e.target.value})}
            className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm"
            placeholder="Judul Promo"
          />
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{promo.title}</p>
              <p className="text-[10px] text-zinc-500 truncate">{promo.description}</p>
            </div>
          </div>
        )}
      </div>
      <div className="col-span-2">
        {isEditing ? (
          <input 
            type="number"
            value={editData.minPurchase}
            onChange={e => setEditData({...editData, minPurchase: Number(e.target.value)})}
            className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm"
            placeholder="Min. Belanja"
          />
        ) : (
          <p className="text-sm font-medium text-zinc-600">Rp {promo.minPurchase.toLocaleString('id-ID')}</p>
        )}
      </div>
      <div className="col-span-2">
        {isEditing ? (
          <select 
            value={editData.discountType}
            onChange={e => setEditData({...editData, discountType: e.target.value as any})}
            className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm"
          >
            <option value="percentage">Persen (%)</option>
            <option value="fixed">Potongan (Rp)</option>
            <option value="free">Gratis Ongkir</option>
          </select>
        ) : (
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest">
            {promo.discountType === 'free' ? 'Gratis' : promo.discountType === 'percentage' ? 'Persen' : 'Potongan'}
          </span>
        )}
      </div>
      <div className="col-span-2">
        {isEditing ? (
          editData.discountType !== 'free' && (
            <input 
              type="number"
              value={editData.discountValue}
              onChange={e => setEditData({...editData, discountValue: Number(e.target.value)})}
              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm"
              placeholder="Nilai Diskon"
            />
          )
        ) : (
          <p className="text-sm font-bold text-blue-600">
            {promo.discountType === 'free' ? '100%' : 
             promo.discountType === 'percentage' ? `${promo.discountValue}%` : 
             `Rp ${promo.discountValue.toLocaleString('id-ID')}`}
          </p>
        )}
      </div>
      <div className="col-span-1">
        <button 
          onClick={() => {
            if (isEditing) {
              onUpdate(promo.id, editData);
              setIsEditing(false);
            } else {
              onUpdate(promo.id, { isActive: !promo.isActive });
            }
          }}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative",
            (isEditing ? editData.isActive : promo.isActive) ? "bg-emerald-600" : "bg-zinc-300"
          )}
        >
          <div className={cn(
            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
            (isEditing ? editData.isActive : promo.isActive) ? "left-6" : "left-1"
          )} />
        </button>
      </div>
      <div className="col-span-2 text-right">
        <div className="flex gap-2 justify-end">
          {isEditing ? (
            <>
              <button 
                onClick={() => {
                  onUpdate(promo.id, editData);
                  setIsEditing(false);
                }}
                className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(promo.id)}
                className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard({ user, onViewWebsite }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'orders' | 'monitoring' | 'settings' | 'products' | 'inventory' | 'reports' | 'attendance' | 'performance' | 'discounts' | 'payments'>('dashboard');
  const [promoTab, setPromoTab] = useState<'codes' | 'products' | 'bundles' | 'shipping'>('codes');
  const [productSubTab, setProductSubTab] = useState<'all' | 'single' | 'bundle'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [shippingPromos, setShippingPromos] = useState<ShippingPromo[]>([]);
  const [reportRange, setReportRange] = useState<'daily' | 'monthly' | 'yearly' | '5year'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [isAddingShippingPromo, setIsAddingShippingPromo] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    isBundle: false,
    bundleItems: [] as string[],
    category: 'T-Shirt',
    stock: 0,
    sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 } as Record<string, number>,
    weight: 0,
    description: '',
    image: '',
    images: ['', '', '', ''] as string[],
    features: DEFAULT_FEATURES.map(f => ({ ...f, enabled: false }))
  });
  const [newPromo, setNewPromo] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minPurchase: 0,
    maxDiscount: 0,
    expiryDate: '',
    usageLimit: 0,
    isActive: true
  });
  const [newShippingPromo, setNewShippingPromo] = useState({
    title: '',
    description: '',
    minPurchase: 0,
    discountType: 'free' as 'percentage' | 'fixed' | 'free',
    discountValue: 0,
    isActive: true
  });
  const [config, setConfig] = useState({
    shopName: 'Everez',
    contactEmail: 'support@everez.com',
    maintenanceMode: false,
    announcement: 'Selamat datang di Dashboard CEO Everez!',
    storeAddress: 'Jalan Kerkof Blok. Padakasih RT/RW 04/08 No 06 Kelurahan CIbeber',
    storeDistrict: 'Cimahi Selatan',
    storeCity: 'Cimahi',
    storePostalCode: '40531',
    workingHours: {
      start: '08:00',
      end: '17:00'
    }
  });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; userId: string; userName: string }>({ show: false, userId: '', userName: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalAvailableStock: 0
  });
  const [hasCheckedIn, setHasCheckedIn] = useState(['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role));
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [selectedAttendanceUser, setSelectedAttendanceUser] = useState<User | null>(null);

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

    fetchUsers();
    fetchStats();
    fetchOrders();
    fetchProducts();
    fetchInventory();
    fetchConfig();
    fetchStockLogs();
    fetchAttendance();
    fetchPromoCodes();
    fetchShippingPromos();

    const unsubscribeChats = onSnapshot(collection(db, 'chats'), (snapshot) => {
      let unread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadAdmin > 0) {
          unread += data.unreadAdmin;
        }
      });
      setUnreadChatCount(unread);
    }, (error) => {
      console.error('Error fetching chats for unread count:', error);
    });

    return () => unsubscribeChats();
  }, []);

  useEffect(() => {
    const newNotifications: Notification[] = [];
    
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

    const pendingUsers = users.filter(u => !u.approved);
    if (pendingUsers.length > 0) {
      newNotifications.push({
        id: 'pending-users',
        title: 'Persetujuan Admin',
        message: `Ada ${pendingUsers.length} admin menunggu persetujuan`,
        type: 'user',
        time: 'Baru saja',
        read: false,
        action: () => setActiveTab('users')
      });
    }

    const newOrders = orders.filter(o => o.status === 'Diproses');
    if (newOrders.length > 0) {
      newNotifications.push({
        id: 'new-orders',
        title: 'Pesanan Baru',
        message: `Ada ${newOrders.length} pesanan perlu diproses`,
        type: 'order',
        time: 'Baru saja',
        read: false,
        action: () => setActiveTab('orders')
      });
    }

    setNotifications(newNotifications);
  }, [inventory, unreadChatCount, users, orders]);

  const fetchPromoCodes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'promo_codes'));
      setPromoCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'promo_codes');
    }
  };

  const fetchShippingPromos = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'shipping_promos'));
      setShippingPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShippingPromo)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'shipping_promos');
    }
  };

  const fetchAttendance = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    }
  };

  const fetchConfig = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'settings'));
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setConfig(prev => ({
          ...prev,
          ...data,
          workingHours: data.workingHours || prev.workingHours
        }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchStockLogs = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stock_logs'));
      setStockLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'stock_logs');
    }
  };

  const getStockIndicator = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' };
    if (stock <= 5) return { label: 'Sedikit', color: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' };
    return { label: 'Banyak', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' };
  };

  const filterDataByRange = (data: any[]) => {
    const selected = new Date(selectedDate);
    return data.filter(item => {
      const itemDate = new Date(item.createdAt || item.date);
      if (reportRange === 'daily') {
        return itemDate.toDateString() === selected.toDateString();
      } else if (reportRange === 'monthly') {
        return itemDate.getMonth() === selected.getMonth() && itemDate.getFullYear() === selected.getFullYear();
      } else if (reportRange === 'yearly') {
        return itemDate.getFullYear() === selected.getFullYear();
      } else if (reportRange === '5year') {
        return itemDate.getFullYear() >= selected.getFullYear() - 5 && itemDate.getFullYear() <= selected.getFullYear();
      }
      return true;
    });
  };

  const filteredOrders = filterDataByRange(orders);
  const filteredStockLogs = filterDataByRange(stockLogs);
  const filteredSales = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const filteredItemsSold = filteredOrders.reduce((acc, o) => acc + (o.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0), 0);
  const filteredIncomingStock = filteredStockLogs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.quantity || 0), 0);
  const filteredOutgoingStock = filteredStockLogs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.quantity || 0), 0);

  const saveConfig = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'settings'));
      if (snapshot.empty) {
        await addDoc(collection(db, 'settings'), config);
      } else {
        await updateDoc(doc(db, 'settings', snapshot.docs[0].id), config);
      }
      setToast({ show: true, message: "Konfigurasi berhasil disimpan.", type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    }
  };

  const fetchProducts = async () => {
    try {
      const [productsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders'))
      ]);
      
      const ordersList = ordersSnap.docs.map(doc => doc.data());
      
      const productsList = productsSnap.docs.map(doc => {
        const productData = doc.data();
        // Calculate total sold for this product from all orders
        const sold = ordersList.reduce((acc, order) => {
          const item = order.items?.find((i: any) => i.id === doc.id || i.name === productData.name);
          return acc + (item?.quantity || 0);
        }, 0);
        
        return { id: doc.id, ...productData, sold: productData.sold || sold };
      });
      
      setProducts(productsList);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'products');
    }
  };

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
      
      const pendingSnapshot = await getDocs(collection(db, 'pending_users'));
      const pendingUsersList = pendingSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      
      setUsers([...usersList, ...pendingUsersList]);
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
      const totalAvailableStock = productsSnap.docs.reduce((acc, doc) => acc + (doc.data().stock || 0), 0);
      
      setStats({
        totalSales,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        totalCustomers: usersSnap.docs.filter(d => d.data().role === 'customer').length,
        totalAvailableStock
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const userToApprove = users.find(u => u.uid === userId);
      if (!userToApprove) return;

      const batch = writeBatch(db);
      
      // Add to users collection with approved: true
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, { ...userToApprove, approved: true });
      
      // Delete from pending_users collection
      const pendingRef = doc(db, 'pending_users', userId);
      batch.delete(pendingRef);
      
      await batch.commit();

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

  const updateEmployeeId = async (userId: string, employeeId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { employeeId });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, employeeId } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateAttitudeScore = async (userId: string, score: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { attitudeScore: score });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, attitudeScore: score } : u));
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

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (!newStatus || selectedOrders.length === 0) return;
    if (!confirm(`Ubah status ${selectedOrders.length} pesanan menjadi ${newStatus}?`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedOrders.forEach(orderId => {
        const orderRef = doc(db, 'orders', orderId);
        batch.update(orderRef, { status: newStatus });
      });
      await batch.commit();
      
      setOrders(prev => prev.map(o => 
        selectedOrders.includes(o.id) ? { ...o, status: newStatus } : o
      ));
      setSelectedOrders([]);
      setToast({ show: true, message: `${selectedOrders.length} pesanan berhasil diperbarui.`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrders.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedOrders.length} pesanan ini? Aksi ini tidak dapat dibatalkan.`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedOrders.forEach(orderId => {
        const orderRef = doc(db, 'orders', orderId);
        batch.delete(orderRef);
      });
      await batch.commit();
      
      setOrders(prev => prev.filter(o => !selectedOrders.includes(o.id)));
      setSelectedOrders([]);
      setToast({ show: true, message: `${selectedOrders.length} pesanan berhasil dihapus.`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const approveOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { approvalStatus: 'approved' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, approvalStatus: 'approved' } : o));
      setToast({ show: true, message: "Pesanan disetujui.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const rejectOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { approvalStatus: 'rejected' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, approvalStatus: 'rejected' } : o));
      setToast({ show: true, message: "Pesanan ditolak.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updateProductDiscount = async (productId: string, discountPrice: number, promoLabel: string, discountType?: 'percentage' | 'fixed', discountValue?: number, bundleBadgeText?: string) => {
    setLoading(true);
    try {
      const updateData: any = {
        discountPrice,
        promoLabel,
        discountType: discountType || 'fixed',
        discountValue: discountValue || 0
      };
      if (bundleBadgeText !== undefined) updateData.bundleBadgeText = bundleBadgeText;

      await updateDoc(doc(db, 'products', productId), updateData);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updateData } : p));
      setToast({ show: true, message: "Diskon produk berhasil diperbarui.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filteredImages = newProduct.images.filter(img => img.trim() !== '');
      const productData = {
        ...newProduct,
        image: filteredImages[0] || newProduct.image,
        images: filteredImages,
        features: newProduct.features.map(({ icon, ...rest }: any) => rest)
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
        setToast({ show: true, message: "Produk berhasil diperbarui.", type: 'success' });
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        setProducts(prev => [...prev, { id: docRef.id, ...productData }]);
        setToast({ show: true, message: "Produk berhasil ditambahkan.", type: 'success' });
      }
      setIsAddingProduct(false);
      setEditingProduct(null);
      setNewProduct({ 
        name: '', price: 0, isBundle: false, bundleBadgeText: 'Bundle', bundleItems: [], category: 'T-Shirt', stock: 0, 
        sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 }, weight: 0, description: '', image: '', 
        images: ['', '', '', ''],
        features: DEFAULT_FEATURES.map(f => ({ ...f, enabled: false }))
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const promoData = {
        ...newPromo,
        usageCount: editingPromo ? editingPromo.usageCount : 0
      };

      if (editingPromo) {
        await updateDoc(doc(db, 'promo_codes', editingPromo.id), promoData);
        setPromoCodes(prev => prev.map(p => p.id === editingPromo.id ? { ...p, ...promoData } : p));
        setToast({ show: true, message: "Kode promo berhasil diperbarui.", type: 'success' });
      } else {
        const docRef = await addDoc(collection(db, 'promo_codes'), promoData);
        setPromoCodes(prev => [...prev, { id: docRef.id, ...promoData }]);
        setToast({ show: true, message: "Kode promo berhasil ditambahkan.", type: 'success' });
      }
      setIsAddingPromo(false);
      setEditingPromo(null);
      setNewPromo({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        minPurchase: 0,
        maxDiscount: 0,
        expiryDate: '',
        usageLimit: 0,
        isActive: true
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, editingPromo ? OperationType.UPDATE : OperationType.CREATE, 'promo_codes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShippingPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'shipping_promos'), newShippingPromo);
      setShippingPromos(prev => [...prev, { id: docRef.id, ...newShippingPromo }]);
      setIsAddingShippingPromo(false);
      setNewShippingPromo({
        title: '',
        description: '',
        minPurchase: 0,
        discountType: 'free',
        discountValue: 0,
        isActive: true
      });
      setToast({ show: true, message: "Promo ongkir berhasil ditambahkan.", type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shipping_promos');
    } finally {
      setLoading(false);
    }
  };

  const updateShippingPromo = async (id: string, data: Partial<ShippingPromo>) => {
    try {
      await updateDoc(doc(db, 'shipping_promos', id), data);
      setShippingPromos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      setToast({ show: true, message: "Promo ongkir berhasil diperbarui.", type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shipping_promos/${id}`);
    }
  };

  const deleteShippingPromo = async (id: string) => {
    if (!confirm("Hapus promo ongkir ini?")) return;
    try {
      await deleteDoc(doc(db, 'shipping_promos', id));
      setShippingPromos(prev => prev.filter(p => p.id !== id));
      setToast({ show: true, message: "Promo ongkir berhasil dihapus.", type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shipping_promos/${id}`);
    }
  };

  const deletePromoCode = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kode promo ini?")) return;
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
      setPromoCodes(prev => prev.filter(p => p.id !== id));
      setToast({ show: true, message: "Kode promo berhasil dihapus.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `promo_codes/${id}`);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price,
      isBundle: product.isBundle || false,
      bundleBadgeText: product.bundleBadgeText || 'Bundle',
      bundleItems: product.bundleItems || [],
      category: product.category,
      stock: product.stock,
      sizes: product.sizes || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 },
      weight: product.weight || 0,
      description: product.description,
      image: product.image || '',
      images: product.images && product.images.length > 0 
        ? [...product.images, ...Array(4 - product.images.length).fill('')].slice(0, 4)
        : [product.image, '', '', ''],
      features: DEFAULT_FEATURES.map(df => {
        const existing = product.features?.find((f: any) => f.id === df.id);
        return existing ? { ...df, ...existing } : { ...df, enabled: false };
      })
    });
    setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(p => p.id !== id));
      setToast({ show: true, message: "Produk berhasil dihapus.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    } finally {
      setLoading(false);
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
      
      // Clear pending users
      const pendingUsersSnap = await getDocs(collection(db, 'pending_users'));
      pendingUsersSnap.forEach(d => batch.delete(d.ref));
      
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
    <div className="flex h-[85vh] bg-white rounded-[2rem] shadow-xl shadow-zinc-200/50 border border-zinc-200/60 overflow-hidden font-sans text-zinc-950">
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
      <aside className="w-64 bg-zinc-50/50 border-r border-zinc-100 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Everez</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">CEO Dashboard</p>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-row md:flex-col gap-2 md:gap-1 ml-4 md:ml-0 overflow-x-auto md:overflow-visible hide-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Analitik Bisnis' },
            { id: 'monitoring', icon: BarChart3, label: 'Performa Tim' },
            { id: 'products', icon: Package, label: 'Katalog Produk' },
            { id: 'discounts', icon: Tag, label: 'Diskon & Promo' },
            { id: 'payments', icon: CreditCard, label: 'Metode Pembayaran' },
            { id: 'inventory', icon: Droplets, label: 'Stok Bahan' },
            { id: 'reports', icon: BarChart3, label: 'Laporan' },
            { id: 'users', icon: Users, label: 'Kelola Pengguna' },
            { id: 'orders', icon: ShoppingBag, label: 'Semua Transaksi', badge: orders.filter(o => ['Diproses', 'Produksi', 'Packing'].includes(o.status)).length },
            { id: 'attendance', icon: UserCheck, label: 'Laporan Absensi' },
            { id: 'performance', icon: Award, label: 'Penilaian Kinerja' },
            { id: 'chat', icon: MessageCircle, label: 'Live Chat', badge: unreadChatCount },
            { id: 'settings', icon: Settings, label: 'Konfigurasi' },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id as any)}
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

        <div className="mt-auto pt-6 border-t border-zinc-200/60">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              CEO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">Super Admin</p>
              <p className="text-[10px] text-zinc-500 truncate">Owner</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {activeTab === 'dashboard' && 'Analitik Bisnis'}
              {activeTab === 'monitoring' && 'Performa Tim'}
              {activeTab === 'products' && 'Katalog Produk'}
              {activeTab === 'inventory' && 'Stok Bahan Produksi'}
              {activeTab === 'users' && 'Kelola Pengguna'}
              {activeTab === 'orders' && 'Semua Transaksi'}
              {activeTab === 'reports' && 'Laporan Bisnis'}
              {activeTab === 'performance' && 'Penilaian Kinerja Pegawai'}
              {activeTab === 'discounts' && 'Diskon & Promo'}
              {activeTab === 'chat' && 'Live Chat'}
              {activeTab === 'settings' && 'Konfigurasi'}
            </h2>
            <p className="text-sm text-zinc-500">
              {activeTab === 'dashboard' && 'Ringkasan performa operasional dan finansial toko.'}
              {activeTab === 'monitoring' && 'Pantau aktivitas produksi, packing, dan sales secara real-time.'}
              {activeTab === 'products' && 'Kelola katalog produk yang tersedia di website.'}
              {activeTab === 'inventory' && 'Pantau ketersediaan bahan baku untuk produksi.'}
              {activeTab === 'users' && 'Kelola staff admin dan database pelanggan.'}
              {activeTab === 'orders' && 'Pantau dan kelola seluruh riwayat transaksi sistem.'}
              {activeTab === 'reports' && 'Laporan penjualan dan pergerakan stok barang.'}
              {activeTab === 'performance' && 'Evaluasi kinerja staff berdasarkan kehadiran (80%) dan sikap (20%).'}
              {activeTab === 'discounts' && 'Kelola diskon produk, kode promo, dan diskon bundling.'}
              {activeTab === 'chat' && 'Pantau dan balas pesan dari pelanggan.'}
              {activeTab === 'settings' && 'Konfigurasi sistem dan manajemen database.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'products' && (
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk
              </button>
            )}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 shadow-sm"
              />
            </div>
            <NotificationDropdown notifications={notifications} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Total Penjualan', value: `Rp ${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Pesanan', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Total Pelanggan', value: stats.totalCustomers, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Total Produk', value: stats.totalProducts, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Barang Tersedia', value: `${stats.totalAvailableStock} Pcs`, icon: Box, color: 'text-zinc-600', bg: 'bg-zinc-100' },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-5 rounded-3xl border border-zinc-200/60 shadow-sm flex flex-col gap-4"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
                      <p className="text-xs font-medium text-zinc-500 mt-1">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="col-span-2 bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm"
                >
                  <h3 className="text-lg font-bold mb-6">Analisis Penjualan</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                        <Tooltip cursor={{ fill: '#fafafa' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="sales" fill="#18181b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm flex flex-col"
                >
                  <h3 className="text-lg font-bold mb-4">Retensi Pelanggan</h3>
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-zinc-100">
                    <div className="text-center">
                      <p className="text-xl font-bold">68%</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lama</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">32%</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Baru</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-[2rem] border border-zinc-200/60 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Laporan Absensi & Penilaian Kerja</h3>
                  <p className="text-sm text-zinc-500 mt-1">Pantau performa dan kehadiran tim secara real-time</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Monitoring
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nama</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Hadir</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Telat</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Izin</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Sakit</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Skor Kinerja</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.role !== 'ceo').map((user, index) => {
                      const userAttendance = attendance.filter(a => a.userId === user.uid);
                      const hadir = userAttendance.filter(a => a.status === 'Hadir').length;
                      const izin = userAttendance.filter(a => a.status === 'Izin');
                      const sakit = userAttendance.filter(a => a.status === 'Sakit');
                      const telatCount = userAttendance.filter(a => {
                        if (a.status !== 'Hadir' || !a.createdAt) return false;
                        const date = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                        const [startHour, startMinute] = config.workingHours.start.split(':').map(Number);
                        return (date.getHours() * 60 + date.getMinutes()) > (startHour * 60 + startMinute);
                      }).length;

                      return (
                        <motion.tr 
                          key={user.uid} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 rounded-l-2xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 overflow-hidden shrink-0">
                                {user.photoURL ? (
                                  <img 
                                    src={user.photoURL} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  user.name.charAt(0)
                                )}
                              </div>
                              <span className="text-sm font-bold text-zinc-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <span className="text-sm font-medium text-zinc-700">{hadir}</span>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <span className={cn(
                              "text-sm font-medium",
                              telatCount > 0 ? "text-orange-600" : "text-zinc-400"
                            )}>{telatCount}</span>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <span className="text-sm font-medium text-zinc-700">{izin.length}</span>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <span className="text-sm font-medium text-zinc-700">{sakit.length}</span>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <div className="flex justify-center">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                (user.attendanceScore || 100) >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                (user.attendanceScore || 100) >= 75 ? "bg-orange-50 text-orange-600 border-orange-100" :
                                "bg-red-50 text-red-600 border-red-100"
                              )}>
                                {user.attendanceScore || 100}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 rounded-r-2xl text-right transition-colors">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedAttendanceUser(user)}
                              className="p-2 hover:bg-white rounded-xl text-zinc-400 hover:text-zinc-900 transition-all shadow-sm hover:shadow border border-transparent hover:border-zinc-200"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-[2rem] border border-zinc-200/60 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Penilaian Kinerja Pegawai</h3>
                  <p className="text-sm text-zinc-500 mt-1">Evaluasi berdasarkan Kehadiran (80%) dan Sikap & Adab (20%)</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-2xl text-xs font-bold">
                  Target: 20 Hari Kerja
                </div>
              </div>

              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pegawai</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Kehadiran (80%)</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Sikap & Adab (20%)</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Skor Akhir</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.role !== 'customer' && u.role !== 'super_admin').map((user, index) => {
                      const userAttendance = attendance.filter(a => {
                        const d = new Date(a.date);
                        return a.userId === user.uid && a.status === 'Hadir' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                      });
                      
                      const attendanceScore = Math.min((userAttendance.length / 20) * 100, 100);
                      const attitudeScore = user.attitudeScore || 0;
                      const finalScore = (attendanceScore * 0.8) + (attitudeScore * 0.2);

                      return (
                        <motion.tr 
                          key={user.uid} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 rounded-l-2xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 overflow-hidden shrink-0">
                                {user.photoURL ? (
                                  <img 
                                    src={user.photoURL} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  user.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{user.name}</p>
                                <p className="text-[10px] text-zinc-500">ID: {user.employeeId || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-bold text-zinc-900">{Math.round(attendanceScore)}%</span>
                              <span className="text-[10px] text-zinc-400">({userAttendance.length}/20 Hari)</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={attitudeScore}
                                onChange={(e) => updateAttitudeScore(user.uid, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                              />
                              <span className="text-xs text-zinc-400">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 text-center transition-colors">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                "text-lg font-black",
                                finalScore >= 85 ? "text-emerald-600" :
                                finalScore >= 70 ? "text-orange-600" :
                                "text-red-600"
                              )}>
                                {Math.round(finalScore)}
                              </span>
                              <div className="w-16 h-1 bg-zinc-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${finalScore}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={cn(
                                    "h-full",
                                    finalScore >= 85 ? "bg-emerald-500" :
                                    finalScore >= 70 ? "bg-orange-500" :
                                    "bg-red-500"
                                  )}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 bg-zinc-50/50 group-hover:bg-zinc-100/50 rounded-r-2xl text-right transition-colors">
                            <span className={cn(
                              "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                              finalScore >= 85 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              finalScore >= 70 ? "bg-orange-50 text-orange-600 border-orange-100" :
                              "bg-red-50 text-red-600 border-red-100"
                            )}>
                              {finalScore >= 85 ? 'Excellent' :
                               finalScore >= 70 ? 'Good' : 'Needs Improvement'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-6">
                {/* Production Monitoring */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold">Produksi</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Perlu Produksi', count: orders.filter(o => o.status === 'Diproses').length, color: 'bg-blue-500' },
                      { label: 'Sedang Produksi', count: orders.filter(o => o.status === 'Produksi').length, color: 'bg-orange-500' },
                      { label: 'Selesai Produksi', count: orders.filter(o => ['Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].includes(o.status)).length, color: 'bg-zinc-900' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
                        <span className="text-xs font-medium text-zinc-600">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{s.count}</span>
                          <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Packing Monitoring */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                        <Box className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold">Packing</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Perlu Packing', count: orders.filter(o => o.status === 'Produksi').length, color: 'bg-blue-500' },
                      { label: 'Sedang Packing', count: orders.filter(o => o.status === 'Packing').length, color: 'bg-orange-500' },
                      { label: 'Siap Kirim', count: orders.filter(o => o.status === 'Siap Kirim').length, color: 'bg-emerald-500' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
                        <span className="text-xs font-medium text-zinc-600">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{s.count}</span>
                          <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Sales Monitoring */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold">Sales</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Total Penjualan', value: `Rp ${stats.totalSales.toLocaleString()}`, color: 'bg-emerald-500' },
                      { label: 'Pesanan Baru', count: orders.filter(o => o.status === 'Diproses').length, color: 'bg-blue-500' },
                      { label: 'Pesanan Selesai', count: orders.filter(o => o.status === 'Selesai').length, color: 'bg-zinc-900' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
                        <span className="text-xs font-medium text-zinc-600">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{s.value || s.count}</span>
                          <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-bold">Aktivitas Pesanan Terkini</h3>
                  <div className="flex gap-2">
                    {['Semua', 'Produksi', 'Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].map(s => (
                      <button key={s} className="px-3 py-1 text-[10px] font-bold bg-zinc-50 text-zinc-500 rounded-lg hover:bg-zinc-100">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Waktu</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ID Pesanan</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-3 text-xs text-zinc-500">
                            {o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : 'Baru'}
                          </td>
                          <td className="px-6 py-3 text-sm font-mono text-zinc-600">#{o.id.slice(-6)}</td>
                          <td className="px-6 py-3 text-sm font-bold">{o.customerName || 'Pelanggan'}</td>
                          <td className="px-6 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                              o.status === 'Diproses' ? "bg-blue-50 text-blue-600" : 
                              o.status === 'Produksi' ? "bg-orange-50 text-orange-600" :
                              o.status === 'Packing' ? "bg-purple-50 text-purple-600" :
                              o.status === 'Siap Kirim' ? "bg-emerald-50 text-emerald-600" :
                              "bg-zinc-100 text-zinc-500"
                            )}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit">
                {[
                  { id: 'all', label: 'Semua Produk', icon: Package },
                  { id: 'single', label: 'Produk Satuan', icon: Tag },
                  { id: 'bundle', label: 'Produk Bundling', icon: Box },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setProductSubTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      productSubTab === tab.id 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-bold">
                    {productSubTab === 'all' ? 'Semua Produk' : productSubTab === 'single' ? 'Produk Satuan' : 'Produk Bundling'}
                  </h3>
                  <span className="text-xs font-bold text-zinc-500">
                    {products.filter(p => 
                      productSubTab === 'all' ? true : 
                      productSubTab === 'single' ? !p.isBundle : 
                      p.isBundle
                    ).length} Produk Terdaftar
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Kategori</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Berat</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stok</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Harga</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {products
                        .filter(p => 
                          productSubTab === 'all' ? true : 
                          productSubTab === 'single' ? !p.isBundle : 
                          p.isBundle
                        )
                        .map(p => (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200/60 shrink-0">
                                <img src={getImageUrl(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-zinc-900 truncate">{p.name}</p>
                                  {p.promoLabel && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold rounded uppercase tracking-wider">
                                      {p.promoLabel}
                                    </span>
                                  )}
                                  {p.isBundle && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-bold rounded uppercase tracking-wider">
                                      Bundle
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-500 truncate">{p.description?.slice(0, 40)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{p.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-zinc-600">{p.weight || 0}g</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", getStockIndicator(p.stock).dot)} />
                              <span className={cn(
                                "text-sm font-medium",
                                p.stock <= 5 ? "text-red-600 font-bold" : "text-zinc-600"
                              )}>{p.stock} Pcs</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-zinc-900 whitespace-nowrap">
                            {p.discountPrice && p.discountPrice > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-red-600">Rp {p.discountPrice.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] text-zinc-400 line-through">Rp {p.price.toLocaleString('id-ID')}</span>
                              </div>
                            ) : (
                              <span>Rp {p.price.toLocaleString('id-ID')}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleEditProduct(p)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Stok Bahan Baku</h2>
                  <p className="text-sm text-zinc-500">Pantau ketersediaan bahan produksi.</p>
                </div>
                <button 
                  onClick={() => setToast({ show: true, message: "Fitur tambah stok akan segera hadir.", type: 'success' })}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Bahan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {inventory.length > 0 ? (
                  inventory.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:border-zinc-300 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-zinc-100 transition-colors">
                          <Droplets className={cn("w-6 h-6", item.stock <= item.minStock ? "text-red-500" : "text-zinc-400")} />
                        </div>
                        {item.stock <= item.minStock && (
                          <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                            Stok Kritis
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-zinc-900 mb-1">{item.name}</h3>
                      <p className="text-xs text-zinc-500 mb-4">{item.category}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-400">Tersedia</span>
                          <span className={cn(item.stock <= item.minStock ? "text-red-600" : "text-zinc-900")}>
                            {item.stock} {item.unit}
                          </span>
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
                        <p className="text-[10px] text-zinc-400">Minimal stok: {item.minStock} {item.unit}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                    <Droplets className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium">Belum ada data inventaris.</p>
                    <button 
                      onClick={() => {
                        const seedInventory = async () => {
                          const items = [
                            { name: 'Tinta Hitam', category: 'Tinta', stock: 12, unit: 'Liter', minStock: 5 },
                            { name: 'Kain Cotton 30s', category: 'Kain', stock: 45, unit: 'Roll', minStock: 10 },
                            { name: 'Plastik Packing', category: 'Lainnya', stock: 1500, unit: 'Pcs', minStock: 500 }
                          ];
                          for (const item of items) {
                            await addDoc(collection(db, 'inventory'), item);
                          }
                          fetchInventory();
                        };
                        seedInventory();
                      }}
                      className="mt-4 text-sm font-bold text-zinc-900 hover:underline"
                    >
                      Klik untuk buat data contoh
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PaymentMethodManager />
            </motion.div>
          )}

          {activeTab === 'discounts' && (
            <motion.div
              key="discounts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Sub-tabs */}
              <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit">
                {[
                  { id: 'codes', label: 'Kode Promo', icon: Tag },
                  { id: 'products', label: 'Diskon Produk', icon: Package },
                  { id: 'bundles', label: 'Diskon Bundling', icon: Box },
                  { id: 'shipping', label: 'Diskon Pengiriman', icon: Truck },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPromoTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      promoTab === tab.id 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {promoTab === 'codes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Daftar Kode Promo</h3>
                      <p className="text-sm text-zinc-500">Kelola kode kupon dan diskon belanja.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingPromo(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Promo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promoCodes.map((promo) => (
                      <motion.div 
                        key={promo.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4 relative overflow-hidden"
                      >
                        {!promo.isActive && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                            Nonaktif
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div className="p-3 bg-zinc-100 rounded-2xl">
                            <Tag className="w-6 h-6 text-zinc-900" />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { setEditingPromo(promo); setNewPromo(promo); setIsAddingPromo(true); }}
                              className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deletePromoCode(promo.id)}
                              className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xl font-black tracking-tighter text-zinc-900 uppercase">{promo.code}</h4>
                          <p className="text-sm text-zinc-500 font-medium">
                            Diskon {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `Rp ${promo.discountValue.toLocaleString()}`}
                          </p>
                        </div>
                        <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Penggunaan</p>
                            <p className="text-sm font-bold text-zinc-900">{promo.usageCount} / {promo.usageLimit || '∞'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Min. Belanja</p>
                            <p className="text-sm font-bold text-zinc-900">Rp {promo.minPurchase?.toLocaleString() || '0'}</p>
                          </div>
                        </div>
                        {promo.expiryDate && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            Berakhir: {new Date(promo.expiryDate).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {promoCodes.length === 0 && (
                    <div className="bg-white p-12 rounded-3xl border border-zinc-200/60 shadow-sm text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                        <Tag className="w-8 h-8 text-zinc-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-zinc-900">Belum ada kode promo</h4>
                        <p className="text-sm text-zinc-500">Buat kode promo pertama Anda untuk meningkatkan penjualan.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(promoTab === 'products' || promoTab === 'bundles') && (
                <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold">
                      {promoTab === 'products' ? 'Diskon Produk Satuan' : 'Diskon Produk Bundling'}
                    </h3>
                    <span className="text-xs font-bold text-zinc-500">
                      {products.filter(p => promoTab === 'products' ? !p.isBundle : p.isBundle).length} Produk
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50/50 border-b border-zinc-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Harga Normal</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Harga Diskon</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Label Promo</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {products
                          .filter(p => promoTab === 'products' ? !p.isBundle : p.isBundle)
                          .map((p, index) => (
                            <ProductDiscountRow 
                              key={p.id} 
                              product={p} 
                              onUpdate={updateProductDiscount} 
                              index={index} 
                            />
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {promoTab === 'shipping' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Promo Ongkos Kirim</h3>
                      <p className="text-sm text-zinc-500">Kelola diskon pengiriman dan gratis ongkir.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingShippingPromo(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Promo Ongkir
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 md:px-6 md:py-4 bg-zinc-50/50 border-b border-zinc-100">
                      <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Judul Promo</div>
                      <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Min. Belanja</div>
                      <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tipe Diskon</div>
                      <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nilai</div>
                      <div className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</div>
                      <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Aksi</div>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {shippingPromos.map(promo => (
                        <ShippingPromoRow 
                          key={promo.id} 
                          promo={promo} 
                          onUpdate={updateShippingPromo} 
                          onDelete={deleteShippingPromo} 
                        />
                      ))}
                      {shippingPromos.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 italic text-sm">
                          Belum ada promo pengiriman.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <AdminChat user={user} />
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Pending Approval Section */}
              {users.some(u => u.role !== 'customer' && u.role !== 'super_admin' && u.approved === false) && (
                <div className="bg-white rounded-3xl border border-orange-200/60 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-orange-100 bg-orange-50/30 flex items-center gap-3 shrink-0">
                    <UserPlus className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-orange-900">Persetujuan Admin Baru</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-orange-50/50 border-b border-orange-100">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-bold text-orange-800 uppercase tracking-widest">Nama & Email</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-orange-800 uppercase tracking-widest">Role Diminta</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-orange-800 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-50">
                        {users.filter(u => u.role !== 'customer' && u.role !== 'super_admin' && u.approved === false).map((u, index) => (
                          <motion.tr 
                            key={u.uid} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-orange-50/30 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-xs overflow-hidden shrink-0">
                                  {u.photoURL ? (
                                    <img 
                                      src={u.photoURL} 
                                      alt={u.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    u.name.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{u.name}</p>
                                  <p className="text-[10px] text-zinc-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-[10px] font-bold px-2 py-1 bg-white border border-orange-200 rounded-md text-orange-800">
                                {u.role === 'admin_production' ? 'Admin Produksi' : 
                                 u.role === 'admin_packing' ? 'Admin Packing' : 
                                 u.role === 'admin_sales' ? 'Admin Sales' : u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex gap-2 justify-end">
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => approveUser(u.uid)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
                                >
                                  Setujui
                                </motion.button>
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => deleteUser(u.uid)}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all flex items-center gap-1"
                                >
                                  Tolak
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Staff Section */}
              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-100 flex items-center gap-3 shrink-0">
                  <Shield className="w-5 h-5 text-zinc-900" />
                  <h3 className="text-lg font-bold">Staff & CEO</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama & Email</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ID Kerja</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kontak & Lokasi</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {users.filter(u => u.role !== 'customer' && (u.approved !== false || u.role === 'super_admin')).map((u, index) => (
                        <motion.tr 
                          key={u.uid} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-zinc-600 text-xs overflow-hidden shrink-0">
                                {u.photoURL ? (
                                  <img 
                                    src={u.photoURL} 
                                    alt={u.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{u.name}</p>
                                <p className="text-[10px] text-zinc-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <input 
                              type="text"
                              value={u.employeeId || ''}
                              placeholder="Set ID..."
                              onChange={(e) => updateEmployeeId(u.uid, e.target.value)}
                              className="text-xs font-bold px-2 py-1 bg-zinc-100 rounded-md border-none focus:ring-2 focus:ring-zinc-900/5 w-24 transition-all"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {u.phone || '-'}
                              </p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {u.city || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {u.role === 'super_admin' ? (
                              <span className="text-[10px] font-bold px-2 py-1 bg-zinc-900 text-white rounded-md">
                                CEO
                              </span>
                            ) : (
                              <select 
                                value={u.role}
                                onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                                className="text-xs font-bold px-2 py-1 bg-zinc-100 rounded-md border-none focus:ring-2 focus:ring-zinc-900/5"
                              >
                                <option value="customer">Pelanggan</option>
                                <option value="admin_production">Admin Produksi</option>
                                <option value="admin_packing">Admin Packing</option>
                                <option value="admin_sales">Admin Sales</option>
                                <option value="super_admin">CEO</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-end">
                              {u.role !== 'super_admin' && (
                                <button 
                                  onClick={() => deleteUser(u.uid)}
                                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customers Section */}
              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-100 flex items-center gap-3 shrink-0">
                  <Users className="w-5 h-5 text-zinc-900" />
                  <h3 className="text-lg font-bold">Pelanggan</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama & Email</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kontak & Lokasi</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {users.filter(u => u.role === 'customer').map((u, index) => (
                        <motion.tr 
                          key={u.uid} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-zinc-600 text-xs overflow-hidden shrink-0">
                                {u.photoURL ? (
                                  <img 
                                    src={u.photoURL} 
                                    alt={u.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{u.name}</p>
                                <p className="text-[10px] text-zinc-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {u.phone || '-'}
                              </p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {u.city || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                              className="text-xs font-bold px-2 py-1 bg-zinc-100 rounded-md border-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                            >
                              <option value="customer">Pelanggan</option>
                              <option value="admin_production">Admin Produksi</option>
                              <option value="admin_packing">Admin Packing</option>
                              <option value="admin_sales">Admin Sales</option>
                              <option value="super_admin">CEO</option>
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-end">
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteUser(u.uid)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold">Daftar Semua Pesanan</h3>
                    <span className="text-xs font-bold text-zinc-500">{orders.length} Pesanan</span>
                  </div>
                  
                  {selectedOrders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 mr-2">{selectedOrders.length} Dipilih</span>
                      <select
                        className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        onChange={(e) => handleBulkUpdateStatus(e.target.value)}
                        value=""
                      >
                        <option value="" disabled>Ubah Status...</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Produksi">Produksi</option>
                        <option value="Packing">Packing</option>
                        <option value="Siap Kirim">Siap Kirim</option>
                        <option value="Dikirim">Dikirim</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                      <button 
                        onClick={handleBulkDeleteOrders}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                        title="Hapus Terpilih"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 w-10">
                          <input 
                            type="checkbox" 
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            checked={orders.length > 0 && selectedOrders.length === orders.length}
                            onChange={handleSelectAllOrders}
                          />
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ID Pesanan</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Approval</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bukti</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {orders.map((o, index) => (
                        <motion.tr 
                          key={o.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "hover:bg-zinc-50/50 transition-colors",
                            selectedOrders.includes(o.id) ? "bg-zinc-50/80" : ""
                          )}
                        >
                          <td className="px-6 py-3">
                            <input 
                              type="checkbox" 
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              checked={selectedOrders.includes(o.id)}
                              onChange={() => handleSelectOrder(o.id)}
                            />
                          </td>
                          <td className="px-6 py-3 text-sm font-mono text-zinc-600">#{o.id.slice(-6)}</td>
                          <td className="px-6 py-3 text-sm font-bold">{o.customerName || 'Pelanggan'}</td>
                          <td className="px-6 py-3 text-sm font-bold">Rp {o.total.toLocaleString()}</td>
                          <td className="px-6 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                              o.status === 'Diproses' ? "bg-blue-50 text-blue-600" : 
                              o.status === 'Produksi' ? "bg-orange-50 text-orange-600" :
                              o.status === 'Packing' ? "bg-purple-50 text-purple-600" :
                              o.status === 'Siap Kirim' ? "bg-emerald-50 text-emerald-600" :
                              "bg-zinc-100 text-zinc-500"
                            )}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                              o.approvalStatus === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                              o.approvalStatus === 'rejected' ? "bg-red-50 text-red-600" :
                              "bg-zinc-100 text-zinc-500"
                            )}>
                              {o.approvalStatus || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            {o.paymentProofUrl ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-zinc-100 overflow-hidden border border-zinc-200">
                                  <img 
                                    src={getImageUrl(o.paymentProofUrl)} 
                                    className="w-full h-full object-cover cursor-pointer" 
                                    onClick={() => setSelectedImage(o.paymentProofUrl)}
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <button 
                                  onClick={() => setSelectedImage(o.paymentProofUrl)}
                                  className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">Belum Ada</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-end gap-2">
                              {o.status === 'Diproses' && o.approvalStatus !== 'approved' && (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => approveOrder(o.id)}
                                    className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => rejectOrder(o.id)}
                                    className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              <select
                                className="text-xs border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                                value={o.status}
                                onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              >
                                <option value="Diproses">Diproses</option>
                                <option value="Produksi">Produksi</option>
                                <option value="Packing">Packing</option>
                                <option value="Siap Kirim">Siap Kirim</option>
                                <option value="Dikirim">Dikirim</option>
                                <option value="Selesai">Selesai</option>
                              </select>
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteOrder(o.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Report Filters */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-zinc-100 rounded-xl">
                    <Calendar className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-bold">Filter Laporan</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-zinc-100 p-1 rounded-xl">
                    {(['daily', 'monthly', 'yearly', '5year'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setReportRange(range)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                          reportRange === range ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                      >
                        {range === 'daily' ? 'Harian' : range === 'monthly' ? 'Bulanan' : range === 'yearly' ? 'Tahunan' : '5 Tahun'}
                      </button>
                    ))}
                  </div>
                  <input 
                    type={reportRange === 'daily' ? 'date' : reportRange === 'monthly' ? 'month' : 'number'} 
                    value={reportRange === 'yearly' || reportRange === '5year' ? new Date(selectedDate).getFullYear() : selectedDate.slice(0, reportRange === 'monthly' ? 7 : 10)}
                    onChange={(e) => {
                      if (reportRange === 'yearly' || reportRange === '5year') {
                        const date = new Date(selectedDate);
                        date.setFullYear(parseInt(e.target.value));
                        setSelectedDate(date.toISOString().split('T')[0]);
                      } else {
                        setSelectedDate(e.target.value + (reportRange === 'monthly' ? '-01' : ''));
                      }
                    }}
                    className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Report Summary */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      Laporan Keuangan & Penjualan
                    </h3>
                    <button className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">Unduh Laporan</button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Pemasukan (Omzet)</p>
                        <p className="text-xl font-bold text-emerald-700">Rp {filteredSales.toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Produk Terjual</p>
                        <p className="text-xl font-bold text-blue-700">{filteredItemsSold} Pcs</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-100 pt-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Rincian Transaksi ({filteredOrders.length})</h4>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                        {filteredOrders.map((o, index) => (
                          <motion.div 
                            key={o.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 border border-zinc-100"
                          >
                            <div>
                              <p className="text-xs font-bold text-zinc-900">#{o.id.slice(-6)}</p>
                              <p className="text-[10px] text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">+Rp {o.total.toLocaleString()}</span>
                          </motion.div>
                        ))}
                        {filteredOrders.length === 0 && <p className="text-center py-4 text-xs text-zinc-400 italic">Tidak ada transaksi pada periode ini.</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Movement Report */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <RefreshCcw className="w-5 h-5 text-blue-600" />
                      Laporan Barang Masuk & Keluar
                    </h3>
                    <button className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">Unduh Log</button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Barang Masuk</p>
                        <p className="text-xl font-bold text-emerald-700">+{filteredIncomingStock} Pcs</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Barang Keluar</p>
                        <p className="text-xl font-bold text-red-700">-{filteredOutgoingStock} Pcs</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Total Tersedia</p>
                        <p className="text-xl font-bold text-zinc-700">{stats.totalAvailableStock} Pcs</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Log Pergerakan Terperinci</h4>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                        {filteredStockLogs.map((log, index) => (
                          <motion.div 
                            key={log.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 border border-zinc-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("p-1.5 rounded-lg", log.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                                {log.type === 'in' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-900">{log.productName}</p>
                                <p className="text-[10px] text-zinc-500">{log.reason} • {new Date(log.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={cn("text-sm font-bold", log.type === 'in' ? "text-emerald-600" : "text-red-600")}>
                              {log.type === 'in' ? '+' : '-'}{log.quantity}
                            </span>
                          </motion.div>
                        ))}
                        {filteredStockLogs.length === 0 && <p className="text-center py-4 text-xs text-zinc-400 italic">Tidak ada log pergerakan pada periode ini.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Inventory Table */}
              <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
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
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Produk</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kategori</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Stok</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Indikator</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Terjual</th>
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
                            <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{p.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-900">{p.stock} Pcs</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", getStockIndicator(p.stock).dot)} />
                              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", getStockIndicator(p.stock).color)}>
                                {getStockIndicator(p.stock).label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-zinc-600">{p.sold || 0} Pcs</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-4xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-6">
                  <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-zinc-400" />
                      Informasi Toko
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nama Toko</label>
                        <input 
                          type="text" 
                          value={config.shopName}
                          onChange={e => setConfig({...config, shopName: e.target.value})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Dukungan</label>
                        <input 
                          type="email" 
                          value={config.contactEmail}
                          onChange={e => setConfig({...config, contactEmail: e.target.value})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Alamat Jalan Toko</label>
                        <textarea 
                          value={config.storeAddress}
                          onChange={e => setConfig({...config, storeAddress: e.target.value})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[80px]"
                          placeholder="Masukkan alamat jalan toko..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Kecamatan Toko</label>
                          <input 
                            type="text" 
                            value={config.storeDistrict || ''}
                            onChange={e => setConfig({...config, storeDistrict: e.target.value})}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                            placeholder="Contoh: Cimahi Selatan"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Kota Toko</label>
                          <input 
                            type="text" 
                            value={config.storeCity}
                            onChange={e => setConfig({...config, storeCity: e.target.value})}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                            placeholder="Contoh: Cimahi"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Kode Pos Toko</label>
                          <input 
                            type="text" 
                            value={config.storePostalCode || ''}
                            onChange={e => setConfig({...config, storePostalCode: e.target.value})}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                            placeholder="Contoh: 40531"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-zinc-100" />

                  <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-zinc-400" />
                      Pengumuman
                    </h3>
                    <textarea 
                      value={config.announcement}
                      onChange={e => setConfig({...config, announcement: e.target.value})}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[100px]"
                      placeholder="Tulis pengumuman untuk pelanggan..."
                    />
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-6">
                    <section>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-zinc-400" />
                        Keamanan & Akses
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">Mode Pemeliharaan</p>
                          <p className="text-[10px] text-zinc-500">Nonaktifkan akses website sementara.</p>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            config.maintenanceMode ? "bg-zinc-900" : "bg-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            config.maintenanceMode ? "left-7" : "left-1"
                          )} />
                        </motion.button>
                      </div>
                    </section>

                    <div className="h-px bg-zinc-100" />

                    <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-zinc-400" />
                      Jam Kerja
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Jam Mulai</label>
                        <input 
                          type="time" 
                          value={config.workingHours.start}
                          onChange={e => setConfig({
                            ...config, 
                            workingHours: { ...config.workingHours, start: e.target.value }
                          })}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Jam Selesai</label>
                        <input 
                          type="time" 
                          value={config.workingHours.end}
                          onChange={e => setConfig({
                            ...config, 
                            workingHours: { ...config.workingHours, end: e.target.value }
                          })}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-zinc-100" />

                  <section className="p-6 bg-red-50/50 rounded-2xl border border-red-100">
                      <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                      </h3>
                      <p className="text-[10px] text-red-500 mb-6 uppercase font-bold tracking-wider">Tindakan ini permanen</p>
                      
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={resetAllData}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 shadow-sm"
                      >
                        <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Reset Semua Data
                      </motion.button>
                    </section>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={saveConfig}
                    disabled={loading}
                    className="w-full py-4 bg-zinc-900 text-white rounded-3xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Shipping Promo Modal */}
        <AnimatePresence>
          {isAddingShippingPromo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingShippingPromo(false)}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Tambah Promo Ongkir</h3>
                    <button onClick={() => setIsAddingShippingPromo(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleAddShippingPromo} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Judul Promo</label>
                      <input 
                        required
                        type="text" 
                        value={newShippingPromo.title}
                        onChange={e => setNewShippingPromo({...newShippingPromo, title: e.target.value})}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        placeholder="Contoh: Gratis Ongkir Ramadhan"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Deskripsi</label>
                      <input 
                        required
                        type="text" 
                        value={newShippingPromo.description}
                        onChange={e => setNewShippingPromo({...newShippingPromo, description: e.target.value})}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        placeholder="Contoh: Minimal belanja Rp 150.000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Min. Belanja</label>
                        <input 
                          required
                          type="number" 
                          value={newShippingPromo.minPurchase || ''}
                          onChange={e => setNewShippingPromo({...newShippingPromo, minPurchase: Number(e.target.value)})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tipe Diskon</label>
                        <select 
                          value={newShippingPromo.discountType}
                          onChange={e => setNewShippingPromo({...newShippingPromo, discountType: e.target.value as any})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        >
                          <option value="free">Gratis Ongkir (100%)</option>
                          <option value="percentage">Persen (%)</option>
                          <option value="fixed">Potongan (Rp)</option>
                        </select>
                      </div>
                    </div>

                    {newShippingPromo.discountType !== 'free' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                          {newShippingPromo.discountType === 'percentage' ? 'Persentase Diskon (%)' : 'Nilai Potongan (Rp)'}
                        </label>
                        <input 
                          required
                          type="number" 
                          value={newShippingPromo.discountValue || ''}
                          onChange={e => setNewShippingPromo({...newShippingPromo, discountValue: Number(e.target.value)})}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                        />
                      </div>
                    )}

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
                      >
                        {loading ? 'Menyimpan...' : 'Tambah Promo Ongkir'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Product Modal */}
        <AnimatePresence>
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
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nama Produk</label>
                    <input 
                      required 
                      placeholder="Contoh: Kaos Polos Premium" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Harga (IDR)</label>
                      <input 
                        required type="number" placeholder="0" 
                        value={newProduct.price || ''}
                        onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                        className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tipe Produk</label>
                      <div className="flex items-center gap-4 p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newProduct.isBundle}
                            onChange={e => setNewProduct({...newProduct, isBundle: e.target.checked})}
                            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span className="text-sm font-medium text-zinc-600">Bundling</span>
                        </label>
                      </div>
                    </div>
                    {newProduct.isBundle && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-left-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Teks Badge Bundle</label>
                        <select 
                          value={newProduct.bundleBadgeText || 'Bundle'}
                          onChange={e => setNewProduct({...newProduct, bundleBadgeText: e.target.value})}
                          className="w-full p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-900/5 text-sm" 
                        >
                          <option value="Bundle">Bundle</option>
                          <option value="Bundle Exclusive">Bundle Exclusive</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {newProduct.isBundle && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Produk dalam Bundle</label>
                      <div className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl space-y-3">
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {products.filter(p => !p.isBundle && p.id !== editingProduct?.id).map(p => (
                            <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-zinc-200">
                              <input 
                                type="checkbox" 
                                checked={newProduct.bundleItems.includes(p.id)}
                                onChange={e => {
                                  const items = e.target.checked 
                                    ? [...newProduct.bundleItems, p.id]
                                    : newProduct.bundleItems.filter(id => id !== p.id);
                                  setNewProduct({...newProduct, bundleItems: items});
                                }}
                                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={getImageUrl(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-8 h-8 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 truncate">{p.name}</p>
                                  <p className="text-[10px] text-zinc-500">Rp {p.price.toLocaleString('id-ID')}</p>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        {newProduct.bundleItems.length === 0 && (
                          <p className="text-[10px] text-red-500 italic">Pilih minimal satu produk untuk bundle ini.</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Stok per Ukuran (Opsional)</label>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                      {['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'].map(size => (
                        <div key={size} className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 text-center block">{size}</label>
                          <input 
                            type="number" min="0" placeholder="0"
                            value={newProduct.sizes?.[size] || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const newSizes: Record<string, number> = { ...(newProduct.sizes || { S:0, M:0, L:0, XL:0, XXL:0, '2XL':0, '3XL':0 }), [size]: val };
                              const totalStock = Object.values(newSizes).reduce((a, b) => a + (Number(b) || 0), 0);
                              setNewProduct({...newProduct, sizes: newSizes, stock: totalStock});
                            }}
                            className="w-full p-2 bg-zinc-50 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm text-center" 
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 ml-1">Isi stok per ukuran jika produk memiliki varian ukuran. Stok total akan dihitung otomatis.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Stok Total, Berat & Kategori</label>
                    <div className="grid grid-cols-3 gap-4">
                      <input 
                        required type="number" placeholder="Stok Total" 
                        value={newProduct.stock || ''}
                        onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                        readOnly={Object.values((newProduct.sizes as Record<string, number>) || {}).some(v => v > 0)}
                        className={`w-full p-3 md:p-4 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm ${Object.values((newProduct.sizes as Record<string, number>) || {}).some(v => v > 0) ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : 'bg-zinc-50'}`} 
                      />
                      <input 
                        required type="number" placeholder="Berat (g)" 
                        value={newProduct.weight || ''}
                        onChange={e => setNewProduct({...newProduct, weight: Number(e.target.value)})}
                        className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
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
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Deskripsi</label>
                    <textarea 
                      placeholder="Jelaskan detail produk..." 
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[100px] text-sm" 
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Gambar Produk (Maksimal 4)</p>
                    <div className="grid grid-cols-4 gap-4">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="space-y-2">
                          <ImageUpload
                            value={img}
                            onChange={(url) => {
                              const updatedImages = [...newProduct.images];
                              updatedImages[idx] = url;
                              setNewProduct(prev => ({ ...prev, images: updatedImages }));
                            }}
                            onRemove={() => {
                              const updatedImages = [...newProduct.images];
                              updatedImages[idx] = '';
                              setNewProduct(prev => ({ ...prev, images: updatedImages }));
                            }}
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
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Keunggulan Pelayanan</p>
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

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="w-full py-3 md:py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : (editingProduct ? 'Simpan Perubahan' : 'Simpan Produk')}
                  </motion.button>
                </form>
              </motion.div>
            </div>
          )}

          {isAddingPromo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => { setIsAddingPromo(false); setEditingPromo(null); }}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-6 md:p-10 space-y-8 border border-zinc-200/60 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tight text-zinc-900">{editingPromo ? 'Edit Promo' : 'Tambah Promo'}</h3>
                  <button onClick={() => { setIsAddingPromo(false); setEditingPromo(null); }} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handlePromoCode} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Kode Promo</label>
                    <input 
                      required 
                      placeholder="Contoh: MERDEKA79" 
                      value={newPromo.code}
                      onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                      className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm font-black tracking-widest" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tipe Diskon</label>
                      <select 
                        value={newPromo.discountType}
                        onChange={e => setNewPromo({...newPromo, discountType: e.target.value as any})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm"
                      >
                        <option value="percentage">Persentase (%)</option>
                        <option value="fixed">Nominal Tetap (Rp)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nilai Diskon</label>
                      <input 
                        required type="number" placeholder="Nilai" 
                        value={newPromo.discountValue || ''}
                        onChange={e => setNewPromo({...newPromo, discountValue: Number(e.target.value)})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Min. Belanja</label>
                      <input 
                        type="number" placeholder="Rp 0" 
                        value={newPromo.minPurchase || ''}
                        onChange={e => setNewPromo({...newPromo, minPurchase: Number(e.target.value)})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Maks. Diskon</label>
                      <input 
                        type="number" placeholder="Rp 0" 
                        value={newPromo.maxDiscount || ''}
                        onChange={e => setNewPromo({...newPromo, maxDiscount: Number(e.target.value)})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Batas Penggunaan</label>
                      <input 
                        type="number" placeholder="0 = Tak terbatas" 
                        value={newPromo.usageLimit || ''}
                        onChange={e => setNewPromo({...newPromo, usageLimit: Number(e.target.value)})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Tgl Kadaluarsa</label>
                      <input 
                        type="date" 
                        value={newPromo.expiryDate}
                        onChange={e => setNewPromo({...newPromo, expiryDate: e.target.value})}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="promoActive"
                      checked={newPromo.isActive}
                      onChange={e => setNewPromo({...newPromo, isActive: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <label htmlFor="promoActive" className="text-sm font-medium text-zinc-700 cursor-pointer">Status Aktif</label>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : (editingPromo ? 'Simpan Perubahan' : 'Simpan Promo')}
                  </motion.button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-200/60"
              >
                <div className="flex items-center gap-4 mb-6 text-red-600">
                  <div className="p-3 bg-red-50 rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Hapus Pengguna?</h3>
                </div>
                <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-zinc-900">{confirmDelete.userName}</span> secara permanen? Tindakan ini tidak dapat dibatalkan dan akan menghapus data di Auth & Firestore. Akun CEO tidak dapat dihapus.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setConfirmDelete({ show: false, userId: '', userName: '' })}
                    className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-bold rounded-xl transition-all"
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDeleteUser}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                  >
                    Hapus
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className={cn(
                "fixed bottom-8 right-8 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 border",
                toast.type === 'success' ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600"
              )}
            >
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="text-sm font-bold text-zinc-900">{toast.message}</p>
              <button 
                onClick={() => setToast({ ...toast, show: false })}
                className="ml-2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attendance Overlay */}
        {!hasCheckedIn && auth.currentUser && !['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role) && (
          <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-200/60 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-bold text-zinc-900">Absensi Diperlukan</h2>
              <p className="text-zinc-600 text-center">Anda harus melakukan absensi terlebih dahulu sebelum dapat mengakses dashboard.</p>
              <AttendanceForm user={users.find(u => u.uid === auth.currentUser?.uid) || { uid: auth.currentUser.uid, name: 'Admin', role: 'admin' } as any} onSuccess={() => setHasCheckedIn(true)} />
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedAttendanceUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAttendanceUser(null)}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-zinc-200 overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-xl font-bold text-white">
                        {selectedAttendanceUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-zinc-900">{selectedAttendanceUser.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">ID: {selectedAttendanceUser.employeeId || 'N/A'}</p>
                          <p className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAttendanceUser(null)}
                      className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Statistik Bulan Ini ({new Date().toLocaleString('id-ID', { month: 'long' })})</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { 
                          label: 'Hadir', 
                          value: attendance.filter(a => {
                            const d = new Date(a.date);
                            return a.userId === selectedAttendanceUser.uid && a.status === 'Hadir' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                          }).length, 
                          color: 'emerald' 
                        },
                        { 
                          label: 'Telat', 
                          value: attendance.filter(a => {
                            if (a.userId !== selectedAttendanceUser.uid || a.status !== 'Hadir' || !a.createdAt) return false;
                            const d = new Date(a.date);
                            if (d.getMonth() !== new Date().getMonth() || d.getFullYear() !== new Date().getFullYear()) return false;
                            const date = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                            const [startHour, startMinute] = config.workingHours.start.split(':').map(Number);
                            return (date.getHours() * 60 + date.getMinutes()) > (startHour * 60 + startMinute);
                          }).length, 
                          color: 'orange' 
                        },
                        { 
                          label: 'Izin', 
                          value: attendance.filter(a => {
                            const d = new Date(a.date);
                            return a.userId === selectedAttendanceUser.uid && a.status === 'Izin' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                          }).length, 
                          color: 'blue' 
                        },
                        { 
                          label: 'Sakit', 
                          value: attendance.filter(a => {
                            const d = new Date(a.date);
                            return a.userId === selectedAttendanceUser.uid && a.status === 'Sakit' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                          }).length, 
                          color: 'red' 
                        },
                      ].map((stat, i) => (
                        <div key={i} className={`p-4 rounded-2xl bg-${stat.color}-50 border border-${stat.color}-100`}>
                          <p className={`text-[10px] font-bold text-${stat.color}-600 uppercase tracking-wider mb-1`}>{stat.label}</p>
                          <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900 rounded-[2rem] text-white mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold">Penilaian Kinerja Bulan Ini</h4>
                      <span className="text-xs text-zinc-400">Target: 20 Hari Kerja</span>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min((attendance.filter(a => {
                                const d = new Date(a.date);
                                return a.userId === selectedAttendanceUser.uid && a.status === 'Hadir' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                              }).length / 20) * 100, 100)}%` 
                            }}
                            className="h-full bg-white rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold leading-none">
                          {Math.min(Math.round((attendance.filter(a => {
                            const d = new Date(a.date);
                            return a.userId === selectedAttendanceUser.uid && a.status === 'Hadir' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                          }).length / 20) * 100), 100)}%
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Skor Akhir</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Riwayat Ketidakhadiran</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {attendance
                          .filter(a => a.userId === selectedAttendanceUser.uid && (a.status === 'Izin' || a.status === 'Sakit'))
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((absent, i) => {
                            const date = new Date(absent.date);
                            return (
                              <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    absent.status === 'Izin' ? "bg-blue-500" : "bg-red-500"
                                  )} />
                                  <span className="text-sm font-medium text-zinc-900">
                                    {date.getDate()} {date.toLocaleString('id-ID', { month: 'long' })}
                                  </span>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                  absent.status === 'Izin' ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                                )}>
                                  {absent.status}
                                </span>
                              </motion.div>
                            );
                          })}
                        {attendance.filter(a => a.userId === selectedAttendanceUser.uid && (a.status === 'Izin' || a.status === 'Sakit')).length === 0 && (
                          <div className="col-span-2 py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                            <p className="text-sm text-zinc-400 italic">Tidak ada riwayat ketidakhadiran</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
        {/* Image Preview Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-2">
                  <img
                    src={getImageUrl(selectedImage)}
                    alt="Bukti Pembayaran"
                    className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-6 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 rounded-xl">
                      <CreditCard className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">Bukti Pembayaran</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Verifikasi Transaksi</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-6 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
