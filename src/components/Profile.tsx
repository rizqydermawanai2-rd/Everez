import React, { useState, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { motion } from 'motion/react';
import { Camera, MapPin, Phone, Home, User as UserIcon, Mail, Save, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onClose: () => void;
}

export default function Profile({ user, onUpdate, onClose }: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [city, setCity] = useState(user.city || '');
  const [address, setAddress] = useState(user.address || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);

    // Limit file size to 500KB for Firestore storage
    if (file.size > 500 * 1024) {
      setUploadError('File terlalu besar. Maksimal 500KB untuk foto profil.');
      return;
    }

    setUploading(true);
    
    try {
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.onprogress = (data) => {
          if (data.lengthComputable) {
            const progress = (data.loaded / data.total) * 100;
            setUploadProgress(Math.round(progress));
          }
        };
      });

      reader.readAsDataURL(file);
      const base64String = await base64Promise;
      
      setPhotoURL(base64String);
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Error processing photo:', error);
      setUploadError('Gagal memproses foto. Coba file lain.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadError(null);

    try {
      // 1. Update Auth Profile (only name, skip photoURL if it's a large Base64)
      if (auth.currentUser) {
        try {
          // Firebase Auth photoURL has a length limit (~2KB). 
          // Base64 is usually much larger, so we only save it to Firestore.
          await updateProfile(auth.currentUser, { 
            displayName: name
          });
        } catch (authError) {
          console.warn('Auth profile update failed:', authError);
        }
      }

      // 2. Update Firestore (Source of truth for our app)
      const updatedData: Partial<User> = {
        name,
        phone,
        city,
        address,
        photoURL
      };

      await updateDoc(doc(db, 'users', user.uid), updatedData);
      
      // 3. Update local state and close
      onUpdate({ ...user, ...updatedData });
      onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setUploadError('Gagal menyimpan perubahan. Silakan coba lagi.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Edit Profil</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-zinc-100 overflow-hidden border-4 border-white shadow-lg">
                  {photoURL ? (
                    <img src={photoURL} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="text-[10px] text-white font-bold">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-3 bg-zinc-900 text-white rounded-2xl shadow-lg hover:bg-zinc-800 transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              {uploadError ? (
                <p className="text-xs text-red-500 font-medium">{uploadError}</p>
              ) : (
                <p className="text-xs text-zinc-400">Klik ikon kamera untuk ganti foto</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Nama Lengkap" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="tel" 
                  placeholder="Nomor WA" 
                  required 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Asal Kota" 
                  required 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>

              <div className="relative">
                <Home className="absolute left-3 top-4 w-5 h-5 text-zinc-400" />
                <textarea 
                  placeholder="Alamat Lengkap" 
                  required 
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-[2] py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
