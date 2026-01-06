/**
 * Shared Face AR Utility
 * Used by both Admin Preview and Client Face Filter components
 */

// ============================================
// TYPES
// ============================================

export interface FaceARConfig {
    filter_type?: '2d' | '3d'
    filter_url?: string
    filter_3d_url?: string
    filter_scale?: number
    /** Non-uniform scale for 3D models */
    scale_x?: number
    scale_y?: number
    scale_z?: number
    anchor_position?: string
    offset_x?: number
    offset_y?: number
    offset_z?: number
    rotation_x?: number
    rotation_y?: number
    rotation_z?: number
    /** Blend mode for 2D images (normal, multiply, add, screen) */
    blend_mode?: 'normal' | 'multiply' | 'add' | 'screen'
    /** Enable volumetric head occlusion (for hats/helmets) */
    full_head_occlusion?: boolean
    /** Radius of volumetric head occluder sphere (default: 0.15) */
    occlusion_radius?: number
    /** Z-position of volumetric head occluder (default: -0.08) */
    occlusion_offset_z?: number
}

export interface FaceARSceneOptions {
    /** Show debug wireframe on occluder */
    debugMode?: boolean
    /** Show face mesh overlay for tracking visualization */
    showFaceMesh?: boolean
    /** Enable color management for proper lighting */
    colorManagement?: boolean
    /** CSS styles for scene container */
    containerStyles?: Partial<CSSStyleDeclaration>
}

// MindAR Face anchor indices
export const ANCHOR_INDICES: Record<string, number> = {
    'nose_bridge': 168,
    'forehead': 10,
    'nose_tip': 1,
    'chin': 152,
    'full_face': 168,
}

// ============================================
// SCRIPT LOADING
// ============================================

/**
 * Load A-Frame and MindAR Face scripts
 */
export async function loadFaceARScripts(): Promise<void> {
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

    // Wait for AFRAME global
    let attempts = 0
    while (!(window as any).AFRAME && attempts < 50) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
    }
    if (!(window as any).AFRAME) throw new Error('AFRAME failed to load')

    // Load MindAR Face
    if (!document.getElementById('mindar-face-script')) {
        const mindarScript = document.createElement('script')
        mindarScript.id = 'mindar-face-script'
        mindarScript.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-face-aframe.prod.js'
        await new Promise((resolve, reject) => {
            mindarScript.onload = resolve
            mindarScript.onerror = reject
            document.head.appendChild(mindarScript)
        })
    } else if (!(window as any).MINDAR?.FACE) {
        await new Promise(r => setTimeout(r, 500))
    }

    // Allow MindAR to initialize
    await new Promise(r => setTimeout(r, 500))
    console.log('✅ Face AR scripts loaded successfully')
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

/**
 * Register custom A-Frame components for Face AR
 */
