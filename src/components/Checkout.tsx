import React, { useState, FormEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CartItem, User } from '../types';
import { motion } from 'motion/react';
import { CreditCard, MapPin, Truck, CheckCircle, ArrowLeft } from 'lucide-react';

interface CheckoutProps {
  items: CartItem[];
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Checkout({ items, user, onSuccess, onCancel }: CheckoutProps) {
  const [address, setAddress] = useState(user.address || '');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [loading, setLoading] = useState(false);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'orders'), {
        customerId: user.uid,
        items,
        total,
        status: 'Diproses',
        address,
        paymentMethod,
        createdAt: serverTimestamp(),
      });
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-white rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-4xl font-bold tracking-tight">Checkout.</h2>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-400">
              <MapPin className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Alamat Pengiriman</h3>
            </div>
            <textarea 
              required
              placeholder="Masukkan alamat lengkap pengiriman..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-6 bg-white border border-zinc-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[150px]"
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-400">
              <CreditCard className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Metode Pembayaran</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Transfer Bank', 'E-Wallet', 'COD'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all ${
                    paymentMethod === method 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                      : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-6">
            <h3 className="text-2xl font-bold">Ringkasan Pesanan.</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 font-bold text-xs">{item.quantity}x</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-zinc-100 space-y-4">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Biaya Layanan</span>
                <span>Rp 2.000</span>
              </div>
              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold">Total Bayar</span>
                <span className="text-2xl font-bold">Rp {(total + 2000).toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button 
              disabled={loading}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Buat Pesanan
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
