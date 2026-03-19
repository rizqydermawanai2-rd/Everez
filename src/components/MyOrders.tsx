import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Order, User } from '../types';
import { motion } from 'motion/react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface MyOrdersProps {
  user: User;
}

export default function MyOrders({ user }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Diproses': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'Dikemas': return <Package className="w-5 h-5 text-orange-500" />;
      case 'Dikirim': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'Selesai': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Clock className="w-5 h-5 text-zinc-400" />;
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto space-y-4">
      {[1, 2].map(i => <div key={i} className="h-40 bg-zinc-100 rounded-3xl animate-pulse" />)}
    </div>;
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-6">
        <Package className="w-16 h-16 text-zinc-200 mx-auto" />
        <h2 className="text-3xl font-bold">Belum Ada Pesanan.</h2>
        <p className="text-zinc-500">Kamu belum melakukan pembelian apapun.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-4xl font-bold tracking-tight">Pesanan Saya.</h2>
      <div className="space-y-6">
        {orders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 flex flex-col md:flex-row justify-between gap-6 border-b border-zinc-50">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Order ID: #{order.id.slice(-6)}</p>
                <p className="text-sm text-zinc-500">{order.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold",
                order.status === 'Diproses' && "bg-blue-50 text-blue-600",
                order.status === 'Dikemas' && "bg-orange-50 text-orange-600",
                order.status === 'Dikirim' && "bg-purple-50 text-purple-600",
                order.status === 'Selesai' && "bg-emerald-50 text-emerald-600",
              )}>
                {getStatusIcon(order.status)}
                {order.status}
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-xl overflow-hidden">
                        <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <p className="font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">Alamat Pengiriman</p>
                  <p className="text-sm text-zinc-600 max-w-md">{order.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">Total Pembayaran</p>
                  <p className="text-2xl font-bold">Rp {order.total.toLocaleString('id-ID')}</p>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="bg-zinc-50 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-medium">Nomor Resi: <span className="font-bold">{order.trackingNumber}</span></span>
                  </div>
                  <button className="text-xs font-bold text-zinc-900 hover:underline">Lacak Paket</button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
