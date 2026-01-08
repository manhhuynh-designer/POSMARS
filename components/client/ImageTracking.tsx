'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, RotateCcw, Check, Download, Video, Square, Share2 } from 'lucide-react'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'

interface AnimationStep {
    id: string
    property: 'position' | 'rotation' | 'scale'
    to: string
    duration: number
    easing: string
}

interface VideoKeyframe {
    id: string
    time: number
    property: 'position' | 'rotation' | 'scale' | 'opacity'
    value: string
    easing: string
}

interface ARAsset {
    id: string
    name: string
    type: '3d' | 'video' | 'occlusion'
    occlusion_shape?: 'model' | 'cube' | 'sphere' | 'plane'
    url: string
    scale: number
    position: [number, number, number]
    rotation: [number, number, number]

    // Video settings
    video_width?: number
    video_height?: number
    video_autoplay?: boolean
    video_loop?: boolean
    video_muted?: boolean

    // Animation settings
    animation_mode?: 'auto' | 'loop_clips' | 'tap_to_play'
    enable_tap_animation?: boolean
    steps?: AnimationStep[]
    loop_animation?: boolean

    // Video Keyframes
    keyframes?: VideoKeyframe[]
    animation_duration?: number
}

interface ImageTrackingConfig {
    assets: ARAsset[]

    // Lighting & Render
    ambient_intensity?: number
    directional_intensity?: number
    environment_url?: string
    exposure?: number
    tone_mapping?: 'None' | 'Linear' | 'Reinhard' | 'Cineon' | 'ACESFilmic'

    // Legacy support
    model_scale?: number
    model_position?: [number, number, number]
    model_rotation?: [number, number, number]

    // Options
    show_scan_hint?: boolean
    enable_capture?: boolean
    max_video_duration?: number
    capture_quality?: 'standard' | 'high'
}

interface ImageTrackingProps {
    markerUrl: string
    modelUrl?: string // Legacy or primary model
    config: ImageTrackingConfig
    onComplete: () => void
    onCapture?: (imageUrl: string) => void
}

