import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductConfiguratorBuilder from './ProductConfiguratorBuilder'

// Mock dependencies
vi.mock('./ConfiguratorPreview', () => ({
    default: ({ onMeshClick, onPointClick, mode }: any) => (
        <div data-testid="mock-preview">
            <span>Mode: {mode}</span>
            <button onClick={() => onMeshClick('mesh_NEW')}>Mock Mesh Click</button>
            <button onClick={() => onPointClick([0, 0, 0], [0, 1, 0])}>Mock Point Click</button>
        </div>
    )
}))

vi.mock('../shared/FileUploader', () => ({
    default: ({ label }: any) => <div>Upload {label}</div>
}))

vi.mock('../shared/ColorPicker', () => ({
    default: ({ value, onChange }: any) => (
        <input data-testid="color-picker" value={value} onChange={e => onChange(e.target.value)} />
    )
}))

describe('ProductConfiguratorBuilder', () => {
    const mockConfig = {
        model_url: 'model.glb',
        parts: [],
        hotspots: []
    }
    const mockChange = vi.fn()
    const mockUpload = vi.fn()

    it('renders navigation tabs', () => {
        render(<ProductConfiguratorBuilder config={mockConfig} onChange={mockChange} onUpload={mockUpload} />)
        expect(screen.getByText('General')).toBeDefined()
        expect(screen.getByText('Configurable Parts')).toBeDefined()
        expect(screen.getByText('Hotspots')).toBeDefined()
    })

    it('switches to Parts tab and adds a part', () => {
        render(<ProductConfiguratorBuilder config={mockConfig} onChange={mockChange} onUpload={mockUpload} />)

        // Click Parts Tab
        fireEvent.click(screen.getByText('Configurable Parts'))

        // Check "Add Part" button
        const addButton = screen.getByText('Add Part')
        fireEvent.click(addButton)

        // Should trigger onChange with new part
        expect(mockChange).toHaveBeenCalled()
        const newConfig = mockChange.mock.calls[0][0]
        expect(newConfig.parts).toHaveLength(1)
        expect(newConfig.parts[0].name).toBe('New Part')

        // Should behave as "Inspector" mode now
        // We can check if mock-preview shows "Mode: inspect" if we re-render with new state, 
        // but since component holds internal state for mode, we can try to find the "inspect" mode indicator in the mock or component
    })

    it('adds a hotspot', () => {
        render(<ProductConfiguratorBuilder config={mockConfig} onChange={mockChange} onUpload={mockUpload} />)

        // Go to Hotspots tab
        fireEvent.click(screen.getByText('Hotspots'))

        // Simulate click on 3D model
        fireEvent.click(screen.getByText('Mock Point Click'))

        // Should add hotspot
        expect(mockChange).toHaveBeenCalled()
        // Note: mockChange is cumulative in this test file context? No, it's a mock function history.
        // We need to check the LAST call
        const lastCall = mockChange.mock.calls[mockChange.mock.calls.length - 1][0]
        expect(lastCall.hotspots).toHaveLength(1)
        expect(lastCall.hotspots[0].label).toBe('Info Point')
    })
})
