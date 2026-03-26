import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash, CreditCard, Smartphone } from 'lucide-react';
import { PaymentMethod } from '../../types';

export default function PaymentMethodManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({ type: 'bank' });

  useEffect(() => {
    const q = collection(db, 'payment_methods');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payment_methods'));
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newMethod.type || !newMethod.name) return;
    try {
      await addDoc(collection(db, 'payment_methods'), newMethod);
      setNewMethod({ type: 'bank' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payment_methods');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Kelola Metode Pembayaran</h2>
      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
        <select value={newMethod.type} onChange={e => setNewMethod({...newMethod, type: e.target.value as 'bank' | 'e-wallet' | 'qris'})} className="w-full p-3 border rounded-xl">
          <option value="bank">Bank</option>
          <option value="e-wallet">E-Wallet</option>
          <option value="qris">QRIS</option>
        </select>
        <input type="text" placeholder="Nama (e.g. BCA, DANA, QRIS)" value={newMethod.name || ''} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="w-full p-3 border rounded-xl" />
        {newMethod.type === 'bank' ? (
          <input type="text" placeholder="Nomor Rekening" value={newMethod.accountNumber || ''} onChange={e => setNewMethod({...newMethod, accountNumber: e.target.value})} className="w-full p-3 border rounded-xl" />
        ) : newMethod.type === 'e-wallet' ? (
          <input type="text" placeholder="Nomor Telepon" value={newMethod.phoneNumber || ''} onChange={e => setNewMethod({...newMethod, phoneNumber: e.target.value})} className="w-full p-3 border rounded-xl" />
        ) : (
          <input type="text" placeholder="QRIS Barcode URL" value={newMethod.qrisBarcodeUrl || ''} onChange={e => setNewMethod({...newMethod, qrisBarcodeUrl: e.target.value})} className="w-full p-3 border rounded-xl" />
        )}
        <input type="text" placeholder="Icon URL" value={newMethod.iconUrl || ''} onChange={e => setNewMethod({...newMethod, iconUrl: e.target.value})} className="w-full p-3 border rounded-xl" />
        <button onClick={handleAdd} className="w-full bg-zinc-900 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Metode
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map(method => (
          <div key={method.id} className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {method.type === 'bank' ? <CreditCard className="w-6 h-6 text-zinc-400" /> : <Smartphone className="w-6 h-6 text-zinc-400" />}
              <div>
                <p className="font-bold">{method.name}</p>
                <p className="text-sm text-zinc-500">
                  {method.type === 'bank' ? method.accountNumber : 
                   method.type === 'e-wallet' ? method.phoneNumber : 
                   'QRIS'}
                </p>
              </div>
            </div>
            <button onClick={() => handleDelete(method.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
              <Trash className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
