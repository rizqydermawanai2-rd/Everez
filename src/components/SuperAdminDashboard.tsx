import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { User, Product, Order } from '../types';
import { motion } from 'motion/react';
import { Users, ShoppingBag, Package, Shield, Edit, Trash, CheckCircle, X, Search, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface SuperAdminDashboardProps {
  user: User;
}

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubProducts();
      unsubOrders();
    };
  }, []);

  const updateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-bold tracking-tight">Super Admin.</h2>
        <p className="text-zinc-500">Manajemen penuh sistem Everez.</p>
      </div>

      <div className="flex gap-4 p-1 bg-zinc-100 rounded-2xl w-fit">
        {[
          { id: 'users', label: 'Pengguna', icon: Users },
          { id: 'products', label: 'Produk', icon: ShoppingBag },
          { id: 'orders', label: 'Pesanan', icon: Package },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl transition-all",
              activeTab === tab.id ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-zinc-200/50 border border-zinc-100">
        <div className="flex items-center justify-between mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder={`Cari ${activeTab === 'users' ? 'pengguna' : activeTab === 'products' ? 'produk' : 'pesanan'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
          </div>
        </div>

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-zinc-100">
                  <th className="pb-4 font-medium text-zinc-500">Nama</th>
                  <th className="pb-4 font-medium text-zinc-500">Email</th>
                  <th className="pb-4 font-medium text-zinc-500">Role</th>
                  <th className="pb-4 font-medium text-zinc-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="group">
                    <td className="py-4 font-medium">{u.name}</td>
                    <td className="py-4 text-zinc-500">{u.email}</td>
                    <td className="py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        u.role === 'super_admin' ? "bg-purple-100 text-purple-600" :
                        u.role === 'admin_sales' ? "bg-blue-100 text-blue-600" :
                        u.role === 'admin_packing' ? "bg-orange-100 text-orange-600" :
                        "bg-zinc-100 text-zinc-600"
                      )}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <select 
                        value={u.role}
                        onChange={(e) => updateUserRole(u.uid, e.target.value as any)}
                        className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-zinc-900/5"
                      >
                        <option value="customer">Customer</option>
                        <option value="admin_sales">Sales Admin</option>
                        <option value="admin_packing">Packing Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center gap-4">
                <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="font-bold">{p.name}</h4>
                  <p className="text-xs text-zinc-500">Stok: {p.stock} | Rp {p.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.map(o => (
              <div key={o.id} className="p-4 border border-zinc-100 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Order #{o.id.slice(-6)}</h4>
                  <p className="text-xs text-zinc-500">Total: Rp {o.total.toLocaleString()} | Status: {o.status}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  o.status === 'Selesai' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                )}>
                  {o.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
