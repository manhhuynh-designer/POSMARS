import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        // 1. Check Authentication (Supabase)
        // We construct a fresh client to validate the Auth Token sent by the browser
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        // Initialize Supabase Client for Auth Check
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const { filename, contentType } = await req.json();
        const bucket = adminStorage.bucket();
        const file = bucket.file(filename);

        // 3. Generate Signed URL
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            contentType,
        });

        // Also generate a public URL for reading (if the bucket is public) 
        // OR we can rely on the Firebase Storage download URL format
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(filename)}?alt=media`;

        return NextResponse.json({ url, publicUrl });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
