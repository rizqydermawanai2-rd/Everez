import React, { useState, useEffect, FormEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy, where, getDocs } from 'firebase/firestore';
import { Product, Order, User, ShippingPromo } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash, Package, ShoppingBag, TrendingUp, Clock, CheckCircle, X, DollarSign, Search, Bell, LayoutDashboard, Globe, Loader2, ShieldCheck, Truck, RefreshCw, Star, UserCheck, Box, Tag, Percent, MessageCircle, Eye } from 'lucide-react';
import { cn, getImageUrl } from '../../lib/utils';
import AttendanceForm from './AttendanceForm';
import AdminChat from './AdminChat';
import { hasCheckedInToday } from '../../services/attendanceService';
import ImageUpload from '../ImageUpload';
import NotificationDropdown, { Notification } from './NotificationDropdown';

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
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(promo.id)}
                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <Trash className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDiscountRow({ product, onUpdate }: { product: any, onUpdate: (id: string, price: number, label: string, discountType?: 'percentage' | 'fixed', discountValue?: number, bundleBadgeText?: string) => Promise<void>, key?: any }) {
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
    <div className="grid grid-cols-12 gap-4 p-4 md:p-6 items-center hover:bg-zinc-50 transition-colors">
      <div className="col-span-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden border border-zinc-200/60">
            <img src={getImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate">{product.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{product.category}</p>
          </div>
        </div>
      </div>
      <div className="col-span-2">
        <p className="text-sm font-medium text-zinc-600">Rp {product.price.toLocaleString('id-ID')}</p>
      </div>
      <div className="col-span-2">
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
            <input 
              type="number" 
              value={discountValue || ''} 
              onChange={e => setDiscountValue(Number(e.target.value))}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              placeholder={discountType === 'percentage' ? "Persen..." : "Harga diskon..."}
            />
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
      </div>
      <div className="col-span-2">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              value={promoLabel} 
              onChange={e => setPromoLabel(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              placeholder="Label..."
            />
            {product.isBundle && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Badge Bundle</label>
                <select 
                  value={bundleBadgeText} 
                  onChange={e => setBundleBadgeText(e.target.value)}
                  className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-900/5"
                >
                  <option value="Bundle">Bundle</option>
                  <option value="Bundle Exclusive">Bundle Exclusive</option>
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {product.promoLabel && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-md w-fit uppercase tracking-wider">
                {product.promoLabel}
              </span>
            )}
            {product.isBundle && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md w-fit uppercase tracking-wider">
                {product.bundleBadgeText || 'Bundle'}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="col-span-2 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                onUpdate(product.id, discountPrice, promoLabel, discountType, discountValue, bundleBadgeText);
                setIsEditing(false);
              }}
              className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminSalesDashboard({ user, onViewWebsite }: AdminDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [shippingPromos, setShippingPromos] = useState<ShippingPromo[]>([]);
  const [isAddingShippingPromo, setIsAddingShippingPromo] = useState(false);
  const [promoTab, setPromoTab] = useState<'product' | 'shipping'>('product');
  const [newShippingPromo, setNewShippingPromo] = useState({
    title: '',
    description: '',
    minPurchase: 0,
    discountType: 'free' as 'percentage' | 'fixed' | 'free',
    discountValue: 0,
    isActive: true
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [productSubTab, setProductSubTab] = useState<'all' | 'single' | 'bundle'>('all');
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role));
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    weight: 0,
    isBundle: false,
    bundleBadgeText: 'Bundle',
    bundleItems: [] as string[],
    category: 'T-Shirt',
    stock: 0,
    sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 } as Record<string, number>,
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

    const unsubChats = onSnapshot(collection(db, 'chats'), (snapshot) => {
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

    const unsubShippingPromos = onSnapshot(collection(db, 'shipping_promos'), (snapshot) => {
      setShippingPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShippingPromo)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shipping_promos');
    });

    return () => { unsubProducts(); unsubOrders(); unsubChats(); unsubShippingPromos(); };
  }, [user.uid]);

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
  }, [unreadChatCount, orders]);

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

  const handleAddShippingPromo = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'shipping_promos'), {
        ...newShippingPromo,
        createdAt: new Date()
      });
      setToast({ show: true, message: "Promo ongkir berhasil ditambahkan.", type: 'success' });
      setIsAddingShippingPromo(false);
      setNewShippingPromo({
        title: '',
        description: '',
        minPurchase: 0,
        discountType: 'free',
        discountValue: 0,
        isActive: true
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shipping_promos');
    } finally {
      setLoading(false);
    }
  };

  const updateShippingPromo = async (id: string, data: Partial<ShippingPromo>) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'shipping_promos', id), data);
      setToast({ show: true, message: "Promo ongkir berhasil diperbarui.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shipping_promos/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteShippingPromo = async (id: string) => {
    if (!window.confirm('Hapus promo ongkir ini?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'shipping_promos', id));
      setToast({ show: true, message: "Promo ongkir berhasil dihapus.", type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shipping_promos/${id}`);
    } finally {
      setLoading(false);
    }
  };

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
        name: '', price: 0, weight: 0, isBundle: false, bundleBadgeText: 'Bundle', bundleItems: [], category: 'Kaos', stock: 0, 
        sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 }, description: '', image: '', 
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
      weight: product.weight || 0,
      isBundle: product.isBundle || false,
      bundleBadgeText: product.bundleBadgeText || 'Bundle',
      bundleItems: product.bundleItems || [],
      category: product.category,
      stock: product.stock,
      sizes: product.sizes || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '2XL': 0, '3XL': 0 },
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

  const approveOrder = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { approvalStatus: 'approved' });
  };

  const rejectOrder = async (orderId: string) => {
    await updateDoc(doc(db, 'orders', orderId), { approvalStatus: 'rejected' });
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
            { id: 'orders', icon: ShoppingBag, label: 'Daftar Pesanan', badge: orders.filter(o => o.status === 'Diproses').length },
            { id: 'promo', icon: Percent, label: 'Promo & Diskon' },
            { id: 'chat', icon: MessageCircle, label: 'Live Chat', badge: unreadChatCount },
            { id: 'absensi', icon: UserCheck, label: 'Absensi' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 focus:outline-none",
                activeTab === item.id 
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60" 
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full",
                  activeTab === item.id ? "bg-zinc-900 text-white" : "bg-red-500 text-white"
                )}>
                  {item.badge}
                </span>
              ) : null}
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
            <div className="order-3">
              <NotificationDropdown notifications={notifications} />
            </div>
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
                            <div className="flex flex-col">
                              <p className="text-sm font-bold text-zinc-900">Rp {order.total.toLocaleString('id-ID')}</p>
                              {order.shippingCost && (
                                <p className="text-[10px] text-zinc-500">Ongkir: Rp {order.shippingCost.toLocaleString('id-ID')} ({order.totalWeight || 0}g)</p>
                              )}
                            </div>
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
                  <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
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
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-zinc-50/50 border-b border-zinc-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Kategori</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Berat</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stok</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Indikator</th>
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
                          .map((p, index) => (
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
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm text-zinc-900 truncate">{p.name}</p>
                                    {p.isBundle && (
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-bold rounded uppercase tracking-wider">
                                        Bundle
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate">{p.description?.slice(0, 30)}...</p>
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
                            <td className="px-6 py-4 text-sm font-bold text-zinc-900 whitespace-nowrap">
                              <span>Rp {p.price.toLocaleString('id-ID')}</span>
                            </td>
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
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bukti Bayar</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Berat</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ongkir</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Approval</th>
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
                          {order.paymentProofUrl ? (
                            <button 
                              onClick={() => setSelectedImage(order.paymentProofUrl!)}
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 hover:border-zinc-900 transition-all"
                            >
                              <img 
                                src={getImageUrl(order.paymentProofUrl)} 
                                alt="Proof" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Belum Ada</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {order.paymentProofUrl ? (
                            <button 
                              onClick={() => setSelectedImage(order.paymentProofUrl!)}
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 hover:border-zinc-900 transition-all"
                            >
                              <img 
                                src={getImageUrl(order.paymentProofUrl)} 
                                alt="Proof" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Belum Ada</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-zinc-600">{order.totalWeight || 0}g</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-zinc-600">Rp {(order.shippingCost || 0).toLocaleString('id-ID')}</span>
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
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            order.approvalStatus === 'approved' ? "bg-emerald-50 text-emerald-600" :
                            order.approvalStatus === 'rejected' ? "bg-red-50 text-red-600" :
                            "bg-zinc-100 text-zinc-500"
                          )}>
                            {order.approvalStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-zinc-900">Rp {order.total.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            {order.approvalStatus === 'pending' && (
                              <>
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => approveOrder(order.id)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  Approve
                                </motion.button>
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => rejectOrder(order.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </motion.button>
                              </>
                            )}
                            {order.status === 'Diproses' && order.approvalStatus === 'approved' && (
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

          {/* Image Preview Modal */}
          {selectedImage && (
            <div 
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative max-w-4xl w-full h-full flex items-center justify-center"
              >
                <img 
                  src={getImageUrl(selectedImage)} 
                  alt="Payment Proof" 
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-0 right-0 m-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </motion.div>
            </div>
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

          {activeTab === 'promo' && (
            <motion.div
              key="promo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Promo & Diskon</h3>
                  <p className="text-sm text-zinc-500">Atur diskon produk dan promo ongkir.</p>
                </div>
                <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
                  <button 
                    onClick={() => setPromoTab('product')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                      promoTab === 'product' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <Tag className="w-4 h-4" />
                    Diskon Produk
                  </button>
                  <button 
                    onClick={() => setPromoTab('shipping')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                      promoTab === 'shipping' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <Truck className="w-4 h-4" />
                    Gratis Ongkir
                  </button>
                </div>
              </div>

              {promoTab === 'product' ? (
                <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <div className="col-span-4">Produk</div>
                      <div className="col-span-2">Harga Normal</div>
                      <div className="col-span-2">Diskon</div>
                      <div className="col-span-2">Harga Akhir</div>
                      <div className="col-span-2 text-right">Aksi</div>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {products.map(product => (
                      <ProductDiscountRow 
                        key={product.id} 
                        product={product} 
                        onUpdate={updateProductDiscount}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsAddingShippingPromo(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Promo Ongkir
                    </motion.button>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-zinc-100 bg-zinc-50/50">
                      <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <div className="col-span-3">Promo</div>
                        <div className="col-span-2">Min. Belanja</div>
                        <div className="col-span-2">Tipe</div>
                        <div className="col-span-2">Nilai</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-2 text-right">Aksi</div>
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {shippingPromos.length > 0 ? (
                        shippingPromos.map(promo => (
                          <ShippingPromoRow 
                            key={promo.id} 
                            promo={promo} 
                            onUpdate={updateShippingPromo}
                            onDelete={deleteShippingPromo}
                          />
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Truck className="w-8 h-8 text-zinc-300" />
                          </div>
                          <p className="text-sm text-zinc-500">Belum ada promo ongkir.</p>
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
              <div className="mb-6">
                <h3 className="text-xl font-bold">Live Chat</h3>
                <p className="text-sm text-zinc-500">Balas pesan dari pelanggan.</p>
              </div>
              <AdminChat user={user} />
            </motion.div>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 border",
              toast.type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-red-600 border-red-500 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 border border-zinc-200/60"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Tambah Promo Ongkir</h3>
              <button onClick={() => setIsAddingShippingPromo(false)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddShippingPromo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Judul Promo</label>
                <input 
                  required 
                  placeholder="Contoh: Gratis Ongkir Ramadhan" 
                  value={newShippingPromo.title}
                  onChange={e => setNewShippingPromo({...newShippingPromo, title: e.target.value})}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Deskripsi</label>
                <textarea 
                  required 
                  placeholder="Detail promo..." 
                  value={newShippingPromo.description}
                  onChange={e => setNewShippingPromo({...newShippingPromo, description: e.target.value})}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm min-h-[80px]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Min. Belanja (Rp)</label>
                  <input 
                    required type="number"
                    value={newShippingPromo.minPurchase || ''}
                    onChange={e => setNewShippingPromo({...newShippingPromo, minPurchase: Number(e.target.value)})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Tipe Diskon</label>
                  <select 
                    value={newShippingPromo.discountType}
                    onChange={e => setNewShippingPromo({...newShippingPromo, discountType: e.target.value as any})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm"
                  >
                    <option value="free">Gratis Ongkir (100%)</option>
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Potongan Tetap (Rp)</option>
                  </select>
                </div>
              </div>
              {newShippingPromo.discountType !== 'free' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">
                    {newShippingPromo.discountType === 'percentage' ? 'Persentase Diskon (%)' : 'Potongan Diskon (Rp)'}
                  </label>
                  <input 
                    required type="number"
                    value={newShippingPromo.discountValue || ''}
                    onChange={e => setNewShippingPromo({...newShippingPromo, discountValue: Number(e.target.value)})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                  />
                </div>
              )}
              <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-md mt-4">
                Simpan Promo
              </button>
            </form>
          </motion.div>
        </div>
      )}

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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Harga (IDR)</label>
                    <input 
                      required type="number" placeholder="Harga" 
                      value={newProduct.price || ''}
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Tipe Produk</label>
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
                    <div className="space-y-1 animate-in fade-in slide-in-from-left-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Teks Badge Bundle</label>
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
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Produk dalam Bundle</label>
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Stok per Ukuran (Opsional)</label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Stok Total</label>
                    <input 
                      required type="number" placeholder="Stok" 
                      value={newProduct.stock || ''}
                      onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                      readOnly={Object.values((newProduct.sizes as Record<string, number>) || {}).some(v => v > 0)}
                      className={`w-full p-3 md:p-4 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm ${Object.values((newProduct.sizes as Record<string, number>) || {}).some(v => v > 0) ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : 'bg-zinc-50'}`} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Berat (g)</label>
                    <input 
                      required type="number" placeholder="Berat" 
                      value={newProduct.weight || ''}
                      onChange={e => setNewProduct({...newProduct, weight: Number(e.target.value)})}
                      className="w-full p-3 md:p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Kategori</label>
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
      {!hasCheckedIn && !['ceo', 'vice_ceo', 'super_admin', 'admin_production', 'admin_packing', 'admin_sales'].includes(user.role) && (
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
