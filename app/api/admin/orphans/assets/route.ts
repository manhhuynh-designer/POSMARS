import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// Broken Asset Reasons
type BrokenReason =
    | 'FILE_DELETED'        // File was deleted from storage
    | 'URL_ENCODING_MISMATCH'  // URL encoding doesn't match storage path
    | 'BUCKET_MISMATCH'     // Different bucket than expected
    | 'EXTERNAL_URL'        // External URL that may be unreachable
    | 'MALFORMED_URL';      // Invalid URL format

interface BrokenAsset {
    projectId: string;
    projectName: string;
    assetPath: string;
    assetId?: string;
    url: string;
    type: string;
    reason: BrokenReason;
    reasonDescription: string;
}

export async function GET(req: NextRequest) {
    try {
        const adminStorage = getAdminStorage();
        if (!adminStorage) {
            return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
        }

        const bucket = adminStorage.bucket();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get all files from Storage
        const [files] = await bucket.getFiles();

        // Create multiple lookup maps for matching
        const storedFilesEncoded = new Set(files.map(f =>
            `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(f.name)}?alt=media`
        ));
        const storedFilesDecoded = new Set(files.map(f =>
            `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${f.name}?alt=media`
        ));
        const storedFileNames = new Set(files.map(f => f.name));

        // 2. Fetch Projects
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, client_slug, template_config');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const brokenAssets: BrokenAsset[] = [];
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
                        const url = obj.url.trim();

                        // Skip empty URLs
                        if (!url) return;

                        // Check URL validity
                        try {
                            new URL(url);
                        } catch {
                            brokenAssets.push({
                                projectId: project.id,
                                projectName: project.name || project.client_slug,
                                assetPath: path,
                                assetId: obj.id,
                                url: url,
                                type: obj.type || 'unknown',
                                reason: 'MALFORMED_URL',
                                reasonDescription: 'URL không hợp lệ - có thể là đường dẫn bị hỏng hoặc thiếu protocol'
                            });
                            return;
                        }

                        // Check if it's an internal Firebase URL
                        if (url.startsWith(internalUrlPrefix)) {
                            // Try multiple matching strategies
                            const existsEncoded = storedFilesEncoded.has(url);
                            const existsDecoded = storedFilesDecoded.has(url);

                            // Extract file path from URL for additional check
                            const match = url.match(/\/o\/([^?]+)/);
                            const encodedPath = match ? match[1] : null;
                            const decodedPath = encodedPath ? decodeURIComponent(encodedPath) : null;
                            const existsByName = decodedPath ? storedFileNames.has(decodedPath) : false;

                            if (!existsEncoded && !existsDecoded && !existsByName) {
                                // Determine specific reason
                                let reason: BrokenReason = 'FILE_DELETED';
                                let reasonDescription = 'File đã bị xóa khỏi Storage - có thể đã bị xóa thủ công hoặc do lỗi upload';

                                // Check if it might be an encoding issue
                                if (encodedPath && encodedPath.includes('%')) {
                                    const similarFiles = files.filter(f =>
                                        f.name.toLowerCase().includes(decodedPath?.split('/').pop()?.toLowerCase() || '')
                                    );
                                    if (similarFiles.length > 0) {
                                        reason = 'URL_ENCODING_MISMATCH';
                                        reasonDescription = `URL encoding không khớp - file tương tự tồn tại: ${similarFiles[0].name}`;
                                    }
                                }

                                brokenAssets.push({
                                    projectId: project.id,
                                    projectName: project.name || project.client_slug,
                                    assetPath: path,
                                    assetId: obj.id,
                                    url: url,
                                    type: obj.type || 'unknown',
                                    reason,
                                    reasonDescription
                                });
                            }
                        } else if (url.startsWith('https://firebasestorage.googleapis.com')) {
                            // Different bucket
                            brokenAssets.push({
                                projectId: project.id,
                                projectName: project.name || project.client_slug,
                                assetPath: path,
                                assetId: obj.id,
                                url: url,
                                type: obj.type || 'unknown',
                                reason: 'BUCKET_MISMATCH',
                                reasonDescription: 'URL trỏ đến bucket khác - có thể là do migrate từ project khác hoặc config sai'
                            });
                        }
                        // External URLs are not checked (could be slow/unreliable)
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

// DELETE handler to remove broken asset references from project config
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, assetId, assetPath } = body;

        if (!projectId || (!assetId && !assetPath)) {
            return NextResponse.json({ error: 'Missing projectId or asset identifier' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch current project config
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('template_config')
            .eq('id', projectId)
            .single();

        if (fetchError || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const config = project.template_config;

        // Remove the broken asset from config
        // If it's in targets array, find and remove by assetId
        if (config.targets && Array.isArray(config.targets)) {
            config.targets = config.targets.map((target: any) => {
                if (target.assets && Array.isArray(target.assets)) {
                    target.assets = target.assets.filter((asset: any) => asset.id !== assetId);
                }
                return target;
            });
        }

        // If it's in default_assets, filter it out
        if (config.default_assets && Array.isArray(config.default_assets)) {
            config.default_assets = config.default_assets.filter((asset: any) => asset.id !== assetId);
        }

        // Update project
        const { error: updateError } = await supabase
            .from('projects')
            .update({ template_config: config })
            .eq('id', projectId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Broken asset reference removed' });
    } catch (error: any) {
        console.error('Error removing broken asset:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
