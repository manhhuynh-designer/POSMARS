import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        // 1. Check Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

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
        const { filename, token } = await req.json();

        // 3. Set Metadata
        const adminStorage = getAdminStorage();
        if (!adminStorage) {
            return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
        }

        const bucket = adminStorage.bucket();
        const file = bucket.file(filename);

        // Set the token in custom metadata
        console.log(`Setting metadata for ${filename} with token ending in ...${token.slice(-6)}`);

        await file.setMetadata({
            metadata: {
                firebaseStorageDownloadTokens: token
            }
        });

        // Verify
        const [meta] = await file.getMetadata();
        const storedToken = meta.metadata?.firebaseStorageDownloadTokens;
        const size = parseInt(meta.size || '0');

        console.log(`Verification:
        - Token: ${storedToken === token ? 'CORRECT' : 'MISMATCH'}
        - Size: ${size} bytes
        - Type: ${meta.contentType}
        `);

        if (size === 0) {
            return NextResponse.json({ error: 'File is empty. Upload failed.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, size });

    } catch (error: any) {
        console.error('Finalize Upload Error:', error);
        return NextResponse.json({
            error: 'Failed to finalize upload',
            details: error.message
        }, { status: 500 });
    }
}
