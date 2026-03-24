import React, { useState } from 'react';
import { Product } from '../types';
import { motion } from 'motion/react';
import { ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight, Star, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBack: () => void;
}

export default function ProductDetail({ product, onAddToCart, onBack }: ProductDetailProps) {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Kembali ke Produk
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-zinc-100 relative group">
            <img 
              src={images[activeImageIdx]} 
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
          </div>
          
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
                  <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full uppercase tracking-wider">
                {product.category}
              </span>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold text-zinc-900">4.9</span>
                <span className="text-xs text-zinc-500 font-medium">(120 Ulasan)</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900">{product.name}</h1>
            <p className="text-3xl font-bold text-zinc-900">Rp {product.price.toLocaleString('id-ID')}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900">Deskripsi Produk</h3>
            <p className="text-zinc-600 leading-relaxed text-lg">
              {product.description || "Tidak ada deskripsi untuk produk ini."}
            </p>
          </div>

          <div className="space-y-6 pt-6 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Stok Tersedia</p>
                <p className={cn(
                  "text-lg font-bold",
                  product.stock < 10 ? "text-red-600" : "text-zinc-900"
                )}>
                  {product.stock} Pcs
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden">
                  <button className="px-4 py-2 hover:bg-zinc-50 transition-colors">-</button>
                  <span className="px-4 py-2 font-bold border-x border-zinc-200">1</span>
                  <button className="px-4 py-2 hover:bg-zinc-50 transition-colors">+</button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:bg-zinc-300 disabled:shadow-none"
            >
              <ShoppingCart className="w-6 h-6" />
              {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
            </button>
          </div>

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