export function registerFaceARComponents(debugMode: boolean = false) {
    if (typeof window === 'undefined' || !(window as any).AFRAME) {
        console.warn('A-Frame not loaded, skipping component registration')
        return
    }

    const AFRAME = (window as any).AFRAME

    // Custom head occluder component for depth-only sphere rendering
    if (!AFRAME.components['head-occluder']) {
        AFRAME.registerComponent('head-occluder', {
            schema: {
                debug: { type: 'boolean', default: false }
            },
            init: function () {
                this.updateMaterial()
            },
            update: function () {
                this.updateMaterial()
            },
            updateMaterial: function () {
                const mesh = this.el.getObject3D('mesh')
                if (mesh) {
                    if (this.data.debug) {
                        // Debug mode: red wireframe visible
                        mesh.material.color.setHex(0xff0000)
                        mesh.material.wireframe = true
                        mesh.material.opacity = 0.3
                        mesh.material.transparent = true
                        mesh.material.colorWrite = true
                        console.log('🔴 Head occluder: DEBUG mode')
                    } else {
                        // Production mode: invisible but writes depth
                        mesh.material.colorWrite = false
                        mesh.material.depthWrite = true
                        mesh.material.transparent = false
                        mesh.renderOrder = 0
                        console.log('⚫ Head occluder: PRODUCTION mode (invisible depth-only)')
                    }
                    mesh.material.needsUpdate = true
                }
            }
        })
        console.log('✅ head-occluder component registered')
    }

    // Register fix-occluder component
    if (!AFRAME.components['fix-occluder']) {
        AFRAME.registerComponent('fix-occluder', {
            schema: {
                debug: { type: 'boolean', default: false }
            },
            init: function () {
                console.log('🔧 fix-occluder init, debug =', this.data.debug)

                const configureOccluder = () => {
                    const object3D = this.el.getObject3D('mesh')
                    console.log('🔍 fix-occluder: Looking for mesh, found:', !!object3D)
                    if (!object3D) return

                    const THREE = AFRAME.THREE
                    let meshCount = 0
                    object3D.traverse((o: any) => {
                        if (o.isMesh) {
                            meshCount++
                            let material
                            if (this.data.debug) {
                                // DEBUG: Visible green wireframe
                                console.log('🟢 Face mesh: Applying DEBUG mode (green wireframe)')
                                material = new THREE.MeshBasicMaterial({
                                    color: 0x00ff00,
                                    wireframe: true,
                                    transparent: true,
                                    opacity: 0.5,
                                    side: THREE.DoubleSide
                                })
                            } else {
                                // PRODUCTION: Invisible occluder
                                console.log('⚫ Face mesh: Applying PRODUCTION mode (invisible depth-only)')
                                material = new THREE.MeshBasicMaterial({
                                    colorWrite: false,
                                    depthWrite: true
                                })
                            }
                            o.material = material
                            o.material.needsUpdate = true
                            o.visible = true  // Ensure mesh is visible
                        }
                    })
                    console.log(`✅ fix-occluder: Configured ${meshCount} meshes`)
                }

                // Listen for when mesh is added to the entity
                this.el.addEventListener('object3dset', (event: any) => {
                    console.log('📦 object3dset event:', event.detail.type)
                    if (event.detail.type === 'mesh') {
                        console.log('✨ Mesh was set, configuring now!')
                        setTimeout(configureOccluder, 50)  // Small delay to ensure mesh is fully ready
                    }
                })

                // Also try immediate configuration (in case mesh already exists)
                configureOccluder()
            }
        })
        console.log('✅ fix-occluder component registered')
    }
}

// ============================================
// SCENE CREATION
// ============================================

/**
 * Create Face AR scene with all entities
 */
