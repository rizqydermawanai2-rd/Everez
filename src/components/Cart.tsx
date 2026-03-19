import { CartItem } from '../types';
import { motion } from 'motion/react';
import { Trash, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
  onContinue: () => void;
  isGuest: boolean;
}

export default function Cart({ items, onRemove, onUpdateQty, onCheckout, onContinue, isGuest }: CartProps) {
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-zinc-300" />
        </div>
        <h2 className="text-3xl font-bold">Keranjang Kosong</h2>
        <p className="text-zinc-500">Sepertinya kamu belum menambahkan produk apapun ke keranjang.</p>
        <button 
          onClick={onContinue}
          className="bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-zinc-800 transition-all"
        >
          Mulai Belanja
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-8">
        <h2 className="text-4xl font-bold tracking-tight">Keranjang Belanja.</h2>
        <div className="space-y-6">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-6 p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="w-24 h-32 rounded-2xl overflow-hidden bg-zinc-50 flex-shrink-0">
                <img 
                  src={item.image || `https://picsum.photos/seed/${item.id}/200/300`} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">{item.category}</p>
                    <h3 className="text-xl font-bold">{item.name}</h3>
                  </div>
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 bg-zinc-50 p-1 rounded-xl border border-zinc-100">
                    <button 
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xl font-bold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50 space-y-6 sticky top-28">
          <h3 className="text-2xl font-bold">Ringkasan.</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Pengiriman</span>
              <span className="text-emerald-500 font-medium">Gratis</span>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
          >
            {isGuest ? 'Login untuk Checkout' : 'Checkout Sekarang'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          {isGuest && (
            <p className="text-[10px] text-zinc-400 text-center">
              * Kamu harus memiliki akun untuk melakukan pemesanan.
            </p>
          )}
          <button 
            onClick={onContinue}
            className="w-full text-zinc-500 font-medium hover:text-zinc-900 transition-colors"
          >
            Lanjut Belanja
          </button>
        </div>
      </div>
    </div>
  );
}
