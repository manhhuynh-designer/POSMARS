import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export async function GET(req: NextRequest) {
    try {
        const adminStorage = getAdminStorage();
        if (!adminStorage) {
            return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
        }

        const bucket = adminStorage.bucket();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get all files from Firebase Storage
        // We scan specific folders or root? Let's scan 'markers/' and 'uploads/' based on usage
        const [files] = await bucket.getFiles();

        // Filter out folders and keep only relevant files
        const allFiles = files
            .filter(f => !f.name.endsWith('/')) // Exclude directories
            .map(f => ({
                name: f.name,
                size: parseInt(f.metadata.size || '0'),
                timeCreated: f.metadata.timeCreated,
                publicUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(f.name)}?alt=media`
            }));

        // 2. Get all referenced URLs from Projects
        const { data: projects, error } = await supabase
            .from('projects')
            .select('marker_url, template_config, asset_url');

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const referencedUrls = new Set<string>();

        projects.forEach(p => {
            if (p.marker_url) referencedUrls.add(p.marker_url);
            if (p.asset_url) referencedUrls.add(p.asset_url);

            // Check template_config for assets
            if (p.template_config && typeof p.template_config === 'object') {
                const config: any = p.template_config;

                // Helper to extract URL from various config structures
                const extractUrls = (obj: any) => {
                    if (!obj) return;

                    if (Array.isArray(obj)) {
                        obj.forEach(item => extractUrls(item));
                    } else if (typeof obj === 'object') {
                        if (obj.url && typeof obj.url === 'string') {
                            referencedUrls.add(obj.url);
                        }
                        // Recursive check properties
                        Object.values(obj).forEach(val => extractUrls(val));
                    }
                };

                extractUrls(config);
            }
        });

        // 3. Find Orphans (Files whose publicURL is NOT in referencedUrls)
        // Also check if encoded URL matches
        const orphanFiles = allFiles.filter(file => {
            // Basic Check: is file.publicUrl in database?
            // Note: Database URLs might be encoded or decoded, or different host
            // Robust check: check if filename exists in any database URL

            // Simple exact match check first
            if (referencedUrls.has(file.publicUrl)) return false;

            // Complex check: Is the filename part of any referenced URL?
            // Decode the file name part from publicUrl just in case
            // The structure is fixed: .../o/{name}?alt=media

            // Optimization: Convert Set to Array for iterator
            let found = false;
            for (const refUrl of referencedUrls) {
                if (refUrl.includes(encodeURIComponent(file.name))) {
                    found = true;
                    break;
                }
                if (refUrl.includes(file.name)) {
                    found = true;
                    break;
                }
            }
            return !found;
        });

        return NextResponse.json(orphanFiles);
    } catch (error: any) {
        console.error('Error detecting orphan storage:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const adminStorage = getAdminStorage();
        if (!adminStorage) {
            return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
        }

        const bucket = adminStorage.bucket();
        const { fileNames } = await req.json();

        if (!Array.isArray(fileNames) || fileNames.length === 0) {
            return NextResponse.json({ error: 'Invalid file names' }, { status: 400 });
        }

        // Delete each file
        const deletePromises = fileNames.map(async (name) => {
            try {
                await bucket.file(name).delete();
                return { name, status: 'deleted' };
            } catch (err: any) {
                return { name, status: 'failed', error: err.message };
            }
        });

        const results = await Promise.all(deletePromises);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