export function createFaceARScene(
    config: FaceARConfig,
    options: FaceARSceneOptions = {}
): {
    scene: HTMLElement
    faceAnchor: HTMLElement
    filterEntity: HTMLElement | null
} {
    const {
        debugMode = false,
        showFaceMesh = false,
        colorManagement = true,
    } = options

    const scale = config.filter_scale || 0.5
    // Non-uniform scale: scale_x/y/z are multipliers on top of base scale (default 1.0 = uniform)
    const scaleMultiplierX = config.scale_x ?? 1.0
    const scaleMultiplierY = config.scale_y ?? 1.0
    const scaleMultiplierZ = config.scale_z ?? 1.0
    const scaleX = scale * scaleMultiplierX
    const scaleY = scale * scaleMultiplierY
    const scaleZ = scale * scaleMultiplierZ
    const anchorIndex = ANCHOR_INDICES[config.anchor_position || 'nose_bridge'] || 168
    const offsetX = config.offset_x || 0
    const offsetY = config.offset_y || 0
    const offsetZ = config.offset_z || 0
    const rotX = config.rotation_x || 0
    const rotY = config.rotation_y || 0
    const rotZ = config.rotation_z || 0
    const blendMode = config.blend_mode || 'normal'

    // Create scene
    const scene = document.createElement('a-scene')
    scene.setAttribute('mindar-face', 'autoStart: true; uiLoading: no; uiError: no; uiScanning: no')
    scene.setAttribute('embedded', '')
    scene.setAttribute('vr-mode-ui', 'enabled: false')
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false')

    if (colorManagement) {
        scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true;')
    }

    // Default styles
    scene.style.position = 'absolute'
    scene.style.top = '0'
    scene.style.left = '0'
    scene.style.width = '100%'
    scene.style.height = '100%'
    scene.style.zIndex = '10'

    // Camera
    const camera = document.createElement('a-camera')
    camera.setAttribute('active', 'false')
    camera.setAttribute('position', '0 0 0')
    camera.setAttribute('look-controls', 'enabled: false')
    scene.appendChild(camera)

    // Lights
    const ambientLight = document.createElement('a-light')
    ambientLight.setAttribute('type', 'ambient')
    ambientLight.setAttribute('intensity', '1.2')
    scene.appendChild(ambientLight)

    const dirLight = document.createElement('a-light')
    dirLight.setAttribute('type', 'directional')
    dirLight.setAttribute('intensity', '1.0')
    dirLight.setAttribute('position', '0.5 1 1')
    scene.appendChild(dirLight)

    const dirLight2 = document.createElement('a-light')
    dirLight2.setAttribute('type', 'directional')
    dirLight2.setAttribute('intensity', '0.8')
    dirLight2.setAttribute('position', '-0.5 1 1')
    scene.appendChild(dirLight2)

    // 1. Standard Face Occluder (Depth mask for face area)
    const occluderAnchor = document.createElement('a-entity')
    occluderAnchor.setAttribute('mindar-face-target', 'anchorIndex: 168')
    const occluderMesh = document.createElement('a-entity')
    occluderMesh.setAttribute('mindar-face-occluder', '')

    // Use fix-occluder component to show in debug mode
    if (debugMode) {
        occluderMesh.setAttribute('fix-occluder', 'debug: true')
    } else {
        occluderMesh.setAttribute('fix-occluder', 'debug: false')
    }

    occluderAnchor.appendChild(occluderMesh)
    scene.appendChild(occluderAnchor)

    // 2. Volumetric Head Occluder (For hats/helmets/ears) - Sphere based
    console.log('🔍 Checking full_head_occlusion:', config.full_head_occlusion, 'debugMode:', debugMode)
    if (config.full_head_occlusion) {
        const headOccluderAnchor = document.createElement('a-entity')
        headOccluderAnchor.setAttribute('mindar-face-target', 'anchorIndex: 168')
        const headSphere = document.createElement('a-sphere')

        // Add data attribute for real-time updates
        headSphere.setAttribute('data-occlusion-sphere', 'true')

        // Use configurable values with defaults
        const radius = config.occlusion_radius ?? 0.15
        const offsetZ = config.occlusion_offset_z ?? -0.08

        headSphere.setAttribute('radius', radius.toString())
        headSphere.setAttribute('position', `0 0.02 ${offsetZ}`)

        // Use custom head-occluder component for proper depth-only rendering
        headSphere.setAttribute('head-occluder', `debug: ${debugMode}`)
        headSphere.setAttribute('material', 'side: double')  // Ensure both sides render

        if (debugMode) {
            console.log(`🔴 Creating DEBUG head sphere (radius: ${radius}, z: ${offsetZ})`)
        } else {
            console.log(`⚫ Creating INVISIBLE head sphere (radius: ${radius}, z: ${offsetZ})`)
        }

        headOccluderAnchor.appendChild(headSphere)
        scene.appendChild(headOccluderAnchor)
        console.log('✅ Volumetric head occluder enabled with custom component')
    } else {
        console.log('❌ Full head occlusion is disabled')
    }

    // Face Debug Visualization (optional) - Simple sphere for reliable rendering
    if (showFaceMesh) {
        console.log('Creating face debug sphere...')
        const debugAnchor = document.createElement('a-entity')
        debugAnchor.setAttribute('mindar-face-target', 'anchorIndex: 168')

        // Simple sphere to indicate face tracking is working
        const debugSphere = document.createElement('a-sphere')
        debugSphere.setAttribute('radius', '0.08')
        debugSphere.setAttribute('color', '#00ffff')
        debugSphere.setAttribute('opacity', '0.6')
        debugSphere.setAttribute('wireframe', 'true')
        debugSphere.setAttribute('position', '0 0 0.05')

        debugAnchor.appendChild(debugSphere)
        scene.appendChild(debugAnchor)
        console.log('Debug sphere added')
    }

    // Face Anchor for Filter
    const faceAnchor = document.createElement('a-entity')
    faceAnchor.setAttribute('mindar-face-target', `anchorIndex: ${anchorIndex}`)

    // Create Filter Entity
    let filterEntity: HTMLElement | null = null
    const is3D = config.filter_type === '3d' && config.filter_3d_url
    const is2D = config.filter_url && (!config.filter_type || config.filter_type === '2d')

    if (is3D) {
        // 3D GLB Model
        const filterModel = document.createElement('a-gltf-model')
        filterModel.setAttribute('src', config.filter_3d_url!)
        filterModel.setAttribute('scale', `${scaleX} ${scaleY} ${scaleZ}`)
        filterModel.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`)
        filterModel.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`)

        filterModel.addEventListener('model-loaded', () => {
            console.log('Filter model loaded!')
            // Do NOT force renderOrder here - it overrides depth buffer masking from occluder
            // const mesh = (filterModel as any).getObject3D('mesh')
            // if (mesh) mesh.renderOrder = 999
        })

        filterModel.addEventListener('model-error', (e) => {
            console.error('Filter model error:', e)
        })

        faceAnchor.appendChild(filterModel)
        filterEntity = filterModel
    } else if (is2D) {
        // 2D PNG Image - Use width/height instead of 3D scale for proper face mapping
        const filterImage = document.createElement('a-image')
        filterImage.setAttribute('src', config.filter_url!)

        // For 2D, scale acts as width/height multiplier (non-uniform support)
        const imageWidth = (config.scale_x ?? scale) * 0.6  // 0.6 approximates face width
        const imageHeight = (config.scale_y ?? scale) * 0.6
        filterImage.setAttribute('width', imageWidth.toString())
        filterImage.setAttribute('height', imageHeight.toString())

        console.log('🖼️ 2D Filter created:', {
            width: imageWidth,
            height: imageHeight,
            scale_x: config.scale_x,
            scale_y: config.scale_y,
            base_scale: scale,
            blend_mode: blendMode
        })

        filterImage.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`)
        filterImage.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`)
        filterImage.setAttribute('opacity', '1')
        filterImage.setAttribute('transparent', 'true')
        filterImage.setAttribute('alpha-test', '0.1')  // Lower threshold for blend modes

        // Apply blend mode after image texture is loaded
        if (blendMode !== 'normal') {
            console.log('🎨 Will apply blend mode:', blendMode)

            // A-Frame uses 'materialtextureloaded' for a-image
            filterImage.addEventListener('materialtextureloaded', () => {
                console.log('📸 Texture loaded, applying blend mode...')
                const mesh = (filterImage as any).getObject3D('mesh')
                if (mesh) {
                    const THREE = (window as any).AFRAME.THREE
                    // Traverse to find all meshes with materials
                    mesh.traverse((child: any) => {
                        if (child.material) {
                            // Keep normal blending but adjust properties for effect
                            child.material.transparent = true

                            switch (blendMode) {
                                case 'multiply':
                                    // Darker blend - reduce opacity and use subtractive look
                                    child.material.blending = THREE.NormalBlending
                                    child.material.opacity = 0.7
                                    child.material.depthWrite = false
                                    // Try to darken by adjusting color
                                    if (child.material.color) {
                                        child.material.color.multiplyScalar(0.8)
                                    }
                                    break
                                case 'add':
                                    // Additive/glow effect
                                    child.material.blending = THREE.AdditiveBlending
                                    child.material.opacity = 1.0
                                    child.material.depthWrite = false
                                    break
                                case 'screen':
                                    // Lighter blend with transparency
                                    child.material.blending = THREE.NormalBlending
                                    child.material.opacity = 0.85
                                    child.material.depthWrite = false
                                    break
                            }
                            child.material.needsUpdate = true
                            console.log(`✅ Blend mode applied: ${blendMode}`, {
                                blending: child.material.blending,
                                opacity: child.material.opacity
                            })
                        }
                    })
                } else {
                    console.warn('⚠️ No mesh found for blend mode')
                }
            })

            // Also try 'loaded' as fallback
            filterImage.addEventListener('loaded', () => {
                console.log('📸 (fallback) loaded event fired')
            })
        }

        faceAnchor.appendChild(filterImage)
        filterEntity = filterImage
    } else {
        // Demo fallback (emoji)
        const demoText = document.createElement('a-text')
        demoText.setAttribute('value', '😎')
        demoText.setAttribute('scale', `${scale} ${scale} ${scale}`)
        demoText.setAttribute('position', `${offsetX} ${offsetY + 0.05} ${offsetZ}`)
        demoText.setAttribute('align', 'center')

        faceAnchor.appendChild(demoText)
        filterEntity = demoText
    }

    scene.appendChild(faceAnchor)

    return { scene, faceAnchor, filterEntity }
}

