import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Order, User } from '../types';
import { motion } from 'motion/react';
import { Package, Truck, CheckCircle, Clock, Tag, Upload, Eye, X } from 'lucide-react';
import { cn, getImageUrl } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { useState, useEffect } from 'react';

interface MyOrdersProps {
  user: User;
  onProfileClick: () => void;
  onContinue: () => void;
}

export default function MyOrders({ user, onProfileClick, onContinue }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleUpdatePaymentProof = async (orderId: string, url: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentProofUrl: url
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

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
      {[1, 2].map(i => <div key={i} className="h-40 bg-zinc-100 rounded-[2rem] animate-pulse" />)}
    </div>;
  }

  if (orders.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto text-center py-20 space-y-6"
      >
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-12 h-12 text-zinc-300" />
        </div>
        <h2 className="text-3xl font-display font-bold">Belum Ada Pesanan.</h2>
        <p className="text-zinc-500">Kamu belum melakukan pembelian apapun.</p>
        <div className="flex justify-center">
          <button 
            onClick={onContinue}
            className="modern-button"
          >
            Mulai Belanja
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.h2 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl font-display font-bold tracking-tight flex justify-between items-center"
      >
        Pesanan Saya.
        <button onClick={onProfileClick} className="text-sm font-bold bg-zinc-900 text-white px-4 py-2 rounded-xl">Lihat Profil</button>
      </motion.h2>
      <div className="space-y-6">
        {orders.map((order, index) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="modern-card overflow-hidden"
          >
            <div className="p-6 flex flex-col md:flex-row justify-between gap-6 border-b border-zinc-100/50 bg-zinc-50/50">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Order ID: #{order.id.slice(-6)}</p>
                <p className="text-sm text-zinc-600 font-medium">{order.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm",
                order.status === 'Diproses' && "bg-blue-50 text-blue-600 border border-blue-100",
                order.status === 'Dikemas' && "bg-orange-50 text-orange-600 border border-orange-100",
                order.status === 'Dikirim' && "bg-purple-50 text-purple-600 border border-purple-100",
                order.status === 'Selesai' && "bg-emerald-50 text-emerald-600 border border-emerald-100",
              )}>
                {getStatusIcon(order.status)}
                {order.status}
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100">
                        <img src={getImageUrl(item.image) || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-zinc-900">{item.name} {item.selectedSize && `(${item.selectedSize})`}</p>
                        <p className="text-xs text-zinc-500 font-medium">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-zinc-900">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Alamat Pengiriman</p>
                    <p className="text-sm text-zinc-600 max-w-md font-medium">{order.address}</p>
                  </div>
                  {order.promoCode && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full w-fit">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Promo: {order.promoCode}</span>
                    </div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  {order.discountAmount && order.discountAmount > 0 && (
                    <p className="text-xs font-medium text-emerald-600">- Rp {order.discountAmount.toLocaleString('id-ID')}</p>
                  )}
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Total Pembayaran</p>
                  <p className="text-2xl font-display font-bold text-zinc-900">Rp {order.total.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {order.status === 'Diproses' && (
                <div className="pt-6 border-t border-zinc-100 space-y-4">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Upload className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">
                      {order.paymentProofUrl ? 'Bukti Pembayaran Terunggah' : 'Unggah Bukti Pembayaran'}
                    </h3>
                  </div>
                  <div className="max-w-xs">
                    <ImageUpload 
                      value={order.paymentProofUrl} 
                      onChange={(url) => handleUpdatePaymentProof(order.id, url)}
                      onRemove={() => handleUpdatePaymentProof(order.id, '')}
                      showCamera={false}
                      label="Unggah Bukti Transfer"
                      aspectRatio="video"
                    />
                  </div>
                  {order.paymentProofUrl && (
                    <button 
                      onClick={() => setSelectedImage(order.paymentProofUrl!)}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-900 hover:underline"
                    >
                      <Eye className="w-4 h-4" />
                      Lihat Bukti Pembayaran
                    </button>
                  )}
                </div>
              )}

              {order.trackingNumber && (
                <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-600">Nomor Resi: <span className="font-bold text-zinc-900">{order.trackingNumber}</span></span>
                  </div>
                  <button className="text-xs font-bold text-zinc-900 hover:underline">Lacak Paket</button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

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
    </div>
  );
}
