/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async headers() {
        return [
            {
                // Apply CSP to client AR pages
                source: '/client/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // Scripts: self + CDNs for MindAR/A-Frame + inline/eval for WASM
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aframe.io https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com",
                            // Styles: self + inline styles
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            // Images: self + data URIs + blob + https
                            "img-src 'self' data: blob: https:",
                            // Fonts
                            "font-src 'self' https://fonts.gstatic.com",
                            // Media: camera stream uses blob
                            "media-src 'self' blob: https:",
                            // Connect: API calls + websockets
                            "connect-src 'self' https: wss: blob:",
                            // Workers: MindAR uses blob workers
                            "worker-src 'self' blob:",
                            // Child frames
                            "frame-src 'self'",
                            // Object/embed
                            "object-src 'none'",
                            // Base URI
                            "base-uri 'self'",
                            // Form actions
                            "form-action 'self'",
                        ].join('; ')
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ]
            }
        ]
    }
};

export default nextConfig;
