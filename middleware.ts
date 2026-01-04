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

    try {
        // Skip rewrite for Admin, Login, and API routes
        if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/login') || url.pathname.startsWith('/client')) {
            return NextResponse.next();
        }

        const isLocal = hostname.includes('localhost');
        const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'posmars.vn';

        // Check if main domain, localhost, or Vercel preview
        if (
            hostname === 'localhost:3000' ||
            hostname === ROOT_DOMAIN ||
            hostname === `www.${ROOT_DOMAIN}` ||
            hostname.endsWith('.vercel.app') ||
            hostname.includes('.loca.lt') // Handle localtunnel for testing
        ) {
            return NextResponse.next();
        }

        // Extract subdomain
        const currentSubdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');

        // Rewrite
        url.pathname = `/client/${currentSubdomain}${url.pathname}`;
        return NextResponse.rewrite(url);
    } catch (error) {
        console.error('Middleware error:', error);
        return NextResponse.next();
    }
}
