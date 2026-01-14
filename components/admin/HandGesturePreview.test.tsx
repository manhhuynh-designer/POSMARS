import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HandGesturePreview from './HandGesturePreview'

// Mock navigator.mediaDevices.getUserMedia
const mockMediaStream = {
    getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
}

Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
    },
    writable: true
})

describe('HandGesturePreview', () => {
    const mockConfig = {
        gesture_models: [],
        instructions: 'Test instructions'
    }
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('eventually transitions to active state', async () => {
        render(<HandGesturePreview config={mockConfig} onClose={mockOnClose} />)

        // Use findBy to wait for the transition if it hasn't happened yet, 
        // or get it if it has.
        await waitFor(() => {
            const status = screen.getByTestId('ar-status')
            expect(status.textContent).toMatch(/Gesture Active|Initializing/i)
        })

        await waitFor(() => {
            expect(screen.getByTestId('ar-status').textContent).toBe('Gesture Active')
        }, { timeout: 10000 })
    })

    it('calls onClose when close button clicked', async () => {
        render(<HandGesturePreview config={mockConfig} onClose={mockOnClose} />)
        const closeBtn = await screen.findByTestId('close-ar-btn', {}, { timeout: 10000 })
        fireEvent.click(closeBtn)
        expect(mockOnClose).toHaveBeenCalled()
    })
})
