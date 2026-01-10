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

        // 1. Get all files from Storage to separate set
        const [files] = await bucket.getFiles();
        const storedFiles = new Set(files.map(f => {
            return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(f.name)}?alt=media`;
        }));

        // 2. Fetch Projects and look for broken internal links
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, client_slug, template_config');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const brokenAssets: any[] = [];
        const internalUrlPrefix = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}`;

        projects.forEach(project => {
            if (!project.template_config || typeof project.template_config !== 'object') return;

            const config: any = project.template_config;

            // Recursive traversal to find URLs
            const checkUrl = (obj: any, path: string) => {
                if (!obj) return;

                if (Array.isArray(obj)) {
                    obj.forEach((item, idx) => checkUrl(item, `${path}[${idx}]`));
                } else if (typeof obj === 'object') {
                    if (obj.url && typeof obj.url === 'string') {
                        const url = obj.url;
                        // Check if it's an internal Firebase URL
                        if (url.startsWith(internalUrlPrefix)) {
                            // Check if it exists in storedFiles
                            // Note: storedFiles has keys encoded exactly as Firebase does
                            // The URL in config might be encoded differently or same.
                            // We should try to match rigorously.

                            // Simple check: exists in Set
                            if (!storedFiles.has(url)) {
                                // Try checking decoded version logic if needed, but usually config strings match storage strings if they came from our upload flow.
                                // Let's mark as broken if not found.
                                brokenAssets.push({
                                    projectId: project.id,
                                    projectName: project.name || project.client_slug,
                                    assetPath: path,
                                    url: url,
                                    type: obj.type || 'unknown'
                                });
                            }
                        }
                    }
                    // Continue recursion
                    Object.keys(obj).forEach(key => {
                        if (key !== 'url') checkUrl(obj[key], `${path}.${key}`);
                    });
                }
            };

            checkUrl(config, 'config');
        });

        return NextResponse.json(brokenAssets);
    } catch (error: any) {
        console.error('Error detecting broken assets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
