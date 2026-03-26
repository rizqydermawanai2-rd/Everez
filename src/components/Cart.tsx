import { useState } from 'react';
import { CartItem, PromoCode } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trash, Plus, Minus, ArrowRight, ShoppingBag, Tag, X } from 'lucide-react';
import { getImageUrl } from '../lib/utils';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string, selectedSize?: string) => void;
  onUpdateQty: (id: string, delta: number, selectedSize?: string) => void;
  onCheckout: () => void;
  onContinue: () => void;
  isGuest: boolean;
  appliedPromo: PromoCode | null;
  onApplyPromo: (promo: PromoCode | null) => void;
}

export default function Cart({ items, onRemove, onUpdateQty, onCheckout, onContinue, isGuest, appliedPromo, onApplyPromo }: CartProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    
    if (appliedPromo.minPurchase && subtotal < appliedPromo.minPurchase) {
      return 0;
    }

    let discount = 0;
    if (appliedPromo.discountType === 'percentage') {
      discount = (subtotal * appliedPromo.discountValue) / 100;
      if (appliedPromo.maxDiscount && discount > appliedPromo.maxDiscount) {
        discount = appliedPromo.maxDiscount;
      }
    } else {
      discount = appliedPromo.discountValue;
    }

    return Math.min(discount, subtotal);
  };

  const discountAmount = calculateDiscount();
  const total = subtotal - discountAmount;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    
    setIsVerifying(true);
    setPromoError('');
    
    try {
      const q = query(collection(db, 'promo_codes'), where('code', '==', promoInput.toUpperCase()), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPromoError('Kode promo tidak valid atau sudah tidak aktif.');
      } else {
        const promo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PromoCode;
        
        // Check expiry
        if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
          setPromoError('Kode promo sudah kadaluarsa.');
        } 
        // Check usage limit
        else if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
          setPromoError('Batas penggunaan kode promo sudah habis.');
        }
        // Check min purchase
        else if (promo.minPurchase && subtotal < promo.minPurchase) {
          setPromoError(`Minimal belanja Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk menggunakan kode ini.`);
        }
        else {
          onApplyPromo(promo);
          setPromoInput('');
        }
      }
    } catch (err) {
      setPromoError('Terjadi kesalahan saat memverifikasi kode.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-20 space-y-6"
      >
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-zinc-300" />
        </div>
        <h2 className="text-3xl font-display font-bold">Keranjang Kosong</h2>
        <p className="text-zinc-500">Sepertinya kamu belum menambahkan produk apapun ke keranjang.</p>
        <div className="flex justify-center">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onContinue}
            className="modern-button"
          >
            Mulai Belanja
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-8">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-display font-bold tracking-tight"
        >
          Keranjang Belanja.
        </motion.h2>
        <div className="space-y-6">
          {items.map((item, index) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="modern-card flex gap-6 p-6"
            >
              <div className="w-24 h-32 rounded-2xl overflow-hidden bg-zinc-50 flex-shrink-0">
                <img 
                  src={getImageUrl(item.image) || `https://picsum.photos/seed/${item.id}/200/300`} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">{item.category}</p>
                    <h3 className="text-xl font-display font-bold">{item.name}</h3>
                    {item.selectedSize && (
                      <p className="text-sm font-bold text-zinc-500 mt-1">Ukuran: {item.selectedSize}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onRemove(item.id, item.selectedSize)}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 bg-zinc-50 p-1 rounded-xl border border-zinc-200/50">
                    <button 
                      onClick={() => onUpdateQty(item.id, -1, item.selectedSize)}
                      className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQty(item.id, 1, item.selectedSize)}
                      className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
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

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8"
      >
        <div className="modern-card p-8 space-y-6 sticky top-28">
          <h3 className="text-2xl font-display font-bold">Ringkasan.</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Kode Promo</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Masukkan kode..." 
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  className="flex-1 p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 font-bold tracking-widest"
                />
                <button 
                  onClick={handleApplyPromo}
                  disabled={isVerifying || !promoInput.trim()}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {isVerifying ? '...' : 'Gunakan'}
                </button>
              </div>
              {promoError && <p className="text-[10px] text-red-500 font-medium ml-1">{promoError}</p>}
            </div>

            {appliedPromo && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">{appliedPromo.code}</p>
                    <p className="text-[10px] text-emerald-600">Terpasang</p>
                  </div>
                </div>
                <button onClick={() => onApplyPromo(null)} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Subtotal</span>
              <span className="text-zinc-900">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Diskon Promo</span>
                <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Pengiriman</span>
              <span className="text-emerald-500 font-bold">Gratis</span>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-lg font-bold text-zinc-500">Total</span>
              <span className="text-3xl font-display font-bold text-zinc-900">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCheckout}
            className="modern-button w-full flex items-center justify-center gap-2 group"
          >
            {isGuest ? 'Login untuk Checkout' : 'Checkout Sekarang'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          {isGuest && (
            <p className="text-xs text-zinc-500 text-center font-medium">
              * Kamu harus memiliki akun untuk melakukan pemesanan.
            </p>
          )}
          <div className="text-center">
            <button 
              onClick={onContinue}
              className="text-zinc-500 font-bold hover:text-zinc-900 transition-colors"
            >
              Lanjut Belanja
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
