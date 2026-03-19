import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, CheckCircle2, Clock, Search, 
  Bell, User, ShoppingCart, CreditCard, ArrowLeft,
  MoreHorizontal, MapPin, Phone, Mail, ExternalLink, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Order } from '../../types';

export default function AdminPackingDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(fetchedOrders);
      if (fetchedOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(fetchedOrders[0].id);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsub();
  }, [selectedOrderId]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, id.startsWith('orders/') ? id : `orders/${id}`), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Hapus pesanan ini?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      if (selectedOrderId === id) {
        setSelectedOrderId(orders.find(o => o.id !== id)?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const stats = [
    { label: 'Perlu Packing', count: orders.filter(o => o.status === 'Produksi').length, icon: Package, color: 'bg-blue-100 text-blue-600' },
    { label: 'Sedang Packing', count: orders.filter(o => o.status === 'Packing').length, icon: Clock, color: 'bg-orange-100 text-orange-600' },
    { label: 'Siap Kirim', count: orders.filter(o => o.status === 'Siap Kirim').length, icon: Truck, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Selesai', count: orders.filter(o => ['Dikirim', 'Selesai'].includes(o.status)).length, icon: CheckCircle2, color: 'bg-zinc-900 text-white' },
  ];

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#1a1a1a]">
      {/* Left Navigation - Clean & Minimal */}
      <aside className="w-72 border-r border-zinc-100 flex flex-col p-8">
        <div className="mb-12">
          <h1 className="text-xl font-bold tracking-tight">tarlet</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {[
            { icon: Package, label: 'Packing List', active: true },
            { icon: Truck, label: 'Shipping' },
            { icon: CheckCircle2, label: 'Completed' },
            { icon: Clock, label: 'Pending' },
            { icon: User, label: 'Customers' },
          ].map((item) => (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                item.active 
                  ? "bg-zinc-50 text-zinc-900" 
                  : "text-zinc-400 hover:text-zinc-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-zinc-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-zinc-100" />
            <div>
              <p className="text-sm font-bold">Packing Team</p>
              <p className="text-[10px] text-zinc-400">Warehouse A</p>
            </div>
          </div>
          <button className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            Check Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-8">
            <button className="text-sm font-medium text-zinc-400 hover:text-zinc-900">Shop</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-zinc-900">Journal</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-zinc-900">About us</button>
            <button className="text-sm font-medium text-zinc-400 hover:text-zinc-900">Contact</button>
          </div>
          
          <div className="flex items-center gap-6">
            <Search className="w-5 h-5 text-zinc-400" />
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-zinc-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">3</span>
            </div>
            <MoreHorizontal className="w-5 h-5 text-zinc-400" />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-12">
          {/* Shopping Cart Style List */}
          <div className="col-span-8 space-y-12">
            <div>
              <h2 className="text-3xl font-bold mb-8">Antrean Packing & Pengiriman.</h2>
              
              <div className="space-y-8">
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className={cn(
                      "border-b border-zinc-100 pb-8 cursor-pointer transition-all",
                      selectedOrderId === order.id ? "bg-zinc-50/50 -mx-4 px-4 rounded-2xl" : ""
                    )}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">#{order.id.slice(-6)}</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {order.status === 'Packing' && (
                          <button 
                            onClick={() => updateStatus(order.id, 'Siap Kirim')}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            Selesai Packing
                          </button>
                        )}
                        {order.status === 'Siap Kirim' && (
                          <button 
                            onClick={() => updateStatus(order.id, 'Dikirim')}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Kirim Pesanan
                          </button>
                        )}
                        <button 
                          onClick={() => deleteOrder(order.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                        >
                          Hapus
                        </button>
                        <button className="text-xs font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1">
                          View Details <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
                      <div className="col-span-6">Product</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-4 text-right">Total Price</div>
                    </div>

                    <div className="space-y-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-6 flex items-center gap-4">
                            <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-zinc-50" />
                            <div>
                              <p className="text-sm font-bold">{item.name}</p>
                              <p className="text-xs text-zinc-400">SKU: {order.id.slice(-4)}-{idx}</p>
                            </div>
                          </div>
                          <div className="col-span-2 text-sm font-bold">{item.quantity}</div>
                          <div className="col-span-4 text-sm font-bold text-right">Rp {(item.price * item.quantity).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>

          {/* Shipping Info Style Sidebar */}
          <div className="col-span-4 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.count}</p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-50 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-8">Info Pengiriman.</h3>
              
              {selectedOrder ? (
                <div className="space-y-8">
                  <section>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Customer</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <User className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{selectedOrder.customer}</p>
                        <p className="text-xs text-zinc-400">Regular Customer</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Informasi Pengiriman</p>
                    <div className="flex gap-4">
                      <MapPin className="w-5 h-5 text-zinc-400 shrink-0" />
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {selectedOrder.address}
                      </p>
                    </div>
                  </section>

                  <section>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Contact Info</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-zinc-600">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        +62 812-3456-7890
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-600">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        {selectedOrder.customer.toLowerCase().replace(/\s/g, '.')}@example.com
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Metode Pembayaran</p>
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Transfer Bank</span>
                      </div>
                      <div className="w-4 h-4 rounded-full border-4 border-blue-600" />
                    </div>
                  </section>

                  <div className="pt-8 border-t border-zinc-200">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Subtotal:</span>
                      <span className="font-bold">Rp {selectedOrder.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-6">
                      <span className="text-zinc-400">Shipping:</span>
                      <span className="text-emerald-600 font-bold">Free</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total:</span>
                      <span>Rp {selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedOrder.status === 'Siap Kirim' && (
                    <button 
                      onClick={() => updateStatus(selectedOrder.id, 'Dikirim')}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                    >
                      Mark as Shipped
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Select an order to view shipping info</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
