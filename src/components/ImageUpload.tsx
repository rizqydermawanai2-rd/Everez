import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, Camera } from 'lucide-react';
import { cn, getImageUrl } from '../lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait';
  maxSizeMB?: number;
  showCamera?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'uploads',
  label = 'Unggah Gambar',
  className,
  aspectRatio = 'square',
  maxSizeMB = 2,
  showCamera = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
          setError("Gagal mengakses kamera.");
          setIsCameraActive(false);
        }
      };
      initCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File terlalu besar. Maksimal ${maxSizeMB}MB.`);
      return;
    }

    const IMGBB_API_KEY = (import.meta as any).env.VITE_IMGBB_API_KEY || '03c6b668d2a39eb304f79db480a514a4';
    if (!IMGBB_API_KEY) {
      setError('API Key ImgBB belum dikonfigurasi. Silakan hubungi admin.');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(10);

    try {
      console.log('Starting upload to ImgBB...');
      console.log('File details:', { name: file.name, size: file.size, type: file.type });
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gagal mengunggah ke ImgBB');
      }

      const result = await response.json();
      console.log('Upload successful!', result);
      
      setProgress(100);
      const directURL = result.data.url;
      const proxyURL = `/api/proxy-image?url=${encodeURIComponent(directURL)}`;
      console.log('Download URL obtained:', proxyURL);
      
      onChange(proxyURL);
      setUploading(false);
      setProgress(0);
    } catch (err: any) {
      console.error('Detailed upload error:', err);
      setError(`Kesalahan: ${err.message || 'Gagal mengunggah gambar'}`);
      setUploading(false);
      setProgress(0);
    }
  }, [maxSizeMB, onChange]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
          handleUpload(file);
          setIsCameraActive(false);
        }
      }, 'image/jpeg');
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]'
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative group rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center bg-zinc-50",
          aspectClasses[aspectRatio],
          isDragging ? "border-zinc-900 bg-zinc-100" : "border-zinc-200",
          value ? "border-solid" : "border-dashed",
          uploading && "opacity-80",
          !uploading && !isCameraActive && "cursor-pointer hover:bg-zinc-100/80"
        )}
        onClick={() => !uploading && !isCameraActive && !value && fileInputRef.current?.click()}
      >
        {isCameraActive ? (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsCameraActive(false); }}
                className="p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/30 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                className="p-3 bg-white text-zinc-900 rounded-2xl shadow-xl hover:bg-zinc-100 transition-all flex items-center gap-2 font-bold"
              >
                <Camera className="w-6 h-6" />
                Ambil Foto
              </button>
            </div>
          </div>
        ) : value ? (
          <>
            <img 
              src={getImageUrl(value)} 
              alt="Preview" 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
            <div 
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-white">
                <Upload className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ganti Gambar</span>
              </div>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900">{label}</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
                Drag & drop atau klik
              </p>
            </div>
            {showCamera && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsCameraActive(true); }}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all"
              >
                <Camera className="w-4 h-4" />
                Gunakan Kamera
              </button>
            )}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 p-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-zinc-900 animate-spin" />
              <span className="absolute text-[10px] font-bold text-zinc-900">{progress}%</span>
            </div>
            <div className="w-full max-w-[120px] h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-900 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mengunggah...</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <p className="text-[10px] font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
