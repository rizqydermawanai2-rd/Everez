import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  // If it's already a proxy URL, return as is
  if (url.startsWith('/api/proxy-image')) return url;
  // If it's an ImgBB URL, wrap it in the proxy
  if (url.includes('ibb.co')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