// ============================================
// REAL-TIME UPDATE HELPERS
// ============================================

/**
 * Update filter entity transform (position, rotation, scale) without re-creating scene
 */
export function updateFilterTransform(
    filterEntity: HTMLElement | null,
    config: FaceARConfig
): void {
    if (!filterEntity) {
        console.log('⏭️ updateFilterTransform: No filterEntity')
        return
    }

    const scale = config.filter_scale || 0.5
    // Non-uniform scale: scale_x/y/z are multipliers on top of base scale
    // If scale_x is 1.0, final = scale * 1.0 = scale (uniform)
    // If scale_x is 1.5, final = scale * 1.5 (wider)
    const scaleMultiplierX = config.scale_x ?? 1.0
    const scaleMultiplierY = config.scale_y ?? 1.0
    const scaleMultiplierZ = config.scale_z ?? 1.0
    const scaleX = scale * scaleMultiplierX
    const scaleY = scale * scaleMultiplierY
    const scaleZ = scale * scaleMultiplierZ

    const offsetX = config.offset_x || 0
    const offsetY = config.offset_y || 0
    const offsetZ = config.offset_z || 0
    const rotX = config.rotation_x || 0
    const rotY = config.rotation_y || 0
    const rotZ = config.rotation_z || 0

    // Check if it's an a-image (2D) - use width/height instead of scale
    const tagName = filterEntity.tagName?.toLowerCase()
    console.log('🔄 updateFilterTransform:', { tagName, scale, scaleX, scaleY, scaleZ })

    if (tagName === 'a-image') {
        // For 2D, scale affects width/height
        const imageWidth = scaleX * 0.6
        const imageHeight = scaleY * 0.6
        filterEntity.setAttribute('width', imageWidth.toString())
        filterEntity.setAttribute('height', imageHeight.toString())
        console.log('📐 2D updated:', { width: imageWidth, height: imageHeight })
    } else {
        // For 3D models, use scale attribute
        filterEntity.setAttribute('scale', `${scaleX} ${scaleY} ${scaleZ}`)
    }

    filterEntity.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`)
    filterEntity.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`)
}

/**
 * Setup video element styling after AR ready
 * Includes iOS Safari-specific fixes for camera access
 */
export function setupVideoStyles(container: HTMLElement): void {
    const video = document.querySelector('video')
    if (video && container) {
        // iOS Safari requires these attributes for inline camera playback
        video.setAttribute('playsinline', '')
        video.setAttribute('webkit-playsinline', '')
        video.setAttribute('autoplay', '')
        video.setAttribute('muted', '')

        container.appendChild(video)
        video.style.position = 'absolute'
        video.style.top = '0'
        video.style.left = '0'
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'cover'
        video.style.zIndex = '0'
    }
}
