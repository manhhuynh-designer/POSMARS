/**
 * WebAR.rocks Script Loaders
 * Utilities to dynamically load WebAR.rocks tracking engines
 */

const IS_PREVIEW = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('linkweb') ||
    window.location.hostname.includes('posmars')
)

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
    if ((window as any).WEBARROCKS?.TRAINING) return

    console.log('📦 Loading WebAR.rocks Training engine...')

    try {
        // Placeholder for actual training lib URL
        const script = document.createElement('script')
        script.id = 'webAR-rocks-training-script'
        script.src = 'https://cdn.jsdelivr.net/npm/webarrocks-training@latest/dist/WebARRocksTraining.js' // Hypothetical URL

        await new Promise<void>((resolve, reject) => {
            script.onload = () => {
                console.log('✅ WebAR.rocks Training engine loaded')
                resolve()
            }
            script.onerror = () => reject(new Error('CDN Load Failed'))
            document.head.appendChild(script)
        })
    } catch (e) {
        console.warn('⚠️ WebAR.rocks Training: Failed to load from CDN. Falling back to Mock for preview.');

        if (typeof window !== 'undefined') {
            // Mock object for training simulation
            (window as any).WEBARROCKS = (window as any).WEBARROCKS || {};
            (window as any).WEBARROCKS.TRAINING = {
                init: (options: any) => {
                    console.log('🎭 [Mock] WebAR.rocks Training initialized', options)
                },
                startRecording: () => {
                    console.log('🎭 [Mock] Training recording started')
                },
                stopRecording: () => {
                    console.log('🎭 [Mock] Training recording stopped')
                    return Promise.resolve(new Blob(['mock-video-data'], { type: 'video/webm' }))
                },
                uploadAndTrain: (videoBlob: Blob, onProgress: (p: number) => void) => {
                    console.log('🎭 [Mock] Uploading and training...')
                    return new Promise<string>((resolve) => {
                        let progress = 0
                        const interval = setInterval(() => {
                            progress += 10
                            if (onProgress) onProgress(progress)
                            if (progress >= 100) {
                                clearInterval(interval)
                                // Return a mock model URL
                                resolve('https://raw.githubusercontent.com/WebAR-rocks/WebAR.rocks.object/master/assets/tower/pisa.zip')
                            }
                        }, 500)
                    })
                }
            }
        }
        return
    }

    if (!(window as any).WEBARROCKS?.TRAINING) {
        throw new Error('WebAR.rocks Training engine failed to initialize')
    }
}
