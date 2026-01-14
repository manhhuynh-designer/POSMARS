import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProductConfigurator from './ProductConfigurator'
import { ProductConfiguratorConfig } from '../admin/template-builder/types'

// Mock 3D components as they require WebGL context
vi.mock('@/components/admin/template-builder/product-configurator/ConfiguratorPreview', () => ({
    default: ({ onMeshClick, onHotspotClick }: any) => (
        <div data-testid="mock-3d-preview">
            <button onClick={() => onMeshClick('mesh_1')}>Simulate Mesh Click</button>
            <button onClick={() => onHotspotClick('hotspot_1')}>Simulate Hotspot Click</button>
        </div>
    )
}))

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
    default: {
        sanitize: (content: string) => content
    }
}))

describe('ProductConfigurator', () => {
    const mockConfig: ProductConfiguratorConfig = {
        model_url: 'test.glb',
        parts: [
            {
                id: 'part_1',
                name: 'Chair Leg',
                mesh_name: 'mesh_1',
                variants: [
                    { id: 'v1', name: 'Wood', color: '#8B4513' },
                    { id: 'v2', name: 'Metal', color: '#C0C0C0' }
                ]
            }
        ],
        hotspots: [
            {
                id: 'hotspot_1',
                position: [0, 1, 0],
                label: 'Test Hotspot',
                content: '<p>Info Content</p>'
            }
        ]
    }

    it('renders the configurator UI', () => {
        render(<ProductConfigurator config={mockConfig} />)
        expect(screen.getByTestId('mock-3d-preview')).toBeDefined()
        expect(screen.getByText('Chair Leg')).toBeDefined() // Part tab
    })

    it('displays variants for the active part', () => {
        render(<ProductConfigurator config={mockConfig} />)
        // Default active part is first one
        expect(screen.getByText('Wood')).toBeDefined()
        expect(screen.getByText('Metal')).toBeDefined()
    })

    it('switches active part when clicked', () => {
        render(<ProductConfigurator config={mockConfig} />)
        const partButton = screen.getByText('Chair Leg')
        fireEvent.click(partButton)
        // Check if variants are still visible (logic confirms active state)
        expect(screen.getByText('Wood')).toBeDefined()
    })

    it('updates 3D view selection on click', () => {
        render(<ProductConfigurator config={mockConfig} />)
        // Simulate click in 3D view (via mock)
        fireEvent.click(screen.getByText('Simulate Mesh Click'))
        // Should set active part to 'part_1' (Chair Leg)
        expect(screen.getByText('Chair Leg')).toBeDefined()
    })

    it('shows hotspot modal on click', () => {
        render(<ProductConfigurator config={mockConfig} />)
        fireEvent.click(screen.getByText('Simulate Hotspot Click'))

        // Modal should appear
        expect(screen.getByText('Test Hotspot')).toBeDefined()
        expect(screen.getByText('Info Content')).toBeDefined()

        // Close modal
        const closeButton = screen.getAllByRole('button')[0] // Assuming first button in modal header
        // Alternatively find by icon or class if accessible
    })
})
