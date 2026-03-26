import React, { useState, useEffect, FormEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { CartItem, User, PromoCode, PaymentMethod, ShippingPromo } from '../types';
import { motion } from 'motion/react';
import { CreditCard, MapPin, CheckCircle, ArrowLeft, Tag, Upload, Loader2, Truck } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { fetchShippingCost, DEFAULT_COURIER, STORE_CITY } from '../services/shippingService';
import { cn } from '../lib/utils';

interface CheckoutProps {
  items: CartItem[];
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
  appliedPromo: PromoCode | null;
}

export default function Checkout({ items, user, onSuccess, onCancel, appliedPromo }: CheckoutProps) {
  const [address, setAddress] = useState(user.address || '');
  const [district, setDistrict] = useState(user.district || '');
  const [city, setCity] = useState(user.city || '');
  const [postalCode, setPostalCode] = useState(user.postalCode || '');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingPromos, setShippingPromos] = useState<ShippingPromo[]>([]);
  const [storeCity, setStoreCity] = useState(STORE_CITY);

  useEffect(() => {
    const q = collection(db, 'settings');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.storeCity) setStoreCity(data.storeCity);
      }
    }, (error) => console.error('Error fetching settings:', error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = collection(db, 'payment_methods');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPaymentMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payment_methods'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = collection(db, 'shipping_promos');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShippingPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShippingPromo)).filter(p => p.isActive));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shipping_promos'));
    return () => unsubscribe();
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalWeight = items.reduce((acc, item) => acc + (item.weight || 0) * item.quantity, 0);
  
  useEffect(() => {
    const calculateShipping = async () => {
      setIsCalculatingShipping(true);
      try {
        // Use city from local state as destination
        const cost = await fetchShippingCost(city || '', totalWeight);
        setShippingCost(cost);
      } catch (error) {
        console.error('Error calculating shipping:', error);
        // Fallback to basic calculation
        setShippingCost(Math.max(10000, Math.ceil(totalWeight / 1000) * 10000));
      } finally {
        setIsCalculatingShipping(false);
      }
    };
    calculateShipping();
  }, [city, totalWeight]);

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

  const calculateShippingDiscount = () => {
    const applicablePromo = shippingPromos
      .filter(p => p.isActive && subtotal >= p.minPurchase)
      .sort((a, b) => {
        // Sort by highest discount value
        const valA = a.discountType === 'free' ? shippingCost : a.discountType === 'percentage' ? (shippingCost * a.discountValue / 100) : a.discountValue;
        const valB = b.discountType === 'free' ? shippingCost : b.discountType === 'percentage' ? (shippingCost * b.discountValue / 100) : b.discountValue;
        return valB - valA;
      })[0];

    if (!applicablePromo) return { amount: 0, promo: null };

    let discount = 0;
    if (applicablePromo.discountType === 'free') {
      discount = shippingCost;
    } else if (applicablePromo.discountType === 'percentage') {
      discount = (shippingCost * applicablePromo.discountValue) / 100;
    } else {
      discount = applicablePromo.discountValue;
    }

    return { amount: Math.min(discount, shippingCost), promo: applicablePromo };
  };

  const discountAmount = calculateDiscount();
  const { amount: shippingDiscountAmount, promo: appliedShippingPromo } = calculateShippingDiscount();
  const serviceFee = 2000;
  const total = subtotal - discountAmount + serviceFee + (shippingCost - shippingDiscountAmount);

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethod || !paymentProofUrl) {
      alert("Silakan pilih metode pembayaran dan unggah bukti transfer.");
      return;
    }
    setLoading(true);

    try {
      const fullAddress = `${address}, Kec. ${district}, ${city}, ${postalCode}`;

      await addDoc(collection(db, 'orders'), {
        customerId: user.uid,
        customerName: user.name,
        items,
        subtotal,
        discountAmount,
        shippingCost,
        shippingDiscountAmount,
        shippingPromoId: appliedShippingPromo?.id || null,
        totalWeight,
        promoCode: appliedPromo?.code || null,
        total,
        status: 'Diproses',
        approvalStatus: 'pending',
        address: fullAddress,
        paymentMethod: selectedPaymentMethod.name,
        paymentProofUrl,
        createdAt: serverTimestamp(),
      });

      if (appliedPromo) {
        await updateDoc(doc(db, 'promo_codes', appliedPromo.id), {
          usageCount: increment(1)
        });
      }

      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12"
    >
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-white rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-4xl font-display font-bold tracking-tight">Checkout.</h2>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-400">
              <MapPin className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Alamat Pengiriman</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <textarea 
                  required
                  placeholder="Alamat Jalan (Nama Jalan, RT/RW, No. Rumah)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="modern-input min-h-[100px] resize-y w-full"
                />
              </div>
              <div>
                <input 
                  type="text"
                  required
                  placeholder="Kecamatan"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="modern-input w-full"
                />
              </div>
              <div>
                <input 
                  type="text"
                  required
                  placeholder="Kota/Kabupaten"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="modern-input w-full"
                />
              </div>
              <div className="md:col-span-2">
                <input 
                  type="text"
                  required
                  placeholder="Kode Pos"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="modern-input w-full"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 text-zinc-400">
              <CreditCard className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-xs">Metode Pembayaran</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {paymentMethods.map((method) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all flex items-center gap-3 ${
                    selectedPaymentMethod?.id === method.id 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/20' 
                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {method.iconUrl && <img src={method.iconUrl} className="w-8 h-8 rounded-full" />}
                  <div>
                    <p>{method.name}</p>
                    <p className="text-xs opacity-70">
                      {method.type === 'bank' ? method.accountNumber : 
                       method.type === 'e-wallet' ? method.phoneNumber : 
                       'QRIS'}
                    </p>
                    {method.qrisBarcodeUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest">QRIS:</p>
                        <img src={method.qrisBarcodeUrl} alt="QRIS" className="w-24 h-24 mt-1" />
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          {selectedPaymentMethod && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-zinc-400">
                <Upload className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-xs">Unggah Bukti Transfer</h3>
              </div>
              <ImageUpload 
                value={paymentProofUrl} 
                onChange={setPaymentProofUrl} 
                onRemove={() => setPaymentProofUrl('')}
                showCamera={false}
                label="Unggah Bukti Transfer"
              />
            </section>
          )}
        </div>

        <div className="space-y-8">
          <div className="modern-card p-8 space-y-6">
            <h3 className="text-2xl font-display font-bold">Ringkasan Pesanan.</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item) => (
                <div key={`${item.id}-${item.selectedSize || ''}`} className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <span className="text-zinc-400 font-bold text-xs bg-zinc-100 px-2 py-1 rounded-md mt-0.5">{item.quantity}x</span>
                    <div>
                      <span className="font-medium text-zinc-700 block">{item.name}</span>
                      {item.selectedSize && (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ukuran: {item.selectedSize}</span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 mt-0.5">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-zinc-100 space-y-4">
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Subtotal</span>
                <span className="text-zinc-900">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Diskon Promo ({appliedPromo?.code})</span>
                  </div>
                  <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Biaya Layanan</span>
                <span className="text-zinc-900">Rp {serviceFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>Ongkos Kirim ({DEFAULT_COURIER})</span>
                    {isCalculatingShipping && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 italic">
                    Dari: {storeCity} • Tujuan: {city || 'Belum diatur'} • {(totalWeight / 1000).toFixed(2)} kg
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn("text-zinc-900 transition-opacity", isCalculatingShipping ? "opacity-50" : "opacity-100")}>
                    Rp {shippingCost.toLocaleString('id-ID')}
                  </span>
                  {shippingDiscountAmount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      - Rp {shippingDiscountAmount.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold text-zinc-500">Total Bayar</span>
                <span className="text-3xl font-display font-bold text-zinc-900">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="modern-button w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Buat Pesanan
                </>
              )}
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
