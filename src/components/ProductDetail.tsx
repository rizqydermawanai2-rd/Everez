import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RefreshCw, Box, Loader2, X, Maximize2 } from 'lucide-react';
import { cn, getImageUrl } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBack: () => void;
}

export default function ProductDetail({ product, onAddToCart, onBack }: ProductDetailProps) {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  
  const hasSizes = product.sizes && Object.keys(product.sizes).length > 0;
  console.log('Product:', product);
  const availableSizes = hasSizes ? Object.entries(product.sizes || {}).filter(([_, stock]) => stock > 0).map(([size]) => size) : [];

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      alert('Silakan pilih ukuran terlebih dahulu');
      return;
    }
    onAddToCart({ ...product, selectedSize: selectedSize || undefined });
  };

  useEffect(() => {
    const fetchBundleItems = async () => {
      if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
        setLoadingBundle(true);
        try {
          const fetchedItems: Product[] = [];
          for (const itemId of product.bundleItems) {
            const docRef = doc(db, 'products', itemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              fetchedItems.push({ id: docSnap.id, ...docSnap.data() } as Product);
            }
          }
          setBundleProducts(fetchedItems);
        } catch (error) {
          console.error("Error fetching bundle items:", error);
        } finally {
          setLoadingBundle(false);
        }
      }
    };

    fetchBundleItems();
  }, [product.isBundle, product.bundleItems]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-zinc-900/90 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <motion.button 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </motion.button>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-4xl w-full aspect-square md:aspect-video rounded-[2rem] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={getImageUrl(previewImage)} 
                className="w-full h-full object-contain bg-zinc-950" 
                referrerPolicy="no-referrer" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group font-medium"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Kembali ke Produk
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="aspect-square rounded-[2.5rem] overflow-hidden bg-zinc-50 shadow-sm relative group"
          >
            <img 
              src={getImageUrl(images[activeImageIdx])} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setActiveImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-zinc-900 shadow-lg hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setActiveImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-zinc-900 shadow-lg hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </motion.div>
          
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={cn(
                    "aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                    activeImageIdx === idx ? "border-zinc-900" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`Gallery ${idx}`} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 bg-zinc-100 text-zinc-900 text-xs font-bold rounded-full uppercase tracking-widest">
                {product.category}
              </span>
              {product.promoLabel && (
                <span className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                  {product.promoLabel}
                </span>
              )}
              {product.isBundle && (
                <span className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                  {product.bundleBadgeText || 'Bundle'}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold text-amber-700">4.9</span>
                <span className="text-[10px] text-amber-600/80 font-medium uppercase tracking-wider">(120 Ulasan)</span>
              </div>
            </div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl md:text-5xl font-display font-bold tracking-tight text-zinc-900 leading-tight"
            >
              {product.name}
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-baseline gap-4"
            >
              {product.discountPrice && product.discountPrice > 0 ? (
                <>
                  <p className="text-4xl font-bold text-red-600">Rp {product.discountPrice.toLocaleString('id-ID')}</p>
                  <p className="text-xl text-zinc-400 line-through">Rp {product.price.toLocaleString('id-ID')}</p>
                </>
              ) : (
                <p className="text-4xl font-bold text-zinc-900">Rp {product.price.toLocaleString('id-ID')}</p>
              )}
            </motion.div>
          </div>

            {product.isBundle && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Box className="w-5 h-5" />
                    <h3 className="font-display font-bold text-lg">Isi Paket Bundle</h3>
                  </div>
                  {loadingBundle && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bundleProducts.length > 0 ? (
                    bundleProducts.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => setPreviewImage(item.image)}
                        className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-blue-100 shadow-sm group hover:shadow-md hover:border-blue-300 transition-all text-left w-full relative"
                      >
                        <div className="w-14 h-14 rounded-xl bg-zinc-50 overflow-hidden border border-zinc-100 shrink-0 relative">
                          <img 
                            src={getImageUrl(item.image) || `https://picsum.photos/seed/${item.id}/100/100`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{item.category}</p>
                        </div>
                      </button>
                    ))
                  ) : !loadingBundle && (
                    <p className="text-sm text-blue-600/60 italic">Memuat isi paket...</p>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-4"
            >
            <h3 className="font-display font-bold text-xl text-zinc-900">Deskripsi Produk</h3>
            <p className="text-zinc-500 leading-relaxed text-lg font-light">
              {product.description || "Tidak ada deskripsi untuk produk ini."}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-6 pt-8 border-t border-zinc-100"
          >
            {true && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-900">Pilih Ukuran</p>
                  <p className="text-xs text-zinc-500">
                    {selectedSize ? `Stok: ${product.sizes?.[selectedSize] || 0} Pcs` : 'Pilih ukuran untuk melihat stok'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'].map(size => {
                    const stock = product.sizes?.[size] || 0;
                    const isAvailable = stock > 0;
                    const isSelected = selectedSize === size;
                    
                    return (
                      <button
                        key={size}
                        disabled={!isAvailable}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "min-w-[3rem] h-12 px-4 rounded-xl font-bold text-sm transition-all border-2",
                          isSelected 
                            ? "border-zinc-900 bg-zinc-900 text-white" 
                            : isAvailable 
                              ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900" 
                              : "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Stok Total Tersedia</p>
                <p className={cn(
                  "text-xl font-bold",
                  product.stock < 10 ? "text-red-500" : "text-zinc-900"
                )}>
                  {product.stock} Pcs
                </p>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
              disabled={product.stock === 0 || (hasSizes && !selectedSize)}
              className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
            >
              <ShoppingCart className="w-6 h-6" />
              {product.stock === 0 ? 'Stok Habis' : hasSizes && !selectedSize ? 'Pilih Ukuran' : 'Tambah ke Keranjang'}
            </motion.button>
          </motion.div>

          {/* Features */}
          {product.features && product.features.some(f => f.enabled) && (
            <div className="grid grid-cols-2 gap-4 pt-8">
              {product.features.filter(f => f.enabled).map((feature, i) => {
                const Icon = {
                  warranty: ShieldCheck,
                  shipping: Truck,
                  return: RefreshCw,
                  quality: Star
                }[feature.id] || Star;

                return (
                  <div key={i} className="flex gap-3 p-4 rounded-2xl bg-white border border-zinc-100">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{feature.title}</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-2">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
