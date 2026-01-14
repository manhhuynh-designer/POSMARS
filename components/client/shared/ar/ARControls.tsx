'use client'

import { Camera, Video, Square } from 'lucide-react'

interface ARControlsProps {
    onCapture: () => void
    onStartRecord: () => void
    onStopRecord: () => void
    isRecording: boolean
    recordingTime: number
    captureButtonText?: string
    captureButtonColor?: string
    disabled?: boolean
    showRecordButton?: boolean
}

/**
 * Shared AR Controls Component
 * Provides consistent capture and recording controls for AR templates
 */
export default function ARControls({
    onCapture,
    onStartRecord,
    onStopRecord,
    isRecording,
    recordingTime,
    captureButtonText = 'Chụp',
    captureButtonColor = '#ec4899',
    disabled = false,
    showRecordButton = true
}: ARControlsProps) {
    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-4">
                {/* Capture Button */}
                <button
                    onClick={onCapture}
                    disabled={disabled || isRecording}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: captureButtonColor }}
                    aria-label="Capture photo"
                >
                    <Camera size={22} />
                    {captureButtonText}
                </button>

                {/* Record Button */}
                {showRecordButton && (
                    <>
                        {!isRecording ? (
                            <button
                                onClick={onStartRecord}
                                disabled={disabled}
                                className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-500 text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600"
                                aria-label="Start recording"
                            >
                                <Video size={22} />
                                Quay
                            </button>
                        ) : (
                            <button
                                onClick={onStopRecord}
                                className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-600 text-white font-semibold shadow-lg animate-pulse"
                                aria-label="Stop recording"
                            >
                                <Square size={18} fill="white" />
                                Dừng ({recordingTime}s)
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Recording Indicator */}
            {isRecording && (
                <div className="flex items-center justify-center gap-2 mt-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">Đang quay... (tối đa 30s)</span>
                </div>
            )}
        </div>
    )
}
