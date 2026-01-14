'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, RefreshCw } from 'lucide-react'
import { loadWebARRocksHand } from '@/lib/ar-loaders/webAR-rocks-loader'
import { WatchRingConfig } from './template-builder/types'
import AR3DOverlay from './shared/AR3DOverlay'
import { useCameraStream } from './hooks/useCameraStream'

interface WebARRocksHandPreviewProps {
    config: WatchRingConfig
    onClose: () => void
}

declare global {
    interface Window {
        frameCounter: number
    }
}

export default function WebARRocksHandPreview({ config, onClose }: WebARRocksHandPreviewProps) {
    // 1. Camera Management via Hook
    const { videoRef, ready: cameraReady, error: cameraError, restartCamera } = useCameraStream({
        facingMode: 'user', // Or 'environment', usually user for hand tracking
        width: 480,
        height: 640
    })

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [engineLoading, setEngineLoading] = useState(true)
    const [engineError, setEngineError] = useState<string | null>(null)
    const [handDetected, setHandDetected] = useState(false)
    const [debugInfo, setDebugInfo] = useState<string>('')

    // Ref to store latest tracking data to pass to Three.js without re-renders
    const trackingRef = useRef<{
        position: [number, number, number]
        rotation: [number, number, number]
        scale: [number, number, number]
        visible: boolean
    } | null>(null)

    // 2. Initialize AR Engine ONLY when camera is ready
    useEffect(() => {
        let webarRocksHandle: any = null
        let isMounted = true

        const initEngine = async () => {
            if (!cameraReady || !videoRef.current || !canvasRef.current) {
                return
            }

            try {
                setEngineLoading(true)
                // Load script if not already loaded
                await loadWebARRocksHand()

                if (!isMounted) return

                const WEBARROCKSHAND = (window as any).WEBARROCKSHAND
                if (!WEBARROCKSHAND) {
                    throw new Error('WebARRocksHand SDK not found')
                }

                // Initialize Engine
                WEBARROCKSHAND.init({
                    canvas: canvasRef.current,
                    video: videoRef.current, // Use the active video element from hook
                    NNsPaths: ['/assets/neuralNets/NN_WRISTBACK_45.json'], // Local optimized model
                    callbackReady: (err: any) => {
                        if (!isMounted) return
                        if (err) {
                            if (err === 'ALREADY_INITIALIZED') {
                                console.log('⚠️ WebAR.rocks Hand already initialized')
                                setEngineLoading(false)
                                return
                            }
                            console.error('WebAR.rocks Hand init failed:', err)
                            setEngineError('Lỗi khởi động Hand Engine')
                            setEngineLoading(false)
                            return
                        }
                        console.log('✅ WebAR.rocks Hand Engine Activated')
                        setEngineLoading(false)
                        webarRocksHandle = WEBARROCKSHAND // Keep reference for cleanup
                    },
                    callbackTrack: (detectState: any) => {
                        if (!trackingRef.current) {
                            trackingRef.current = {
                                position: [0, 0, 0],
                                rotation: [0, 0, 0],
                                scale: [1, 1, 1],
                                visible: false
                            }
                        }

                        const isDetected = detectState.detected > 0.6

                        trackingRef.current.visible = isDetected

                        if (isDetected && videoRef.current) {
                            // ASPECT RATIO COMPENSATION
                            const videoW = videoRef.current.videoWidth || 480;
                            const videoH = videoRef.current.videoHeight || 640;
                            const screenW = window.innerWidth;
                            const screenH = window.innerHeight;

                            const rVideo = videoW / videoH;
                            const rScreen = screenW / screenH;

                            // Calculate Rendered Dimensions of the Video (due to object-cover)
                            let renderW, renderH;
                            if (rScreen > rVideo) {
                                // Screen is wider: fit width
                                renderW = screenW;
                                renderH = screenW / rVideo;
                            } else {
                                // Screen is taller: fit height
                                renderH = screenH;
                                renderW = screenH * rVideo;
                            }

                            const sourceX = detectState.x;
                            const sourceY = detectState.y;

                            const renderX = sourceX * (renderW / 2);
                            const renderY = sourceY * (renderH / 2);

                            // Factor: Render Pixels -> 3D Units at Z = -5
                            const zDepth = -5;
                            const vFOV = 45 * (Math.PI / 180);
                            const visibleHeightAtZ = 2 * Math.abs(zDepth) * Math.tan(vFOV / 2);

                            const unitsPerPixel = visibleHeightAtZ / screenH;

                            // Final 3D Position
                            // Invert X because camera preview is mirrored via CSS transform: scaleX(-1)
                            const finalX = -renderX * unitsPerPixel;
                            const finalY = renderY * unitsPerPixel;

                            // DEBUG LOGGING (Reduced frequency)
                            if (!(window as any).logCounter) (window as any).logCounter = 0;
                            (window as any).logCounter++;
                            if ((window as any).logCounter % 10 === 0) {
                                setDebugInfo(JSON.stringify({
                                    src: [sourceX.toFixed(2), sourceY.toFixed(2)],
                                    renderPx: [renderX.toFixed(0), renderY.toFixed(0)],
                                    final: [finalX.toFixed(2), finalY.toFixed(2)],
                                    screen: [screenW, screenH],
                                    ratio: [rVideo.toFixed(2), rScreen.toFixed(2)]
                                }, null, 2))
                            }

                            trackingRef.current.position = [finalX, finalY, zDepth];

                            trackingRef.current.rotation = [
                                detectState.rx || 0,
                                detectState.ry || 0,
                                detectState.rz || 0
                            ];
                            const s = detectState.s || 1;
                            trackingRef.current.scale = [s, s, s];
                        }
                    }
                })

            } catch (e: any) {
                console.error('Engine Init Error:', e)
                if (isMounted) {
                    setEngineError(e.message || 'Failed to start AR Engine')
                    setEngineLoading(false)
                }
            }
        }

        if (cameraReady) {
            initEngine()
        }

        return () => {
            isMounted = false
            // Cleanup Engine
            // Note: WebAR.rocks typically attaches to the canvas/video. 
            // Since we own the video via the hook, we just need to tell the engine to stop drawing/processing.
            // If the library supports .destroy(), use it.
            try {
                const WEBARROCKSHAND = (window as any).WEBARROCKSHAND
                if (WEBARROCKSHAND && (WEBARROCKSHAND.destroy || WEBARROCKSHAND.stop)) {
                    // console.log('🛑 Stopping AR Engine')
                    // WEBARROCKSHAND.stop() 
                    // WEBARROCKSHAND.destroy often removes the video element or canvas context, be careful re-using refs
                }
            } catch (e) { /* ignore */ }
        }
    }, [cameraReady, videoRef]) // Re-run if camera becomes ready

    // Handling Canvas Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && videoRef.current) {
                // Resize canvas to match the video container, not the full window
                const width = videoRef.current.clientWidth || window.innerWidth;
                const height = videoRef.current.clientHeight || window.innerHeight;

                canvasRef.current.width = width;
                canvasRef.current.height = height;

                // Notify engine if possible
                try {
                    (window as any).WEBARROCKSHAND?.resize()
                } catch (e) { }
            }
        }
        window.addEventListener('resize', handleResize)
        // Also observe the video element for resizing (if container changes)
        const resizeObserver = new ResizeObserver(() => handleResize());
        if (videoRef.current) resizeObserver.observe(videoRef.current);

        handleResize()

        return () => {
            window.removeEventListener('resize', handleResize)
            resizeObserver.disconnect()
        }
    }, [videoRef])


    const hasError = cameraError || engineError
    const isLoading = !cameraReady || engineLoading

    return (
        <div className="absolute inset-0 bg-black z-50 overflow-hidden flex flex-col">
            <div className="flex-1 relative bg-transparent w-full h-full">
                {/* 1. Video Layer (Managed by Hook) */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                // style handled by hook (mirroring)
                />

                {/* 2. AR Canvas Layer (For Engine Output, often transparent or overlay) */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none opacity-50"
                />

                {/* 3. 3D Overlay Layer (Three.js) */}
                {!isLoading && !hasError && (
                    <AR3DOverlay
                        assets={(config.accessory_models || []).map(m => ({
                            ...m,
                            type: '3d' as const,
                            video_autoplay: false
                        }))}
                        lightingConfig={{
                            ambient_intensity: config.ambient_intensity,
                            directional_intensity: config.directional_intensity,
                            environment_url: config.environment_url,
                            exposure: config.exposure
                        }}
                        trackingRef={trackingRef}
                    />
                )}

                {/* UI Overlay */}
                <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5">
                        <Camera size={12} className={isLoading ? "animate-pulse text-orange-500" : "text-green-500"} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest" data-testid="ar-status">
                            {isLoading ? 'Starting...' : (hasError ? 'Error' : 'Hand AR Active')}
                        </span>
                    </div>
                </div>

                <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
                    <div className="bg-black/50 text-white text-[10px] font-mono p-2 rounded max-w-[200px] whitespace-pre-wrap">
                        {debugInfo}
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="close-ar-btn"
                        className="w-10 h-10 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Status/Error Screens */}
                {isLoading && !hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">
                            {!cameraReady ? 'Requesting Camera...' : 'Starting Hand Engine...'}
                        </p>
                    </div>
                )}

                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center z-40">
                        <p className="text-red-500 font-bold mb-6">{cameraError || engineError}</p>
                        <button
                            onClick={() => window.location.reload()} // Simple reload for now, or use restartCamera() if logic permits
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
