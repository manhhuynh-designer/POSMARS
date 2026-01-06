'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, Sparkles } from 'lucide-react'
import {
    FaceARConfig,
    loadFaceARScripts,
    registerFaceARComponents,
    createFaceARScene,
    updateFilterTransform,
    setupVideoStyles,
} from '@/lib/face-ar'

interface FaceFilterPreviewProps {
    config: FaceARConfig
    debugMode?: boolean
    onClose: () => void
}

export default function FaceFilterPreview({ config, debugMode = true, onClose }: FaceFilterPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const filterEntityRef = useRef<HTMLElement | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [faceDetected, setFaceDetected] = useState(false)

    // Initial Setup - Load scripts and create scene
    useEffect(() => {
        const init = async () => {
            try {
                // Check if already loaded
                if ((window as any).MINDAR?.FACE) {
                    initFaceAR()
                    return
                }

                await loadFaceARScripts()
                registerFaceARComponents(true) // Debug mode ON for admin
                initFaceAR()
            } catch (e) {
                console.error('Failed to load AR scripts:', e)
                setError('Không thể tải thư viện Face AR')
                setLoading(false)
            }
        }

        init()

        return () => {
            const scene = containerRef.current?.querySelector('a-scene')
            if (scene) scene.remove()
        }
    }, [])

    // Soft Updates for Transform (Position, Rotation, Scale)
    useEffect(() => {
        updateFilterTransform(filterEntityRef.current, config)
        console.log('Soft Update:', {
            scale: config.filter_scale,
            pos: [config.offset_x, config.offset_y, config.offset_z],
            rot: [config.rotation_x, config.rotation_y, config.rotation_z]
        })
    }, [
        config.filter_scale,
        config.scale_x,
        config.scale_y,
        config.scale_z,
        config.offset_x,
        config.offset_y,
        config.offset_z,
        config.rotation_x,
        config.rotation_y,
        config.rotation_z
    ])

    // Re-init when filter type/URL/anchor/occlusion toggle/debugMode changes
    useEffect(() => {
        if (!loading && containerRef.current) {
            initFaceAR()
        }
    }, [
        config.filter_type,
        config.filter_url,
        config.filter_3d_url,
        config.anchor_position,
        config.full_head_occlusion,  // Only re-init when toggled on/off
        config.blend_mode,  // Blend mode needs re-init since it's applied at scene creation
        // NOT occlusion_radius or occlusion_offset_z - these update in real-time below
        debugMode
    ])

    // Soft Updates for Occlusion Sphere (real-time, no camera restart)
    useEffect(() => {
        if (!config.full_head_occlusion) return  // Only update if occlusion is enabled

        const sphere = document.querySelector('a-sphere[data-occlusion-sphere]') as HTMLElement
        if (sphere) {
            const radius = config.occlusion_radius ?? 0.15
            const offsetZ = config.occlusion_offset_z ?? -0.08

            sphere.setAttribute('radius', radius.toString())
            sphere.setAttribute('position', `0 0.02 ${offsetZ}`)
            console.log('🔄 Occlusion sphere updated:', { radius, offsetZ })
        }
    }, [config.occlusion_radius, config.occlusion_offset_z, config.full_head_occlusion])

    // Update sphere material when debug mode toggles (real-time)
    useEffect(() => {
        if (!config.full_head_occlusion) return

        const sphere = document.querySelector('a-sphere[data-occlusion-sphere]') as HTMLElement
        if (sphere) {
            // Update head-occluder component attribute
            sphere.setAttribute('head-occluder', `debug: ${debugMode}`)
            console.log(debugMode ? '🔴 Switched to DEBUG mode' : '⚫ Switched to PRODUCTION mode (invisible)')
        }
    }, [debugMode, config.full_head_occlusion])

    const initFaceAR = () => {
        if (!containerRef.current) return
        console.log('initFaceAR called', config)

        // Cleanup existing content
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
        }

        // Create scene using shared utility
        const { scene, faceAnchor, filterEntity } = createFaceARScene(config, {
            debugMode: debugMode,      // Controlled by prop
            showFaceMesh: debugMode,   // Show face mesh only in debug mode
            colorManagement: true,
        })

        // Save filter entity reference for soft updates
        filterEntityRef.current = filterEntity

        // Event Listeners
        scene.addEventListener('arReady', () => {
            setLoading(false)
            setupVideoStyles(containerRef.current!)

            // Fallback: Auto-detect face after timeout (events may not fire reliably)
            setTimeout(() => {
                console.log('⏰ Preview: Auto-enabling face detection after 3s')
                setFaceDetected(true)
            }, 3000)
        })

        scene.addEventListener('arError', (event: any) => {
            console.error('MindAR Error:', event)
            setError('Lỗi khởi động AR (Camera/GPU)')
            setLoading(false)
        })

        // Append scene to DOM FIRST
        containerRef.current.appendChild(scene)

        // THEN attach face target listeners after scene is initialized
        setTimeout(() => {
            const faceTarget = document.querySelector('[mindar-face-target]')
            if (faceTarget) {
                console.log('🎯 Preview: Attaching face target listeners')
                faceTarget.addEventListener('targetFound', () => {
                    console.log('👤 Face FOUND')
                    setFaceDetected(true)
                })

                faceTarget.addEventListener('targetLost', () => {
                    console.log('❌ Face LOST')
                    // Don't reset to false - keep detection visible
                })
            } else {
                console.warn('⚠️ Preview: No face target element found')
            }
        }, 1000)
    }

    return (
        <div
            className="bg-gray-900 rounded-lg relative"
            style={{
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                clipPath: 'inset(0)',
                contain: 'strict',
            }}
        >
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{
                    overflow: 'hidden',
                    position: 'relative',
                }}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                    <Camera size={16} />
                    Live Preview
                </span>
                <button
                    onClick={onClose}
                    className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white">
                        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-pink-500 rounded-full mx-auto mb-2" />
                        <p className="text-sm">Đang khởi động camera...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white p-4">
                        <p className="text-red-400 text-sm mb-2">{error}</p>
                        <button onClick={() => window.location.reload()} className="bg-pink-500 px-4 py-1 rounded text-sm">
                            Thử lại
                        </button>
                    </div>
                </div>
            )}

            {/* Face Status */}
            {!loading && (
                <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs flex items-center gap-1 z-10 ${faceDetected ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
                    }`}>
                    {faceDetected ? (
                        <>
                            <Sparkles size={12} />
                            Đã nhận diện khuôn mặt
                        </>
                    ) : (
                        <>
                            <Camera size={12} />
                            Đang tìm khuôn mặt...
                        </>
                    )}
                </div>
            )}

            {/* No filter warning */}
            {!config.filter_url && !config.filter_3d_url && !loading && (
                <div className="absolute bottom-3 right-3 px-3 py-1 bg-orange-500 text-white rounded-full text-xs z-10">
                    ⚠️ Chưa có filter, đang dùng emoji demo
                </div>
            )}
        </div>
    )
}
