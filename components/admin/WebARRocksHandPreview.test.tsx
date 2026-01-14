import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WebARRocksHandPreview from './WebARRocksHandPreview'

// Mock the CSS import in AR3DOverlay if mostly needed, but likely handled by build config.
// Mocking the loader
vi.mock('@/lib/ar-loaders/webAR-rocks-loader', () => ({
    loadWebARRocksHand: vi.fn().mockResolvedValue(undefined)
}))

// Mock the custom hook with stable ref logic
vi.mock('./hooks/useCameraStream', () => {
    // Create a stable ref object that persists across calls for this module
    const stableVideoRef = { current: ((global as any).document || { createElement: () => ({}) }).createElement('video') }
    return {
        useCameraStream: vi.fn().mockReturnValue({
            videoRef: stableVideoRef,
            ready: true,
            error: null,
            restartCamera: vi.fn()
        })
    }
})

// Mock AR3DOverlay to avoid Three.js issues in JSDOM
vi.mock('./shared/AR3DOverlay', () => ({
    default: () => <div data-testid="ar-3d-overlay">Mock 3D Overlay</div>
}))

describe('WebARRocksHandPreview', () => {
    const mockConfig = {
        accessory_models: [],
        hand_preference: 'right',
        instructions: 'Test instructions'
    } as any
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock global WEBARROCKSHAND as expected by the component
        const mockInit = vi.fn().mockImplementation(({ callbackReady }) => {
            // Simulate sync ready callback for robustness in JSDOM
            callbackReady(null)
        })

        Object.defineProperty(window, 'WEBARROCKSHAND', {
            value: {
                init: mockInit,
                resize: vi.fn(),
                destroy: vi.fn(),
                stop: vi.fn()
            },
            writable: true,
            configurable: true
        })
    })

    afterEach(() => {
        // Cleanup
        delete (window as any).WEBARROCKSHAND
    })

    it('eventually transitions to active state', async () => {
        render(<WebARRocksHandPreview config={mockConfig} onClose={mockOnClose} />)

        // Debug initial state
        // screen.debug()

        // Should start with loading or active message
        await waitFor(() => {
            const status = screen.getByTestId('ar-status').textContent
            expect(status).toMatch(/Hand AR Active|Starting/i)
        })

        // Should eventually become active once the "mocked" engine callback fires
        try {
            await waitFor(() => {
                expect(screen.getByTestId('ar-status').textContent).toBe('Hand AR Active')
            }, { timeout: 2000 })
        } catch (e) {
            screen.debug() // print DOM on failure
            throw e
        }
    })

    it('calls onClose when close button clicked', async () => {
        render(<WebARRocksHandPreview config={mockConfig} onClose={mockOnClose} />)
        const closeBtn = await screen.findByTestId('close-ar-btn')
        fireEvent.click(closeBtn)
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('handles camera error gracefully', async () => {
        // Override mock for this test
        const { useCameraStream } = await import('./hooks/useCameraStream')
        vi.mocked(useCameraStream).mockReturnValueOnce({
            videoRef: { current: null },
            ready: false,
            error: 'Camera Permission Denied',
            restartCamera: vi.fn()
        } as any)

        render(<WebARRocksHandPreview config={mockConfig} onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByText('Camera Permission Denied')).toBeInTheDocument()
        })
    })
})
