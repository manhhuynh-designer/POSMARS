/**
 * Get the base URL for client links based on current domain
 * Works in both localhost and production environments
 */
export function getBaseUrl(): string {
    if (typeof window === 'undefined') {
        // Server-side: use env variable or default
        return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    }
    return window.location.origin
}

/**
 * Get the root domain for subdomain links
 * e.g. 'posmars.vn' or 'localhost:3000'
 */
export function getRootDomain(): string {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    }

    const host = window.location.host
    // Remove any subdomain prefix to get root domain
    // e.g. 'demo.posmars.vn' -> 'posmars.vn'
    // e.g. 'admin.localhost:3000' -> 'localhost:3000'
    const parts = host.split('.')

    // For localhost:port, return as-is
    if (host.includes('localhost')) {
        return host.replace(/^[^.]+\./, '') // Remove subdomain if any
    }

    // For production domains, keep last 2 parts (e.g. 'posmars.vn')
    if (parts.length > 2) {
        return parts.slice(-2).join('.')
    }

    return host
}

/**
 * Get protocol (http or https) based on current environment
 */
export function getProtocol(): string {
    if (typeof window === 'undefined') {
        return process.env.NODE_ENV === 'production' ? 'https' : 'http'
    }
    return window.location.protocol.replace(':', '')
}

/**
 * Generate subdomain URL for a client
 * e.g. 'demo.posmars.vn' or 'demo.localhost:3000'
 */
export function getSubdomainUrl(clientSlug: string): string {
    const protocol = getProtocol()
    const rootDomain = getRootDomain()
    return `${protocol}://${clientSlug}.${rootDomain}`
}

/**
 * Generate path-based URL for a client
 * e.g. 'posmars.vn/client/demo' or 'localhost:3000/client/demo'
 */
export function getPathUrl(clientSlug: string): string {
    return `${getBaseUrl()}/client/${clientSlug}`
}
