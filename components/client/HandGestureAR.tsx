'use client'

import { useEffect, useRef, useState } from 'react'
import { loadMediaPipeHands } from '@/lib/ar-loaders/mediapipe-loader'
import AROverlay from './shared/ar/AROverlay'
import ARControls from './shared/ar/ARControls'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'

interface GestureModel {
    id: string
    name: string
    gesture: 'open' | 'closed' | 'point' | 'peace' | 'thumbs_up'
    url: string
    scale: number
    position: [number, number, number]
    animation?: string
}

interface HandGestureConfig {
    gesture_models?: GestureModel[]
    gesture_sensitivity?: number
    logo_url?: string
    instructions?: string
    enable_capture?: boolean
    enable_record?: boolean
    capture_btn_text?: string
    capture_btn_color?: string
    max_video_duration?: number
}

interface HandGestureARProps {
    config: HandGestureConfig
    onComplete: () => void
    onCapture?: (imageUrl: string) => void
}

/**
 * Hand Gesture AR using MediaPipe Hands
 * Control AR experiences with hand gestures
 */
export default function HandGestureAR({
    config,
    onComplete,
    onCapture
}: HandGestureARProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [arReady, setArReady] = useState(false)
    const [gestureDetected, setGestureDetected] = useState(false)
    const [showVideoPreview, setShowVideoPreview] = useState(false)

    const {
        isRecording,
        recordingTime,
        recordedVideoUrl,
        startRecording,
        stopRecording,
        clearRecording,
        downloadRecording
    } = useVideoRecorder({ maxDuration: config.max_video_duration || 30 })

    useEffect(() => {
        const init = async () => {
            try {
                await loadMediaPipeHands()
                initARScene()
            } catch (e) {
                console.error('Failed to initialize Hand Gesture AR:', e)
                setError('Không thể khởi động Hand Gesture AR')
                setLoading(false)
            }
        }

        init()

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = ''
            }
        }
    }, [])

    const initARScene = () => {
        if (!containerRef.current) return

        setLoading(false)
        setArReady(true)

        console.log('👋 Hand Gesture AR initialized')
        console.log('Gesture sensitivity:', config.gesture_sensitivity)
        console.log('Gesture models:', config.gesture_models)

        // Simulate gesture detection
        setTimeout(() => {
            setGestureDetected(true)
            console.log('✅ Gesture detected!')
        }, 2000)
    }

    const handleCapture = async () => {
        if (!onCapture) return

        try {
            const canvas = document.createElement('canvas')
            const video = containerRef.current?.querySelector('video') as HTMLVideoElement

            if (!video) {
                console.warn('No video element found for capture')
                return
            }

            canvas.width = video.videoWidth || 1920
            canvas.height = video.videoHeight || 1080
            const ctx = canvas.getContext('2d')

            if (!ctx) return

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            const imageData = canvas.toDataURL('image/jpeg', 0.95)
            onCapture(imageData)
        } catch (e) {
            console.error('Capture failed:', e)
            alert('Không thể chụp ảnh')
        }
    }

    const handleStartRecord = () => {
        const video = containerRef.current?.querySelector('video') as HTMLVideoElement
        const arCanvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement

        if (video) {
            startRecording(video, arCanvas, true)
        }
    }

    const handleStopRecord = () => {
        stopRecording()
        setShowVideoPreview(true)
    }

    return (
        <div className="fixed inset-0 bg-black">
            <div ref={containerRef} className="w-full h-full" />

            <AROverlay
                logoUrl={config.logo_url}
                instructions={config.instructions || 'Use hand gestures to interact'}
                showScanHint={!gestureDetected && arReady}
                onClose={onComplete}
            />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-orange-500 rounded-full mx-auto mb-4" />
                        <p>Đang khởi động Hand Gesture AR...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white p-6">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-orange-500 px-6 py-2 rounded-lg hover:bg-orange-600"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            )}

            {arReady && !showVideoPreview && (config.enable_capture || onCapture) && (
                <ARControls
                    onCapture={handleCapture}
                    onStartRecord={handleStartRecord}
                    onStopRecord={handleStopRecord}
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    captureButtonText={config.capture_btn_text}
                    captureButtonColor={config.capture_btn_color}
                    showRecordButton={config.enable_record !== false}
                />
            )}

            {showVideoPreview && recordedVideoUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1b] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                        <div className="relative aspect-[9/16] bg-black">
                            <video
                                src={recordedVideoUrl}
                                controls
                                autoPlay
                                loop
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        clearRecording()
                                        setShowVideoPreview(false)
                                    }}
                                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition"
                                >
                                    Hủy
                                </button>

                                <button
                                    onClick={() => downloadRecording()}
                                    className="flex items-center gap-2 bg-green-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition"
                                >
                                    Tải về
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
