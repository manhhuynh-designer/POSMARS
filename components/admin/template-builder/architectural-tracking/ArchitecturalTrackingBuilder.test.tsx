import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ArchitecturalTrackingBuilder from './ArchitecturalTrackingBuilder'

// Mock shared components
vi.mock('../shared/FileUploader', () => ({
    default: ({ onUpload, currentUrl }: any) => (
        <div data-testid="file-uploader">
            <button onClick={() => onUpload(new File([], 'test.glb'))}>Upload</button>
            {currentUrl && <span data-testid="url">{currentUrl}</span>}
        </div>
    )
}))

vi.mock('../shared/ColorPicker', () => ({
    default: ({ value, onChange }: any) => (
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid="color-picker"
        />
    )
}))

vi.mock('../shared/PreviewPhone', () => ({
    default: ({ children }: any) => <div data-testid="preview-phone">{children}</div>
}))

vi.mock('../../WebARRocksObjectPreview', () => ({
    default: ({ onClose }: any) => (
        <div data-testid="ar-preview">
            <button data-testid="close-ar-btn" onClick={onClose}>Close AR</button>
        </div>
    )
}))

describe('ArchitecturalTrackingBuilder', () => {
    const mockConfig = {
        object_model_url: '',
        overlay_models: [],
        instructions: 'Test instructions'
    }
    const mockOnChange = vi.fn()
    const mockOnUpload = vi.fn().mockResolvedValue('test-url')

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the builder tabs correctly', () => {
        render(<ArchitecturalTrackingBuilder template="architectural_tracking" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        expect(screen.getByTestId('tab-content')).toBeDefined()
        expect(screen.getByTestId('tab-branding')).toBeDefined()
        expect(screen.getByTestId('tab-settings')).toBeDefined()
    })

    it('starts AR simulation when play button is clicked', async () => {
        render(<ArchitecturalTrackingBuilder template="architectural_tracking" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        const startBtn = screen.getByTestId('start-simulation')
        fireEvent.click(startBtn)
        expect(await screen.findByTestId('ar-preview', {}, { timeout: 10000 })).toBeDefined()
    })

    it('closes AR simulation when onClose is triggered', async () => {
        render(<ArchitecturalTrackingBuilder template="architectural_tracking" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        fireEvent.click(screen.getByTestId('start-simulation'))
        const closeBtn = await screen.findByTestId('close-ar-btn', {}, { timeout: 10000 })
        fireEvent.click(closeBtn)
        expect(screen.queryByTestId('ar-preview')).toBeNull()
        expect(await screen.findByTestId('start-simulation', {}, { timeout: 10000 })).toBeDefined()
    })

    it('updates instructions in branding tab', async () => {
        render(<ArchitecturalTrackingBuilder template="architectural_tracking" initialConfig={mockConfig} onChange={mockOnChange} onUpload={mockOnUpload} />)
        fireEvent.click(screen.getByTestId('tab-branding'))
        const input = await screen.findByPlaceholderText(/Scan the building/i, {}, { timeout: 10000 })
        fireEvent.change(input, { target: { value: 'New instructions' } })
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ instructions: 'New instructions' }))
    })
})
