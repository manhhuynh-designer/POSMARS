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
        const [files] = await bucket.getFiles();

        const allFiles = files
            .filter(f => !f.name.endsWith('/')) // Exclude directories
            .map(f => ({
                name: f.name, // e.g., "thumbnails/abc.jpg"
                size: parseInt(f.metadata.size || '0'),
                timeCreated: f.metadata.timeCreated,
                publicUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(f.name)}?alt=media`
            }));

        // 2. Get all referenced URLs/Paths from Projects AND Leads (Deep Scan)
        const { data: projects, error } = await supabase
            .from('projects')
            .select('marker_url, template_config, asset_url, lead_form_config');

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const referencedPaths = new Set<string>();

        // Helper to normalize storage path from URL or relative path
        const normalizePath = (input: string) => {
            if (!input) return null;
            try {
                if (input.includes('firebasestorage.googleapis.com')) {
                    // Extract path from URL: .../o/{path}?alt...
                    const match = input.match(/\/o\/([^?]+)/);
                    if (match) return decodeURIComponent(match[1]);
                }
                // If it looks like a path (markers/, thumbnails/, uploads/) keep it
                if (input.startsWith('markers/') || input.startsWith('thumbnails/') || input.startsWith('uploads/')) {
                    return input;
                }
            } catch (e) { return null; }
            return null;
        };

        // Generic Deep Scanner for JSON objects
        const deepScan = (obj: any) => {
            if (!obj) return;

            if (typeof obj === 'string') {
                const path = normalizePath(obj);
                if (path) referencedPaths.add(path);
            } else if (Array.isArray(obj)) {
                obj.forEach(item => deepScan(item));
            } else if (typeof obj === 'object') {
                Object.values(obj).forEach(val => deepScan(val));
            }
        };

        projects.forEach(p => {
            if (p.marker_url) deepScan(p.marker_url);
            if (p.asset_url) deepScan(p.asset_url);
            if (p.template_config) deepScan(p.template_config);
            if (p.lead_form_config) deepScan(p.lead_form_config);
        });

        // 3. Find Orphans with Parent-Child Logic
        const orphanFiles = allFiles.filter(file => {
            const filePath = file.name; // e.g., "thumbnails/abc_thumb.jpg"

            // 1. Direct Reference Check
            if (referencedPaths.has(filePath)) return false;

            // 2. Parent-Child Linkage (Smart Dependency)
            if (filePath.startsWith('thumbnails/')) {
                const basename = filePath.split('/').pop() || '';

                // Identify Parent: Iterate through all referenced paths
                let isDerived = false;
                for (const refPath of referencedPaths) {
                    const refName = refPath.split('/').pop(); // "video.mp4"
                    if (!refName) continue;

                    const refNameNoExt = refName.substring(0, refName.lastIndexOf('.')) || refName; // "video"

                    // Does the thumbnail contain the parent's base name?
                    if (basename.includes(refNameNoExt)) {
                        // Yes, verify it's a suffix/prefix match
                        isDerived = true;
                        break;
                    }
                }

                if (isDerived) return false; // Valid because parent exists
            }

            // 3. Special Case: .mind files
            // Logic: If a .mind file exists but is NOT referenced in any project config, it is an orphan.
            // This is strict but correct per user requirement: "If project deleted, file should be deleted".
            // If "Smart Compile" creates a .mind file but doesn't save it to the project config, 
            // the user needs to save the project.

            // 4. Safety Net: If file is very recent (less than 1 hour), do not mark as orphan
            // This prevents deleting files that are currently being uploaded/processed but not yet saved to DB
            const isRecent = file.timeCreated && (new Date().getTime() - new Date(file.timeCreated).getTime() < 60 * 60 * 1000);
            if (isRecent) return false;

            return true; // Is Orphan
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
