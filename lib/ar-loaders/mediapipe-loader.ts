/**
 * MediaPipe Script Loaders
 * Utilities to dynamically load MediaPipe tracking solutions
 */

/**
 * Load MediaPipe Hands
 * Used for hand gesture recognition and hand tracking
 */
export async function loadMediaPipeHands(): Promise<void> {
    // Check if already loaded
    if ((window as any).Hands) {
        console.log('✅ MediaPipe Hands already loaded')
        return
    }

    console.log('📦 Loading MediaPipe Hands...')

    // Load Camera Utils first
    if (!(window as any).Camera) {
        const cameraScript = document.createElement('script')
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
        await new Promise<void>((resolve, reject) => {
            cameraScript.onload = () => resolve()
            cameraScript.onerror = () => reject(new Error('Failed to load Camera Utils'))
            document.head.appendChild(cameraScript)
        })
    }

    // Load Hands
    const handsScript = document.createElement('script')
    handsScript.id = 'mediapipe-hands-script'
    handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'

    await new Promise<void>((resolve, reject) => {
        handsScript.onload = () => {
            console.log('✅ MediaPipe Hands loaded')
            resolve()
        }
        handsScript.onerror = () => {
            console.error('❌ Failed to load MediaPipe Hands')
            reject(new Error('Failed to load MediaPipe Hands'))
        }
        document.head.appendChild(handsScript)
    })

    // Wait for Hands constructor to be available
    let attempts = 0
    while (!(window as any).Hands && attempts < 50) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
    }

    if (!(window as any).Hands) {
        throw new Error('MediaPipe Hands failed to initialize')
    }
}

/**
 * Load MediaPipe Pose (for World AR / Markerless)
 * Used for body pose estimation and world tracking
 */
export async function loadMediaPipePose(): Promise<void> {
    // Check if already loaded
    if ((window as any).Pose) {
        console.log('✅ MediaPipe Pose already loaded')
        return
    }

    console.log('📦 Loading MediaPipe Pose...')

    // Load Camera Utils first
    if (!(window as any).Camera) {
        const cameraScript = document.createElement('script')
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
        await new Promise<void>((resolve, reject) => {
            cameraScript.onload = () => resolve()
            cameraScript.onerror = () => reject(new Error('Failed to load Camera Utils'))
            document.head.appendChild(cameraScript)
        })
    }

    // Load Pose
    const poseScript = document.createElement('script')
    poseScript.id = 'mediapipe-pose-script'
    poseScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'

    await new Promise<void>((resolve, reject) => {
        poseScript.onload = () => {
            console.log('✅ MediaPipe Pose loaded')
            resolve()
        }
        poseScript.onerror = () => {
            console.error('❌ Failed to load MediaPipe Pose')
            reject(new Error('Failed to load MediaPipe Pose'))
        }
        document.head.appendChild(poseScript)
    })

    // Wait for Pose constructor to be available
    let attempts = 0
    while (!(window as any).Pose && attempts < 50) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
    }

    if (!(window as any).Pose) {
        throw new Error('MediaPipe Pose failed to initialize')
    }
}
