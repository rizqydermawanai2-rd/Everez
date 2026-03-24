import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../../types';
import { calculateAndUpdateAttendanceScore, hasCheckedInToday } from '../../services/attendanceService';
import ImageUpload from '../ImageUpload';
import { Loader2 } from 'lucide-react';

interface AttendanceFormProps {
  user: User;
  onSuccess?: (record?: any) => void;
}

export default function AttendanceForm({ user, onSuccess }: AttendanceFormProps) {
  const [status, setStatus] = useState<'Hadir' | 'Izin' | 'Sakit'>('Hadir');
  const [photoUrl, setPhotoUrl] = useState('');
  const [sickNoteUrl, setSickNoteUrl] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Hide attendance form for CEO and Admin roles
  const isAdminOrCEO = ['admin_production', 'admin_packing', 'admin_sales', 'ceo', 'vice_ceo', 'super_admin'].includes(user.role);

  useEffect(() => {
    if (isAdminOrCEO) return;
    const checkAttendance = async () => {
      const submitted = await hasCheckedInToday(user.uid);
      setHasSubmitted(submitted);
    };
    checkAttendance();
  }, [user.uid, isAdminOrCEO]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const record = {
        userId: user.uid,
        userName: user.name,
        date: new Date().toISOString().split('T')[0],
        status,
        photoUrl,
        reason: status === 'Izin' ? reason : '',
        sickNoteUrl,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'attendance'), {
        ...record,
        createdAt: serverTimestamp()
      });

      await calculateAndUpdateAttendanceScore(user.uid);
      setHasSubmitted(true);
      if (onSuccess) onSuccess(record);
      setPhotoUrl('');
      setSickNoteUrl('');
      setReason('');
    } catch (error) {
      console.error('Attendance submission error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  if (isAdminOrCEO) {
    return null;
  }

  if (hasSubmitted) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm text-center">
        <h3 className="text-lg font-bold text-zinc-900">Anda sudah mengisi kehadiran hari ini.</h3>
        <p className="text-zinc-600 mt-2">Terima kasih telah melakukan absensi.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4">
      <h3 className="text-lg font-bold">Absensi Hari Ini</h3>
      <div className="flex gap-2">
        {(['Hadir', 'Izin', 'Sakit'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium", status === s ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600")}
          >
            {s}
          </button>
        ))}
      </div>

      {status === 'Hadir' && (
        <div className="space-y-2">
          <ImageUpload
            value={photoUrl}
            onChange={setPhotoUrl}
            onRemove={() => setPhotoUrl('')}
            folder={`attendance/${user.uid}`}
            label="Ambil Foto Kehadiran"
            showCamera={true}
            aspectRatio="video"
          />
        </div>
      )}

      {status === 'Izin' && (
        <textarea 
          value={reason} 
          onChange={(e) => setReason(e.target.value)} 
          placeholder="Alasan izin..." 
          className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[120px] resize-none" 
        />
      )}

      {status === 'Sakit' && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Unggah Surat Keterangan Sakit</p>
          <ImageUpload
            value={sickNoteUrl}
            onChange={setSickNoteUrl}
            onRemove={() => setSickNoteUrl('')}
            folder={`attendance/${user.uid}/notes`}
            label="Unggah Surat Sakit"
            aspectRatio="portrait"
          />
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading || (status === 'Hadir' && !photoUrl) || (status === 'Sakit' && !sickNoteUrl) || (status === 'Izin' && !reason)} 
        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Absensi'}
      </button>
    </form>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
