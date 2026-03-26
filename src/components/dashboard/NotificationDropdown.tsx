import React, { useState, useRef, useEffect } from 'react';
import { Bell, Package, AlertTriangle, MessageCircle, UserPlus, ShoppingBag, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'chat' | 'user' | 'system';
  time: string;
  read: boolean;
  action?: () => void;
}

export default function NotificationDropdown({ notifications }: { notifications: Notification[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingBag className="w-4 h-4 text-blue-500" />;
      case 'stock': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'chat': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'user': return <UserPlus className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 shrink-0 bg-white border border-zinc-200/60 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-50 shadow-sm relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200/60 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-bold text-zinc-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-500">
                  <CheckCircle className="w-8 h-8 mb-2 text-zinc-300" />
                  <p className="text-sm font-medium">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (notif.action) notif.action();
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full text-left p-4 hover:bg-zinc-50 transition-colors flex gap-3",
                        !notif.read ? "bg-blue-50/30" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        notif.type === 'order' ? "bg-blue-100" :
                        notif.type === 'stock' ? "bg-orange-100" :
                        notif.type === 'chat' ? "bg-green-100" :
                        notif.type === 'user' ? "bg-purple-100" : "bg-zinc-100"
                      )}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", !notif.read ? "font-bold text-zinc-900" : "font-medium text-zinc-700")}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] font-medium text-zinc-400 mt-1">{notif.time}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
