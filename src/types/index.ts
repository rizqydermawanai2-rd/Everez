export type UserRole = 'customer' | 'admin_production' | 'admin_packing' | 'admin_sales' | 'super_admin' | 'vice_ceo' | 'ceo';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  approved?: boolean;
  address?: string;
  phone?: string;
  city?: string;
  photoURL?: string;
  attendanceScore?: number;
  employeeId?: string;
  attitudeScore?: number;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Sakit';
  photoUrl?: string;
  reason?: string;
  sickNoteUrl?: string;
  createdAt: any;
}

export interface ProductFeature {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  description: string;
  stock: number;
  features?: ProductFeature[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  total: number;
  status: 'Diproses' | 'Produksi' | 'Packing' | 'Siap Kirim' | 'Dikirim' | 'Selesai';
  address: string;
  paymentMethod: string;
  createdAt: any;
  trackingNumber?: string;
}
