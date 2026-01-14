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
        let isMounted = true

        const init = async () => {
            try {
                await loadFaceARScripts()
                registerFaceARComponents(true) // Debug mode ON for admin
                if (isMounted) initFaceAR()
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to load AR scripts:', e)
                    setError('Không thể tải thư viện Face AR')
                    setLoading(false)
                }
            }
        }

        init()

        return () => {
            isMounted = false
            const scene = containerRef.current?.querySelector('a-scene')
            if (scene) {
                // @ts-ignore
                const mindarSystem = scene.systems?.['mindar-face-system']
                if (mindarSystem) mindarSystem.stop()
                scene.remove()
            }
            // Stop camera tracks
            navigator.mediaDevices?.getUserMedia({ video: true })
                .then(stream => stream.getTracks().forEach(track => track.stop()))
                .catch(() => { })
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

            // Initialized, ready for simulation
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
            className="bg-[#0a0a0a] rounded-lg relative"
            style={{
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                clipPath: 'inset(0)',
                contain: 'strict',
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                a-scene canvas { background: none !important; }
                video { background: none !important; }
            `}} />
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
                    className="w-8 h-8 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-pink-500 hover:border-pink-500 transition-all active:scale-90"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center">
                        <div className="animate-spin w-10 h-10 border-2 border-white/5 border-t-pink-500 rounded-full mx-auto mb-4 shadow-[0_0_15px_rgba(236,72,153,0.3)]" />
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Đang khởi động camera...</p>
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
            <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 z-10 transition-all ${faceDetected ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-orange-500/80 backdrop-blur-md text-white border border-white/20'
                }`}>
                {faceDetected ? (
                    <>
                        <Sparkles size={12} />
                        Face Detected
                    </>
                ) : (
                    <>
                        <Camera size={12} className="animate-pulse" />
                        Simulation Ready
                    </>
                )}
            </div>

            {!loading && !error && (
                <div className="absolute top-14 left-3 z-10">
                    <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 rounded-full px-3 py-1 text-[8px] font-black text-orange-400 uppercase tracking-widest">
                        Simulation Mode
                    </div>
                </div>
            )}

            {/* No filter warning */}
            {!config.filter_url && !config.filter_3d_url && !loading && (
                <div className="absolute bottom-3 right-3 px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] uppercase font-black tracking-widest z-10 animate-pulse">
                    ⚠️ No Filter configured
                </div>
            )}

            {!loading && !error && !faceDetected && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <button
                        onClick={() => setFaceDetected(true)}
                        className="pointer-events-auto flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-in fade-in zoom-in duration-700 delay-500"
                    >
                        <Sparkles size={14} /> Simulate Face Detection
                    </button>
                </div>
            )}

            {faceDetected && !error && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
                    <button
                        onClick={() => setFaceDetected(false)}
                        className="bg-black/60 backdrop-blur-md border border-white/10 text-white/40 hover:text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                        Reset Tracking
                    </button>
                </div>
            )}
        </div>
    )
}
