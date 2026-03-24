import { ShoppingBag, ShoppingCart, User as UserIcon, LogOut, LayoutDashboard, Package, Menu, X } from 'lucide-react';
import { User } from '../types';
import { cn, getImageUrl } from '../lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: User | null;
  cartCount: number;
  setView: (view: any) => void;
  currentView: string;
  onLogout: () => void;
  onLogin: () => void;
  onProfileClick: () => void;
}

export default function Navbar({ user, cartCount, setView, currentView, onLogout, onLogin, onProfileClick }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: ShoppingBag, hide: user && user.role !== 'customer' && user.role !== 'super_admin' },
    { id: 'products', label: 'Produk', icon: Package, hide: user && user.role !== 'customer' && user.role !== 'super_admin' },
    { id: 'orders', label: 'Pesanan Saya', icon: Package, hide: !user || user.role !== 'customer' },
    { id: 'admin_production', label: 'Produksi', icon: LayoutDashboard, hide: !user || user.role !== 'admin_production' },
    { id: 'admin_packing', label: 'Packing', icon: LayoutDashboard, hide: !user || user.role !== 'admin_packing' },
    { id: 'admin_sales', label: 'Sales', icon: LayoutDashboard, hide: !user || user.role !== 'admin_sales' },
    { id: 'super_admin', label: 'CEO', icon: LayoutDashboard, hide: !user || (user.role !== 'super_admin' && user.role !== 'vice_ceo') },
  ];

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (user && user.role !== 'customer' && user.role !== 'super_admin' && user.role !== 'vice_ceo') {
              if (user.role === 'admin_production') setView('admin_production');
              else if (user.role === 'admin_packing') setView('admin_packing');
              else if (user.role === 'admin_sales') setView('admin_sales');
            } else if (user && (user.role === 'super_admin' || user.role === 'vice_ceo')) {
              setView('super_admin');
            } else {
              setView('home');
            }
          }} 
          className="text-2xl font-display font-bold tracking-tighter"
        >
          Everez.
        </motion.button>

        <div className="hidden md:flex items-center gap-8">
          {navItems.filter(item => !item.hide).map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setView(item.id)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-zinc-900 relative",
                currentView === item.id ? "text-zinc-900" : "text-zinc-500"
              )}
            >
              {item.label}
              {currentView === item.id && (
                <div 
                  className="absolute -bottom-2 left-0 right-0 h-0.5 bg-zinc-900 rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {(!user || user.role === 'customer') && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('cart')}
              className="relative p-2.5 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          )}
          
          <div className="h-8 w-[1px] bg-zinc-200 mx-2 hidden md:block" />
          
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <button 
                  onClick={onProfileClick}
                  className="flex items-center gap-3 hover:bg-zinc-100 p-1.5 pr-3 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center">
                    {user.photoURL ? (
                      <img src={getImageUrl(user.photoURL)} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold group-hover:text-zinc-900 transition-colors">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{user.role === 'super_admin' ? 'CEO' : user.role === 'vice_ceo' ? 'Wakil CEO' : user.role.replace('admin_', 'Admin ')}</p>
                  </div>
                </button>
                <div className="h-6 w-[1px] bg-zinc-200" />
                <button 
                  onClick={onLogout}
                  className="p-2 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogin}
                className="modern-button py-2 px-5 text-sm"
              >
                Login
              </motion.button>
            )}
          </div>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-zinc-100 rounded-full"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-100 bg-white overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {navItems.filter(item => !item.hide).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setIsMenuOpen(false); }}
                  className="w-full text-left py-2 text-zinc-500 font-medium"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                {user ? (
                  <>
                    <button 
                      onClick={() => { onProfileClick(); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 py-2 w-full text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center">
                        {user.photoURL ? (
                          <img src={getImageUrl(user.photoURL)} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">{user.role === 'super_admin' ? 'CEO' : user.role === 'vice_ceo' ? 'Wakil CEO' : user.role}</p>
                      </div>
                    </button>
                    <button onClick={onLogout} className="text-red-500 font-medium">Logout</button>
                  </>
                ) : (
                  <button 
                    onClick={() => { onLogin(); setIsMenuOpen(false); }} 
                    className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
