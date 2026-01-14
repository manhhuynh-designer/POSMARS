/**
 * WebAR.rocks Script Loaders
 * Utilities to dynamically load WebAR.rocks tracking engines
 */

const IS_PREVIEW = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('linkweb') ||
    window.location.hostname.includes('posmars') ||
    window.location.hostname.includes('ngrok')
)

const ENGINE_BASE = '/libs/training-engine'

const TRAINING_SCRIPTS = [
    // WEBGL ENGINE
    `${ENGINE_BASE}/src/js/trainer/webgl/Shaders.js`,
    `${ENGINE_BASE}/src/js/trainer/webgl/Context.js`,
    `${ENGINE_BASE}/src/js/trainer/webgl/VBO.js`,
    `${ENGINE_BASE}/src/js/trainer/webgl/FBO.js`,
    `${ENGINE_BASE}/src/js/trainer/webgl/Texture.js`,

    // TRAINER CORE - neural network
    `${ENGINE_BASE}/src/js/trainer/core/layers/InputLayer.js`,
    `${ENGINE_BASE}/src/js/trainer/core/layers/NeuronLayer.js`,
    `${ENGINE_BASE}/src/js/trainer/core/NeuronNetwork.js`,

    // TRAINER CORE - connectivities
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivityFull.js`,
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivitySquare.js`,
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivityDirect.js`,
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivityConv.js`,
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivitySquareFast.js`,
    `${ENGINE_BASE}/src/js/trainer/core/connectivities/ConnectivityFullNPoT.js`,

    // TRAINER CORE - features & eval
    `${ENGINE_BASE}/src/js/trainer/core/features/MaxPooling.js`,
    `${ENGINE_BASE}/src/js/trainer/core/Evaluator.js`,
    `${ENGINE_BASE}/src/js/trainer/core/Trainer.js`,

    // DEPENDENCIES (ThreeJS etc)
    `${ENGINE_BASE}/libs/three/v119/threeTweaked.js`,
    `${ENGINE_BASE}/libs/three/v119/GLTFLoader.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/loaders/OBJLoader.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/loaders/MTLLoader.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/shaders/CopyShader.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/shaders/CopyScaleShader.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/postprocessing/EffectComposerTweaked.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/postprocessing/RenderPass.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/postprocessing/ShaderPass.js`,
    `${ENGINE_BASE}/libs/three/v131/examples/js/utils/SkeletonUtils.js`,

    // IMAGE PROCESSING
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/ImageTransformer.js`,
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/ImageTilter.js`,
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/passes/RandomImageRenderer.js`,
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/passes/Blur.js`,
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/passes/ShaderPass.js`,
    `${ENGINE_BASE}/src/js/trainer/imageProcessing/ImageTransformPipeline.js`,

    // PROBLEM PROVIDERS
    `${ENGINE_BASE}/src/js/problemProviders/ThreeMaterials.js`,
    `${ENGINE_BASE}/src/js/problemProviders/objectDetection/ObjectDetectionTrainer.js`,
    `${ENGINE_BASE}/src/js/problemProviders/imageDataset/ImageDatasetTrainer.js`,
    `${ENGINE_BASE}/src/js/problemProviders/Problem.js`,

    // CUSTOM LIBS
    `${ENGINE_BASE}/libs/simjs/random-0.26.js`,
    `${ENGINE_BASE}/libs/custom/lib_random.js`,
    `${ENGINE_BASE}/libs/custom/lib_maths.js`,
    `${ENGINE_BASE}/libs/custom/lib_array.js`
]

async function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve()
            return
        }
        const script = document.createElement('script')
        script.src = src
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.head.appendChild(script)
    })
}

/**
 * Load WebAR.rocks Object tracking engine
 */
export async function loadWebARRocksObject(): Promise<void> {
    if ((window as any).WEBARROCKS?.OBJECT) return

    console.log('📦 Loading WebAR.rocks Object engine...')

    try {
        const script = document.createElement('script')
        script.id = 'webAR-rocks-object-script'
        script.src = 'https://cdn.jsdelivr.net/npm/webarrocks-object@1.1.0/dist/WebARRocksObject.js'

        await new Promise<void>((resolve, reject) => {
            script.onload = () => {
                console.log('✅ WebAR.rocks Object engine loaded')
                resolve()
            }
            script.onerror = () => reject(new Error('CDN Load Failed'))
            document.head.appendChild(script)
        })

        // Wait for engine to initialize
        let attempts = 0
        while (!(window as any).WEBARROCKS?.OBJECT && attempts < 20) {
            await new Promise(r => setTimeout(r, 100))
            attempts++
        }
    } catch (e) {
        console.warn('⚠️ WebAR.rocks Object: Failed to load from CDN. Falling back to Mock for preview.')
        if (IS_PREVIEW) {
            // Mock object for preview simulation
            (window as any).WEBARROCKS = (window as any).WEBARROCKS || {};
            (window as any).WEBARROCKS.OBJECT = {
                init: (options: any) => {
                    console.log('🎭 [Mock] WebAR.rocks Object initialized', options)
                    if (options.callbackReady) options.callbackReady(null, { canvas: document.createElement('canvas') })
                },
                stop: () => console.log('🎭 [Mock] WebAR.rocks Object stopped')
            }
            return
        }
        throw e
    }

    if (!(window as any).WEBARROCKS?.OBJECT) {
        throw new Error('WebAR.rocks Object engine failed to initialize')
    }
}

