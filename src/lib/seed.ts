import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const INITIAL_PRODUCTS = [
  {
    name: 'Everez Classic Tee',
    price: 149000,
    category: 'Kaos',
    image: 'https://picsum.photos/seed/tee1/600/800',
    description: 'Kaos katun premium dengan potongan modern.',
    stock: 50
  },
  {
    name: 'Street Hype Hoodie',
    price: 399000,
    category: 'Hoodie',
    image: 'https://picsum.photos/seed/hoodie1/600/800',
    description: 'Hoodie oversized dengan bahan fleece tebal.',
    stock: 20
  },
  {
    name: 'Minimalist Tote Bag',
    price: 89000,
    category: 'Lainnya',
    image: 'https://picsum.photos/seed/bag1/600/800',
    description: 'Tas kanvas serbaguna untuk kebutuhan harian.',
    stock: 100
  },
  {
    name: 'Essential Joggers',
    price: 249000,
    category: 'Lainnya',
    image: 'https://picsum.photos/seed/pants1/600/800',
    description: 'Celana jogger nyaman untuk santai atau olahraga.',
    stock: 30
  }
];

export async function seedProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  if (snapshot.empty) {
    for (const product of INITIAL_PRODUCTS) {
      await addDoc(collection(db, 'products'), product);
    }
    console.log('Products seeded successfully');
  }
}
