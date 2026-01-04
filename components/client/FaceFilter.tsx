'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, Sparkles } from 'lucide-react'
import {
    FaceARConfig,
    loadFaceARScripts,
    registerFaceARComponents,
    createFaceARScene,
    setupVideoStyles,
} from '@/lib/face-ar'

interface FaceFilterProps {
    config: FaceARConfig & {
        instructions?: string
        rules_text?: string
        logo_url?: string
        capture_btn_text?: string
        capture_btn_color?: string
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
            setLoading(false)
            setupVideoStyles(containerRef.current!)
        })

        scene.addEventListener('arError', (event: any) => {
            console.error('MindAR Error:', event)
            setError('Lỗi khởi động AR (Camera/GPU)')
            setLoading(false)
        })

        faceAnchor.addEventListener('targetFound', () => {
            setFaceDetected(true)
        })

        faceAnchor.addEventListener('targetLost', () => {
            setFaceDetected(false)
        })

        containerRef.current.appendChild(scene)
    }

    const capturePhoto = async () => {
        setCapturing(true)

        try {
            const scene = document.querySelector('a-scene') as any
            const video = containerRef.current?.querySelector('video')

            if (!scene || !scene.canvas || !video) {
                throw new Error('Scene or Video not ready')
            }

            // Force a render
            scene.renderer?.render(scene.object3D, scene.camera)

            const aframeCanvas = scene.canvas as HTMLCanvasElement
            const width = aframeCanvas.width
            const height = aframeCanvas.height

            // Create composite canvas
            const captureCanvas = document.createElement('canvas')
            captureCanvas.width = width
            captureCanvas.height = height
            const ctx = captureCanvas.getContext('2d')

            if (!ctx) throw new Error('Could not create canvas context')

            // 1. Draw Video
            ctx.drawImage(video, 0, 0, width, height)

            // 2. Draw 3D Scene
            ctx.drawImage(aframeCanvas, 0, 0, width, height)

            const imageData = captureCanvas.toDataURL('image/jpeg', 0.92)
            onCapture(imageData)
        } catch (e) {
            console.error('Capture failed:', e)
            alert('Không thể chụp ảnh, vui lòng thử lại')
        }

        setCapturing(false)
    }

    const btnColor = config.capture_btn_color || '#ec4899'
    const btnText = config.capture_btn_text || 'Chụp ảnh'

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

            {/* Face Hint */}
            {!loading && !faceDetected && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center text-white">
                        <Sparkles size={48} className="mx-auto mb-4 animate-pulse text-pink-400" />
                        <p className="text-lg font-medium">{config.instructions || 'Hướng camera vào khuôn mặt'}</p>
                        <p className="text-sm opacity-70">Để áp dụng filter</p>
                    </div>
                </div>
            )}

            {/* Capture Button */}
            {!loading && faceDetected && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={capturePhoto}
                        disabled={capturing}
                        className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: btnColor }}
                    >
                        <Camera size={24} />
                        {btnText}
                    </button>
                </div>
            )}

            {/* Rules */}
            {config.rules_text && !loading && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="bg-black/60 backdrop-blur rounded-lg p-3 text-white text-xs max-h-20 overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: config.rules_text.replace(/\n/g, '<br>') }} />
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
