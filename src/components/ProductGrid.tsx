import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, limit as limitQuery, onSnapshot, where } from 'firebase/firestore';
import { Product } from '../types';
import { motion } from 'motion/react';
import { Plus, ShoppingCart } from 'lucide-react';

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
          transition={{ delay: index * 0.1 }}
          className="group cursor-pointer"
          onClick={() => onProductClick?.(product)}
        >
          <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100">
            <img 
              src={product.image || `https://picsum.photos/seed/${product.id}/600/800`} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="bg-white text-zinc-900 p-4 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
              >
                <ShoppingCart className="w-6 h-6" />
              </button>
            </div>
            {product.stock < 5 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Stok Terbatas
              </div>
            )}
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">{product.category}</p>
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-zinc-900 font-bold">Rp {product.price.toLocaleString('id-ID')}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
