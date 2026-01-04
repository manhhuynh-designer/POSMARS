import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    // Skip rewrite for Admin, Login, and API routes (redundant with matcher but safe)
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/login')) {
        return NextResponse.next();
    }

    const isLocal = hostname.includes('localhost');
    // Get root domain from env or default
    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'posmars.vn';

    // Check if accessing main domain OR a Vercel preview domain (to avoid treating preview string as subdomain)
    // e.g. posmars-git-master.vercel.app should be treated as main site for Admin access
    if (
        hostname === 'localhost:3000' ||
        hostname === ROOT_DOMAIN ||
        hostname === `www.${ROOT_DOMAIN}` ||
        hostname.endsWith('.vercel.app') // Treat all Vercel previews as "Root" for now (or handle differently if needed)
    ) {
        return NextResponse.next();
    }

    // Extract subdomain
    // Ex: samsung.posmars.vn -> samsung
    const currentSubdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');

    // Rewrite to /client/[slug]
    url.pathname = `/client/${currentSubdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
}
