import { VideoKeyframe } from '@/components/admin/template-builder/types'

export interface InterpolatedValues {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    opacity: number
}

/**
 * Parse a keyframe value string like "1 2 3" into [1, 2, 3]
 */
function parseVector(value: string, defaultVal: [number, number, number]): [number, number, number] {
    if (!value) return defaultVal
    const parts = value.split(' ').map(Number)
    if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
        return [parts[0], parts[1], parts[2]]
    }
    return defaultVal
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function lerpVector(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/**
 * Get interpolated vector value at time t from keyframes
 */
function interpolateVectorProp(
    keyframes: VideoKeyframe[],
    t: number,
    defaultVal: [number, number, number]
): [number, number, number] {
    if (!keyframes.length) return defaultVal

    const sorted = [...keyframes].sort((a, b) => a.time - b.time)

    // Before first keyframe
    if (t <= sorted[0].time) {
        return parseVector(sorted[0].value, defaultVal)
    }

    // After last keyframe
    if (t >= sorted[sorted.length - 1].time) {
        return parseVector(sorted[sorted.length - 1].value, defaultVal)
    }

    // Find surrounding keyframes
    for (let i = 0; i < sorted.length - 1; i++) {
        const kf1 = sorted[i]
        const kf2 = sorted[i + 1]

        if (t >= kf1.time && t <= kf2.time) {
            const duration = kf2.time - kf1.time
            const progress = duration > 0 ? (t - kf1.time) / duration : 0

            const v1 = parseVector(kf1.value, defaultVal)
            const v2 = parseVector(kf2.value, defaultVal)

            return lerpVector(v1, v2, progress)
        }
    }

    return defaultVal
}

/**
 * Get interpolated scalar value at time t from keyframes
 */
function interpolateScalarProp(
    keyframes: VideoKeyframe[],
    t: number,
    defaultVal: number
): number {
    if (!keyframes.length) return defaultVal

    const sorted = [...keyframes].sort((a, b) => a.time - b.time)

    // Before first keyframe
    if (t <= sorted[0].time) {
        const val = parseFloat(sorted[0].value)
        return isNaN(val) ? defaultVal : val
    }

    // After last keyframe
    if (t >= sorted[sorted.length - 1].time) {
        const val = parseFloat(sorted[sorted.length - 1].value)
        return isNaN(val) ? defaultVal : val
    }

    // Find surrounding keyframes
    for (let i = 0; i < sorted.length - 1; i++) {
        const kf1 = sorted[i]
        const kf2 = sorted[i + 1]

        if (t >= kf1.time && t <= kf2.time) {
            const duration = kf2.time - kf1.time
            const progress = duration > 0 ? (t - kf1.time) / duration : 0

            const v1Raw = parseFloat(kf1.value)
            const v2Raw = parseFloat(kf2.value)

            const v1 = isNaN(v1Raw) ? defaultVal : v1Raw
            const v2 = isNaN(v2Raw) ? defaultVal : v2Raw

            return lerp(v1, v2, progress)
        }
    }

    return defaultVal
}

/**
 * Interpolate all keyframe values at a given time
 * Used by BOTH R3F (Studio) and A-Frame (AR) for consistent animations
 */
export function interpolateKeyframes(
    keyframes: VideoKeyframe[],
    currentTime: number,
    duration: number,
    loop: boolean,
    defaults?: {
        position?: [number, number, number],
        rotation?: [number, number, number],
        scale?: [number, number, number],
        opacity?: number
    }
): InterpolatedValues {
    const t = loop && duration > 0 ? currentTime % duration : Math.min(currentTime, duration)

    // Group by property
    const byProp = {
        position: keyframes.filter(k => k.property === 'position'),
        rotation: keyframes.filter(k => k.property === 'rotation'),
        scale: keyframes.filter(k => k.property === 'scale'),
        opacity: keyframes.filter(k => k.property === 'opacity'),
    }

    return {
        position: interpolateVectorProp(byProp.position, t, defaults?.position || [0, 0, 0]),
        rotation: interpolateVectorProp(byProp.rotation, t, defaults?.rotation || [0, 0, 0]),
        scale: interpolateVectorProp(byProp.scale, t, defaults?.scale || [1, 1, 1]),
        opacity: interpolateScalarProp(byProp.opacity, t, defaults?.opacity ?? 1),
    }
}

/**
 * Get animation duration from keyframes
 */
export function getKeyframeDuration(keyframes: VideoKeyframe[]): number {
    if (!keyframes.length) return 0
    return Math.max(...keyframes.map(k => k.time))
}
