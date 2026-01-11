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
    type: '3d' | 'video' | 'occlusion' | 'image'
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

    // Image settings
    image_width?: number
    image_height?: number

    // Animation settings
    animation_mode?: 'auto' | 'loop_clips' | 'tap_to_play'
    enable_tap_animation?: boolean
    steps?: AnimationStep[]
    loop_animation?: boolean

    // Video Keyframes
    keyframes?: VideoKeyframe[]
    animation_duration?: number
}

// Multi-target support
interface TargetConfig {
    targetIndex: number      // Index in .mind file (0-based)
    name: string             // Display name for admin UI  
    thumbnail?: string       // Reference image thumbnail
    assets: ARAsset[]        // Assets for THIS target only
    extends?: number         // Inherit from target index
}

interface ImageTrackingConfig {
    // Multi-target mode (new)
    targets?: TargetConfig[]

    default_assets?: ARAsset[] // Global fallback assets

    // Legacy single-target mode (backward compatible)
    assets?: ARAsset[]

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
    max_track?: number       // Max concurrent targets to track (default: 3)
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

    // Multi-target support: Convert config to unified targets array
    const finalTargets: TargetConfig[] = (() => {
        // New multi-target mode
        if (config.targets && config.targets.length > 0) {
            return config.targets
        }

        // Legacy single-target mode with assets[]
        if (config.assets && config.assets.length > 0) {
            return [{
                targetIndex: 0,
                name: 'Default',
                assets: config.assets
            }]
        }

        // Ultra-legacy mode with model_scale/position/rotation
        return [{
            targetIndex: 0,
            name: 'Default',
            assets: [{
                id: 'legacy-1',
                name: 'Primary Model',
                type: '3d' as const,
                url: modelUrl || '',
                scale: config.model_scale || 1,
                position: config.model_position || [0, 0, 0],
                rotation: config.model_rotation || [0, 0, 0],
                animation_mode: 'auto'
            }]
        }]
    })()

