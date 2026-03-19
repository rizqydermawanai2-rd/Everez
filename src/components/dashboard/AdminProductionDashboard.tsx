import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Search, Bell, Settings, LogOut, LayoutDashboard,
  ClipboardList, Package, Users, Plus, 
  Clock, CheckCircle2, AlertCircle, Droplets, FlaskConical, Box, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Order } from '../../types';

const data = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 15 },
  { name: 'Wed', count: 8 },
  { name: 'Thu', count: 10 },
  { name: 'Fri', count: 18 },
  { name: 'Sat', count: 20 },
  { name: 'Sun', count: 14 },
];

const pieData = [
  { name: 'Returning', value: 9 },
  { name: 'New', value: 2 },
];

const COLORS = ['#1e40af', '#e5e7eb'];

export default function AdminProductionDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsub();
  }, []);

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
    { label: 'Perlu Produksi', count: orders.filter(o => o.status === 'Diproses').length, icon: AlertCircle, color: 'bg-blue-100 text-blue-600' },
    { label: 'Sedang Produksi', count: orders.filter(o => o.status === 'Produksi').length, icon: Clock, color: 'bg-orange-100 text-orange-600' },
    { label: 'Selesai Produksi', count: orders.filter(o => ['Packing', 'Siap Kirim', 'Dikirim', 'Selesai'].includes(o.status)).length, icon: CheckCircle2, color: 'bg-zinc-900 text-white' },
  ];
  return (
    <div className="flex min-h-screen bg-[#E4E3E0] font-sans text-[#141414]">
      {/* Sidebar - Minimal Icons */}
      <aside className="w-20 bg-white border-r border-[#141414]/10 flex flex-col items-center py-8">
        <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center mb-12">
          <Package className="w-6 h-6 text-white" />
        </div>
        
        <nav className="flex-1 space-y-8">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: ClipboardList, label: 'Pesanan' },
            { icon: FlaskConical, label: 'Daftar Harga' },
            { icon: Users, label: 'Pelanggan' },
            { icon: Droplets, label: 'Persediaan' },
            { icon: Settings, label: 'Pengaturan' },
          ].map((item) => (
            <button
              key={item.label}
              className={cn(
                "p-3 rounded-xl transition-all relative group",
                item.active 
                  ? "bg-[#1e40af] text-white shadow-lg shadow-blue-900/20" 
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-[#141414] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <button className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex items-center justify-between mb-12">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-xl text-sm focus:outline-none shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative">
              <Bell className="w-5 h-5 text-zinc-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#E4E3E0]" />
            </button>
            <div className="flex items-center gap-3">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" 
                alt="Profile" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">Max Brown</p>
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-zinc-500 font-medium">9 Mar 2024, Saturday</p>
            </div>

            {/* Orders Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Pesanan</h3>
                <button className="text-sm font-bold text-blue-600 hover:underline">Lihat Semua</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <button className="aspect-square border-2 border-dashed border-zinc-300 rounded-3xl flex items-center justify-center hover:border-zinc-400 transition-all group">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-orange-500" />
                  </div>
                </button>
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-zinc-400">#{order.id.slice(-5)}</span>
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold text-white rounded-full",
                        order.status === 'Diproses' ? 'bg-blue-500' : 'bg-orange-500'
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] text-zinc-400 mb-1">
                        {order.createdAt instanceof Date ? order.createdAt.toLocaleDateString() : 'Baru'}
                      </p>
                      <p className="font-bold truncate">{order.customerName || 'Customer'}</p>
                      <p className="text-xs text-zinc-500">{order.items.length} Items</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(order.id, 'Packing')}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                        >
                          Selesai Produksi
                        </button>
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                      <span className="text-xs font-bold">Rp {order.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-[#1e40af] p-8 rounded-[40px] text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-sm font-medium opacity-80">Total Revenue</p>
                    <button className="text-xs font-bold opacity-80 hover:opacity-100 flex items-center gap-1">
                      All Time <Settings className="w-3 h-3" />
                    </button>
                  </div>
                  <h3 className="text-5xl font-bold mb-2">Rp {orders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}</h3>
                </div>
                {/* Abstract shape */}
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-sm font-bold text-zinc-400">Pending Orders Value</p>
                  <button className="text-xs font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1">
                    Current <Settings className="w-3 h-3" />
                  </button>
                </div>
                <h3 className="text-5xl font-bold">Rp {orders.filter(o => o.status !== 'Selesai').reduce((acc, o) => acc + o.total, 0).toLocaleString()}</h3>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-4 space-y-8">
            {/* Supply List */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Daftar Persediaan</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline">Update</button>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Softener', value: '2 pcs left', warning: true, progress: 20 },
                  { label: 'Detergent', value: '7 pcs left', warning: true, progress: 40 },
                  { label: 'Plastic wrap', value: '24 m left', warning: true, progress: 60 },
                  { label: 'Plastic bag', value: '34 pcs left', warning: false, progress: 80 },
                  { label: 'Perfume', value: '19 ml left', warning: false, progress: 30, color: 'bg-blue-900' },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.label}</span>
                        {item.warning && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                      <span className="text-zinc-400 text-xs">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", item.color || (item.warning ? "bg-orange-500" : "bg-zinc-900"))} 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Cards */}
            <div className="space-y-4">
              {stats.map((status) => (
                <div key={status.label} className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-6">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", status.color)}>
                    <status.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 mb-1">{status.label}</p>
                    <p className="text-2xl font-bold">{status.count}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Customer Chart */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Total Pelanggan</h3>
                <button className="text-xs font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1">
                  7 Hari Terakhir <Settings className="w-3 h-3" />
                </button>
              </div>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm font-bold">9 returning customers</p>
                <p className="text-sm text-zinc-400">2 new customers</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
