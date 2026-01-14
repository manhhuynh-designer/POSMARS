/**
 * Integration tests for WebAR.rocks Object component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import WebARRocksObject from '../WebARRocksObject'

// Mock the loader
vi.mock('@/lib/ar-loaders/webAR-rocks-loader', () => ({
    loadWebARRocksObject: vi.fn().mockResolvedValue(undefined)
}))

// Mock useVideoRecorder
vi.mock('@/hooks/useVideoRecorder', () => ({
    useVideoRecorder: () => ({
        isRecording: false,
        recordingTime: 0,
        recordedVideoUrl: null,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        clearRecording: vi.fn(),
        downloadRecording: vi.fn()
    })
}))

describe('WebARRocksObject Component', () => {
    const mockConfig = {
        object_model_url: 'https://example.com/model.zip',
        overlay_models: [
            {
                id: 'model-1',
                name: 'Test Model',
                url: 'https://example.com/overlay.glb',
                scale: 1.0,
                position: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number]
            }
        ],
        logo_url: 'https://example.com/logo.png',
        instructions: 'Scan the building',
        enable_capture: true,
        enable_record: true
    }

    const mockOnComplete = vi.fn()
    const mockOnCapture = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render loading state initially', () => {
        render(
            <WebARRocksObject
                config={mockConfig}
                onComplete={mockOnComplete}
                onCapture={mockOnCapture}
            />
        )

        expect(screen.getByText('Đang khởi động Object Tracking...')).toBeInTheDocument()
    })

    it('should render AROverlay with correct props', async () => {
        render(
            <WebARRocksObject
                config={mockConfig}
                onComplete={mockOnComplete}
                onCapture={mockOnCapture}
            />
        )

        await waitFor(() => {
            expect(screen.getByAltText('Logo')).toBeInTheDocument()
        })
    })

    it('should call onComplete when close button clicked', async () => {
        render(
            <WebARRocksObject
                config={mockConfig}
                onComplete={mockOnComplete}
                onCapture={mockOnCapture}
            />
        )

        const closeButton = await screen.findByLabelText('Close AR')
        closeButton.click()

        expect(mockOnComplete).toHaveBeenCalledTimes(1)
    })
})
