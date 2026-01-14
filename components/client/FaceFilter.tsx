'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, Sparkles, Video, Square, Download, Play } from 'lucide-react'
import DOMPurify from 'isomorphic-dompurify'
import {
    FaceARConfig,
    loadFaceARScripts,
    registerFaceARComponents,
    createFaceARScene,
    setupVideoStyles,
} from '@/lib/face-ar'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'

interface FaceFilterProps {
    config: FaceARConfig & {
        instructions?: string
        rules_text?: string
        logo_url?: string
        capture_btn_text?: string
        capture_btn_color?: string
        enable_capture?: boolean
    }
    onCapture: (imageData: string) => void
    onComplete: () => void
}

export default function FaceFilter({ config, onCapture, onComplete }: FaceFilterProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [faceDetected, setFaceDetected] = useState(false)
    const [capturing, setCapturing] = useState(false)
    const [showVideoPreview, setShowVideoPreview] = useState(false)

    // Video recording hook
    const {
        isRecording,
        recordingTime,
        recordedVideoUrl,
        startRecording,
        stopRecording,
        clearRecording,
        downloadRecording
    } = useVideoRecorder({ maxDuration: 30 })

    useEffect(() => {
        const init = async () => {
            try {
                if ((window as any).MINDAR?.FACE) {
                    initFaceAR()
                    return
                }

                await loadFaceARScripts()
                registerFaceARComponents(false) // Production mode (invisible occluder)
                initFaceAR()
            } catch (e) {
                console.error('Failed to load AR scripts:', e)
                setError('Không thể tải thư viện Face AR')
                setLoading(false)
            }
        }

        init()

        return () => {
            const scene = document.querySelector('a-scene')
            if (scene) scene.remove()
        }
    }, [])

    const initFaceAR = () => {
        if (!containerRef.current) return

        // Cleanup existing content
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
        }

        // Create scene using shared utility
        const { scene, faceAnchor } = createFaceARScene(config, {
            debugMode: false,      // Production: invisible occluder
            showFaceMesh: false,   // Production: no mesh overlay
            colorManagement: true,
        })

        // Event Listeners
        scene.addEventListener('arReady', () => {
            console.log('✅ FaceFilter: AR Ready!')
            setLoading(false)
            setupVideoStyles(containerRef.current!)

            // Fallback: Set face detected after a short delay
            // Some mobile browsers may not fire targetFound reliably
            setTimeout(() => {
                console.log('⏰ FaceFilter: Auto-enabling capture after timeout')
                setFaceDetected(true)
            }, 3000)
        })

        scene.addEventListener('arError', (event: any) => {
            console.error('❌ FaceFilter AR Error:', event)
            setError('Lỗi khởi động AR (Camera/GPU)')
            setLoading(false)
        })

        // Append scene to DOM first, then attach target listeners
        containerRef.current.appendChild(scene)

        // Wait for scene to be fully initialized before attaching face target listeners
        setTimeout(() => {
            const faceTarget = document.querySelector('[mindar-face-target]')
            if (faceTarget) {
                console.log('🎯 FaceFilter: Attaching face target listeners')
                faceTarget.addEventListener('targetFound', () => {
                    console.log('🟢 FaceFilter: Face detected!')
                    setFaceDetected(true)
                })
                faceTarget.addEventListener('targetLost', () => {
                    console.log('🔴 FaceFilter: Face lost!')
                    // Don't set to false - keep button visible once face was detected
                })
            } else {
                console.warn('⚠️ FaceFilter: No face target element found')
            }
        }, 1000)
    }

    const capturePhoto = async () => {
        setCapturing(true)

        try {
            const scene = document.querySelector('a-scene') as any
            const video = containerRef.current?.querySelector('video') as HTMLVideoElement

            if (!scene || !scene.canvas || !video) {
                throw new Error('Scene or Video not ready')
            }

            // Force a render
            scene.renderer?.render(scene.object3D, scene.camera)

            // Use video native resolution for best quality
            const videoWidth = video.videoWidth || 1920
            const videoHeight = video.videoHeight || 1080

            const aframeCanvas = scene.canvas as HTMLCanvasElement

            // Create high-resolution composite canvas
            const captureCanvas = document.createElement('canvas')
            captureCanvas.width = videoWidth
            captureCanvas.height = videoHeight
            const ctx = captureCanvas.getContext('2d')

            if (!ctx) throw new Error('Could not create canvas context')

            // 1. Draw Video background (mirrored for selfie mode)
            ctx.save()
            ctx.translate(videoWidth, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
            ctx.restore()

            // 2. Draw 3D Scene overlay (unmirrored, as aframeCanvas is already mirrored in face mode)
            ctx.drawImage(aframeCanvas, 0, 0, videoWidth, videoHeight)

            // Export at high quality
            const imageData = captureCanvas.toDataURL('image/jpeg', 0.95)
            onCapture(imageData)
        } catch (e) {
            console.error('Capture failed:', e)
            alert('Không thể chụp ảnh, vui lòng thử lại')
        }

        setCapturing(false)
    }

    const btnColor = config.capture_btn_color || '#ec4899'
    const btnText = config.capture_btn_text || 'Chụp ảnh'

    console.log('FaceFilter Render Info:', {
        loading,
        faceDetected,
        capturing,
        isRecording,
        showVideoPreview,
        enableCapture: Boolean(onCapture || config.enable_capture)
    })

    return (
        <div className="fixed inset-0 bg-transparent">
            <div ref={containerRef} className="w-full h-full" />

            {/* Dark overlay for loading state only */}
            {loading && <div className="absolute inset-0 bg-black -z-10" />}

            {/* Logo */}
            {config.logo_url && (
                <div className="absolute top-4 left-4 z-20">
                    <img src={config.logo_url} alt="Logo" className="h-10 object-contain" />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-pink-500 rounded-full mx-auto mb-4" />
                        <p>Đang khởi động Face Filter...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white p-6">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="bg-pink-500 px-6 py-2 rounded-lg">
                            Thử lại
                        </button>
                    </div>
                </div>
            )}

            {/* Face Hint - only show briefly until face detected */}
            {!loading && !faceDetected && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center text-white bg-black/40 px-6 py-4 rounded-2xl">
                        <Sparkles size={48} className="mx-auto mb-4 animate-pulse text-pink-400" />
                        <p className="text-lg font-medium">{config.instructions || 'Hướng camera vào khuôn mặt'}</p>
                        <p className="text-sm opacity-70">Đang tìm khuôn mặt...</p>
                    </div>
                </div>
            )}

            {/* Capture & Record Buttons - Always show after loading */}
            {!loading && !showVideoPreview && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-4">
                        {/* Photo Capture Button */}
                        <button
                            onClick={capturePhoto}
                            disabled={capturing || isRecording}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${faceDetected ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
                                }`}
                            style={{ backgroundColor: btnColor }}
                        >
                            <Camera size={22} />
                            {capturing ? '...' : 'Chụp'}
                        </button>

                        {/* Video Record Button */}
                        {!isRecording ? (
                            <button
                                onClick={() => {
                                    const video = containerRef.current?.querySelector('video') as HTMLVideoElement
                                    const arCanvas = document.querySelector('a-scene canvas') as HTMLCanvasElement
                                    // Selfie mode mirror on (Face Filter)
                                    if (video && arCanvas) startRecording(video, arCanvas, true)
                                }}
                                disabled={capturing}
                                className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-500 text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Video size={22} />
                                Quay
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    stopRecording()
                                    setShowVideoPreview(true)
                                }}
                                className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-600 text-white font-semibold shadow-lg animate-pulse"
                            >
                                <Square size={18} fill="white" />
                                Dừng ({recordingTime}s)
                            </button>
                        )}
                    </div>
                    {!faceDetected && (
                        <p className="text-center text-white/70 text-xs mt-2">Chờ phát hiện khuôn mặt...</p>
                    )}
                    {isRecording && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white text-sm">Đang quay... (tối đa 30s)</span>
                        </div>
                    )}
                </div>
            )}

            {/* Video Preview Dialog */}
            {showVideoPreview && recordedVideoUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1b] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                        {/* Video container */}
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

                        {/* Action Buttons */}
                        <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        clearRecording()
                                        setShowVideoPreview(false)
                                    }}
                                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition active:scale-95"
                                >
                                    <X size={18} />
                                    <span className="text-xs font-bold uppercase">Hủy</span>
                                </button>

                                <button
                                    onClick={() => downloadRecording()}
                                    className="flex items-center gap-2 bg-green-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition"
                                >
                                    <Download size={18} />
                                    <span className="text-xs font-bold uppercase">Tải về</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules */}
            {config.rules_text && !loading && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="bg-black/60 backdrop-blur rounded-lg p-3 text-white text-xs max-h-20 overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.rules_text.replace(/\n/g, '<br>')) }} />
                    </div>
                </div>
            )}

            {/* Close Button */}
            <button
                onClick={onComplete}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white z-20"
            >
                <X size={24} />
            </button>
        </div>
    )
}
