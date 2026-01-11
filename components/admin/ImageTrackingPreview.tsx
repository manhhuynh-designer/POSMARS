'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Camera, X, Box, Check, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { ImageTrackingConfig, ARAsset, TargetConfig } from './template-builder/types'

interface ImageTrackingPreviewProps {
    markerUrl: string
    config: ImageTrackingConfig
    onClose: () => void
}

export default function ImageTrackingPreview({ markerUrl, config, onClose }: ImageTrackingPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)
    const entityRefs = useRef<{ [key: string]: HTMLElement }>({})

    // Stable key for asset structure - only changes when assets actually change
    // Use JSON.stringify to compare by value, not by reference
    const assetStructureKeyJson = JSON.stringify({
        targets: (config.targets || []).map(t => ({ idx: t.targetIndex, assets: (t.assets || []).map(a => ({ id: a.id, url: a.url })) })),
        assets: (config.assets || []).map(a => ({ id: a.id, url: a.url })),
        defaults: (config.default_assets || []).map(a => ({ id: a.id, url: a.url }))
    });

    const assetStructureKey = useMemo(() => {
        return assetStructureKeyJson;
    }, [assetStructureKeyJson]);
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

    // Soft Updates for LIGHTING ONLY (Real-time tweaks without resetting transforms)
    useEffect(() => {
        if (!sceneRef.current) return

        // 1. Update Global Lighting
        const ambient = sceneRef.current.querySelector('a-light[type="ambient"]')
        if (ambient) ambient.setAttribute('intensity', (config.ambient_intensity ?? 1).toString())

        const directional = sceneRef.current.querySelector('a-light[type="directional"]')
        if (directional) directional.setAttribute('intensity', (config.directional_intensity ?? 1).toString())

        // 2. Update Renderer settings (Tone Mapping, Exposure)
        sceneRef.current.setAttribute('renderer', {
            colorManagement: true,
            physicallyCorrectLights: true,
            exposure: config.exposure ?? 1,
            toneMapping: config.tone_mapping ?? 'acesfilmic'
        })

        // NOTE: Asset transform updates are handled by initAR (on asset structure change)
        // and by keyframe animations. We do NOT update transforms here to prevent
        // resetting positions when only lighting settings are changed.

    }, [config.ambient_intensity, config.directional_intensity, config.exposure, config.tone_mapping])

    // Re-initialize scene when assets list or marker changes (Hard update)
    useEffect(() => {
        if (!loading && containerRef.current) {
            initAR()
        }
    }, [markerUrl, assetStructureKey, facingMode])

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

        // Register occlusion-material component only if not already registered
        if (!(window as any).AFRAME.components['occlusion-material']) {
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
        // Smoothing filters: Must match Client settings for consistent preview
        // filterMinCF: 0.00001 (very low = smooth), filterBeta: 0.001 (very low = very stable)
        // maxTrack: max concurrent targets to track (default 3 for performance)
        const maxTrack = config.max_track || 3
        scene.setAttribute('mindar-image', `imageTargetSrc: ${markerUrl}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.00001; filterBeta: 0.001; missTolerance: 10; warmupTolerance: 1; maxTrack: ${maxTrack}`)
        scene.setAttribute('embedded', 'true')
        scene.setAttribute('color-space', 'sRGB')
        // CRITICAL: preserveDrawingBuffer: true is required for canvas capture!
        scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true; preserveDrawingBuffer: true')
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

        // Lights - must match Client settings exactly
        console.log('💡 Admin Lights: ambient_intensity:', config.ambient_intensity, '-> applying:', config.ambient_intensity ?? 1.0)
        console.log('💡 Admin Lights: directional_intensity:', config.directional_intensity, '-> applying:', config.directional_intensity ?? 0.5)

        const ambient = document.createElement('a-light')
        ambient.setAttribute('type', 'ambient')
        ambient.setAttribute('intensity', (config.ambient_intensity ?? 1.0).toString())
        scene.appendChild(ambient)

        const directional = document.createElement('a-light')
        directional.setAttribute('type', 'directional')
        directional.setAttribute('position', '0 10 10') // Same as Client
        directional.setAttribute('intensity', (config.directional_intensity ?? 0.5).toString()) // Same default as Client
        scene.appendChild(directional)

        // HDR Environment Map for Image-Based Lighting (IBL)
        // This only affects lighting/reflections, NOT the background (camera stays visible)
        if (config.environment_url) {
            console.log('🌅 Admin HDR: Loading environment map:', config.environment_url)

            // Wait for scene to be ready, then apply HDR
            scene.addEventListener('loaded', async () => {
                try {
                    const THREE = (window as any).THREE
                    if (!THREE) {
                        console.warn('⚠️ Admin HDR: THREE not available')
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
                        console.log(`🌅 Admin HDR: Loading ${loaderName}...`)
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
                        console.warn(`⚠️ Admin HDR: ${loaderName} not available`)
                        return
                    }

                    // Diagnostic Fetch
                    try {
                        console.log(`🌅 Admin HDR: Fetch Check Start for ${url}`);
                        const response = await fetch(url, { method: 'HEAD' });
                        console.log(`🌅 Admin HDR: Fetch Check Status: ${response.status} ${response.statusText}`);
                        console.log(`🌅 Admin HDR: Content-Type: ${response.headers.get('content-type')}`);
                        console.log(`🌅 Admin HDR: Content-Length: ${response.headers.get('content-length')}`);
                    } catch (fetchErr) {
                        console.error('🌅 Admin HDR: Fetch Check Failed:', fetchErr);
                    }

                    const loader = new EnvLoader()
                    loader.setCrossOrigin('anonymous')
                    // For EXR, we might need to set data type if not default
                    if (isEXR) {
                        try {
                            loader.setDataType(THREE.HalfFloatType);
                        } catch (e) {
                            loader.setDataType(THREE.FloatType);
                        }
                    }

                    loader.load(url, (texture: any) => {
                        try {
                            // Sync Tone Mapping with Client AR
                            const renderer = (scene as any).renderer;
                            if (renderer) {
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
                            }
                        } catch (e) { console.warn('Admin HDR: Tone mapping error', e); }

                        texture.mapping = THREE.EquirectangularReflectionMapping

                        // Get the Three.js scene from A-Frame
                        const threeScene = (scene as any).object3D
                        if (threeScene) {
                            // Set environment for IBL (lighting/reflections)
                            threeScene.environment = texture
                            // Keep background null for AR (camera feed visible)
                            threeScene.background = null
                            console.log(`✅ Admin HDR: ${isEXR ? 'EXR' : 'HDR'} Environment map applied for IBL`)
                        }
                    }, undefined, (error: any) => {
                        console.error(`❌ Admin HDR: Failed to load ${isEXR ? 'EXR' : 'HDR'} map:`, error)
                    })
                } catch (error) {
                    console.error('❌ Admin HDR: Error setting up environment map:', error)
                }
            })
        }

        // Helper function: Render assets for a target (Identical to Client Logic)
        const renderAssetsForTarget = (targetEntity: any, assets: ARAsset[], targetIndex: number) => {
            assets.forEach(asset => {
                const isPrimitiveOcclusion = asset.type === 'occlusion' && asset.occlusion_shape && asset.occlusion_shape !== 'model';

                // Allow render if it has URL OR if it is a primitive occlusion shape
                if (!asset.url && !isPrimitiveOcclusion) return

                console.log(`🎬 Target ${targetIndex} - AR Asset ${asset.name}: keyframes =`, asset.keyframes?.length || 0, asset.keyframes)

                // Store entity ref for animation triggering
                // We use a composite ID for multi-target: targetIndex_assetId
                const assetEntityId = `${asset.id}-${targetIndex}`

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
                    el.setAttribute('fix-rotation-order', '')

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
                } else if (asset.type === 'image') {
                    // Image Asset - render with alpha/transparency support
                    el = document.createElement('a-image')
                    el.setAttribute('src', asset.url)
                    el.setAttribute('width', (asset.image_width ?? 1).toString())
                    el.setAttribute('height', (asset.image_height ?? 1).toString())
                    // Use flat shader with alpha transparency
                    el.setAttribute('material', 'shader: flat; transparent: true; alphaTest: 0.5')
                    el.setAttribute('fix-rotation-order', '')

                    // Image Keyframes (Option B) for Preview
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

                                el.setAttribute(animName,
                                    `property: ${propertyName}; ${fromAttr} to: ${kf.value}; dur: ${Math.max(duration, 1)}; delay: ${delay}; easing: ${kf.easing || 'linear'}; startEvents: ${startEvents}`
                                );
                            });
                        });
                    }
                } else {

                    // Handle Primitive Occlusion Shapes
                    if (asset.type === 'occlusion' && asset.occlusion_shape && asset.occlusion_shape !== 'model') {
                        el = document.createElement('a-entity')

                        if (asset.occlusion_shape === 'cube') {
                            el.setAttribute('geometry', 'primitive: box')
                        } else if (asset.occlusion_shape === 'sphere') {
                            el.setAttribute('geometry', 'primitive: sphere; segmentsWidth: 32; segmentsHeight: 32')
                        } else if (asset.occlusion_shape === 'plane') {
                            el.setAttribute('geometry', 'primitive: plane')
                        }

                        el.setAttribute('occlusion-material', 'debug: false')
                        el.setAttribute('fix-rotation-order', '')
                    }
                    // Handle GLTF Models (3D Models & Occlusion Custom Models)
                    else {
                        el = document.createElement('a-gltf-model')
                        el.setAttribute('src', asset.url)
                        el.setAttribute('fix-rotation-order', '')

                        // GLB Embedded Animation Support (Sync with Client AR)
                        if (asset.type !== 'occlusion') {
                            const loopMode = asset.loop_animation !== false ? 'repeat' : 'once';
                            el.setAttribute('animation-mixer', `loop: ${loopMode}; timeScale: 1`);
                            el.setAttribute('model-opacity', '1');
                        }

                        if (asset.type === 'occlusion') {
                            el.setAttribute('occlusion-material', 'debug: false')
                        }
                    }

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

                                // Handle opacity animation differently for occlusion vs normal
                                if (prop === 'opacity') {
                                    if (asset.type === 'occlusion') return; // Skip opacity for occlusion
                                    propertyName = 'model-opacity';
                                }

                                let startEvents = 'targetFound';
                                if (idx > 0) {
                                    startEvents = `animationcomplete__kf_${prop}_${idx - 1}`;
                                }

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
                    }
                }

                el.setAttribute('position', `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`)
                el.setAttribute('rotation', `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`)
                el.setAttribute('scale', `${asset.scale} ${asset.scale} ${asset.scale}`)

                entityRefs.current[assetEntityId] = el
                targetEntity.appendChild(el)
            })
        }

        // Multi-Target Support: Determine rendering targets
        const finalTargets: TargetConfig[] = (() => {
            // New multi-target mode
            if (config.targets && config.targets.length > 0) {
                return config.targets
            }
            // Legacy single-target mode
            if (config.assets && config.assets.length > 0) {
                return [{
                    targetIndex: 0,
                    name: 'Default',
                    assets: config.assets
                }]
            }
            return []
        })()

        console.log(`🎬 Image Tracking Preview: Rendering ${finalTargets.length} targets`)

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
        const activeTargetsByGroup: Map<number, Set<number>> = new Map()
        markerGroups.forEach((_, key) => activeTargetsByGroup.set(key, new Set()))

        // Helper to update visibility for a group
        const updateGroupVisibility = (groupKey: number) => {
            const activeSet = activeTargetsByGroup.get(groupKey)
            if (!activeSet || activeSet.size === 0) return

            // Strategy: Show the most recently added target (LIFO)
            let winnerTargetIndex = -1
            activeSet.forEach(val => winnerTargetIndex = val)

            // Update all members
            const groupMembers = markerGroups.get(groupKey) || []
            groupMembers.forEach(idx => {
                const contentEl = document.getElementById(`preview-target-content-${idx}`)
                if (contentEl) {
                    const isVisible = (idx === winnerTargetIndex)
                    contentEl.setAttribute('visible', isVisible.toString())
                    if (isVisible) {
                        console.log(`👁️ Preview: Showing content for Target ${idx} (Group ${groupKey})`)
                    }
                }
            })
        }

        finalTargets.forEach(target => {
            const targetEntity = document.createElement('a-entity')
            targetEntity.setAttribute('mindar-image-target', `targetIndex: ${target.targetIndex}`)

            // Wrapper for content
            const contentEntity = document.createElement('a-entity')
            contentEntity.setAttribute('id', `preview-target-content-${target.targetIndex}`)
            contentEntity.setAttribute('visible', 'true') // Managed by updateGroupVisibility
            targetEntity.appendChild(contentEntity)

            // Render assets for this target
            let assetsToRender = target.assets && target.assets.length > 0 ? target.assets : []

            // 1. Inheritance Logic
            if (assetsToRender.length === 0 && target.extends !== undefined) {
                const parent = config.targets?.find(t => t.targetIndex === target.extends)
                if (parent && parent.assets && parent.assets.length > 0) {
                    assetsToRender = parent.assets
                }
            }

            // 2. Fallback to Global Defaults
            if (assetsToRender.length === 0) {
                assetsToRender = config.default_assets || []
            }

            // Render to CONTENT entity
            renderAssetsForTarget(contentEntity, assetsToRender, target.targetIndex)

            // Target Found Listener
            targetEntity.addEventListener('targetFound', (e) => {
                if (e.target !== targetEntity) return
                console.log(`🎯 Target ${target.targetIndex} Found!`)
                setTargetFound(true)

                const groupKey = targetToGroup.get(target.targetIndex)!
                activeTargetsByGroup.get(groupKey)?.add(target.targetIndex)
                updateGroupVisibility(groupKey)

                // Emit targetFound to all child element refs (for animations)
                assetsToRender.forEach(asset => {
                    const uniqueId = `${asset.id}-${target.targetIndex}`
                    const el = entityRefs.current[uniqueId]
                    if (el) {
                        (el as any).emit('targetFound', null, false)
                    }
                    if (asset.type === 'video' && asset.video_autoplay) {
                        const videoId = `preview-video-${asset.id}`
                        const video = document.getElementById(videoId) as HTMLVideoElement
                        // Only play if this target is the WINNER? 
                        // Ideally checking visibility, but simple play() is checking 'visible' implicitly in A-Frame? No.
                        // For preview, let's play them all, but visual is hidden.
                        if (video) video.play()
                    }
                })
            })

            targetEntity.addEventListener('targetLost', () => {
                console.log(`❌ Target ${target.targetIndex} Lost`)

                const groupKey = targetToGroup.get(target.targetIndex)!
                activeTargetsByGroup.get(groupKey)?.delete(target.targetIndex)
                updateGroupVisibility(groupKey)

                // Check if ANY targets are active
                let anyActive = false
                activeTargetsByGroup.forEach(set => { if (set.size > 0) anyActive = true })
                if (!anyActive) {
                    setTargetFound(false)
                }
            })

            scene.appendChild(targetEntity)
        })
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
