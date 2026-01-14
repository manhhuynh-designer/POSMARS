/**
 * AR Config Validators
 * Validation functions for AR template configurations
 */

/**
 * Validate WebAR.rocks Object config
 */
export function validateWebARRocksObjectConfig(config: any): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Check object model URL
    if (!config.object_model_url) {
        errors.push('object_model_url is required')
    } else if (!config.object_model_url.endsWith('.zip')) {
        errors.push('object_model_url must be a .zip file containing the NN model')
    }

    // Check overlay models if present
    if (config.overlay_models && Array.isArray(config.overlay_models)) {
        config.overlay_models.forEach((model: any, index: number) => {
            if (!model.url) {
                errors.push(`overlay_models[${index}]: url is required`)
            } else if (!model.url.endsWith('.glb') && !model.url.endsWith('.gltf')) {
                errors.push(`overlay_models[${index}]: url must be a .glb or .gltf file`)
            }

            if (!model.id) {
                errors.push(`overlay_models[${index}]: id is required`)
            }

            if (typeof model.scale !== 'number') {
                errors.push(`overlay_models[${index}]: scale must be a number`)
            }
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Validate WebAR.rocks Hand config
 */
export function validateWebARRocksHandConfig(config: any): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Check accessory models
    if (config.accessory_models && Array.isArray(config.accessory_models)) {
        config.accessory_models.forEach((model: any, index: number) => {
            if (!model.url) {
                errors.push(`accessory_models[${index}]: url is required`)
            } else if (!model.url.endsWith('.glb') && !model.url.endsWith('.gltf')) {
                errors.push(`accessory_models[${index}]: url must be a .glb or .gltf file`)
            }

            if (!model.type || !['watch', 'ring', 'bracelet'].includes(model.type)) {
                errors.push(`accessory_models[${index}]: type must be 'watch', 'ring', or 'bracelet'`)
            }
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Validate MediaPipe Hand Gesture config
 */
export function validateMediaPipeHandGestureConfig(config: any): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Check gesture models
    if (config.gesture_models && Array.isArray(config.gesture_models)) {
        config.gesture_models.forEach((model: any, index: number) => {
            if (!model.url) {
                errors.push(`gesture_models[${index}]: url is required`)
            } else if (!model.url.endsWith('.glb') && !model.url.endsWith('.gltf')) {
                errors.push(`gesture_models[${index}]: url must be a .glb or .gltf file`)
            }

            if (!model.gesture || !['open', 'closed', 'point', 'peace', 'thumbs_up'].includes(model.gesture)) {
                errors.push(`gesture_models[${index}]: gesture must be one of: open, closed, point, peace, thumbs_up`)
            }
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Validate World AR config
 */
export function validateWorldARConfig(config: any): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // Check placement models
    if (!config.placement_models || !Array.isArray(config.placement_models) || config.placement_models.length === 0) {
        errors.push('At least one placement_model is required')
    } else {
        config.placement_models.forEach((model: any, index: number) => {
            if (!model.url) {
                errors.push(`placement_models[${index}]: url is required`)
            } else if (!model.url.endsWith('.glb') && !model.url.endsWith('.gltf')) {
                errors.push(`placement_models[${index}]: url must be a .glb or .gltf file`)
            }

            if (typeof model.scale !== 'number' || model.scale <= 0) {
                errors.push(`placement_models[${index}]: scale must be a positive number`)
            }
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
