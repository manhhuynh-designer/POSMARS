/**
 * Unit tests for ARControls component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ARControls from '../ARControls'

describe('ARControls', () => {
    const defaultProps = {
        onCapture: vi.fn(),
        onStartRecord: vi.fn(),
        onStopRecord: vi.fn(),
        isRecording: false,
        recordingTime: 0
    }

    it('should render capture button with default text', () => {
        render(<ARControls {...defaultProps} />)

        expect(screen.getByText('Chụp')).toBeInTheDocument()
    })

    it('should render capture button with custom text', () => {
        render(
            <ARControls
                {...defaultProps}
                captureButtonText="Take Photo"
            />
        )

        expect(screen.getByText('Take Photo')).toBeInTheDocument()
    })

    it('should call onCapture when capture button clicked', () => {
        const onCapture = vi.fn()
        render(
            <ARControls
                {...defaultProps}
                onCapture={onCapture}
            />
        )

        const captureButton = screen.getByLabelText('Capture photo')
        fireEvent.click(captureButton)

        expect(onCapture).toHaveBeenCalledTimes(1)
    })

    it('should render record button when showRecordButton is true', () => {
        render(
            <ARControls
                {...defaultProps}
                showRecordButton={true}
            />
        )

        expect(screen.getByText('Quay')).toBeInTheDocument()
    })

    it('should not render record button when showRecordButton is false', () => {
        render(
            <ARControls
                {...defaultProps}
                showRecordButton={false}
            />
        )

        expect(screen.queryByText('Quay')).not.toBeInTheDocument()
    })

    it('should call onStartRecord when record button clicked', () => {
        const onStartRecord = vi.fn()
        render(
            <ARControls
                {...defaultProps}
                onStartRecord={onStartRecord}
            />
        )

        const recordButton = screen.getByLabelText('Start recording')
        fireEvent.click(recordButton)

        expect(onStartRecord).toHaveBeenCalledTimes(1)
    })

    it('should show stop button when recording', () => {
        render(
            <ARControls
                {...defaultProps}
                isRecording={true}
                recordingTime={5}
            />
        )

        expect(screen.getByText(/Dừng \(5s\)/)).toBeInTheDocument()
    })

    it('should call onStopRecord when stop button clicked', () => {
        const onStopRecord = vi.fn()
        render(
            <ARControls
                {...defaultProps}
                isRecording={true}
                recordingTime={5}
                onStopRecord={onStopRecord}
            />
        )

        const stopButton = screen.getByLabelText('Stop recording')
        fireEvent.click(stopButton)

        expect(onStopRecord).toHaveBeenCalledTimes(1)
    })

    it('should disable capture button when recording', () => {
        render(
            <ARControls
                {...defaultProps}
                isRecording={true}
            />
        )

        const captureButton = screen.getByLabelText('Capture photo')
        expect(captureButton).toBeDisabled()
    })

    it('should disable buttons when disabled prop is true', () => {
        render(
            <ARControls
                {...defaultProps}
                disabled={true}
            />
        )

        const captureButton = screen.getByLabelText('Capture photo')
        const recordButton = screen.getByLabelText('Start recording')

        expect(captureButton).toBeDisabled()
        expect(recordButton).toBeDisabled()
    })

    it('should show recording indicator when recording', () => {
        render(
            <ARControls
                {...defaultProps}
                isRecording={true}
            />
        )

        expect(screen.getByText(/Đang quay.../)).toBeInTheDocument()
    })
})
