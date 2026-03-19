export type UserRole = 'customer' | 'admin_production' | 'admin_packing' | 'admin_sales' | 'super_admin';

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
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  stock: number;
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
