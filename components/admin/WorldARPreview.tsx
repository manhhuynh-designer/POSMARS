'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Globe, Loader2, RotateCcw, MousePointer2 } from 'lucide-react'
import { WorldARConfig } from './template-builder/types'
import ARCameraBackground from './shared/ARCameraBackground'
import AR3DOverlay from './shared/AR3DOverlay'

interface WorldARPreviewProps {
    config: WorldARConfig
    onClose: () => void
}

export default function WorldARPreview({ config, onClose }: WorldARPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [planeDetected, setPlaneDetected] = useState(false)

    useEffect(() => {
        let isMounted = true

        const init = async () => {
            try {
                // Initialized, ready for simulation
                if (isMounted) {
                    initAR()
                }
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to initialize World AR Preview:', e)
                    setError('Không thể khởi động World AR')
                    setLoading(false)
                }
            }
        }

        init()

        return () => {
            isMounted = false
        }
    }, [])

    const initAR = () => {
        if (!containerRef.current) return

        setLoading(false)
        console.log('🚀 World AR Preview Init')
        console.log('Placement Mode:', config.placement_mode)
        console.log('Placement Models:', config.placement_models)
    }

    return (
        <div className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col">
            <div ref={containerRef} className="flex-1 relative bg-black">
                {/* Real Camera Background */}
                {!error && <ARCameraBackground />}

                {/* 3D Model Overlay */}
                {planeDetected && !loading && !error && (
                    <AR3DOverlay
                        assets={(config.placement_models || []).map(m => ({
                            ...m,
                            type: '3d' as const
                        }))}
                        lightingConfig={{
                            ambient_intensity: config.ambient_intensity,
                            directional_intensity: config.directional_intensity,
                            environment_url: config.environment_url,
                            exposure: config.exposure
                        }}
                    />
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    data-testid="close-ar-btn"
                    className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Status Badges */}
                <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest" data-testid="ar-status">
                            {loading ? 'Initializing' : (error ? 'Error' : (planeDetected ? 'Tracking Active' : 'Simulation Ready'))}
                        </span>
                    </div>

                    {!loading && !error && (
                        <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 rounded-full px-3 py-1 text-[8px] font-black text-orange-400 uppercase tracking-widest">
                            Simulation Mode
                        </div>
                    )}

                    {planeDetected && (
                        <div className="flex items-center gap-2 bg-green-500/80 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 animate-in slide-in-from-left duration-500" data-testid="detection-badge">
                            <Globe size={12} className="text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Surface Detected</span>
                        </div>
                    )}
                </div>

                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 z-40">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Initializing Surface Detection
                        </p>
                    </div>
                )}

                {/* Error Overlay */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center gap-6 z-40">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                            <X size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-white font-black uppercase tracking-tighter">AR Failed</h3>
                            <p className="text-white/40 text-[10px] font-medium leading-relaxed uppercase">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                        >
                            <RotateCcw size={14} /> Retry
                        </button>
                    </div>
                )}

                {/* Scanning & Interaction UI */}
                {!loading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        {!planeDetected ? (
                            <div className="text-center px-12 animate-pulse space-y-4">
                                <div className="w-12 h-12 bg-white/10 rounded-full mx-auto flex items-center justify-center">
                                    <Globe size={24} className="text-white/40" />
                                </div>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
                                    Move your camera around to detect surfaces
                                </p>

                                <button
                                    onClick={() => setPlaneDetected(true)}
                                    className="mt-12 pointer-events-auto flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                                >
                                    <Globe size={14} /> Simulate Surface Detection
                                </button>
                            </div>
                        ) : (
                            <div className="absolute bottom-1/4 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom duration-1000">
                                <div className="w-16 h-16 border-2 border-orange-500/50 rounded-full flex items-center justify-center bg-orange-500/10 backdrop-blur-sm animate-bounce">
                                    <MousePointer2 size={24} className="text-orange-500" />
                                </div>
                                <p className="text-white font-black text-[10px] uppercase tracking-widest bg-black/50 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10">
                                    Tap to place model
                                </p>

                                <button
                                    onClick={() => setPlaneDetected(false)}
                                    className="mt-4 pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 text-white/40 hover:text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                                >
                                    Reset Tracking
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
