import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WorldARBuilder from './WorldARBuilder'

// Mock shared components
vi.mock('../shared/FileUploader', () => ({
    default: ({ onUpload, currentUrl, helperText }: any) => (
        <div data-testid="file-uploader">
            <button onClick={() => onUpload(new File([], 'test.glb'))}>Upload</button>
            {currentUrl && <span data-testid="url">{currentUrl}</span>}
            {helperText && <span>{helperText}</span>}
        </div>
    )
}))

vi.mock('../shared/PreviewPhone', () => ({
    default: ({ children }: any) => <div data-testid="preview-phone">{children}</div>
}))

vi.mock('../../WorldARPreview', () => ({
    default: ({ onClose }: any) => (
        <div data-testid="ar-preview">
            <button onClick={onClose}>Close AR</button>
        </div>
    )
}))

describe('WorldARBuilder', () => {
    const mockConfig = {
        placement_models: [],
        placement_mode: 'tap',
        instructions: 'Test instructions'
    }
    const mockOnChange = vi.fn()
    const mockOnUpload = vi.fn().mockResolvedValue('test-model-url')

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the character/world branding tab', () => {
        render(
            <WorldARBuilder
                template="world_ar"
                initialConfig={mockConfig}
                onChange={mockOnChange}
                onUpload={mockOnUpload}
            />
        )
        screen.debug()
        expect(screen.getByTestId('tab-content')).toBeDefined()
    })

    it('can add a placement model', () => {
        render(
            <WorldARBuilder
                template="world_ar"
                initialConfig={mockConfig}
                onChange={mockOnChange}
                onUpload={mockOnUpload}
            />
        )

        fireEvent.click(screen.getByText(/add model/i))

        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
            placement_models: expect.arrayContaining([
                expect.objectContaining({
                    name: expect.stringContaining('Model'),
                    scale: 1.0
                })
            ])
        }))
    })

    it('shows preview simulation when play is clicked', () => {
        render(
            <WorldARBuilder
                template="world_ar"
                initialConfig={mockConfig}
                onChange={mockOnChange}
                onUpload={mockOnUpload}
            />
        )

        fireEvent.click(screen.getByTestId('start-simulation'))
        expect(screen.getByTestId('ar-preview')).toBeDefined()
    })
})
