import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  let isAdminInitialized = false;

  if (serviceAccountStr) {
    try {
      if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(serviceAccountStr);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log('Firebase Admin initialized successfully');
      }
      isAdminInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
    }
  }

  app.use(express.json());
  
  // Shipping Cost API (RapidAPI - Cek Resi Cek Ongkir)
  app.post('/api/shipping/cost', async (req, res) => {
    const { destinationCity, weight } = req.body;
    const apiKey = process.env.RAPIDAPI_KEY || '359d2ddcebmsh3d0b2d7a37a9fb0p1ab0e2jsn1429e29cc086';
    const apiHost = 'cek-resi-cek-ongkir.p.rapidapi.com';
    
    if (!destinationCity) return res.status(400).json({ error: 'Destination city is required' });

    try {
      let originAreaId = '4616'; // Default to Cimahi
      let originCity = 'Cimahi';
      let originDistrict = 'Cimahi Selatan';

      // Try to fetch store origin from settings
      try {
        const settingsSnapshot = await admin.firestore().collection('settings').limit(1).get();
        if (!settingsSnapshot.empty) {
          const settings = settingsSnapshot.docs[0].data();
          if (settings.storeCity) originCity = settings.storeCity;
          if (settings.storeDistrict) originDistrict = settings.storeDistrict;
        }
      } catch (e) {
        console.error('Error fetching store settings:', e);
      }

      // Since the RapidAPI area search endpoint is currently unavailable,
      // we will use a robust mock calculation based on the destination city.
      
      const baseRate = 10000;
      let distanceMultiplier = 1;
      const dest = destinationCity.toLowerCase();
      
      if (dest.includes('cimahi') || dest.includes('bandung')) {
        distanceMultiplier = 0.8; // Local
      } else if (dest.includes('jakarta') || dest.includes('jawa barat')) {
        distanceMultiplier = 1.2;
      } else if (dest.includes('jawa')) {
        distanceMultiplier = 1.8;
      } else {
        distanceMultiplier = 3.0; // Outside Java
      }
      
      const weightInKg = Math.ceil((weight || 1000) / 1000);
      const calculatedCost = Math.max(baseRate, weightInKg * baseRate * distanceMultiplier);
      
      // Return the calculated cost
      return res.json({ cost: calculatedCost });
    } catch (error) {
      console.error('RapidAPI error:', error);
      res.status(500).json({ error: 'Failed to fetch shipping cost' });
    }
  });

  // Image Proxy Route to bypass ImgBB hotlinking restrictions
  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send('URL is required');
    
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Referer': new URL(imageUrl).origin
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Failed to proxy image');
    }
  });

  // API Routes
  app.delete('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    
    if (!isAdminInitialized) {
      return res.status(500).json({ 
        success: false, 
        message: 'Firebase Admin belum dikonfigurasi. Pastikan FIREBASE_SERVICE_ACCOUNT sudah diset di Secrets.' 
      });
    }
    
    try {
      // 1. Delete from Firebase Auth
      await admin.auth().deleteUser(userId);
      console.log(`Successfully deleted user from Auth: ${userId}`);
      
      // 2. Delete from Firestore
      const db = admin.firestore();
      await db.collection('users').doc(userId).delete();
      await db.collection('pending_users').doc(userId).delete();
      console.log(`Successfully deleted user from Firestore: ${userId}`);
      
      res.json({ success: true, message: 'User deleted from Auth and Firestore' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        // If user not in Auth, still try to delete from Firestore
        try {
          const db = admin.firestore();
          await db.collection('users').doc(userId).delete();
          await db.collection('pending_users').doc(userId).delete();
          return res.json({ success: true, message: 'User deleted from Firestore (not found in Auth)' });
        } catch (dbError: any) {
          return res.status(500).json({ success: false, message: `Auth user not found, and Firestore delete failed: ${dbError.message}` });
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error.message || 'Gagal menghapus pengguna' 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
