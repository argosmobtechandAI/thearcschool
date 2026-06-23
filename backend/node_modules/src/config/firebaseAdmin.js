import { initializeApp, cert, getApps } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Read service account from the root of backend
  const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    }
  } else {
    console.warn('Firebase Service Account file not found. Push notifications will not work.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

export const isFirebaseInitialized = () => getApps().length > 0;
