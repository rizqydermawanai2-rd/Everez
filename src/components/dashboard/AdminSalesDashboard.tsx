import React, { useState, useEffect, FormEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Product, Order, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, Trash, Package, ShoppingBag, TrendingUp, Clock, CheckCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: 'Kaos',
    stock: 0,
    description: '',
    image: ''
  });

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => { unsubProducts(); unsubOrders(); };
  }, []);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), newProduct);
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: 'Kaos', stock: 0, description: '', image: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
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

  const stats = [
    { label: 'Total Penjualan', value: `Rp ${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Order Masuk', value: orders.length, icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'Perlu Diproses', value: orders.filter(o => o.status === 'Diproses').length, icon: Clock, color: 'text-orange-500' },
    { label: 'Selesai', value: orders.filter(o => o.status === 'Selesai').length, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">Admin Sales.</h2>
          <p className="text-zinc-500">Kelola produk dan pantau penjualan harian.</p>
        </div>
        <button 
          onClick={() => setIsAddingProduct(true)}
          className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah Produk
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <div className={cn("p-3 rounded-2xl bg-zinc-50 w-fit", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-6">
          <h3 className="text-2xl font-bold">Manajemen Produk</h3>
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Produk</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Stok</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Harga</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden">
                          <img src={p.image || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{p.stock}</td>
                    <td className="px-6 py-4 text-sm font-bold">Rp {p.price.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-2xl font-bold">Pesanan Terbaru</h3>
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold text-sm">#{order.id.slice(-6)} - {order.items.length} Item</p>
                  <p className="text-xs text-zinc-500">Total: Rp {order.total.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    order.status === 'Diproses' ? "bg-blue-50 text-blue-600" : "bg-zinc-50 text-zinc-500"
                  )}>
                    {order.status}
                  </span>
                  {order.status === 'Diproses' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'Produksi')}
                      className="text-xs font-bold text-zinc-900 hover:underline"
                    >
                      Kirim ke Produksi
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteOrder(order.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Tambah Produk Baru</h3>
                <button onClick={() => setIsAddingProduct(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input 
                  required 
                  placeholder="Nama Produk" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    required type="number" placeholder="Harga" 
                    value={newProduct.price || ''}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none" 
                  />
                  <input 
                    required type="number" placeholder="Stok" 
                    value={newProduct.stock || ''}
                    onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none" 
                  />
                </div>
                <select 
                  value={newProduct.category}
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none"
                >
                  <option>Kaos</option>
                  <option>Hoodie</option>
                  <option>Lainnya</option>
                </select>
                <textarea 
                  placeholder="Deskripsi" 
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none min-h-[100px]" 
                />
                <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all">
                  Simpan Produk
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
