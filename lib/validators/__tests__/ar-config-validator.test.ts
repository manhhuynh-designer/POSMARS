/**
 * Unit tests for AR config validators
 */
import { describe, it, expect } from 'vitest'
import {
    validateWebARRocksObjectConfig,
    validateWebARRocksHandConfig,
    validateMediaPipeHandGestureConfig,
    validateWorldARConfig
} from '../ar-config-validator'

describe('AR Config Validators', () => {
    describe('validateWebARRocksObjectConfig', () => {
        it('should validate valid config', () => {
            const config = {
                object_model_url: 'https://example.com/model.zip',
                overlay_models: [
                    {
                        id: 'overlay-1',
                        url: 'https://example.com/model.glb',
                        scale: 1.0,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0]
                    }
                ]
            }

            const result = validateWebARRocksObjectConfig(config)
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should reject missing object_model_url', () => {
            const config = {}
            const result = validateWebARRocksObjectConfig(config)

            expect(result.valid).toBe(false)
            expect(result.errors).toContain('object_model_url is required')
        })

        it('should reject non-zip object_model_url', () => {
            const config = {
                object_model_url: 'https://example.com/model.glb'
            }
            const result = validateWebARRocksObjectConfig(config)

            expect(result.valid).toBe(false)
            expect(result.errors).toContain('object_model_url must be a .zip file containing the NN model')
        })

        it('should reject invalid overlay model URLs', () => {
            const config = {
                object_model_url: 'https://example.com/model.zip',
                overlay_models: [
                    {
                        id: 'overlay-1',
                        url: 'https://example.com/model.obj',
                        scale: 1.0
                    }
                ]
            }
            const result = validateWebARRocksObjectConfig(config)

            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('must be a .glb or .gltf file'))).toBe(true)
        })
    })

    describe('validateWebARRocksHandConfig', () => {
        it('should validate valid config', () => {
            const config = {
                accessory_models: [
                    {
                        url: 'https://example.com/watch.glb',
                        type: 'watch'
                    }
                ]
            }

            const result = validateWebARRocksHandConfig(config)
            expect(result.valid).toBe(true)
        })

        it('should reject invalid accessory type', () => {
            const config = {
                accessory_models: [
                    {
                        url: 'https://example.com/watch.glb',
                        type: 'invalid'
                    }
                ]
            }

            const result = validateWebARRocksHandConfig(config)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('type must be'))).toBe(true)
        })
    })

    describe('validateWorldARConfig', () => {
        it('should validate valid config', () => {
            const config = {
                placement_models: [
                    {
                        url: 'https://example.com/model.glb',
                        scale: 1.5
                    }
                ]
            }

            const result = validateWorldARConfig(config)
            expect(result.valid).toBe(true)
        })

        it('should reject empty placement_models', () => {
            const config = {
                placement_models: []
            }

            const result = validateWorldARConfig(config)
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('At least one placement_model is required')
        })

        it('should reject invalid scale', () => {
            const config = {
                placement_models: [
                    {
                        url: 'https://example.com/model.glb',
                        scale: -1
                    }
                ]
            }

            const result = validateWorldARConfig(config)
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('scale must be a positive number'))).toBe(true)
        })
    })
})
