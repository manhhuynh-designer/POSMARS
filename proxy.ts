import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};

export default function proxy(req: NextRequest) {
    try {
        const url = req.nextUrl;
        const hostname = req.headers.get("host") || "";

        // For now, let's allow ALL requests to pass through
        // This is a test to isolate if the proxy itself is causing the 404

        // Skip rewrite for Admin, Login, Client, and root routes
        if (
            url.pathname === '/' ||
            url.pathname.startsWith('/admin') ||
            url.pathname.startsWith('/login') ||
            url.pathname.startsWith('/client')
        ) {
            return NextResponse.next();
        }

        const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'posmars.vn';

        // Check if main domain, localhost, or Vercel preview
        if (
            hostname === 'localhost:3000' ||
            hostname === ROOT_DOMAIN ||
            hostname === `www.${ROOT_DOMAIN}` ||
            hostname.endsWith('.vercel.app') ||
            hostname.includes('.loca.lt')
        ) {
            return NextResponse.next();
        }

        // Extract subdomain for custom domains
        const currentSubdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');

        if (!currentSubdomain || currentSubdomain === hostname) {
            // No valid subdomain extracted, pass through
            return NextResponse.next();
        }

        // Rewrite path to /client/[slug]
        url.pathname = `/client/${currentSubdomain}${url.pathname}`;
        return NextResponse.rewrite(url);

    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.next();
    }
}
