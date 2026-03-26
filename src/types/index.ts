export type UserRole = 'customer' | 'admin_production' | 'admin_packing' | 'admin_sales' | 'super_admin' | 'vice_ceo' | 'ceo';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  approved?: boolean;
  address?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
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
  discountPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  promoLabel?: string;
  isBundle?: boolean;
  bundleBadgeText?: string;
  category: string;
  image: string;
  images?: string[];
  description: string;
  stock: number;
  sizes?: Record<string, number>; // e.g., { S: 10, M: 5, L: 0, XL: 2, XXL: 0, '2XL': 0, '3XL': 0 }
  selectedSize?: string;
  weight: number; // in grams
  features?: ProductFeature[];
  bundleItems?: string[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  total: number;
  discountAmount?: number;
  promoCode?: string;
  status: 'Diproses' | 'Produksi' | 'Packing' | 'Siap Kirim' | 'Dikirim' | 'Selesai';
  address: string;
  shippingCost?: number;
  shippingDiscountAmount?: number;
  shippingPromoId?: string;
  totalWeight?: number;
  paymentMethod: string;
  paymentProofUrl?: string;
  customerName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  trackingNumber?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'e-wallet' | 'qris';
  name: string;
  accountNumber?: string;
  phoneNumber?: string;
  iconUrl?: string;
  barcodeUrl?: string;
  qrisBarcodeUrl?: string;
  qrisBarcodeBase64?: string;
}

export interface ShippingPromo {
  id: string;
  title: string;
  description: string;
  minPurchase: number;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  isActive: boolean;
  createdAt: any;
}
