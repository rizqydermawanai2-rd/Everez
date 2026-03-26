import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, limit as limitQuery, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShoppingCart, Box, Loader2, ChevronRight } from 'lucide-react';
import { cn, getImageUrl } from '../lib/utils';

interface BundleSlideshowProps {
  product: Product;
}

function BundleSlideshow({ product }: BundleSlideshowProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (product.bundleItems && product.bundleItems.length > 0) {
        setLoading(true);
        try {
          const fetched: Product[] = [];
          for (const id of product.bundleItems) {
            const snap = await getDoc(doc(db, 'products', id));
            if (snap.exists()) {
              fetched.push({ id: snap.id, ...snap.data() } as Product);
            }
          }
          setItems(fetched);
        } catch (error) {
          console.error("Error fetching bundle slideshow items:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchItems();
  }, [product.bundleItems]);

  useEffect(() => {
    if (items.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, 5000); // Increased to 5 seconds for a more relaxed pace
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items.length]);

  const displayImages = items.length > 0 ? items.map(item => item.image) : [product.image];

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={getImageUrl(displayImages[currentIndex]) || `https://picsum.photos/seed/${product.id}/600/800`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }} // Smoother, longer cross-fade
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      {/* Hover Overlay: Show all products in bundle */}
      <AnimatePresence>
        {isHovered && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm p-4 flex flex-col justify-center gap-3 z-20"
          >
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Isi Paket Bundle</p>
            <div className="space-y-2 overflow-y-auto max-h-[80%] pr-1 custom-scrollbar">
              {items.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 bg-white/10 p-2 rounded-xl border border-white/5"
                >
                  <img src={getImageUrl(item.image)} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{item.category}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-auto pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white font-bold">
              <span>{items.length} Produk</span>
              <div className="flex items-center gap-1 text-blue-400">
                Lihat Detail <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideshow Indicators */}
      {items.length > 1 && !isHovered && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {items.map((_, idx) => (
            <div 
              key={idx} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                currentIndex === idx ? "w-4 bg-white" : "w-1 bg-white/40"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductGridProps {
  limit?: number;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  searchQuery: string;
  categoryFilter: string;
  isBundleOnly?: boolean;
}

export default function ProductGrid({ limit, onAddToCart, onProductClick, searchQuery, categoryFilter, isBundleOnly }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'products'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      console.log('Products:', items);
      setProducts(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'Semua' || p.category === categoryFilter;
    const matchesBundle = isBundleOnly === true ? p.isBundle === true : (isBundleOnly === false ? p.isBundle !== true : true);
    return matchesSearch && matchesCategory && matchesBundle;
  }).slice(0, limit || products.length);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-[3/4] bg-zinc-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Tidak ada produk ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {filteredProducts.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
          className="group cursor-pointer flex flex-col"
          onClick={() => onProductClick?.(product)}
        >
          <div className={cn(
            "relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 shadow-sm group-hover:shadow-xl transition-all duration-500",
            product.isBundle && "border-2 border-blue-100 shadow-blue-100/50"
          )}>
            {product.isBundle ? (
              <BundleSlideshow product={product} />
            ) : (
              <img 
                src={getImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/600/800`} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {product.isBundle ? (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1.5 border border-white/20">
                  <Box className="w-3 h-3" />
                  {product.bundleBadgeText || 'Bundle'}
                </div>
              ) : product.promoLabel && (
                <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                  {product.promoLabel}
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="bg-white text-zinc-900 p-4 rounded-full shadow-2xl transform translate-y-8 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center"
              >
                <ShoppingCart className="w-6 h-6" />
              </motion.button>
            </div>
            {product.stock < 5 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                Sisa {product.stock}
              </div>
            )}
          </div>
          <div className="mt-5 space-y-1.5 px-1">
            <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">{product.category}</p>
            <h3 className="font-display font-semibold text-lg leading-tight line-clamp-1 group-hover:text-zinc-600 transition-colors">{product.name}</h3>
            <div className="flex items-center gap-2">
              {product.discountPrice && product.discountPrice > 0 ? (
                <>
                  <p className="text-red-600 font-bold text-lg">Rp {product.discountPrice.toLocaleString('id-ID')}</p>
                  <p className="text-zinc-400 text-sm line-through">Rp {product.price.toLocaleString('id-ID')}</p>
                </>
              ) : (
                <p className="text-zinc-900 font-bold text-lg">Rp {product.price.toLocaleString('id-ID')}</p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
