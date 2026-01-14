/**
 * Simplified unit tests for WebAR.rocks loaders
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock global window object
global.window = global.window || {}

describe('WebAR.rocks Loaders', () => {
    beforeEach(() => {
        // Clear any existing scripts
        if (typeof document !== 'undefined') {
            document.head.innerHTML = ''
        }
        // Reset window globals
        ; (window as any).WEBARROCKS = undefined
    })

    it('should define loader functions', async () => {
        const { loadWebARRocksObject, loadWebARRocksHand } = await import('../webAR-rocks-loader')

        expect(typeof loadWebARRocksObject).toBe('function')
        expect(typeof loadWebARRocksHand).toBe('function')
    })
})
