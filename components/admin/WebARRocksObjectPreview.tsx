'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, RotateCcw } from 'lucide-react'
import { loadWebARRocksObject } from '@/lib/ar-loaders/webAR-rocks-loader'
import { ArchitecturalTrackingConfig } from './template-builder/types'
import ARCameraBackground from './shared/ARCameraBackground'
import AR3DOverlay from './shared/AR3DOverlay'

interface WebARRocksObjectPreviewProps {
    config: ArchitecturalTrackingConfig
    onClose: () => void
}

export default function WebARRocksObjectPreview({ config, onClose }: WebARRocksObjectPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [objectDetected, setObjectDetected] = useState(false)

    useEffect(() => {
        let isMounted = true

        const init = async () => {
            try {
                // 1. Load WebAR.rocks Object engine
                await loadWebARRocksObject()

                if (isMounted) {
                    initAR()
                }
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to initialize WebAR.rocks Object Preview:', e)
                    setError('Không thể khởi động AR tracking')
                    setLoading(false)
                }
            }
        }

        init()

        return () => {
            isMounted = false
            // Cleanup engine
            const WEBARROCKS = (window as any).WEBARROCKS
            if (WEBARROCKS?.OBJECT) {
                try {
                    WEBARROCKS.OBJECT.stop()
                } catch (e) {
                    console.warn('Failed to stop WebAR.rocks Object:', e)
                }
            }
        }
    }, [])

    const initAR = () => {
        if (!containerRef.current) return

        const WEBARROCKS = (window as any).WEBARROCKS
        if (WEBARROCKS?.OBJECT) {
            WEBARROCKS.OBJECT.init({
                canvas: document.createElement('canvas'),
                callbackReady: (err: any) => {
                    if (err) {
                        console.error('WebAR.rocks Object init failed:', err)
                        setError('Không thể khởi động Object tracking engine')
                    } else {
                        console.log('✅ WebAR.rocks Object Engine Activated')
                    }
                    setLoading(false)
                }
            })
        } else {
            setLoading(false)
        }
    }

    return (
        <div className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col">
            <div ref={containerRef} className="flex-1 relative bg-black">
                {/* Real Camera Background */}
                {!error && <ARCameraBackground />}

                {/* 3D Model Overlay */}
                {objectDetected && !loading && !error && (
                    <AR3DOverlay
                        assets={(config.overlay_models || []).map(m => ({ ...m, type: '3d' as const }))}
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
                            {loading ? 'Initializing' : (error ? 'Error' : (objectDetected ? 'Tracking Active' : 'Simulation Ready'))}
                        </span>
                    </div>

                    {!loading && !error && (
                        <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 rounded-full px-3 py-1 text-[8px] font-black text-orange-400 uppercase tracking-widest">
                            Simulation Mode
                        </div>
                    )}

                    {objectDetected && (
                        <div className="flex items-center gap-2 bg-green-500/80 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 animate-in slide-in-from-left duration-500" data-testid="detection-badge">
                            <Camera size={12} className="text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Building Detected</span>
                        </div>
                    )}
                </div>

                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 z-40">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Loading Object Engine
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

                {/* Scanning UI */}
                {!loading && !objectDetected && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative overflow-hidden">
                            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent top-0 animate-scan shadow-[0_0_20px_rgba(249,115,22,0.5)]" />
                            <div className="absolute inset-0 bg-orange-500/5" />
                        </div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mt-8 animate-pulse text-center px-12">
                            {config.instructions || 'Scan the building to place overlay'}
                        </p>

                        <button
                            onClick={() => setObjectDetected(true)}
                            className="mt-12 pointer-events-auto flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-in fade-in zoom-in duration-700 delay-1000"
                        >
                            <Camera size={14} /> Simulate Detection
                        </button>
                    </div>
                )}

                {objectDetected && !error && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
                        <button
                            onClick={() => setObjectDetected(false)}
                            className="bg-black/60 backdrop-blur-md border border-white/10 text-white/40 hover:text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                            Reset Tracking
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
