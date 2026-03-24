import React, { useState, FormEvent } from 'react';
import { auth, db, handleFirestoreError, OperationType, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { User as UserIcon, Mail, Lock, ArrowLeft, MapPin, Phone, Home } from 'lucide-react';

interface AuthProps {
  onAuthSuccess?: () => void;
  onCancel?: () => void;
}

export default function Auth({ onAuthSuccess, onCancel }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        
        const userData = {
          uid: user.uid,
          email,
          name,
          role,
          address,
          phone,
          city,
          approved: role === 'customer' ? true : false,
        };

        if (role === 'customer') {
          await setDoc(doc(db, 'users', user.uid), userData);
        } else {
          await setDoc(doc(db, 'pending_users', user.uid), userData);
        }
      }
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}`);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-xl shadow-zinc-200/50 overflow-hidden"
      >
        <div className="p-8 space-y-8">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="absolute top-6 left-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
          )}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-display font-bold tracking-tight">Everez.</h1>
            <p className="text-zinc-500">{isLogin ? 'Selamat datang kembali' : 'Buat akun baru'}</p>
          </div>

          <div className="flex p-1 bg-zinc-100/80 rounded-2xl backdrop-blur-sm">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                isLogin ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Masuk
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                !isLogin ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Daftar
            </button>
          </div>

          <div className="space-y-4">
            {(!(!isLogin && role !== 'customer')) && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 border border-zinc-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all disabled:opacity-50 shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {isLogin ? 'Masuk dengan Google' : 'Daftar dengan Google'}
              </motion.button>
            )}

            {(!(!isLogin && role !== 'customer')) && (
              <div className="relative flex items-center gap-4 py-2">
                <div className="flex-1 h-[1px] bg-zinc-100" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">atau</span>
                <div className="flex-1 h-[1px] bg-zinc-100" />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4">
                <div className="flex p-1 bg-zinc-100 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setRole('customer')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      role === 'customer' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    )}
                  >
                    Pelanggan
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('admin_production')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      role !== 'customer' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    )}
                  >
                    Admin
                  </button>
                </div>

                {role !== 'customer' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Tipe Admin</label>
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-sm font-medium"
                    >
                      <option value="admin_production">Admin Produksi</option>
                      <option value="admin_packing">Admin Packing</option>
                      <option value="admin_sales">Admin Sales</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
                  <UserIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Nama Lengkap" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-sm font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
                  <Phone className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  <input 
                    type="tel" 
                    placeholder="Nomor WA (Contoh: 08123456789)" 
                    required 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-sm font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
                  <MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Asal Kota" 
                    required 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-sm font-medium"
                  />
                </div>

                <div className="flex items-start gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
                  <Home className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                  <textarea 
                    placeholder={role === 'customer' ? "Alamat Lengkap" : "Alamat"} 
                    required 
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-sm font-medium resize-y min-h-[100px]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
              <Mail className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              <input 
                type="email" 
                placeholder="Email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-sm font-medium"
              />
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900/20 transition-all duration-200">
              <Lock className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-sm font-medium"
              />
            </div>

            {error && <p className="text-red-500 text-xs text-center font-medium bg-red-50 p-3 rounded-xl">{error}</p>}

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="modern-button w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isLogin ? 'Masuk Sekarang' : 'Buat Akun'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
