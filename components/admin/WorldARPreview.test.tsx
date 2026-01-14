import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorldARPreview from './WorldARPreview'

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

describe('WorldARPreview', () => {
    const mockConfig = {
        placement_models: [],
        instructions: 'Test instructions'
    }
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('eventually transitions to active state', async () => {
        render(<WorldARPreview config={mockConfig} onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByTestId('ar-status').textContent).toMatch(/World AR Active|Initializing/i)
        })

        await waitFor(() => {
            expect(screen.getByTestId('ar-status').textContent).toBe('World AR Active')
        }, { timeout: 10000 })
    })

    it('calls onClose when close button clicked', async () => {
        render(<WorldARPreview config={mockConfig} onClose={mockOnClose} />)
        const closeBtn = await screen.findByTestId('close-ar-btn', {}, { timeout: 10000 })
        fireEvent.click(closeBtn)
        expect(mockOnClose).toHaveBeenCalled()
    })
})
