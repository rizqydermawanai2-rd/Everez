/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, updateDoc, onSnapshot, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { User, UserRole, Product, CartItem, Order } from './types';
import { handleFirestoreError, OperationType } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, LogOut, User as UserIcon, Package, LayoutDashboard, ShoppingBag, Menu, X, ChevronRight, Search, Filter, Plus, Edit, Trash, Truck, CheckCircle, Clock } from 'lucide-react';
import { cn } from './lib/utils';

// Components
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import MyOrders from './components/MyOrders';
import AdminProductionDashboard from './components/dashboard/AdminProductionDashboard';
import AdminPackingDashboard from './components/dashboard/AdminPackingDashboard';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import AdminSalesDashboard from './components/dashboard/AdminSalesDashboard';
import Profile from './components/Profile';
import { seedProducts } from './lib/seed';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [view, setView] = useState<'home' | 'products' | 'product_detail' | 'cart' | 'checkout' | 'orders' | 'admin_production' | 'admin_packing' | 'admin_sales' | 'super_admin' | 'login'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    seedProducts();
    let unsubscribeDoc: (() => void) | null = null;
    let unsubscribePending: (() => void) | null = null;

    const unsubscribeConfig = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        setConfig(snapshot.docs[0].data());
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous document listener if any
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      if (unsubscribePending) {
        unsubscribePending();
        unsubscribePending = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            const isSuperAdminEmail = ["rizqydermawanai2@gmail.com", "rizqydermawanai@gmail.com"].includes(firebaseUser.email || '');
            
            if (isSuperAdminEmail && userData.role !== 'super_admin') {
              userData.role = 'super_admin';
              await updateDoc(userDocRef, { role: 'super_admin' });
            }
            
            setUser(userData);
            
            if (userData.approved !== false || userData.role === 'customer' || userData.role === 'super_admin') {
              if (userData.role === 'admin_production') setView('admin_production');
              else if (userData.role === 'admin_packing') setView('admin_packing');
              else if (userData.role === 'admin_sales') setView('admin_sales');
              else if (userData.role === 'super_admin') setView('super_admin');
              else if (userData.role === 'customer') {
                setView(prev => prev === 'login' ? 'home' : prev);
              }
            }
          } else {
            const pendingDocRef = doc(db, 'pending_users', firebaseUser.uid);
            
            // Listen to pending_users collection
            unsubscribePending = onSnapshot(pendingDocRef, (pendingSnap) => {
              if (pendingSnap.exists()) {
                setUser(pendingSnap.data() as User);
                setLoading(false);
              } else {
                // If not in pending_users either, check if it's a new Google/SuperAdmin user
                const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
                const isSuperAdminEmail = ["rizqydermawanai2@gmail.com", "rizqydermawanai@gmail.com"].includes(firebaseUser.email || '');
                
                if (isGoogle || isSuperAdminEmail) {
                  const newUser: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    role: isSuperAdminEmail ? 'super_admin' : 'customer',
                  };
                  setDoc(userDocRef, newUser).then(() => {
                    setUser(newUser);
                    if (newUser.role === 'super_admin') setView('super_admin');
                  }).catch(err => {
                    console.error("Error creating new user:", err);
                  });
                } else {
                  // If not a new Google/SuperAdmin user and not in either collection, they might have been deleted
                  // or the registration process hasn't completed yet.
                  // We don't log them out immediately to allow the registration process to finish.
                  if (!user) {
                    setLoading(false);
                  }
                }
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `pending_users/${firebaseUser.uid}`);
            });
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfig();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribePending) unsubscribePending();
    };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    
    if (user && user.role !== 'customer') {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      const start = config?.workingHours?.start || '08:00';
      const end = config?.workingHours?.end || '17:00';
      
      if (currentTime >= start && currentTime <= end) {
        setLogoutMessage('Selamat istirahat sejenak...');
      } else {
        setLogoutMessage('Semoga hari kerja hari ini bermakna...');
      }
    } else if (user && user.role === 'customer') {
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid),
          limit(1)
        );
        const ordersSnap = await getDocs(ordersQuery);
        
        if (!ordersSnap.empty) {
          setLogoutMessage('Terimakasih telah berbelanja pada kami');
        } else {
          setLogoutMessage('Selamat berbelanja kembali');
        }
      } catch (error) {
        console.error("Error checking orders:", error);
        setLogoutMessage('Selamat berbelanja kembali');
      }
    }
    
    setTimeout(async () => {
      await signOut(auth);
      setLogoutLoading(false);
      setLogoutMessage('');
      setView('login');
    }, 2000);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const isDashboardView = ['admin_production', 'admin_packing', 'admin_sales', 'super_admin'].includes(view);

  if (loading || logoutLoading) {
    const isCustomerLogout = logoutLoading && user?.role === 'customer';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            y: [0, -10, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2, 
            ease: "easeInOut" 
          }}
          className="relative"
        >
          {isCustomerLogout ? (
            <div className="relative flex flex-col items-center">
              <motion.div
                animate={{ 
                  x: [-15, 15, -15],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2, 
                  ease: "easeInOut" 
                }}
                className="text-zinc-900"
              >
                <ShoppingCart size={80} strokeWidth={1.5} />
              </motion.div>
              <div className="flex gap-4 mt-4">
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                  className="w-2.5 h-2.5 bg-zinc-900 rounded-full"
                />
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }}
                  className="w-2.5 h-2.5 bg-zinc-900 rounded-full"
                />
              </div>
            </div>
          ) : (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-900">
              <circle cx="12" cy="12" r="10" />
              <motion.path 
                d="M8 14s1.5 2 4 2 4-2 4-2" 
                animate={{ d: ["M8 14s1.5 2 4 2 4-2 4-2", "M8 15s1.5 3 4 3 4-3 4-3", "M8 14s1.5 2 4 2 4-2 4-2"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          )}
        </motion.div>
        {logoutLoading && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-bold text-zinc-900 text-center px-4"
          >
            {logoutMessage}
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Navbar 
        user={user} 
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        setView={setView} 
        currentView={view}
        onLogout={handleLogout}
        onLogin={() => setView('login')}
        onProfileClick={() => setShowProfile(true)}
      />

      <AnimatePresence>
        {showProfile && user && (
          <Profile 
            user={user} 
            onUpdate={(updatedUser) => setUser(updatedUser)} 
            onClose={() => setShowProfile(false)} 
          />
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto px-4 py-8">
        {user && user.role !== 'customer' && user.role !== 'super_admin' && user.approved === false ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-3xl font-bold tracking-tight">Menunggu Persetujuan.</h2>
              <p className="text-zinc-500">Akun admin Anda sedang ditinjau oleh Super Admin. Anda akan dapat mengakses dashboard setelah disetujui.</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
            >
              Keluar
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Auth 
                  onAuthSuccess={() => {
                    // Redirection is primarily handled by onAuthStateChanged
                    // Only redirect to cart if we are sure it's a customer with items
                    if (cart.length > 0 && user && user.role === 'customer') {
                      setView('cart');
                    }
                  }} 
                  onCancel={() => setView('home')}
                />
              </motion.div>
            )}

            {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <section className="relative h-[400px] rounded-3xl overflow-hidden bg-zinc-900 text-white flex items-center">
                <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/fashion/1920/1080')] bg-cover bg-center" />
                <div className="relative z-10 px-12 space-y-6 max-w-2xl">
                  <h1 className="text-6xl font-bold tracking-tight leading-tight">Everez.<br/>Bring The Hype.</h1>
                  <p className="text-zinc-300 text-lg">Koleksi eksklusif untuk gaya hidup modern. Kualitas premium, desain minimalis.</p>
                  <button 
                    onClick={() => setView('products')}
                    className="bg-white text-zinc-900 px-8 py-4 rounded-full font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 group"
                  >
                    Belanja Sekarang
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Produk Terbaru</h2>
                  <button onClick={() => setView('products')} className="text-zinc-500 hover:text-zinc-900 font-medium">Lihat Semua</button>
                </div>
                <ProductGrid 
                  limit={4} 
                  onAddToCart={addToCart} 
                  onProductClick={(p) => {
                    setSelectedProduct(p);
                    setView('product_detail');
                  }}
                  searchQuery={searchQuery}
                  categoryFilter={categoryFilter}
                />
              </section>
            </motion.div>
          )}

          {view === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h2 className="text-3xl font-bold">Semua Produk</h2>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Cari produk..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    />
                  </div>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none"
                  >
                    <option>Semua</option>
                    <option>Kaos</option>
                    <option>Hoodie</option>
                    <option>Lainnya</option>
                  </select>
                </div>
              </div>
              <ProductGrid 
                onAddToCart={addToCart} 
                onProductClick={(p) => {
                  setSelectedProduct(p);
                  setView('product_detail');
                }}
                searchQuery={searchQuery} 
                categoryFilter={categoryFilter}
              />
            </motion.div>
          )}

          {view === 'product_detail' && selectedProduct && (
            <ProductDetail 
              product={selectedProduct} 
              onAddToCart={addToCart} 
              onBack={() => setView('products')} 
            />
          )}

          {view === 'cart' && (
            <Cart 
              items={cart} 
              onRemove={removeFromCart} 
              onUpdateQty={updateQuantity} 
              isGuest={!user}
              onCheckout={() => {
                if (!user) {
                  setView('login');
                } else {
                  setView('checkout');
                }
              }}
              onContinue={() => setView('products')}
            />
          )}

          {view === 'checkout' && (
            <Checkout 
              items={cart} 
              user={user} 
              onSuccess={() => {
                clearCart();
                setView('orders');
              }}
              onCancel={() => setView('cart')}
            />
          )}

          {view === 'orders' && user && <MyOrders user={user} />}

          {view === 'admin_production' && user?.role === 'admin_production' && user.approved !== false && <AdminProductionDashboard onViewWebsite={() => setView('home')} />}
          {view === 'admin_packing' && user?.role === 'admin_packing' && user.approved !== false && <AdminPackingDashboard onViewWebsite={() => setView('home')} />}
          {view === 'admin_sales' && user?.role === 'admin_sales' && user.approved !== false && <AdminSalesDashboard user={user} onViewWebsite={() => setView('home')} />}
          {view === 'super_admin' && user?.role === 'super_admin' && <SuperAdminDashboard onViewWebsite={() => setView('home')} />}
        </AnimatePresence>
        )}
      </main>

      {!isDashboardView && (
        <footer className="bg-white border-t border-zinc-100 py-12">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Everez.</h3>
              <p className="text-zinc-500">Pakaian berkualitas tinggi untuk mereka yang menghargai gaya dan kenyamanan.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Belanja</h4>
              <ul className="space-y-2 text-zinc-500">
                <li><button onClick={() => setView('products')}>Semua Produk</button></li>
                <li><button onClick={() => { setCategoryFilter('Kaos'); setView('products'); }}>Kaos</button></li>
                <li><button onClick={() => { setCategoryFilter('Hoodie'); setView('products'); }}>Hoodie</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Bantuan</h4>
              <ul className="space-y-2 text-zinc-500">
                <li>Kontak Kami</li>
                <li>Pengiriman</li>
                <li>Pengembalian</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ikuti Kami</h4>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200 cursor-pointer transition-colors">IG</div>
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200 cursor-pointer transition-colors">TW</div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
