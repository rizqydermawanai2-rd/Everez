import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ShoppingCart, Box } from 'lucide-react';
import { cn, getImageUrl } from '../lib/utils';

interface BundleCarouselProps {
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export default function BundleCarousel({ onAddToCart, onProductClick }: BundleCarouselProps) {
  const [bundles, setBundles] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('isBundle', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setBundles(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (bundles.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % bundles.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bundles.length]);

  if (loading) return <div className="h-[400px] bg-zinc-100 rounded-[3rem] animate-pulse" />;
  if (bundles.length === 0) return null;

  const current = bundles[currentIndex];

  return (
    <div className="relative group pb-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-[3rem] overflow-hidden border border-zinc-200/60 shadow-2xl flex flex-col md:flex-row h-full md:h-[480px] cursor-pointer"
          onClick={() => onProductClick(current)}
        >
          <div className="w-full md:w-1/2 h-72 md:h-auto relative overflow-hidden">
            <img 
              src={getImageUrl(current.image)} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-8 left-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 border border-white/20 backdrop-blur-sm">
                <Box className="w-3.5 h-3.5" />
                Bundle Exclusive
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-[1px] bg-blue-600" />
                <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">{current.category}</p>
              </div>
              <h3 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 leading-[1.1] tracking-tighter">{current.name}</h3>
            </div>
            <p className="text-zinc-500 line-clamp-3 text-lg font-light leading-relaxed">
              {current.description}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-red-600 tracking-tighter">Rp {current.discountPrice?.toLocaleString('id-ID')}</span>
                <span className="text-sm text-zinc-400 line-through font-medium">Rp {current.price.toLocaleString('id-ID')}</span>
              </div>
              <div className="px-4 py-2 bg-red-50 text-red-600 text-xs font-black rounded-2xl border border-red-100">
                HEMAT {Math.round((1 - (current.discountPrice || 0) / current.price) * 100)}%
              </div>
            </div>
            <div className="pt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); onAddToCart(current); }}
                className="w-full md:w-fit px-10 bg-zinc-900 text-white py-5 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-zinc-300 active:scale-95"
              >
                <ShoppingCart className="w-5 h-5" />
                Dapatkan Sekarang
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {bundles.length > 1 && (
        <>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev === 0 ? bundles.length - 1 : prev - 1)); }}
              className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-xl border border-zinc-200/50 flex items-center justify-center text-zinc-900 shadow-2xl pointer-events-auto opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-90"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % bundles.length); }}
              className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-xl border border-zinc-200/50 flex items-center justify-center text-zinc-900 shadow-2xl pointer-events-auto opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-90"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-3">
            {bundles.map((_, idx) => (
              <button 
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  currentIndex === idx ? "w-10 bg-zinc-900" : "w-2 bg-zinc-300 hover:bg-zinc-400"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
