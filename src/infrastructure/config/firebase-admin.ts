import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let serviceAccount: object;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Fallback local (développement uniquement)
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const keyPath   = join(__dirname, '../../nocturne-4582e-firebase-adminsdk-fbsvc-9d72dd6fa6.json');
    serviceAccount  = JSON.parse(readFileSync(keyPath, 'utf-8'));
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export default admin;
