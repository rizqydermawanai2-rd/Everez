import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { motion } from 'motion/react';
import { MapPin, Phone, Home, User as UserIcon, Save, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import ImageUpload from './ImageUpload';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onClose: () => void;
}

export default function Profile({ user, onUpdate, onClose }: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [city, setCity] = useState(user.city || '');
  const [district, setDistrict] = useState(user.district || '');
  const [postalCode, setPostalCode] = useState(user.postalCode || '');
  const [address, setAddress] = useState(user.address || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        district,
        postalCode,
        address,
        photoURL
      };

      if (user.approved === false) {
        await updateDoc(doc(db, 'pending_users', user.uid), updatedData);
      } else {
        await updateDoc(doc(db, 'users', user.uid), updatedData);
      }
      
      // 3. Update local state and close
      onUpdate({ ...user, ...updatedData });
      onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError('Gagal menyimpan perubahan. Silakan coba lagi.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-100"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-display font-bold tracking-tight">Edit Profil</h2>
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
              <div className="w-32 h-32">
                <ImageUpload
                  value={photoURL}
                  onChange={setPhotoURL}
                  onRemove={() => setPhotoURL('')}
                  folder={`profiles/${user.uid}`}
                  label="Foto Profil"
                  aspectRatio="square"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="relative w-full">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Nama Lengkap" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modern-input !pl-12"
                />
              </div>

              <div className="relative w-full">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="tel" 
                  placeholder="Nomor WA" 
                  required 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="modern-input !pl-12"
                />
              </div>

              <div className="relative w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Kecamatan" 
                  required 
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="modern-input !pl-12"
                />
              </div>

              <div className="relative w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Kota/Kabupaten" 
                  required 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="modern-input !pl-12"
                />
              </div>

              <div className="relative w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Kode Pos" 
                  required 
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="modern-input !pl-12"
                />
              </div>

              <div className="relative w-full">
                <Home className="absolute left-4 top-4 w-5 h-5 text-zinc-400" />
                <textarea 
                  placeholder="Alamat Jalan (Nama Jalan, RT/RW, No. Rumah)" 
                  required 
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="modern-input !pl-12 resize-y min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
              >
                Batal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="modern-button flex-[2] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Simpan Perubahan
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
