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

    // Allow access via IP address (e.g. Network testing on mobile)
    // RegExp checks for X.X.X.X or X.X.X.X:PORT
    const isIp = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(hostname);
    if (isIp) {
        return NextResponse.next();
    }

    const isLocal = hostname.includes('localhost');
    const rootDomain = isLocal ? 'localhost:3000' : 'posmars.vn';

    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
        // Main site -> Continue
        return NextResponse.next();
    }

    // Extract subdomain
    // Ex: samsung.posmars.vn -> samsung
    // Ex: demo.localhost:3000 -> demo
    // Note: Handle port stripping if necessary for production, but Vercel usually handles hostname well.
    const currentSubdomain = hostname.replace(`.${rootDomain}`, '');

    // Rewrite to /client/[slug]
    // We rewrite the URL to the dynamic route handler for the client
    // e.g. /client/samsung/
    url.pathname = `/client/${currentSubdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
}