    useEffect(() => {
        console.log('🚀 ImageTracking: Config received:', config);
        console.log('🚀 ImageTracking: Final Targets:', finalTargets);
        console.log('🚀 ImageTracking: Ambient:', config.ambient_intensity, 'Directional:', config.directional_intensity);
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

        // Register fix-rotation-order component
        if (!(window as any).AFRAME.components['fix-rotation-order']) {
            (window as any).AFRAME.registerComponent('fix-rotation-order', {
                init: function () {
                    const el = this.el;
                    const applyOrder = () => {
                        if (el.object3D) {
                            el.object3D.rotation.order = 'XZY';
                        }
                    };
                    applyOrder();
                    el.addEventListener('loaded', applyOrder);
                    el.addEventListener('model-loaded', applyOrder);
                }
            });
        }

        // Register loop-animation-controller component
        if (!(window as any).AFRAME.components['loop-animation-controller']) {
            (window as any).AFRAME.registerComponent('loop-animation-controller', {
                schema: {
                    duration: { type: 'number', default: 0 },
                    enabled: { type: 'boolean', default: false }
                },
                init: function () {
                    if (!this.data.enabled) return;
                    this.timer = null;
                    this.onStart = this.onStart.bind(this);
                    this.onStop = this.onStop.bind(this);
                    this.el.addEventListener('targetFound', this.onStart);
                    this.el.addEventListener('targetLost', this.onStop);
                },
                onStart: function () {
                    if (this.timer) clearInterval(this.timer);
                    // Initial run is triggered by targetFound events on animation
                    // We need to trigger restart after duration
                    if (this.data.duration > 0) {
                        this.timer = setInterval(() => {
                            this.el.emit('restart_animation');
                        }, this.data.duration * 1000); // ms
                    }
                },
                onStop: function () {
                    if (this.timer) {
                        clearInterval(this.timer);
                        this.timer = null;
                    }
                },
                remove: function () {
                    this.onStop();
                    this.el.removeEventListener('targetFound', this.onStart);
                    this.el.removeEventListener('targetLost', this.onStop);
                }
            });
        }

        // Register occlusion-material component only if not already registered
        if (!(window as any).AFRAME.components['occlusion-material']) {
            (window as any).AFRAME.registerComponent('occlusion-material', {
                schema: { debug: { default: false } },
                init: function () {
                    console.log('🛡️ occlusion-material INIT on element:', this.el.tagName, this.el.id);
                    this.el.addEventListener('model-loaded', this.update.bind(this));
                    this.el.addEventListener('loaded', this.update.bind(this));
                    // Try immediate update
                    if (this.el.getObject3D('mesh')) {
                        console.log('🛡️ Mesh already exists on init');
                        this.update();
                    }
                },
                update: function () {
                    var mesh = this.el.getObject3D('mesh');
                    var debug = this.data.debug;
                    const THREE = (window as any).THREE;

                    console.log('🛡️ occlusion-material UPDATE:', { hasMesh: !!mesh, hasTHREE: !!THREE, debug });

                    if (!mesh || !THREE) { return; }

                    mesh.traverse(function (node: any) {
                        if (node.isMesh) {
                            console.log('🛡️ Applying material to mesh node:', node.name || 'unnamed');
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
        }

        const oldScene = document.querySelector('a-scene')
        if (oldScene) {
            try {
                const s = oldScene as any
                // Safe stop with optional chaining and try-catch
                if (s.systems?.['mindar-image-system']?.stop) {
                    try {
                        s.systems['mindar-image-system'].stop()
                    } catch (err) {
                        // console.debug('MindAR stop warning (harmless):', err)
                    }
                }
            } catch (e) {
                console.warn('⚠️ Image Tracking: Failed to access MindAR system', e)
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
        // maxTrack: max concurrent targets to track (default 3 for performance)
        const maxTrack = config.max_track || 3
        scene.setAttribute('mindar-image', `imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.0001; filterBeta: 0.0005; missTolerance: 30; warmupTolerance: 10; maxTrack: ${maxTrack}`)
        scene.setAttribute('embedded', 'true')
        scene.setAttribute('color-space', 'sRGB')
        // CRITICAL: preserveDrawingBuffer: true is required for canvas capture!
        // sortObjects: true is required for renderOrder-based occlusion to work
        scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true; preserveDrawingBuffer: true; sortObjects: true')

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

                    // Check extension
                    const url = config.environment_url!;
                    const isEXR = url.toLowerCase().includes('.exr');
                    const loaderName = isEXR ? 'EXRLoader' : 'RGBELoader';
                    const cdnUrl = isEXR
                        ? 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/EXRLoader.js'
                        : 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/RGBELoader.js';

                    // Check if Loader is available
                    let EnvLoader = THREE[loaderName]
                    if (!EnvLoader) {
                        // Try to load Loader dynamically
                        console.log(`🌅 HDR: Loading ${loaderName}...`)
                        const script = document.createElement('script')
                        script.src = cdnUrl
                        await new Promise((resolve, reject) => {
                            script.onload = resolve
                            script.onerror = reject
                            document.head.appendChild(script)
                        })
                        EnvLoader = THREE[loaderName]
                    }

                    if (!EnvLoader) {
                        console.warn(`⚠️ HDR: ${loaderName} not available`)
                        return
                    }

                    // Diagnostic Fetch
                    try {
                        console.log(`🌅 HDR: Fetch Check Start for ${url}`);
                        const response = await fetch(url, { method: 'HEAD' });
                        console.log(`🌅 HDR: Fetch Check Status: ${response.status} ${response.statusText}`);
                        console.log(`🌅 HDR: Content-Type: ${response.headers.get('content-type')}`);
                        console.log(`🌅 HDR: Content-Length: ${response.headers.get('content-length')}`);
                    } catch (fetchErr) {
                        console.error('🌅 HDR: Fetch Check Failed:', fetchErr);
                    }

                    const loader = new EnvLoader()
                    loader.setCrossOrigin('anonymous')
                    // For EXR, we might need to set data type if not default
                    if (isEXR) {
                        try {
                            // Mobile Optimization: HalfFloatType is sufficient for lighting and saves 50% memory/bandwidth
                            // It is also more compatible with mobile WebGL implementations
                            loader.setDataType(THREE.HalfFloatType);
                        } catch (e) {
                            console.warn('⚠️ HDR: Failed to set HalfFloatType, falling back to FloatType:', e);
                            try { loader.setDataType(THREE.FloatType); } catch (e2) { }
                        }
                    }

                    loader.load(url, (texture: any) => {
                        try {
                            // High Dynamic Range (HDR) Tone Mapping
                            // Essential for mobile to map EXR values to screen range
                            const renderer = (scene as any).renderer;
                            if (renderer) {
                                // Map string config to THREE constants
                                const tmMap: Record<string, any> = {
                                    'acesfilmic': THREE.ACESFilmicToneMapping,
                                    'linear': THREE.LinearToneMapping,
                                    'reinhard': THREE.ReinhardToneMapping,
                                    'no': THREE.NoToneMapping
                                };
                                const tmMode = tmMap[config.tone_mapping || 'acesfilmic'] || THREE.ACESFilmicToneMapping;

                                renderer.toneMapping = tmMode;
                                renderer.toneMappingExposure = config.exposure ?? 1.0;

                                renderer.outputEncoding = THREE.sRGBEncoding;
                                console.log(`💡 HDR: Tone Mapping (${config.tone_mapping || 'acesfilmic'}) & Exposure (${config.exposure ?? 1.0}) configured`);
                            }
                        } catch (tmErr) {
                            console.warn('⚠️ HDR: Failed to set Tone Mapping:', tmErr);
                        }

                        // Ensure texture is LinearEncoding before PMREM
                        texture.encoding = THREE.LinearEncoding;
                        texture.mapping = THREE.EquirectangularReflectionMapping;;

                        // Mobile Compatibility: Use PMREMGenerator for better lighting
                        const threeScene = (scene as any).object3D;

                        if (threeScene) {
                            try {
                                const renderer = (scene as any).renderer;
                                if (renderer) {
                                    console.log('🌅 HDR: Generating PMREM...');
                                    const pmremGenerator = new THREE.PMREMGenerator(renderer);
                                    pmremGenerator.compileEquirectangularShader();

                                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                                    threeScene.environment = envMap;

                                    // Clean up original texture to save memory
                                    texture.dispose();
                                    pmremGenerator.dispose();
                                } else {
                                    // Fallback if renderer not ready
                                    threeScene.environment = texture;
                                }

                                // Keep background null for AR (camera feed visible)
                                threeScene.background = null;
                                console.log(`✅ HDR: ${isEXR ? 'EXR' : 'HDR'} Environment map applied (PMREM: ${!!renderer})`);
                            } catch (pmremErr) {
                                console.error('❌ HDR: PMREM processing failed, falling back to texture:', pmremErr);
                                threeScene.environment = texture;
                                threeScene.background = null;
                            }
                        }
                    }, undefined, (error: any) => {
                        console.error(`❌ HDR: Failed to load ${isEXR ? 'EXR' : 'HDR'} map:`, error)
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

        // Keyframe animation helper function
        const applyKeyframes = (el: HTMLElement, asset: ARAsset, allowedProps: string[] = ['position', 'rotation', 'scale', 'opacity']) => {
            if (!asset.keyframes || asset.keyframes.length === 0) return 0;
            const sortedKfs = [...asset.keyframes].sort((a, b) => a.time - b.time);
            let maxTime = 0;

            allowedProps.forEach(prop => {
                const kfsForProp = sortedKfs.filter(k => k.property === prop);
                if (kfsForProp.length === 0) return;

                kfsForProp.forEach((kf, idx) => {
                    const animName = `animation__kf_${prop}_${idx}`;
                    const prevKf = kfsForProp[idx - 1];

                    const startTime = prevKf ? prevKf.time : 0;
                    const duration = (kf.time - startTime) * 1000; // to ms
                    const delay = startTime * 1000;

                    if (kf.time > maxTime) maxTime = kf.time;

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

                    // Loop Support: Listen for restart_animation event
                    const animValue = `property: ${propertyName}; from: ${prevKf ? prevKf.value : (prop === 'scale' ? "1 1 1" : (prop === 'opacity' ? "1" : "0 0 0"))}; to: ${kf.value}; dur: ${Math.max(1, duration)}; delay: ${delay}; easing: ${kf.easing || 'linear'}; startEvents: targetFound, restart_animation; autoplay: false;`
                    el.setAttribute(animName, animValue)
                });
            });

            return maxTime;
        }

        // Helper function to render assets on a target entity
        const renderAssetsForTarget = (targetEntity: HTMLElement, assets: ARAsset[], targetIndex: number) => {
            assets.forEach((asset) => {
                const isPrimitiveOcclusion = asset.type === 'occlusion' && asset.occlusion_shape && asset.occlusion_shape !== 'model';

                // Allow render if it has URL OR if it is a primitive occlusion shape
                if (!asset.url && !isPrimitiveOcclusion) return

                const assetEntity = document.createElement('a-entity')
                // Use unique ID for unique instance
                assetEntity.setAttribute('id', `${asset.id}-${targetIndex}`)
                assetEntity.setAttribute('position', `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`)
                assetEntity.setAttribute('rotation', `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`)
                assetEntity.setAttribute('fix-rotation-order', '')
                assetEntity.setAttribute('scale', `${asset.scale} ${asset.scale} ${asset.scale}`)

                if (asset.type === '3d' || asset.type === 'occlusion') {
                    let model: HTMLElement;

                    if (isPrimitiveOcclusion) {
                        console.log('🛡️ Creating Primitive Occlusion:', asset.id, asset.occlusion_shape)
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
                        // Apply Transform animations to Container (assetEntity)
                        const dur1 = applyKeyframes(assetEntity, asset, ['position', 'rotation', 'scale']);
                        // Apply Opacity animations to Content (model)
                        const dur2 = applyKeyframes(model, asset, ['opacity']);

                        const maxDur = Math.max(dur1, dur2);

                        // Default to looping if not explicitly disabled or if user expects it
                        if (asset.loop_animation !== false) {
                            if (dur1 > 0) assetEntity.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                            if (dur2 > 0) model.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                        }
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
                    const dur1 = applyKeyframes(assetEntity, asset, ['position', 'rotation', 'scale']);
                    const dur2 = applyKeyframes(plane, asset, ['opacity']);

                    const maxDur = Math.max(dur1, dur2);

                    if (asset.loop_animation !== false && asset.keyframes && asset.keyframes.length > 0) {
                        if (dur1 > 0) assetEntity.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                        if (dur2 > 0) plane.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                    }

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
                } else if (asset.type === 'image') {
                    // Image Asset - render as a-image with configurable dimensions
                    const imageEl = document.createElement('a-image')
                    imageEl.setAttribute('src', asset.url)
                    imageEl.setAttribute('width', (asset.image_width || 1).toString())
                    imageEl.setAttribute('height', (asset.image_height || 1).toString())
                    // Use flat shader for consistent appearance
                    imageEl.setAttribute('material', 'shader: flat; transparent: true')

                    // Apply keyframes if present
                    if (asset.keyframes && asset.keyframes.length > 0) {
                        const dur1 = applyKeyframes(assetEntity, asset, ['position', 'rotation', 'scale']);
                        const dur2 = applyKeyframes(imageEl, asset, ['opacity']);

                        const maxDur = Math.max(dur1, dur2);

                        if (asset.loop_animation !== false) {
                            if (dur1 > 0) assetEntity.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                            if (dur2 > 0) imageEl.setAttribute('loop-animation-controller', `duration: ${maxDur}; enabled: true`);
                        }
                    }

                    assetEntity.appendChild(imageEl)
                }

                targetEntity.appendChild(assetEntity)
            })
        }

        // MULTI-TARGET: Create a target entity for each target in finalTargets
        console.log(`🎯 Multi-Target: Creating ${finalTargets.length} target entities`)

        // 1. Group targets by parent
        const markerGroups: Map<number, number[]> = new Map()
        const targetToGroup: Map<number, number> = new Map()

        finalTargets.forEach((target) => {
            const groupKey = target.extends !== undefined ? target.extends : target.targetIndex
            if (!markerGroups.has(groupKey)) {
                markerGroups.set(groupKey, [])
            }
            markerGroups.get(groupKey)!.push(target.targetIndex)
            targetToGroup.set(target.targetIndex, groupKey)
        })

        // 2. Track active state
        // Set of currently detected targetIndices per group
        const activeTargetsByGroup: Map<number, Set<number>> = new Map()
        markerGroups.forEach((_, key) => activeTargetsByGroup.set(key, new Set()))

        // Helper to update visibility for a group
        const updateGroupVisibility = (groupKey: number) => {
            const activeSet = activeTargetsByGroup.get(groupKey)
            if (!activeSet || activeSet.size === 0) return

            // Strategy: Show the most recently added target (simple LIFO for responsiveness)
            let winnerTargetIndex = -1
            activeSet.forEach(val => winnerTargetIndex = val) // Get last value

            console.log(`🏆 Group ${groupKey} winner: Target ${winnerTargetIndex} (Active: ${Array.from(activeSet).join(', ')})`)

            // Update all members
            const groupMembers = markerGroups.get(groupKey) || []
            groupMembers.forEach(idx => {
                const contentEl = document.getElementById(`target-content-${idx}`)
                if (contentEl) {
                    const isWinner = (idx === winnerTargetIndex)

                    // Apply visibility
                    contentEl.setAttribute('visible', isWinner.toString())

                    if (isWinner) {
                        // console.log(`👁️ Winner Target ${idx} (Group ${groupKey}) - showing content`)
                    } else {
                        // console.log(`🔒 Non-winner Target ${idx} (Group ${groupKey}) - would be hidden`)
                    }
                }
            })
        }

        finalTargets.forEach((target) => {
            const targetEntity = document.createElement('a-entity')
            targetEntity.setAttribute('mindar-image-target', `targetIndex: ${target.targetIndex}`)
            targetEntity.setAttribute('id', `target-${target.targetIndex}`)

            // Wrapper for content (assets) to control visibility independently of tracking
            const contentEntity = document.createElement('a-entity')
            contentEntity.setAttribute('id', `target-content-${target.targetIndex}`)
            contentEntity.setAttribute('visible', 'true') // Default visible

            targetEntity.appendChild(contentEntity)

            // Determine assets
            let assetsToRender = target.assets && target.assets.length > 0 ? target.assets : []
            if (assetsToRender.length === 0 && target.extends !== undefined) {
                const parent = finalTargets.find((t: any) => t.targetIndex === target.extends)
                if (parent && parent.assets && parent.assets.length > 0) {
                    assetsToRender = parent.assets
                }
            }
            if (assetsToRender.length === 0) {
                assetsToRender = config.default_assets || []
            }

            // Render assets into CONTENT entity, not target entity
            renderAssetsForTarget(contentEntity, assetsToRender, target.targetIndex)

            // Events
            targetEntity.addEventListener('targetFound', (e) => {
                if (e.target !== targetEntity) return
                console.log(`✅ Found: ${target.targetIndex} (${target.name})`)
                setScanning(false)

                const groupKey = targetToGroup.get(target.targetIndex)!
                activeTargetsByGroup.get(groupKey)?.add(target.targetIndex)

                updateGroupVisibility(groupKey)

                // Trigger animations
                const children = contentEntity.querySelectorAll('*')
                children.forEach((child: Element) => {
                    if ((child as any).emit) {
                        (child as any).emit('targetFound', null, false)
                    }
                })
            })

            targetEntity.addEventListener('targetLost', () => {
                console.log(`❌ Lost: ${target.targetIndex} (${target.name})`)

                const groupKey = targetToGroup.get(target.targetIndex)!
                activeTargetsByGroup.get(groupKey)?.delete(target.targetIndex)

                // If group is empty, we don't strictly need to hide, 
                // because mindar-image-target hides the parent. 
                // But updating checks if we need to switch winner if multiple were active.
                updateGroupVisibility(groupKey)

                // Check global scanning state
                let anyActive = false
                activeTargetsByGroup.forEach(set => { if (set.size > 0) anyActive = true })
                if (!anyActive) {
                    setScanning(true)
                }
            })

            scene.appendChild(targetEntity)
        })

        // Append scene to container and set up ready events
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

            {/* Video Preview Dialog */}
            {showVideoPreview && recordedVideoUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1b] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                        {/* Video container */}
                        <div className="relative aspect-[9/16] bg-black">
                            <video
                                src={recordedVideoUrl}
                                controls
                                autoPlay
                                loop
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        clearRecording()
                                        setShowVideoPreview(false)
                                    }}
                                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition active:scale-95"
                                >
                                    <RotateCcw size={18} />
                                    <span className="text-xs font-bold uppercase">Làm lại</span>
                                </button>

                                <button
                                    onClick={() => downloadRecording()}
                                    className="flex items-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition active:scale-95"
                                >
                                    <Download size={18} />
                                    <span className="text-xs font-bold uppercase">Lưu về</span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition"
                                >
                                    <Share2 size={18} />
                                    <span className="text-xs font-bold uppercase">Chia sẻ</span>
                                </button>
                            </div>
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
