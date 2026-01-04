'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface ImageTrackingConfig {
    model_scale?: number
    model_position?: [number, number, number]
    show_scan_hint?: boolean
}

interface ImageTrackingProps {
    markerUrl: string
    modelUrl: string
    config: ImageTrackingConfig
    onComplete: () => void
}

export default function ImageTracking({ markerUrl, modelUrl, config, onComplete }: ImageTrackingProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(true)

    useEffect(() => {
        // Dynamically load MindAR scripts
        const loadScripts = async () => {
            try {
                // Check if already loaded
                if ((window as any).MINDAR) {
                    initAR()
                    return
                }

                // Load A-Frame
                if (!document.getElementById('aframe-script')) {
                    const aframeScript = document.createElement('script')
                    aframeScript.id = 'aframe-script'
                    aframeScript.src = 'https://aframe.io/releases/1.4.2/aframe.min.js'
                    await new Promise((resolve, reject) => {
                        aframeScript.onload = resolve
                        aframeScript.onerror = reject
                        document.head.appendChild(aframeScript)
                    })
                }

                // Wait for AFRAME
                let attempts = 0
                while (!(window as any).AFRAME && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100))
                    attempts++
                }
                if (!(window as any).AFRAME) throw new Error('AFRAME failed to load')

                // Load MindAR
                if (!document.getElementById('mindar-image-script')) {
                    const mindarScript = document.createElement('script')
                    mindarScript.id = 'mindar-image-script'
                    mindarScript.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js'
                    await new Promise((resolve, reject) => {
                        mindarScript.onload = resolve
                        mindarScript.onerror = reject
                        document.head.appendChild(mindarScript)
                    })
                }

                initAR()
            } catch (e) {
                console.error('Failed to load AR scripts:', e)
                setError('Không thể tải thư viện AR')
                setLoading(false)
            }
        }

        loadScripts()

        return () => {
            // Cleanup
            const scene = document.querySelector('a-scene')
            if (scene) scene.remove()
        }
    }, [])

    const initAR = () => {
        if (!containerRef.current) return

        const scale = config.model_scale || 1
        const pos = config.model_position || [0, 0, 0]

        // Create A-Frame scene
        const scene = document.createElement('a-scene')
        scene.setAttribute('mindar-image', `imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no`)
        scene.setAttribute('color-space', 'sRGB')
        scene.setAttribute('renderer', 'colorManagement: true, physicallyCorrectLights')
        scene.setAttribute('vr-mode-ui', 'enabled: false')
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false')

        // Camera
        const camera = document.createElement('a-camera')
        camera.setAttribute('position', '0 0 0')
        camera.setAttribute('look-controls', 'enabled: false')
        scene.appendChild(camera)

        // Entity for target
        const entity = document.createElement('a-entity')
        entity.setAttribute('mindar-image-target', 'targetIndex: 0')

        // 3D Model
        const model = document.createElement('a-gltf-model')
        model.setAttribute('src', modelUrl)
        model.setAttribute('scale', `${scale} ${scale} ${scale}`)
        model.setAttribute('position', `${pos[0]} ${pos[1]} ${pos[2]}`)
        model.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear')
        entity.appendChild(model)

        scene.appendChild(entity)
        containerRef.current.appendChild(scene)

        // Listen for target found
        scene.addEventListener('arReady', () => {
            setLoading(false)
        })

        entity.addEventListener('targetFound', () => {
            setScanning(false)
        })

        entity.addEventListener('targetLost', () => {
            setScanning(true)
        })
    }

    return (
        <div className="fixed inset-0 bg-black">
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-orange-500 rounded-full mx-auto mb-4" />
                        <p>Đang khởi động AR...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center text-white p-6">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="bg-orange-500 px-6 py-2 rounded-lg">
                            Thử lại
                        </button>
                    </div>
                </div>
            )}

            {/* Scan Hint */}
            {!loading && scanning && config.show_scan_hint !== false && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center text-white">
                        <Camera size={48} className="mx-auto mb-4 animate-pulse" />
                        <p className="text-lg font-medium">Hướng camera vào poster</p>
                        <p className="text-sm opacity-70">Để xem nội dung AR</p>
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
