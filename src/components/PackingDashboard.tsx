import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { Order, User } from '../types';
import { motion } from 'motion/react';
import { Package, Truck, CheckCircle, Search, Box, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PackingDashboardProps {
  user: User;
}

export default function PackingDashboard({ user }: PackingDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Semua' | 'Dikemas' | 'Dikirim'>('Semua');

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Dikemas', 'Dikirim', 'Diproses']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, status: string, tracking?: string) => {
    try {
      const data: any = { status };
      if (tracking) data.trackingNumber = tracking;
      await updateDoc(doc(db, 'orders', orderId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const filteredOrders = orders.filter(o => filter === 'Semua' || o.status === filter);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-bold tracking-tight">Admin Packing.</h2>
        <p className="text-zinc-500">Kelola pengemasan dan pengiriman pesanan.</p>
      </div>

      <div className="flex gap-4 p-1 bg-zinc-100 rounded-2xl w-fit">
        {['Semua', 'Diproses', 'Dikemas', 'Dikirim'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-6 py-2 text-sm font-bold rounded-xl transition-all",
              (filter === f || (f === 'Diproses' && filter === 'Semua')) ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {f === 'Diproses' ? 'Perlu Dikemas' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredOrders.map((order) => (
          <motion.div 
            key={order.id}
            layout
            className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden"
          >
            <div className="p-8 flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Order ID: #{order.id.slice(-6)}</p>
                    <h3 className="text-xl font-bold">{order.items.length} Produk untuk dikirim</h3>
                  </div>
                  <span className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest",
                    order.status === 'Diproses' && "bg-blue-50 text-blue-600",
                    order.status === 'Dikemas' && "bg-orange-50 text-orange-600",
                    order.status === 'Dikirim' && "bg-purple-50 text-purple-600",
                  )}>
                    {order.status === 'Diproses' ? 'Siap Dikemas' : order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Daftar Item</p>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center font-bold text-xs">{item.quantity}x</div>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Alamat Pengiriman</p>
                    <p className="text-sm text-zinc-600 leading-relaxed">{order.address}</p>
                  </div>
                </div>
              </div>

              <div className="lg:w-80 bg-zinc-50 p-8 rounded-2xl space-y-6 flex flex-col justify-center">
                {order.status === 'Diproses' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'Dikemas')}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Box className="w-5 h-5" />
                    Tandai Dikemas
                  </button>
                )}
                {order.status === 'Dikemas' && (
                  <div className="space-y-4">
                    <input 
                      id={`resi-${order.id}`}
                      placeholder="Masukkan No. Resi"
                      className="w-full p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none"
                    />
                    <button 
                      onClick={() => {
                        const resi = (document.getElementById(`resi-${order.id}`) as HTMLInputElement).value;
                        if (resi) updateStatus(order.id, 'Dikirim', resi);
                      }}
                      className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Truck className="w-5 h-5" />
                      Kirim Pesanan
                    </button>
                  </div>
                )}
                {order.status === 'Dikirim' && (
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="font-bold">Dalam Pengiriman</p>
                    <p className="text-xs text-zinc-500">Resi: {order.trackingNumber}</p>
                    <button 
                      onClick={() => updateStatus(order.id, 'Selesai')}
                      className="mt-4 text-xs font-bold text-zinc-900 hover:underline"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
