import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// ADVANCED: Robust private key sanitization for Vercel/Node.js environment
const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
let sanitizedKey = rawKey
    .replace(/^["']|["']$/g, "")    // Remove leading/trailing quotes
    .split("\\n").join("\n")        // Unescape newlines (more reliable than replace)
    .trim();                        // Remove extra whitespace

// SAFE DIAGNOSTICS: Log structure info without leaking the actual secret
if (process.env.NODE_ENV === 'production' || true) {
    const keyInfo = {
        exists: !!rawKey,
        length: sanitizedKey.length,
        hasHeader: sanitizedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
        hasFooter: sanitizedKey.endsWith('-----END PRIVATE KEY-----'),
        containsLiteralSlashN: sanitizedKey.includes('\\n'),
        first10: sanitizedKey.substring(0, 10),
        last10: sanitizedKey.substring(sanitizedKey.length - 10)
    };
    console.log('Firebase Admin Key Diagnostic (Safe):', keyInfo);
}

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: sanitizedKey,
};

let adminStorage: any;

export function getAdminStorage() {
    if (adminStorage) return adminStorage;

    if (!getApps().length) {
        // Double check env vars to avoid crash
        if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
            console.warn("Missing Firebase Admin env vars, skipping initialization");
            // Return dummy or throw? Throwing is better for debugging runtime, but for build we want safety.
            // If called at runtime, we want it to work.
            if (process.env.NODE_ENV === 'production') {
                // In production, we expect vars to be present if this feature is used
            }
        }

        try {
            initializeApp({
                credential: cert(serviceAccount),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        } catch (error) {
            console.error("Firebase Admin initialization error:", error);
            // If already initialized, ignore
        }
    }

    adminStorage = getStorage();
    return adminStorage;
}
