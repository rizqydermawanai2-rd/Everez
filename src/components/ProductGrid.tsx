import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, limit as limitQuery, onSnapshot, where } from 'firebase/firestore';
import { Product } from '../types';
import { motion } from 'motion/react';
import { Plus, ShoppingCart } from 'lucide-react';
import { getImageUrl } from '../lib/utils';

interface ProductGridProps {
  limit?: number;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  searchQuery: string;
  categoryFilter: string;
}

export default function ProductGrid({ limit, onAddToCart, onProductClick, searchQuery, categoryFilter }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'products'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
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
    return matchesSearch && matchesCategory;
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
          <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 shadow-sm group-hover:shadow-xl transition-all duration-500">
            <img 
              src={getImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/600/800`} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
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
            <p className="text-zinc-900 font-bold text-lg">Rp {product.price.toLocaleString('id-ID')}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
