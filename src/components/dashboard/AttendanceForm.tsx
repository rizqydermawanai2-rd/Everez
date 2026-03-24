import React, { useState, useRef, useEffect } from 'react';
import { db, storage, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, FileText, Upload, Loader2, X } from 'lucide-react';
import { User } from '../../types';
import { calculateAndUpdateAttendanceScore, hasCheckedInToday } from '../../services/attendanceService';

interface AttendanceFormProps {
  user: User;
  onSuccess?: () => void;
}

export default function AttendanceForm({ user, onSuccess }: AttendanceFormProps) {
  const [status, setStatus] = useState<'Hadir' | 'Izin' | 'Sakit'>('Hadir');
  const [photo, setPhoto] = useState<File | null>(null);
  const [sickNote, setSickNote] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkAttendance = async () => {
      const submitted = await hasCheckedInToday(user.uid);
      setHasSubmitted(submitted);
    };
    checkAttendance();
  }, [user.uid]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
  };

  useEffect(() => {
    if (isCameraActive) {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
          setIsCameraActive(false);
        }
      };
      initCamera();
    }
  }, [isCameraActive]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });
          setPhoto(file);
          setIsCameraActive(false);
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      }, 'image/jpeg');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting attendance...');
    setLoading(true);
    try {
      let photoUrl = '';
      let sickNoteUrl = '';

      if (photo) {
        const photoRef = ref(storage, `attendance/${user.uid}/${Date.now()}_photo.jpg`);
        await uploadBytes(photoRef, photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      if (sickNote) {
        const noteRef = ref(storage, `attendance/${user.uid}/${Date.now()}_note.pdf`);
        await uploadBytes(noteRef, sickNote);
        sickNoteUrl = await getDownloadURL(noteRef);
      }

      await addDoc(collection(db, 'attendance'), {
        userId: user.uid,
        userName: user.name, // Added userName for CEO report
        date: new Date().toISOString().split('T')[0],
        status,
        photoUrl,
        reason: status === 'Izin' ? reason : '',
        sickNoteUrl,
        createdAt: serverTimestamp()
      });

      await calculateAndUpdateAttendanceScore(user.uid);
      console.log('Attendance score updated');

      setHasSubmitted(true); // Update state
      if (onSuccess) onSuccess();
      console.log('Attendance submitted successfully');
      setPhoto(null);
      setSickNote(null);
      setReason('');
    } catch (error) {
      console.error('Attendance submission error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

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
          {photo ? (
            <div className="relative">
              <img src={URL.createObjectURL(photo)} alt="Captured" className="w-full rounded-xl" />
              <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
          ) : isCameraActive ? (
            <div className="space-y-2">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-zinc-900" />
              <button type="button" onClick={capturePhoto} className="w-full bg-zinc-900 text-white py-2 rounded-xl font-bold">Ambil Foto</button>
            </div>
          ) : (
            <button type="button" onClick={startCamera} className="w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 flex flex-col items-center gap-2">
              <Camera className="w-8 h-8" />
              <span>Buka Kamera</span>
            </button>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {status === 'Izin' && (
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan izin..." className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900" />
      )}

      {status === 'Sakit' && (
        <input type="file" accept="image/*,.pdf" onChange={(e) => setSickNote(e.target.files?.[0] || null)} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100" />
      )}

      <button type="submit" disabled={loading || (status === 'Hadir' && !photo)} className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50">
        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Kirim Absensi'}
      </button>
    </form>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