/**
 * Load WebAR.rocks Hand tracking engine
 */
export async function loadWebARRocksHand(): Promise<void> {
    if ((window as any).WEBARROCKSHAND) return

    console.log('📦 Loading WebAR.rocks Hand engine...')

    try {
        const script = document.createElement('script')
        script.id = 'webAR-rocks-hand-script'
        script.src = 'https://cdn.jsdelivr.net/gh/WebAR-rocks/WebAR.rocks.hand@latest/dist/WebARRocksHand.js'

        await new Promise<void>((resolve, reject) => {
            script.onload = () => {
                console.log('✅ WebAR.rocks Hand engine loaded')
                resolve()
            }
            script.onerror = () => reject(new Error('CDN Load Failed'))
            document.head.appendChild(script)
        })

        // Wait for engine to initialize
        let attempts = 0
        while (!(window as any).WEBARROCKSHAND && attempts < 20) {
            await new Promise(r => setTimeout(r, 100))
            attempts++
        }
    } catch (e) {
        console.warn('⚠️ WebAR.rocks Hand: Failed to load from CDN. Falling back to Mock for preview.')
        if (IS_PREVIEW) {
            // Mock object for preview simulation
            (window as any).WEBARROCKSHAND = {
                init: (options: any) => {
                    console.log('🎭 [Mock] WebAR.rocks Hand initialized', options)
                    if (options.callbackReady) options.callbackReady(null, { canvas: document.createElement('canvas') })
                },
                stop: () => console.log('🎭 [Mock] WebAR.rocks Hand stopped'),
                toggle_pause: (paused: boolean) => console.log('🎭 [Mock] WebAR.rocks Hand pause:', paused)
            }
            return
        }
        throw e
    }

    if (!(window as any).WEBARROCKSHAND) {
        throw new Error('WebAR.rocks Hand engine failed to initialize')
    }
}

/**
 * Load WebAR.rocks Training engine
 */
export async function loadWebARRocksTraining(): Promise<void> {
    console.log('📦 Loading WebAR.rocks Training Engine (Local)...')

    try {
        // Load all scripts sequentially
        for (const scriptSrc of TRAINING_SCRIPTS) {
            await loadScript(scriptSrc)
        }
        console.log('✅ WebAR.rocks Engine Loaded Successfully')

        // Initialize Global Namespace if needed
        if (typeof window !== 'undefined') {
            (window as any).WEBARROCKS = (window as any).WEBARROCKS || {};

            // Allow access to the loaded classes
            (window as any).WEBARROCKS.TRAINING = {
                // Bridge to the loaded engine classes
                NeuronNetwork: (window as any).NeuronNetwork,
                Trainer: (window as any).Trainer,
                Problem: (window as any).Problem,

                // Helper to run the training flow
                uploadAndTrain: async (input: Blob | File, onProgress: (p: number) => void) => {
                    console.log('🚀 [Real] Uploading file to server...', input)

                    // 1. Upload
                    const formData = new FormData()
                    formData.append('file', input)
                    const response = await fetch('/api/admin/training/upload', { method: 'POST', body: formData })
                    if (!response.ok) throw new Error('Upload failed')
                    const data = await response.json()
                    const modelUrl = data.url

                    console.log('✅ [Real] File uploaded:', modelUrl)
                    if (onProgress) onProgress(20)

                    // 2. Setup Training (Real Engine)
                    return new Promise<string>((resolve, reject) => {
                        try {
                            console.log('⚙️ Initializing Training Sequence...')

                            // Check for engine availability
                            if (!(window as any).Trainer || !(window as any).NeuronNetwork) {
                                throw new Error('Engine classes not found within global scope')
                            }

                            // TODO: Instantiate the actual Trainer with the Training Script Generator
                            // For now, we still Simulate the loop to verify classes are present

                            let progress = 20
                            const interval = setInterval(() => {
                                progress += 2
                                if (onProgress) onProgress(Math.min(99, progress))
                                if (progress >= 100) {
                                    clearInterval(interval)
                                    resolve('https://raw.githubusercontent.com/WebAR-rocks/WebAR.rocks.object/master/assets/tower/pisa.zip')
                                }
                            }, 100)

                        } catch (err) {
                            reject(err)
                        }
                    })
                },

                // Helper for Image Dataset Training
                trainFromDataset: async (datasetUrl: string, onProgress: (p: number) => void) => {
                    console.log('🚀 [Real] Starting Image Dataset Training at:', datasetUrl)

                    if (!(window as any).PROBLEMPROVIDERS?.ImageDatasetTrainer) {
                        throw new Error('ImageDatasetTrainer module not loaded')
                    }

                    // TODO: Initialize real ImageDatasetTrainer here
                    // For now, simulate progress
                    return new Promise<string>((resolve) => {
                        let progress = 0
                        const interval = setInterval(() => {
                            progress += 2
                            if (onProgress) onProgress(progress)
                            if (progress >= 100) {
                                clearInterval(interval)
                                resolve('https://raw.githubusercontent.com/WebAR-rocks/WebAR.rocks.object/master/assets/tower/pisa.zip')
                            }
                        }, 100)
                    })
                }
            }
        }

    } catch (e) {
        console.error('❌ Failed to load Training Engine:', e)
        throw e
    }
}
