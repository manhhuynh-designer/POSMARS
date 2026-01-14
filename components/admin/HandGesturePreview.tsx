'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Hand, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { HandGestureConfig } from './template-builder/types'
import ARCameraBackground from './shared/ARCameraBackground'
import AR3DOverlay from './shared/AR3DOverlay'

interface HandGesturePreviewProps {
    config: HandGestureConfig
    onClose: () => void
}

export default function HandGesturePreview({ config, onClose }: HandGesturePreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [gestureDetected, setGestureDetected] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const init = async () => {
            try {
                // TODO: Load MediaPipe Hands SDK
                if (isMounted) {
                    initAR()
                }
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to initialize Hand Gesture Preview:', e)
                    setError('Không thể khởi động Gesture tracking')
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
        console.log('🚀 Hand Gesture Preview Init')
        console.log('Gesture Models:', config.gesture_models)

        // Initialized, ready for simulation
    }

    // Helper to map UI gesture names to config names
    const getGestureKey = (uiName: string | null) => {
        if (!uiName) return null
        const map: Record<string, string> = {
            'Open Hand': 'open',
            'Peace': 'peace',
            'Thumbs Up': 'thumbs_up',
            'Point': 'point',
            'Fist': 'closed'
        }
        return map[uiName]
    }

    const activeGestureKey = getGestureKey(gestureDetected)
    const activeModels = (config.gesture_models || []).filter(m => m.gesture === activeGestureKey)

    return (
        <div className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col">
            <div ref={containerRef} className="flex-1 relative bg-black">
                {/* Real Camera Background */}
                {!error && <ARCameraBackground />}

                {/* 3D Model Overlay */}
                {gestureDetected && activeModels.length > 0 && !loading && !error && (
                    <AR3DOverlay
                        assets={activeModels as any}
                    />
                )}

                <button
                    onClick={onClose}
                    data-testid="close-ar-btn"
                    className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5">
                        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : (error ? 'bg-red-500' : 'bg-green-500')}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest text-shadow" data-testid="ar-status">
                            {loading ? 'Initializing' : 'Simulation Active'}
                        </span>
                    </div>

                    {!loading && !error && (
                        <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 rounded-full px-3 py-1 text-[8px] font-black text-orange-400 uppercase tracking-widest">
                            Simulation Mode
                        </div>
                    )}

                    {gestureDetected && (
                        <div className="flex items-center gap-2 bg-orange-500/80 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5 animate-in slide-in-from-left duration-500" data-testid="detection-badge">
                            <Sparkles size={12} className="text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{gestureDetected}</span>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 z-40">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-widest animate-pulse font-mono">
                            Calibrating Hand Landmarks
                        </p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center gap-6 z-40">
                        <X size={48} className="text-red-500" />
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{error}</p>
                        <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black uppercase">Retry</button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="w-64 h-64 border-2 border-white/10 rounded-full relative flex items-center justify-center overflow-hidden">
                            <Hand size={64} className="text-white/5" />
                            <div className="absolute inset-0 bg-gradient-to_center from-transparent via-orange-500/5 to-transparent animate-pulse" />
                        </div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mt-8 animate-pulse text-center px-12 leading-relaxed">
                            {config.instructions || 'Show gestures to trigger AR'}
                        </p>

                        <div className="mt-12 flex flex-wrap justify-center gap-3 px-8 pointer-events-auto">
                            {['Open Hand', 'Peace', 'Thumbs Up', 'Point', 'Fist'].map(gesture => (
                                <button
                                    key={gesture}
                                    onClick={() => setGestureDetected(gesture)}
                                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${gestureDetected === gesture
                                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {gesture}
                                </button>
                            ))}
                        </div>

                        {gestureDetected && (
                            <button
                                onClick={() => setGestureDetected(null)}
                                className="mt-6 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-red-400 transition-colors pointer-events-auto"
                            >
                                Clear Gesture
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
