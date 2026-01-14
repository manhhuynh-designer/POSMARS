import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import WebARRocksObjectPreview from './WebARRocksObjectPreview'

// Mock the loader
vi.mock('@/lib/ar-loaders/webAR-rocks-loader', () => ({
    loadWebARRocksObject: vi.fn().mockResolvedValue(undefined)
}))

// Mock mediaDevices
const mockMediaStream = {
    getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
}

Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
    },
    writable: true
})

describe('WebARRocksObjectPreview', () => {
    const mockConfig = {
        object_model_url: 'test-model.glb',
        overlay_models: [],
        instructions: 'Test instructions'
    }
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        // Reset global WEBARROCKS
        delete (window as any).WEBARROCKS
    })

    it('shows loading state initially', () => {
        render(<WebARRocksObjectPreview config={mockConfig} onClose={mockOnClose} />)
        expect(screen.getByText(/Loading Object Engine/i)).toBeDefined()
    })

    it('transitions to active state after loading', async () => {
        render(<WebARRocksObjectPreview config={mockConfig} onClose={mockOnClose} />)

        await waitFor(() => {
            const status = screen.queryByTestId('ar-status')
            expect(status?.textContent).toBe('AR Active')
        }, { timeout: 10000 })
    })

    it('shows detection badge after delay', async () => {
        render(<WebARRocksObjectPreview config={mockConfig} onClose={mockOnClose} />)

        // Wait for initializing to switch to AR Active
        await waitFor(() => {
            expect(screen.getByTestId('ar-status').textContent).toBe('AR Active')
        }, { timeout: 10000 })

        // Wait for detection badge (it has a 3s setTimeout in the component)
        await waitFor(() => {
            expect(screen.getByTestId('detection-badge')).toBeInTheDocument()
            expect(screen.getByText(/Building Detected/i)).toBeInTheDocument()
        }, { timeout: 10000 })
    })

    it('calls onClose when close button clicked', async () => {
        render(<WebARRocksObjectPreview config={mockConfig} onClose={mockOnClose} />)
        const closeBtn = await screen.findByTestId('close-ar-btn', {}, { timeout: 10000 })
        fireEvent.click(closeBtn)
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('stops camera and engine on unmount', async () => {
        (window as any).WEBARROCKS = {
            OBJECT: {
                stop: vi.fn()
            }
        }
        const { unmount } = render(<WebARRocksObjectPreview config={mockConfig} onClose={mockOnClose} />)
        unmount()
        expect((window as any).WEBARROCKS.OBJECT.stop).toHaveBeenCalled()
    })
})
