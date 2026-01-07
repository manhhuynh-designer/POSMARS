'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, Box, Check, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { ImageTrackingConfig } from './TemplateConfigBuilder'

interface ImageTrackingPreviewProps {
    markerUrl: string
    config: ImageTrackingConfig
    onClose: () => void
}

export default function ImageTrackingPreview({ markerUrl, config, onClose }: ImageTrackingPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)
    const entityRefs = useRef<{ [key: string]: HTMLElement }>({})
    const observerRef = useRef<MutationObserver | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [targetFound, setTargetFound] = useState(false)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

    // Load AR Scripts and Handle Cleanup
    useEffect(() => {
        let isMounted = true

        const loadScripts = async () => {
            try {
                // 1. Load A-Frame first
                if (!(window as any).AFRAME) {
                    if (!document.getElementById('aframe-script')) {
                        const aframeScript = document.createElement('script')
                        aframeScript.id = 'aframe-script'
                        aframeScript.src = 'https://aframe.io/releases/1.4.2/aframe.min.js'
                        document.head.appendChild(aframeScript)
                        await new Promise((resolve, reject) => {
                            aframeScript.onload = resolve
                            aframeScript.onerror = reject
                        })
                    }
                    // Wait for AFRAME global to be available
                    let attempts = 0
                    while (!(window as any).AFRAME && attempts < 50) {
                        await new Promise(r => setTimeout(r, 100))
                        attempts++
                    }
                    if (!(window as any).AFRAME) throw new Error('AFRAME failed to load')
                }

                // 2. Load A-Frame Extras (depends on AFRAME)
                if (!document.getElementById('aframe-extras-script')) {
                    const extrasScript = document.createElement('script')
                    extrasScript.id = 'aframe-extras-script'
                    extrasScript.src = 'https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v7.0.0/dist/aframe-extras.min.js'
                    document.head.appendChild(extrasScript)
                    await new Promise((resolve, reject) => {
                        extrasScript.onload = resolve
                        extrasScript.onerror = reject
                    })
                }

                // 3. Load MindAR (depends on AFRAME)
                if (!document.getElementById('mindar-image-script')) {
                    const mindarScript = document.createElement('script')
                    mindarScript.id = 'mindar-image-script'
                    mindarScript.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js'
                    document.head.appendChild(mindarScript)
                    await new Promise((resolve, reject) => {
                        mindarScript.onload = resolve
                        mindarScript.onerror = reject
                    })
                }

                if (isMounted) initAR()
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to load AR scripts:', e)
                    setError('Không thể tải thư viện AR')
                    setLoading(false)
                }
            }
        }

        loadScripts()

        return () => {
            isMounted = false

            if (observerRef.current) {
                observerRef.current.disconnect()
                observerRef.current = null
            }

            // Explicitly stop and remove scene
            const scene = sceneRef.current
            if (scene) {
                // @ts-ignore
                try {
                    const mindarSystem = scene.systems?.['mindar-image-system']
                    if (mindarSystem) mindarSystem.stop()
                } catch (e) {
                    console.warn('⚠️ Admin AR Cleanup: Failed to stop system', e)
                }

                try {
                    scene.remove()
                } catch (e) {
                    console.warn('⚠️ Admin AR Cleanup: Failed to remove scene', e)
                }
            }
            // Stop any leftover camera tracks
            navigator.mediaDevices?.getUserMedia({ video: true })
                .then(stream => stream.getTracks().forEach(track => track.stop()))
                .catch(() => { })
        }
    }, [])

    // Soft Updates for config changes (Real-time tweaks)
    useEffect(() => {
        if (!sceneRef.current) return

        // 1. Update Global Lighting
        const ambient = sceneRef.current.querySelector('a-light[type="ambient"]')
        if (ambient) ambient.setAttribute('intensity', (config.ambient_intensity ?? 1).toString())

        const directional = sceneRef.current.querySelector('a-light[type="directional"]')
        if (directional) directional.setAttribute('intensity', (config.directional_intensity ?? 1).toString())

        // 2. Update Renderer settings
        sceneRef.current.setAttribute('renderer', {
            colorManagement: true,
            physicallyCorrectLights: true,
            exposure: config.exposure ?? 1,
            toneMapping: config.tone_mapping ?? 'acesfilmic'
        })

        // 3. Update Assets Transform
        config.assets?.forEach(asset => {
            const el = entityRefs.current[asset.id]
            if (el) {
                el.setAttribute('position', `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`)
                el.setAttribute('rotation', `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`)
                el.setAttribute('scale', `${asset.scale} ${asset.scale} ${asset.scale}`)

                if (asset.type === 'video') {
                    el.setAttribute('width', (asset.video_width ?? 1).toString())
                    el.setAttribute('height', (asset.video_height ?? 0.5625).toString())
                }
            }
        })
    }, [config])

    // Re-initialize scene when assets list or marker changes (Hard update)
    useEffect(() => {
        if (!loading && containerRef.current) {
            initAR()
        }
    }, [markerUrl, config.assets?.length, facingMode])

    const initAR = () => {
        if (!containerRef.current) return

        // Register custom component for Model Opacity if not exists
        if (!(window as any).AFRAME.components['model-opacity']) {
            (window as any).AFRAME.registerComponent('model-opacity', {
                schema: { default: 1.0 },
                init: function () {
                    this.el.addEventListener('model-loaded', this.update.bind(this));
                },
                update: function () {
                    var mesh = this.el.getObject3D('mesh');
                    var data = this.data;
                    if (!mesh) { return; }
                    mesh.traverse(function (node: any) {
                        if (node.isMesh) {
                            node.material.transparent = true;
                            node.material.opacity = data;
                            node.material.needsUpdate = true;
                        }
                    });
                }
            });
        }

        // Cleanup existing if any
        if (sceneRef.current) {
            const oldScene = sceneRef.current
            // @ts-ignore
            try {
                const mindarSystem = oldScene.systems?.['mindar-image-system']
                if (mindarSystem) mindarSystem.stop()
            } catch (e) {
                console.warn('⚠️ Admin AR: Failed to stop system', e)
            }
            try {
                oldScene.remove()
            } catch (e) {
                console.warn('⚠️ Admin AR: Failed to remove scene', e)
            }
        }

        console.log('🚀 Image Tracking: initAR() called, markerUrl:', markerUrl, 'facingMode:', facingMode)

        const scene = document.createElement('a-scene')
        // mindar-image system uses camera from navigator.mediaDevices.getUserMedia
        // Improved sensitivity: missTolerance: 10; warmupTolerance: 1; filterMinCF:0.01; filterBeta: 10 (Responsive)
        scene.setAttribute('mindar-image', `imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; filterMinCF:0.01; filterBeta: 10; missTolerance: 10; warmupTolerance: 1`)
        scene.setAttribute('embedded', 'true')
        scene.setAttribute('color-space', 'sRGB')
        scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true')
        scene.setAttribute('vr-mode-ui', 'enabled: false')
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false')
        scene.classList.add('w-full', 'h-full')
        scene.style.position = 'absolute'
        scene.style.top = '0'
        scene.style.left = '0'
        scene.style.zIndex = '1'

        // Assets
        const assets = document.createElement('a-assets')
        scene.appendChild(assets)

        // Camera
        const camera = document.createElement('a-camera')
        camera.setAttribute('position', '0 0 0')
        camera.setAttribute('look-controls', 'enabled: false')
        camera.setAttribute('cursor', 'fuse: false; rayOrigin: mouse;')
        camera.setAttribute('raycaster', 'objects: .clickable')
        scene.appendChild(camera)

        // Lights
        const ambient = document.createElement('a-light')
        ambient.setAttribute('type', 'ambient')
        ambient.setAttribute('intensity', (config.ambient_intensity ?? 1).toString())
        scene.appendChild(ambient)

        const directional = document.createElement('a-light')
        directional.setAttribute('type', 'directional')
        directional.setAttribute('position', '0.5 1 1')
        directional.setAttribute('intensity', (config.directional_intensity ?? 1).toString())
        scene.appendChild(directional)

        // Note: Environment map (HDR) is NOT used in AR mode as it would block camera
        // Use Studio Mode to preview with HDR environment

        // Target Entity
        const targetEntity = document.createElement('a-entity')
        targetEntity.setAttribute('mindar-image-target', 'targetIndex: 0')

        // Add Assets
        config.assets?.forEach(asset => {
            if (!asset.url) return

            console.log(`🎬 AR Asset ${asset.name}: keyframes =`, asset.keyframes?.length || 0, asset.keyframes)

            let el: HTMLElement
            if (asset.type === 'video') {
                const videoId = `preview-video-${asset.id}`
                let videoEl = document.getElementById(videoId) as HTMLVideoElement

                if (!videoEl) {
                    videoEl = document.createElement('video')
                    videoEl.id = videoId
                    videoEl.setAttribute('src', asset.url)
                    videoEl.setAttribute('crossorigin', 'anonymous')
                    videoEl.setAttribute('playsinline', 'true')
                    videoEl.setAttribute('webkit-playsinline', 'true')
                    videoEl.preload = 'auto'
                    videoEl.muted = true
                    videoEl.loop = asset.video_loop !== false

                    videoEl.style.position = 'absolute'
                    videoEl.style.top = '0'
                    videoEl.style.left = '0'
                    videoEl.style.opacity = '0'
                    videoEl.style.zIndex = '-1'
                    videoEl.style.pointerEvents = 'none'

                    document.body.appendChild(videoEl)

                    videoEl.addEventListener('loadeddata', () => console.log(`🎥 Preview Video ${videoId} ready`))
                    videoEl.addEventListener('error', (e) => console.error(`❌ Preview Video ${videoId} error:`, videoEl.error))
                    videoEl.load()
                }

                el = document.createElement('a-video')
                el.setAttribute('src', `#${videoId}`)
                el.setAttribute('width', (asset.video_width ?? 1).toString())
                el.setAttribute('height', (asset.video_height ?? 0.5625).toString())
                el.setAttribute('material', `shader: flat; src: #${videoId}; transparent: true`)

                // Video Keyframes (Option B) for Preview
                if (asset.keyframes && asset.keyframes.length > 0) {
                    const sortedKfs = [...asset.keyframes].sort((a, b) => a.time - b.time);
                    const props = ['position', 'rotation', 'scale', 'opacity'];

                    props.forEach(prop => {
                        const kfsForProp = sortedKfs.filter(k => k.property === prop);
                        if (kfsForProp.length === 0) return;

                        kfsForProp.forEach((kf, idx) => {
                            const animName = `animation__kf_${prop}_${idx}`;
                            const prevKf = kfsForProp[idx - 1];
                            let propertyName = prop;
                            if (prop === 'opacity') propertyName = 'material.opacity';

                            let startEvents = 'targetFound';
                            if (idx > 0) {
                                startEvents = `animationcomplete__kf_${prop}_${idx - 1}`;
                            }

                            // Delay is mainly for the first keyframe to respect start time
                            const delay = idx === 0 ? kf.time * 1000 : 0;

                            // Duration:
                            // If idx > 0, duration is (kf.time - prevKf.time).
                            // If idx = 0, duration is kf.time (0 -> time).
                            const duration = (kf.time - (prevKf ? prevKf.time : 0)) * 1000;

                            let fromAttr = '';
                            if (idx === 0) {
                                let fromValue = '';
                                if (prop === 'position') fromValue = asset.position.join(' ');
                                else if (prop === 'rotation') fromValue = asset.rotation.join(' ');
                                else if (prop === 'scale') fromValue = `${asset.scale} ${asset.scale} ${asset.scale}`;
                                else if (prop === 'opacity') fromValue = '1';
                                fromAttr = `from: ${fromValue};`;
                            }

                            const animValue = `property: ${propertyName}; ${fromAttr} to: ${kf.value}; dur: ${Math.max(1, duration)}; delay: ${delay}; easing: ${kf.easing || 'linear'}; startEvents: ${startEvents}; autoplay: false; loop: false;`
                            el.setAttribute(animName, animValue)
                        });
                    });
                }

                // Add play logic for this specific video
                targetEntity.addEventListener('targetFound', () => {
                    console.log('🎯 Preview Target Found - Playing Video')
                    if (asset.video_autoplay !== false) {
                        videoEl.play().catch(e => {
                            console.warn('Preview Autoplay failed', e)
                            videoEl.muted = true
                            videoEl.play()
                        })
                    }
                })
                targetEntity.addEventListener('targetLost', () => {
                    console.log('❌ Preview Target Lost - Pausing Video')
                    videoEl.pause()
                })
            } else {
                el = document.createElement('a-gltf-model')
                el.setAttribute('src', asset.url)

                // Pro Mixer Keyframes for 3D Models (Option B)
                if (asset.keyframes && asset.keyframes.length > 0) {
                    const sortedKfs = [...asset.keyframes].sort((a, b) => a.time - b.time);
                    const props = ['position', 'rotation', 'scale', 'opacity'];

                    props.forEach(prop => {
                        const kfsForProp = sortedKfs.filter(k => k.property === prop);
                        if (kfsForProp.length === 0) return;

                        kfsForProp.forEach((kf, idx) => {
                            const animName = `animation__kf_${prop}_${idx}`;
                            const prevKf = kfsForProp[idx - 1];
                            let propertyName = prop;
                            if (prop === 'opacity') propertyName = 'model-opacity';

                            let startEvents = 'targetFound';
                            if (idx > 0) {
                                startEvents = `animationcomplete__kf_${prop}_${idx - 1}`;
                            }

                            // Delay is mainly for the first keyframe to respect start time
                            const delay = idx === 0 ? kf.time * 1000 : 0;

                            const duration = (kf.time - (prevKf ? prevKf.time : 0)) * 1000;

                            let fromAttr = '';
                            if (idx === 0) {
                                let fromValue = '';
                                if (prop === 'position') fromValue = asset.position.join(' ');
                                else if (prop === 'rotation') fromValue = asset.rotation.join(' ');
                                else if (prop === 'scale') fromValue = `${asset.scale} ${asset.scale} ${asset.scale}`;
                                else if (prop === 'opacity') fromValue = '1';
                                fromAttr = `from: ${fromValue};`;
                            }

                            const animValue = `property: ${propertyName}; ${fromAttr} to: ${kf.value}; dur: ${Math.max(1, duration)}; delay: ${delay}; easing: ${kf.easing || 'linear'}; startEvents: ${startEvents}; autoplay: false; loop: false;`
                            el.setAttribute(animName, animValue)
                        });
                    });

                    // Initialize opacity
                    el.setAttribute('model-opacity', '1')

                }
            }

            el.setAttribute('position', `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`)
            el.setAttribute('rotation', `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`)
            el.setAttribute('scale', `${asset.scale} ${asset.scale} ${asset.scale}`)

            entityRefs.current[asset.id] = el
            targetEntity.appendChild(el)
        })

        scene.appendChild(targetEntity)
        containerRef.current.appendChild(scene)
        sceneRef.current = scene

        // Listeners
        scene.addEventListener('arReady', () => {
            console.log('✅ Image Tracking: arReady event fired!')
            setLoading(false)
        })
        scene.addEventListener('arError', (e) => {
            console.error('❌ Image Tracking: arError event fired', e)
            setError('Lỗi khởi động AR')
        })

        // Fallback: Force loading to false after 5 seconds if arReady never fires
        setTimeout(() => {
            if (loading) {
                console.warn('⚠️ Image Tracking: arReady timeout - forcing loading=false')
                setLoading(false)
            }
        }, 5000)

        if (observerRef.current) {
            observerRef.current.disconnect()
            observerRef.current = null
        }

        targetEntity.addEventListener('targetFound', (e) => {
            // Prevent infinite loop from bubbling child events
            if (e.target !== targetEntity) return

            setTargetFound(true)

            // Emit targetFound to all child elements to trigger animations
            config.assets?.forEach(asset => {
                const el = entityRefs.current[asset.id]
                if (el) {
                    // emit(name, detail, bubbles) - set bubbles to false
                    ; (el as any).emit('targetFound', null, false)
                }

                // Also play video if autoplay
                if (asset.type === 'video' && asset.video_autoplay) {
                    const videoId = `asset-video-${asset.id}`
                    const video = document.getElementById(videoId) as HTMLVideoElement
                    if (video) video.play()
                }
            })
        })

        targetEntity.addEventListener('targetLost', () => setTargetFound(false))

        // Monitor for when video element is added by MindAR (observe entire subtree)
        const attachVideo = (video: HTMLVideoElement) => {
            if (!containerRef.current || containerRef.current.contains(video)) return

            video.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; z-index: 0 !important; background: none !important;'
            // Prepend video so it's behind the scene (scene has zIndex: 1)
            containerRef.current.prepend(video)
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeName === 'VIDEO') {
                        attachVideo(node as HTMLVideoElement)
                        observer.disconnect()
                        observerRef.current = null
                        return
                    }
                    // Also check descendants of the added node
                    if (node instanceof HTMLElement) {
                        const vids = node.querySelectorAll('video')
                        if (vids.length > 0) {
                            attachVideo(vids[0])
                            observer.disconnect()
                            observerRef.current = null
                            return
                        }
                    }
                }
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        observerRef.current = observer

        // Fallback: search for video after short delay
        setTimeout(() => {
            const video = document.querySelector('video')
            if (video) attachVideo(video)
        }, 2000)
    }

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
        setLoading(true)
        // Restart AR with new facing mode
        // Note: MindAR A-Frame might need a full remount or specialized system call
        // For now, we manually re-init
        // initAR() // This will be triggered by the useEffect dependency on facingMode
    }

    return (
        <div className="rounded-lg relative overflow-hidden h-full min-h-[400px]" style={{ backgroundColor: 'black' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                a-scene { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; background: transparent !important; }
                a-scene canvas { background: transparent !important; position: absolute !important; top: 0 !important; left: 0 !important; }
                video { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; z-index: 0 !important; background: none !important; }
            `}} />
            <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ backgroundColor: 'transparent' }} />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center justify-between">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} className="text-orange-500" />
                    AR Simulator
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleCamera}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:border-orange-500/50 rounded-xl text-white/40 hover:text-white transition-all flex items-center gap-2"
                        title="Đổi Camera"
                    >
                        <RotateCcw size={14} className="text-orange-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            {facingMode === 'user' ? 'Front' : 'Back'}
                        </span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-orange-500 hover:border-orange-500 transition-all active:scale-90 shadow-xl"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 backdrop-blur-md">
                    <div className="relative">
                        <div className="animate-spin w-16 h-16 border-2 border-white/5 border-t-orange-500 rounded-full mb-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Camera size={20} className="text-orange-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Khởi động không gian AR</p>
                        <p className="text-white/20 text-[8px] mt-2 font-bold uppercase tracking-widest italic">Vui lòng chờ trong giây lát...</p>
                    </div>
                </div>
            )}

            {/* Status */}
            {!loading && (
                <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 z-10 transition-colors ${targetFound ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                    {targetFound ? (
                        <>
                            <Sparkles size={14} />
                            Đã nhận diện marker
                        </>
                    ) : (
                        <>
                            <Camera size={14} className="animate-pulse" />
                            Đang tìm marker...
                        </>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
                    <div className="text-center p-6 text-white">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-lg transition"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            )}

            {/* Missing Marker Warning */}
            {!markerUrl && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                    <div className="text-center text-white/50 space-y-2">
                        <Box size={48} className="mx-auto opacity-20" />
                        <p className="text-sm">Vui lòng upload file marker (.mind) để preview</p>
                    </div>
                </div>
            )}
        </div>
    )
}
