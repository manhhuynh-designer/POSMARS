import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// ADVANCED: Robust private key parsing that handles both PEM and JSON Service Account formats
const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
let finalKey = rawKey;
let finalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
let finalClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let isJson = false;

try {
    // Check if the key is actually a full Service Account JSON
    if (rawKey.trim().startsWith('{')) {
        const json = JSON.parse(rawKey);
        if (json.private_key) {
            finalKey = json.private_key;
            if (json.project_id) finalProjectId = json.project_id;
            if (json.client_email) finalClientEmail = json.client_email;
            isJson = true;
        }
    }
} catch (e) {
    // If JSON parse fails, it's likely a standard PEM key
}

// Standard PEM sanitization for the final key
const sanitizedKey = finalKey
    .replace(/^["']|["']$/g, "")    // Remove leading/trailing quotes
    .split("\\n").join("\n")        // Unescape newlines
    .trim();

export function getFirebaseDiagnostic() {
    return {
        exists: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        isJsonFormatDetected: isJson,
        length: sanitizedKey.length,
        hasHeader: sanitizedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
        hasFooter: sanitizedKey.endsWith('-----END PRIVATE KEY-----'),
        first10: sanitizedKey.substring(0, 10),
        last10: sanitizedKey.substring(sanitizedKey.length - 10)
    };
}

const serviceAccount = {
    projectId: finalProjectId,
    clientEmail: finalClientEmail,
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
