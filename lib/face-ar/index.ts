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
    anchor_position?: string
    offset_x?: number
    offset_y?: number
    offset_z?: number
    rotation_x?: number
    rotation_y?: number
    rotation_z?: number
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
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

/**
 * Register custom A-Frame components for Face AR
 */
export function registerFaceARComponents(debugMode: boolean = false): void {
    const AFRAME = (window as any).AFRAME
    if (!AFRAME) return

    // Register fix-occluder component
    if (!AFRAME.components['fix-occluder']) {
        AFRAME.registerComponent('fix-occluder', {
            init: function () {
                const configureOccluder = () => {
                    const object3D = this.el.getObject3D('mesh')
                    if (!object3D) return

                    const THREE = AFRAME.THREE
                    object3D.traverse((o: any) => {
                        if (o.isMesh) {
                            let material
                            if (debugMode) {
                                // DEBUG: Visible green wireframe
                                material = new THREE.MeshBasicMaterial({
                                    color: 0x00ff00,
                                    wireframe: true,
                                    transparent: true,
                                    opacity: 0.5
                                })
                            } else {
                                // PRODUCTION: Invisible occluder
                                material = new THREE.MeshBasicMaterial({
                                    colorWrite: false,
                                    depthWrite: true
                                })
                            }
                            o.material = material
                        }
                    })
                    this.el.object3D.renderOrder = 0
                }

                this.el.addEventListener('model-loaded', configureOccluder)
                if (this.el.getObject3D('mesh')) configureOccluder()
            }
        })
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
    const anchorIndex = ANCHOR_INDICES[config.anchor_position || 'nose_bridge'] || 168
    const offsetX = config.offset_x || 0
    const offsetY = config.offset_y || 0
    const offsetZ = config.offset_z || 0
    const rotX = config.rotation_x || 0
    const rotY = config.rotation_y || 0
    const rotZ = config.rotation_z || 0

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

    // Occluder - Use MindAR's official face occluder for proper depth masking
    const occluderAnchor = document.createElement('a-entity')
    occluderAnchor.setAttribute('mindar-face-target', 'anchorIndex: 168')

    // MindAR's official occluder - a head-shaped mesh that masks 3D objects behind the face
    const occluderMesh = document.createElement('a-entity')
    occluderMesh.setAttribute('mindar-face-occluder', '')

    // In debug mode, make the occluder visible
    if (debugMode) {
        occluderMesh.setAttribute('material', 'color: green; wireframe: true; opacity: 0.4; transparent: true')
    }

    occluderAnchor.appendChild(occluderMesh)
    scene.appendChild(occluderAnchor)
    console.log('MindAR occluder added, debugMode:', debugMode)

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
        filterModel.setAttribute('scale', `${scale} ${scale} ${scale}`)
        filterModel.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`)
        filterModel.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`)

        filterModel.addEventListener('model-loaded', () => {
            console.log('Filter model loaded!')
            const mesh = (filterModel as any).getObject3D('mesh')
            if (mesh) mesh.renderOrder = 999
        })

        filterModel.addEventListener('model-error', (e) => {
            console.error('Filter model error:', e)
        })

        faceAnchor.appendChild(filterModel)
        filterEntity = filterModel
    } else if (is2D) {
        // 2D PNG Image
        const filterImage = document.createElement('a-image')
        filterImage.setAttribute('src', config.filter_url!)
        filterImage.setAttribute('scale', `${scale} ${scale} ${scale}`)
        filterImage.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`)
        filterImage.setAttribute('rotation', `${rotX} ${rotY} ${rotZ}`)
        filterImage.setAttribute('opacity', '1')
        filterImage.setAttribute('transparent', 'true')

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
    if (!filterEntity) return

    const scale = config.filter_scale || 0.5
    const offsetX = config.offset_x || 0
    const offsetY = config.offset_y || 0
    const offsetZ = config.offset_z || 0
    const rotX = config.rotation_x || 0
    const rotY = config.rotation_y || 0
    const rotZ = config.rotation_z || 0

    filterEntity.setAttribute('scale', `${scale} ${scale} ${scale}`)
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
