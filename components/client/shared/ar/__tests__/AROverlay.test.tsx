/**
 * Unit tests for AROverlay component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AROverlay from '../AROverlay'

describe('AROverlay', () => {
    it('should render logo when provided', () => {
        render(
            <AROverlay
                logoUrl="/test-logo.png"
                onClose={() => { }}
            />
        )

        const logo = screen.getByAltText('Logo')
        expect(logo).toBeInTheDocument()
        expect(logo).toHaveAttribute('src', '/test-logo.png')
    })

    it('should not render logo when not provided', () => {
        render(
            <AROverlay
                onClose={() => { }}
            />
        )

        const logo = screen.queryByAltText('Logo')
        expect(logo).not.toBeInTheDocument()
    })

    it('should show scan hint when enabled', () => {
        render(
            <AROverlay
                showScanHint={true}
                instructions="Scan the building"
                onClose={() => { }}
            />
        )

        expect(screen.getByText('Scan the building')).toBeInTheDocument()
    })

    it('should show default instructions when not provided', () => {
        render(
            <AROverlay
                showScanHint={true}
                onClose={() => { }}
            />
        )

        expect(screen.getByText('Scan the object to activate AR')).toBeInTheDocument()
    })

    it('should not show scan hint when disabled', () => {
        render(
            <AROverlay
                showScanHint={false}
                instructions="This should not appear"
                onClose={() => { }}
            />
        )

        expect(screen.queryByText('This should not appear')).not.toBeInTheDocument()
    })

    it('should call onClose when close button clicked', () => {
        const onClose = vi.fn()
        render(
            <AROverlay
                onClose={onClose}
            />
        )

        const closeButton = screen.getByLabelText('Close AR')
        fireEvent.click(closeButton)

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should always render close button', () => {
        render(
            <AROverlay
                onClose={() => { }}
            />
        )

        expect(screen.getByLabelText('Close AR')).toBeInTheDocument()
    })
})
