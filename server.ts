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