export default function ImageTracking({ markerUrl, modelUrl, config, onComplete, onCapture }: ImageTrackingProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(true)
    const [captured, setCaptured] = useState(false)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [showVideoPreview, setShowVideoPreview] = useState(false)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

    // Migration logic for old configs
    const finalAssets = config.assets || [
        {
            id: 'legacy-1',
            name: 'Primary Model',
            type: '3d',
            url: modelUrl || '',
            scale: config.model_scale || 1,
            position: config.model_position || [0, 0, 0],
            rotation: config.model_rotation || [0, 0, 0],
            animation_mode: 'auto'
        }
    ]

    useEffect(() => {
        console.log('🚀 ImageTracking: Config received:', config);
        console.log('🚀 ImageTracking: Final Assets:', finalAssets);
        console.log('🚀 ImageTracking: Ambient:', config.ambient_intensity, 'Directional:', config.directional_intensity);
        if (finalAssets.length > 0 && finalAssets[0].keyframes) {
            console.log('🚀 ImageTracking: First asset keyframes:', finalAssets[0].keyframes);
        }
    }, [config]);

    // Video recording hook
    const {
        isRecording,
        recordingTime,
        recordedVideoUrl,
        startRecording,
        stopRecording,
        clearRecording,
        downloadRecording
    } = useVideoRecorder({ maxDuration: config.max_video_duration || 30 })

    // Enable capture if onCapture prop is provided or config.enable_capture is true
    const enableCapture = Boolean(onCapture || config.enable_capture)

    useEffect(() => {
        const loadScripts = async () => {
            try {
                // Already loaded?
                if ((window as any).AFRAME && (window as any).MINDAR) {
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

                // Load A-Frame Extras (FOR ANIMATION MIXER)
                if (!document.getElementById('aframe-extras-script')) {
                    const extrasScript = document.createElement('script')
                    extrasScript.id = 'aframe-extras-script'
                    extrasScript.src = 'https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v7.0.0/dist/aframe-extras.min.js'
                    await new Promise((resolve, reject) => {
                        extrasScript.onload = resolve
                        extrasScript.onerror = reject
                        document.head.appendChild(extrasScript)
                    })
                }

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
            const scene = document.querySelector('a-scene')
            if (scene) {
                const s = scene as any
                // optional chaining to avoid null access
                s.systems?.['mindar-image-system']?.stop?.()
                scene.remove()
            }
        }
    }, [facingMode])



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

        // Always register/overwrite custom component for Occlusion Material to ensure latest logic
        (window as any).AFRAME.registerComponent('occlusion-material', {
            schema: { debug: { default: false } },
            init: function () {
                this.el.addEventListener('model-loaded', this.update.bind(this));
                this.el.addEventListener('loaded', this.update.bind(this));
                // Try immediate update
                if (this.el.getObject3D('mesh')) {
                    this.update();
                }
            },
            update: function () {
                var mesh = this.el.getObject3D('mesh');
                var debug = this.data.debug;
                const THREE = (window as any).THREE;

                if (!mesh || !THREE) { return; }

                mesh.traverse(function (node: any) {
                    if (node.isMesh) {
                        if (debug) {
                            // Debug mode: Red transparent
                            node.material = new THREE.MeshBasicMaterial({
                                color: 0xff0000,
                                opacity: 0.5,
                                transparent: true,
                                side: THREE.DoubleSide
                            });
                        } else {
                            // Production mode: Invisible occluder
                            node.material = new THREE.MeshBasicMaterial({
                                colorWrite: false,
                                depthWrite: true,
                                side: THREE.DoubleSide
                            });
                        }
                        node.renderOrder = -1; // Ensure it renders before other objects
                    }
                });
            }
        });

        const oldScene = document.querySelector('a-scene')
        if (oldScene) {
            try {
                const s = oldScene as any
                s.systems?.['mindar-image-system']?.stop?.()
            } catch (e) {
                console.warn('⚠️ Image Tracking: Failed to stop existing MindAR system', e)
            }
            try {
                oldScene.remove()
            } catch (e) {
                console.warn('⚠️ Image Tracking: Failed to remove scene', e)
            }
        }

        const scene = document.createElement('a-scene')
        // Smoothing filters: Lower filterBeta = MORE stabilization (less jitter)
        // filterMinCF: 0.0001 (very low = smooth), filterBeta: 0.001 (very low = very stable)
        scene.setAttribute('mindar-image', `imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.00001; filterBeta: 0.001; missTolerance: 10; warmupTolerance: 1`)
        scene.setAttribute('embedded', 'true')
        scene.setAttribute('color-space', 'sRGB')
        // CRITICAL: preserveDrawingBuffer: true is required for canvas capture!
        scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true; preserveDrawingBuffer: true')

        scene.setAttribute('vr-mode-ui', 'enabled: false')
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false')

        // Lights
        console.log('💡 Lights: ambient_intensity from config:', config.ambient_intensity, '-> applying:', config.ambient_intensity ?? 1.0)
        console.log('💡 Lights: directional_intensity from config:', config.directional_intensity, '-> applying:', config.directional_intensity ?? 0.5)

        const ambientLight = document.createElement('a-light')
        ambientLight.setAttribute('type', 'ambient')
        ambientLight.setAttribute('intensity', (config.ambient_intensity ?? 1.0).toString())
        scene.appendChild(ambientLight)

        const directionalLight = document.createElement('a-light')
        directionalLight.setAttribute('type', 'directional')
        directionalLight.setAttribute('position', '0 10 10')
        directionalLight.setAttribute('intensity', (config.directional_intensity ?? 0.5).toString())
        scene.appendChild(directionalLight)

        // HDR Environment Map for Image-Based Lighting (IBL)
        // This only affects lighting/reflections, NOT the background (camera stays visible)
        if (config.environment_url) {
            console.log('🌅 HDR: Loading environment map:', config.environment_url)

            // Wait for scene to be ready, then apply HDR
            scene.addEventListener('loaded', async () => {
                try {
                    const THREE = (window as any).THREE
                    if (!THREE) {
                        console.warn('⚠️ HDR: THREE not available')
                        return
                    }

                    // Check if RGBELoader is available (from aframe-extras or manual load)
                    let RGBELoader = THREE.RGBELoader
                    if (!RGBELoader) {
                        // Try to load RGBELoader dynamically
                        console.log('🌅 HDR: Loading RGBELoader...')
                        const script = document.createElement('script')
                        script.src = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/RGBELoader.js'
                        await new Promise((resolve, reject) => {
                            script.onload = resolve
                            script.onerror = reject
                            document.head.appendChild(script)
                        })
                        RGBELoader = THREE.RGBELoader
                    }

                    if (!RGBELoader) {
                        console.warn('⚠️ HDR: RGBELoader not available')
                        return
                    }

                    const loader = new RGBELoader()
                    loader.load(config.environment_url!, (hdrTexture: any) => {
                        hdrTexture.mapping = THREE.EquirectangularReflectionMapping

                        // Get the Three.js scene from A-Frame
                        const threeScene = (scene as any).object3D
                        if (threeScene) {
                            // Set environment for IBL (lighting/reflections)
                            threeScene.environment = hdrTexture
                            // Keep background null for AR (camera feed visible)
                            threeScene.background = null
                            console.log('✅ HDR: Environment map applied for IBL')
                        }
                    }, undefined, (error: any) => {
                        console.error('❌ HDR: Failed to load environment map:', error)
                    })
                } catch (error) {
                    console.error('❌ HDR: Error setting up environment map:', error)
                }
            })
        }

        const camera = document.createElement('a-camera')
        camera.setAttribute('position', '0 0 0')
        camera.setAttribute('look-controls', 'enabled: false')
        scene.appendChild(camera)

        const targetEntity = document.createElement('a-entity')
        targetEntity.setAttribute('mindar-image-target', 'targetIndex: 0')

        const applyKeyframes = (el: HTMLElement, asset: ARAsset) => {
            if (!asset.keyframes || asset.keyframes.length === 0) return;
            const sortedKfs = [...asset.keyframes].sort((a, b) => a.time - b.time);
            const props = ['position', 'rotation', 'scale', 'opacity'];

            props.forEach(prop => {
                const kfsForProp = sortedKfs.filter(k => k.property === prop);
                if (kfsForProp.length === 0) return;

                kfsForProp.forEach((kf, idx) => {
                    const animName = `animation__kf_${prop}_${idx}`;
                    const prevKf = kfsForProp[idx - 1];

                    const startTime = prevKf ? prevKf.time : 0;
                    const duration = (kf.time - startTime) * 1000; // to ms
                    const delay = startTime * 1000;

                    let propertyName = prop;
                    if (prop === 'opacity') {
                        if (el.tagName === 'A-GLTF-MODEL') {
                            // Support Occlusion: Skip opacity animation if it's an occluder
                            if (el.hasAttribute('occlusion-material')) return;

                            propertyName = 'model-opacity';
                            // Initialize
                            el.setAttribute('model-opacity', '1');
                        } else {
                            propertyName = 'material.opacity';
                        }
                    }

                    const animValue = `property: ${propertyName}; from: ${prevKf ? prevKf.value : (prop === 'scale' ? "1 1 1" : (prop === 'opacity' ? "1" : "0 0 0"))}; to: ${kf.value}; dur: ${Math.max(1, duration)}; delay: ${delay}; easing: ${kf.easing || 'linear'}; startEvents: targetFound; autoplay: false;`
                    el.setAttribute(animName, animValue)
                });
            });
        }

        // Render Assets
        finalAssets.forEach((asset) => {
            const isPrimitiveOcclusion = asset.type === 'occlusion' && asset.occlusion_shape && asset.occlusion_shape !== 'model';

            // Allow render if it has URL OR if it is a primitive occlusion shape
            if (!asset.url && !isPrimitiveOcclusion) return

            const assetEntity = document.createElement('a-entity')
            assetEntity.setAttribute('id', asset.id)
            assetEntity.setAttribute('position', `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`)
            assetEntity.setAttribute('rotation', `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`)
            assetEntity.setAttribute('scale', `${asset.scale} ${asset.scale} ${asset.scale}`)

            if (asset.type === '3d' || asset.type === 'occlusion') {
                let model: HTMLElement;

                if (isPrimitiveOcclusion) {
                    model = document.createElement('a-entity');
                    if (asset.occlusion_shape === 'cube') {
                        model.setAttribute('geometry', 'primitive: box');
                    } else if (asset.occlusion_shape === 'sphere') {
                        model.setAttribute('geometry', 'primitive: sphere; segmentsWidth: 32; segmentsHeight: 32');
                    } else if (asset.occlusion_shape === 'plane') {
                        model.setAttribute('geometry', 'primitive: plane');
                    }
                    model.setAttribute('occlusion-material', 'debug: false');
                } else {
                    model = document.createElement('a-gltf-model');
                    model.setAttribute('src', asset.url)

                    if (asset.type === 'occlusion') {
                        model.setAttribute('occlusion-material', 'debug: false');
                    }
                }

                // Pro Mixer Keyframes (Option B)
                // Now unified consistent logic with Admin Preview
                if (asset.keyframes && asset.keyframes.length > 0) {
                    applyKeyframes(model, asset);
                } else {
                    // Default static state if no keyframes
                }

                assetEntity.appendChild(model)
            } else if (asset.type === 'video') {
                const videoId = `video-${asset.id}`
                let videoEl = document.getElementById(videoId) as HTMLVideoElement

                if (!videoEl) {
                    videoEl = document.createElement('video')
                    videoEl.id = videoId
                    videoEl.setAttribute('src', asset.url)
                    videoEl.setAttribute('crossorigin', 'anonymous')
                    videoEl.setAttribute('playsinline', 'true')
                    videoEl.setAttribute('webkit-playsinline', 'true')
                    videoEl.preload = 'auto'
                    videoEl.muted = true // Important for autoplay
                    videoEl.loop = asset.video_loop !== false

                    // Hide via CSS but keep in layout for playback
                    videoEl.style.position = 'absolute'
                    videoEl.style.top = '0'
                    videoEl.style.left = '0'
                    videoEl.style.opacity = '0'
                    videoEl.style.zIndex = '-1'
                    videoEl.style.pointerEvents = 'none'

                    document.body.appendChild(videoEl)

                    // Event listeners for debugging and state handling
                    videoEl.addEventListener('loadeddata', () => {
                        console.log(`🎥 Video ${videoId} buffered data. ReadyState: ${videoEl.readyState}`)
                    })
                    videoEl.addEventListener('error', (e) => {
                        console.error(`❌ Video ${videoId} error:`, videoEl.error)
                    })

                    // Try playing immediately to "warm up" (will likely pause if not visible/interacted)
                    // But for AR, we often want it to start when target found.
                    // However, A-Frame needs a valid texture. 
                    // Let's only load it. Play on targetFound.
                    videoEl.load()
                }

                const plane = document.createElement('a-video')
                plane.setAttribute('src', `#${videoId}`)
                // Use a standard material first to debug, then flat. 
                // Flat is correct for "screen" effect.
                plane.setAttribute('material', 'shader: flat; src: #' + videoId + '; transparent: true')
                plane.setAttribute('width', (asset.video_width || 1).toString())
                plane.setAttribute('height', (asset.video_height || 0.56).toString())

                // Video Keyframes
                applyKeyframes(plane, asset);

                // Error handling: Visual feedback in AR
                videoEl.addEventListener('error', (e) => {
                    console.error(`❌ Video ${videoId} error:`, videoEl.error)
                    // Change plane to red to indicate error
                    plane.setAttribute('material', 'shader: flat; color: #ff0000; opacity: 0.7')
                    // Optional: Add text entity "ERROR"
                    const text = document.createElement('a-text')
                    text.setAttribute('value', 'DECODE ERROR\n(Check Codec)')
                    text.setAttribute('align', 'center')
                    text.setAttribute('scale', '0.5 0.5 0.5')
                    text.setAttribute('position', '0 0 0.1')
                    plane.appendChild(text)
                })

                targetEntity.addEventListener('targetFound', () => {
                    console.log(`🎯 Target Found! Attempting to play video ${videoId}`)
                    if (asset.video_autoplay !== false) {
                        videoEl.play()
                            .then(() => console.log(`▶️ Video ${videoId} playing`))
                            .catch(e => {
                                console.warn(`⚠️ Video ${videoId} play failed:`, e)
                                // If failed, try muted
                                videoEl.muted = true
                                videoEl.play().catch(err => console.error('Double fail', err))
                            })
                    }
                })

                targetEntity.addEventListener('targetLost', () => {
                    console.log(`❌ Target Lost. Pausing video ${videoId}`)
                    videoEl.pause()
                })

                assetEntity.appendChild(plane)
            }

            targetEntity.appendChild(assetEntity)
        })

        scene.appendChild(targetEntity)
        containerRef.current.appendChild(scene)

        const fallbackTimer = setTimeout(() => {
            console.warn('⚠️ Image Tracking: arReady timeout - forcing loading=false')
            setLoading(false)
        }, 5000)

        scene.addEventListener('arReady', () => {
            console.log('✅ Image Tracking: arReady event fired!')
            clearTimeout(fallbackTimer) // Clear fallback if ready
            setLoading(false)
        })

        targetEntity.addEventListener('targetFound', (e) => {
            // Prevent infinite loop: only process if event originated from targetEntity itself
            if (e.target !== targetEntity) return

            console.log('🎯 targetFound: triggering animations on all child entities')
            setScanning(false)

            // Manually emit 'targetFound' to ALL child entities so animations trigger
            // Using bubbles=false to prevent event from bubbling back up
            const children = targetEntity.querySelectorAll('*')
            children.forEach((child: Element) => {
                if ((child as any).emit) {
                    (child as any).emit('targetFound', null, false)
                }
            })
        })

        targetEntity.addEventListener('targetLost', () => {
            setScanning(true)
        })



        // Monitor for when video element is added by MindAR (observe entire subtree)
        const attachVideo = (video: HTMLVideoElement) => {
            if (!containerRef.current || containerRef.current.contains(video)) return
            console.log('📹 Image Tracking: Attaching camera video element')
            video.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; z-index: 0 !important; background: none !important;'
            // Prepend video so it's behind the scene
            containerRef.current.prepend(video)
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeName === 'VIDEO') {
                        attachVideo(node as HTMLVideoElement)
                        observer.disconnect()
                        return
                    }
                    if (node instanceof HTMLElement) {
                        const vids = node.querySelectorAll('video')
                        if (vids.length > 0) {
                            attachVideo(vids[0])
                            observer.disconnect()
                            return
                        }
                    }
                }
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })

        // Fallback: search for video after short delay
        setTimeout(() => {
            const video = document.querySelector('video')
            if (video) attachVideo(video)
        }, 2000)
    }

    const handleShare = async () => {
        if (!recordedVideoUrl) return

        try {
            const response = await fetch(recordedVideoUrl)
            const blob = await response.blob()
            const file = new File([blob], `ar-video-${Date.now()}.webm`, { type: blob.type })

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My AR Experience',
                    text: 'Check out my AR video!',
                })
            } else {
                // Fallback to download if sharing not supported
                downloadRecording()
                alert('Trình duyệt không hỗ trợ chia sẻ file. Bản ghi đã được tải về máy.')
            }
        } catch (error) {
            console.error('Share failed:', error)
            alert('Không thể chia sẻ video.')
        }
    }

    const handlePhotoShare = async () => {
        if (!capturedImage) return

        try {
            const response = await fetch(capturedImage)
            const blob = await response.blob()
            const file = new File([blob], `ar-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My AR Experience',
                    text: 'Check out my AR photo!',
                })
            } else {
                handleDownload()
                alert('Trình duyệt không hỗ trợ chia sẻ ảnh. Ảnh đã được tải về máy.')
            }
        } catch (error) {
            console.error('Photo share failed:', error)
            alert('Không thể chia sẻ ảnh.')
        }
    }

    const handleCapture = async () => {
        try {
            const video = document.querySelector('video') as HTMLVideoElement

            // Get AR canvas from A-Frame renderer (more reliable)
            const scene = document.querySelector('a-scene') as any
            let arCanvas: HTMLCanvasElement | null = null

            if (scene && scene.renderer && scene.renderer.domElement) {
                arCanvas = scene.renderer.domElement as HTMLCanvasElement
            } else {
                // Fallback to querySelector
                arCanvas = document.querySelector('a-scene canvas') as HTMLCanvasElement
            }

            if (!video || !arCanvas) {
                console.error('Cannot find video or AR canvas', { video: !!video, arCanvas: !!arCanvas })
                return
            }

            console.log('📸 Capture: Video size:', video.videoWidth, 'x', video.videoHeight)
            console.log('📸 Capture: AR Canvas size:', arCanvas.width, 'x', arCanvas.height)

            // CRITICAL: Force a render before capturing to ensure the buffer is populated
            if (scene && scene.renderer && scene.object3D) {
                const cameraEl = scene.querySelector('a-camera') || scene.querySelector('[camera]')
                const threeCamera = cameraEl?.object3D?.children?.[0] || scene.camera?.object3D
                if (threeCamera) {
                    scene.renderer.render(scene.object3D, threeCamera)
                    console.log('📸 Capture: Forced render before capture')
                }
            }

            // CRITICAL: Use AR canvas resolution as base (this is what A-Frame renders at)
            const canvasWidth = arCanvas.width || 1280
            const canvasHeight = arCanvas.height || 720

            // Create composite canvas at AR canvas resolution
            const canvas = document.createElement('canvas')
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            const ctx = canvas.getContext('2d')!

            // Draw video background - scale to COVER the canvas (no black bars)
            const videoWidth = video.videoWidth || 1920
            const videoHeight = video.videoHeight || 1080
            const videoAspect = videoWidth / videoHeight
            const canvasAspect = canvasWidth / canvasHeight

            let drawWidth = canvasWidth
            let drawHeight = canvasHeight
            let drawX = 0
            let drawY = 0

            // Scale video to cover
            if (videoAspect > canvasAspect) {
                // Video is wider - fit height, crop width
                drawHeight = canvasHeight
                drawWidth = canvasHeight * videoAspect
                drawX = (canvasWidth - drawWidth) / 2
            } else {
                // Video is taller - fit width, crop height
                drawWidth = canvasWidth
                drawHeight = canvasWidth / videoAspect
                drawY = (canvasHeight - drawHeight) / 2
            }

            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

            // Draw AR canvas overlay at EXACTLY 1:1 - preserves AR element positions
            ctx.drawImage(arCanvas, 0, 0)

            // Convert to base64 at high quality
            const imageData = canvas.toDataURL('image/jpeg', 0.95)
            setCapturedImage(imageData)
            setCaptured(true)
            console.log('📸 Capture success!')
        } catch (e) {
            console.error('Capture failed:', e)
        }
    }

    const handleRetake = () => {
        setCaptured(false)
        setCapturedImage(null)
    }

    const handleConfirm = () => {
        if (capturedImage && onCapture) {
            onCapture(capturedImage)
        }
    }

    const handleDownload = () => {
        if (!capturedImage) return
        const link = document.createElement('a')
        link.download = `ar-photo-${Date.now()}.jpg`
        link.href = capturedImage
        link.click()
    }

    return (
        <div className="fixed inset-0 bg-black">
            <style dangerouslySetInnerHTML={{
                __html: `
                a-scene { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; background: transparent !important; }
                a-scene canvas { background: transparent !important; position: absolute !important; top: 0 !important; left: 0 !important; }
                video { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; z-index: 0 !important; background: none !important; }
            `}} />
            <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ backgroundColor: 'transparent' }} />

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
            {!loading && scanning && !captured && config.show_scan_hint !== false && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center text-white">
                        <Camera size={48} className="mx-auto mb-4 animate-pulse" />
                        <p className="text-lg font-medium">Hướng camera vào poster</p>
                        <p className="text-sm opacity-70">Để xem nội dung AR</p>
                    </div>
                </div>
            )}

            {/* Capture & Record Buttons - Show when marker found and capture enabled */}
            {!loading && !scanning && !captured && !showVideoPreview && enableCapture && (
                <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-20">
                    <div className="flex items-center gap-4">
                        {/* Photo Capture Button */}
                        <button
                            onClick={handleCapture}
                            disabled={isRecording}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-orange-500 active:scale-95 transition-transform disabled:opacity-50"
                        >
                            <Camera size={28} className="text-orange-500" />
                        </button>

                        {/* Video Record Button */}
                        {!isRecording ? (
                            <button
                                onClick={() => {
                                    const video = document.querySelector('video') as HTMLVideoElement
                                    const scene = document.querySelector('a-scene') as any
                                    let arCanvas: HTMLCanvasElement | null = null
                                    if (scene && scene.renderer && scene.renderer.domElement) {
                                        arCanvas = scene.renderer.domElement
                                    } else {
                                        arCanvas = document.querySelector('a-scene canvas') as HTMLCanvasElement
                                    }
                                    if (video && arCanvas) startRecording(video, arCanvas)
                                }}
                                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-4 border-red-300 active:scale-95 transition-transform"
                            >
                                <Video size={28} className="text-white" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    stopRecording()
                                    setShowVideoPreview(true)
                                }}
                                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-4 border-red-300 animate-pulse"
                            >
                                <Square size={24} fill="white" className="text-white" />
                            </button>
                        )}
                    </div>
                    {isRecording && (
                        <div className="flex items-center gap-2 mt-3 bg-black/60 px-4 py-2 rounded-full">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white text-sm font-medium">{recordingTime}s / {config.max_video_duration || 30}s</span>
                        </div>
                    )}
                </div>
            )}

            {/* Video Preview */}
            {showVideoPreview && recordedVideoUrl && (
                <div className="absolute inset-0 bg-black z-30 flex flex-col">
                    {/* Video container - maximizes space */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        <video
                            src={recordedVideoUrl}
                            controls
                            autoPlay
                            loop
                            playsInline
                            className="w-full h-full object-contain shadow-2xl"
                        />
                    </div>

                    {/* Action Buttons - Always visible at bottom */}
                    <div className="p-8 pb-12 bg-gradient-to-t from-black via-black/95 to-transparent">
                        <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
                            <button
                                onClick={() => {
                                    clearRecording()
                                    setShowVideoPreview(false)
                                }}
                                className="flex flex-col items-center gap-2 bg-white/10 text-white min-w-[80px] py-4 rounded-2xl font-medium hover:bg-white/20 transition active:scale-95"
                            >
                                <RotateCcw size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Làm lại</span>
                            </button>

                            <button
                                onClick={() => downloadRecording()}
                                className="flex flex-col items-center gap-2 bg-white/10 text-white min-w-[80px] py-4 rounded-2xl font-medium hover:bg-white/20 transition active:scale-95"
                            >
                                <Download size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Lưu về</span>
                            </button>

                            <button
                                onClick={handleShare}
                                className="flex flex-col items-center gap-2 bg-orange-500 text-white flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition"
                            >
                                <Share2 size={24} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Chia sẻ</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Captured Image Preview */}
            {captured && capturedImage && (
                <div className="absolute inset-0 bg-black z-30 flex flex-col">
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        <img
                            src={capturedImage}
                            alt="Captured AR"
                            className="w-full h-full object-contain shadow-2xl"
                        />
                    </div>

                    {/* Preview Actions */}
                    <div className="p-8 pb-12 bg-gradient-to-t from-black via-black/95 to-transparent">
                        <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
                            <button
                                onClick={handleRetake}
                                className="flex flex-col items-center gap-2 bg-white/10 text-white min-w-[80px] py-4 rounded-2xl font-medium hover:bg-white/20 transition active:scale-95"
                            >
                                <RotateCcw size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Chụp lại</span>
                            </button>

                            <button
                                onClick={handlePhotoShare}
                                className="flex flex-col items-center gap-2 bg-white/10 text-white min-w-[80px] py-4 rounded-2xl font-medium hover:bg-white/20 transition active:scale-95"
                            >
                                <Share2 size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Chia sẻ</span>
                            </button>

                            {onCapture && (
                                <button
                                    onClick={handleConfirm}
                                    className="flex flex-col items-center gap-2 bg-orange-500 text-white flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition"
                                >
                                    <Check size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Xác nhận</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Close & Toggle Buttons */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                {!captured && (
                    <button
                        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                        className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
                        title="Đổi Camera"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
                {!captured && (
                    <button
                        onClick={onComplete}
                        className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
                    >
                        <X size={24} />
                    </button>
                )}
            </div>
        </div>
    )
}
