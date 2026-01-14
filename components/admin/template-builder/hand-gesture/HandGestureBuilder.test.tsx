import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HandGestureBuilder from './HandGestureBuilder'

// Mock shared components
vi.mock('../shared/FileUploader', () => ({
    default: ({ onUpload, currentUrl }: any) => (
        <div data-testid="file-uploader">
            <button onClick={() => onUpload(new File([], 'test.glb'))}>Upload</button>
            {currentUrl && <span data-testid="url">{currentUrl}</span>}
        </div>
    )
}))

vi.mock('../shared/PreviewPhone', () => ({
    default: ({ children }: any) => <div data-testid="preview-phone">{children}</div>
}))

vi.mock('../../HandGesturePreview', () => ({
    default: ({ onClose }: any) => (
        <div data-testid="ar-preview">
            <button onClick={onClose}>Close AR</button>
        </div>
    )
}))

describe('HandGestureBuilder', () => {
    const mockConfig = {
        gesture_models: [],
        gesture_sensitivity: 0.7,
        instructions: 'Test instructions'
    }
    const mockOnChange = vi.fn()
    const mockOnUpload = vi.fn().mockResolvedValue('test-model-url')

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the builder tabs correctly', () => {
        render(<HandGestureBuilder template="hand_gesture" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        expect(screen.getByTestId('tab-content')).toBeDefined()
    })

    it('starts simulation when clicked', () => {
        render(<HandGestureBuilder template="hand_gesture" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        // Find by test id instead of text
        fireEvent.click(screen.getByTestId('start-simulation'))
        expect(screen.getByTestId('ar-preview')).toBeDefined()
    })

    it('adjusts sensitivity range', () => {
        const configWithModel = {
            ...mockConfig,
            gesture_models: [{ id: '1', name: 'G1', gesture: 'open', url: '', scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] }]
        }
        render(<HandGestureBuilder template="hand_gesture" initialConfig={configWithModel} onChange={mockOnChange} onUpload={mockOnUpload} />)
        fireEvent.click(screen.getByTestId('tab-settings'))
        const slider = screen.getByRole('slider')
        fireEvent.change(slider, { target: { value: '0.9' } })
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ gesture_sensitivity: 0.9 }))
    })
})
