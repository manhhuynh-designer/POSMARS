/**
 * Integration tests for WebARRocksHand component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WebARRocksHand from '../WebARRocksHand'

vi.mock('@/lib/ar-loaders/webAR-rocks-loader', () => ({
    loadWebARRocksHand: vi.fn().mockResolvedValue(undefined)
}))

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

describe('WebARRocksHand Component', () => {
    const mockConfig = {
        accessory_models: [
            {
                id: 'watch-1',
                name: 'Test Watch',
                type: 'watch' as const,
                url: 'https://example.com/watch.glb',
                scale: 1.0,
                position: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number]
            }
        ],
        hand_preference: 'both' as const,
        enable_capture: true
    }

    it('should render loading state', () => {
        render(
            <WebARRocksHand
                config={mockConfig}
                onComplete={vi.fn()}
            />
        )

        expect(screen.getByText('Đang khởi động Hand Tracking...')).toBeInTheDocument()
    })

    it('should render AROverlay with hand tracking instructions', async () => {
        render(
            <WebARRocksHand
                config={{ ...mockConfig, instructions: 'Show your hand' }}
                onComplete={vi.fn()}
            />
        )

        expect(await screen.findByText(/Show your hand/i)).toBeInTheDocument()
    })
})
