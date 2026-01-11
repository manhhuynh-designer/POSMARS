'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Grid, useVideoTexture, useTexture, Html, Environment } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Box, Loader2, Move, RotateCcw, Play, Pause } from 'lucide-react'
import { ImageTrackingConfig, ARAsset, VideoKeyframe } from './template-builder/types'
import { interpolateKeyframes, getKeyframeDuration } from '@/lib/animation-utils'

// Shared animation state for playback control
interface AnimationState {
    isPlaying: boolean
    currentTime: number
    startTimestamp: number
}

interface StudioPreviewProps {
    config: ImageTrackingConfig
    debugMode?: boolean
    onClose: () => void
    selectedTargetIndex?: number  // -1 for global defaults, 0+ for specific targets
    playbackState: AnimationState
    onPlaybackChange: (state: AnimationState) => void
}

// Occlusion GLTF Component
function OcclusionGLTF({ asset, debugMode }: { asset: ARAsset; debugMode: boolean }) {
    // Only load if url exists (handled by parent logic)
    const { scene } = useGLTF(asset.url!)
    const clonedScene = useState(() => scene.clone())[0]

    useEffect(() => {
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                if (debugMode) {
                    mesh.material = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        opacity: 0.3,
                        transparent: true,
                        side: THREE.DoubleSide,
                        depthWrite: true // Keep depth write for correct sorting
                    })
                } else {
                    mesh.material = new THREE.MeshBasicMaterial({
                        colorWrite: false,
                        depthWrite: true,
                        side: THREE.DoubleSide
                    })
                }
            }
        })
    }, [debugMode, clonedScene])

    return <primitive object={clonedScene} />
}

// Occlusion Primitive Component
function OcclusionPrimitive({ asset, debugMode }: { asset: ARAsset; debugMode: boolean }) {
    const shape = asset.occlusion_shape || 'cube'

    // Memoize material to avoid recreation on every render
    const material = useMemo(() => {
        console.log('🔴 OcclusionPrimitive: Creating material, debugMode:', debugMode, 'shape:', shape)
        if (debugMode) {
            return new THREE.MeshBasicMaterial({
                color: 0xff0000,
                opacity: 0.3,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: true
            })
        } else {
            return new THREE.MeshBasicMaterial({
                colorWrite: false,
                depthWrite: true,
                side: THREE.DoubleSide
            })
        }
    }, [debugMode, shape])

    return (
        <mesh material={material} renderOrder={-1}>
            {shape === 'cube' && <boxGeometry args={[1, 1, 1]} />}
            {shape === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
            {shape === 'plane' && <planeGeometry args={[1, 1]} />}
        </mesh>
    )
}

// Wrapper Occlusion Model Component
function OcclusionModel({ asset, animState, debugMode }: { asset: ARAsset; animState: AnimationState; debugMode: boolean }) {
    const ref = useRef<THREE.Group>(null)

    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current) return
        ref.current.rotation.order = 'XZY'

        // Calculate time: when playing, use elapsed; when paused, use currentTime
        const t = animState.isPlaying
            ? (performance.now() - animState.startTimestamp) / 1000 + animState.currentTime
            : animState.currentTime

        // If no keyframes, use initial transform
        if (keyframes.length === 0) {
            ref.current.position.set(...asset.position)
            ref.current.rotation.set(
                asset.rotation[0] * Math.PI / 180,
                asset.rotation[1] * Math.PI / 180,
                asset.rotation[2] * Math.PI / 180
            )
            ref.current.scale.set(asset.scale, asset.scale, asset.scale)
            return
        }

        const values = interpolateKeyframes(keyframes as VideoKeyframe[], t, duration, loop, {
            position: asset.position,
            rotation: asset.rotation,
            scale: [asset.scale, asset.scale, asset.scale],
            opacity: 1
        })

        ref.current.position.set(...values.position)
        ref.current.rotation.set(
            values.rotation[0] * Math.PI / 180,
            values.rotation[1] * Math.PI / 180,
            values.rotation[2] * Math.PI / 180
        )
        ref.current.scale.set(...values.scale)

        // Apply opacity (mainly for debug visualization of fade)
        if (debugMode) {
            ref.current.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh
                    const opacity = values.opacity ?? 1
                    const baseOpacity = 0.3
                    const effectiveOpacity = baseOpacity * opacity

                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => {
                            m.opacity = effectiveOpacity
                        })
                    } else {
                        mesh.material.opacity = effectiveOpacity
                    }
                }
            })
        }
    })

    const isPrimitive = asset.occlusion_shape && asset.occlusion_shape !== 'model'

    return (
        <group ref={ref}>
            {isPrimitive
                ? <OcclusionPrimitive asset={asset} debugMode={debugMode} />
                : (asset.url ? <OcclusionGLTF asset={asset} debugMode={debugMode} /> : null)
            }
        </group>
    )
}

// GLTF Model Component with keyframe animation
function Model({ asset, animState }: { asset: ARAsset; animState: AnimationState }) {
    const { scene } = useGLTF(asset.url)
    const ref = useRef<THREE.Group>(null)

    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current) return
        ref.current.rotation.order = 'XZY'

        // Calculate time: when playing, use elapsed; when paused, use currentTime
        const t = animState.isPlaying
            ? (performance.now() - animState.startTimestamp) / 1000 + animState.currentTime
            : animState.currentTime

        // If no keyframes, use initial transform
        if (keyframes.length === 0) {
            ref.current.position.set(...asset.position)
            ref.current.rotation.set(
                asset.rotation[0] * Math.PI / 180,
                asset.rotation[1] * Math.PI / 180,
                asset.rotation[2] * Math.PI / 180
            )
            ref.current.scale.set(asset.scale, asset.scale, asset.scale)
            return
        }

        const values = interpolateKeyframes(keyframes as VideoKeyframe[], t, duration, loop, {
            position: asset.position,
            rotation: asset.rotation,
            scale: [asset.scale, asset.scale, asset.scale],
            opacity: 1
        })

        ref.current.position.set(...values.position)
        ref.current.rotation.set(
            values.rotation[0] * Math.PI / 180,
            values.rotation[1] * Math.PI / 180,
            values.rotation[2] * Math.PI / 180
        )
        ref.current.scale.set(...values.scale)

        // Apply opacity to all materials in the model
        ref.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                const opacity = values.opacity ?? 1

                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => {
                        m.transparent = true
                        m.opacity = opacity
                    })
                } else {
                    mesh.material.transparent = true
                    mesh.material.opacity = opacity
                }
            }
        })
    })

    // Initial transform (if no animation)
    useEffect(() => {
        if (ref.current && keyframes.length === 0) {
            ref.current.position.set(...asset.position)
            ref.current.rotation.set(
                asset.rotation[0] * Math.PI / 180,
                asset.rotation[1] * Math.PI / 180,
                asset.rotation[2] * Math.PI / 180
            )
            ref.current.scale.set(asset.scale, asset.scale, asset.scale)
        }
    }, [asset.position, asset.rotation, asset.scale, keyframes.length])

    return <primitive object={scene} ref={ref} />
}

// Video Plane Component with keyframe animation
function VideoPlane({ asset, animState }: { asset: ARAsset; animState: AnimationState }) {
    const ref = useRef<THREE.Mesh>(null)
    const texture = useVideoTexture(asset.url, {
        unsuspend: 'canplay',
        muted: asset.video_muted ?? false,
        loop: asset.video_loop ?? true,
        start: true
    })

    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current) return
        ref.current.rotation.order = 'XZY'

        // Calculate time: when playing, use elapsed; when paused, use currentTime
        const t = animState.isPlaying
            ? (performance.now() - animState.startTimestamp) / 1000 + animState.currentTime
            : animState.currentTime

        const ratio = (asset.video_width || 1) / (asset.video_height || 1)

        // If no keyframes, use initial transform
        if (keyframes.length === 0) {
            ref.current.position.set(...asset.position)
            ref.current.rotation.set(
                asset.rotation[0] * Math.PI / 180,
                asset.rotation[1] * Math.PI / 180,
                asset.rotation[2] * Math.PI / 180
            )
            ref.current.scale.set(asset.scale * ratio, asset.scale, asset.scale)
            return
        }

        const values = interpolateKeyframes(keyframes as VideoKeyframe[], t, duration, loop, {
            position: asset.position,
            rotation: asset.rotation,
            scale: [asset.scale, asset.scale, asset.scale],
            opacity: 1
        })

        ref.current.position.set(...values.position)
        ref.current.rotation.set(
            values.rotation[0] * Math.PI / 180,
            values.rotation[1] * Math.PI / 180,
            values.rotation[2] * Math.PI / 180
        )
        ref.current.scale.set(values.scale[0] * ratio, values.scale[1], values.scale[2])

        // Apply opacity
        const opacity = values.opacity ?? 1
        if (Array.isArray(ref.current.material)) {
            ref.current.material.forEach(m => {
                m.transparent = true
                m.opacity = opacity
            })
        } else {
            ref.current.material.transparent = true
            ref.current.material.opacity = opacity
        }
    })

    // Initial transform handled by useFrame now

    return (
        <mesh ref={ref}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={texture} toneMapped={false} transparent side={THREE.DoubleSide} />
        </mesh>
    )
}

// Image Plane Component with keyframe animation and alpha support
function ImagePlane({ asset, animState }: { asset: ARAsset; animState: AnimationState }) {
    const ref = useRef<THREE.Mesh>(null)
    const texture = useTexture(asset.url)

    // Enable alpha transparency for PNG
    useEffect(() => {
        if (texture) {
            texture.colorSpace = THREE.SRGBColorSpace
        }
    }, [texture])

    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current) return
        ref.current.rotation.order = 'XZY'

        // Calculate time: when playing, use elapsed; when paused, use currentTime
        const t = animState.isPlaying
            ? (performance.now() - animState.startTimestamp) / 1000 + animState.currentTime
            : animState.currentTime

        const w = asset.image_width ?? 1
        const h = asset.image_height ?? 1

        // If no keyframes, use initial transform
        if (keyframes.length === 0) {
            ref.current.position.set(...asset.position)
            ref.current.rotation.set(
                asset.rotation[0] * Math.PI / 180,
                asset.rotation[1] * Math.PI / 180,
                asset.rotation[2] * Math.PI / 180
            )
            ref.current.scale.set(asset.scale * w, asset.scale * h, asset.scale)
            return
        }

        const values = interpolateKeyframes(keyframes as VideoKeyframe[], t, duration, loop, {
            position: asset.position,
            rotation: asset.rotation,
            scale: [asset.scale, asset.scale, asset.scale],
            opacity: 1
        })

        ref.current.position.set(...values.position)
        ref.current.rotation.set(
            values.rotation[0] * Math.PI / 180,
            values.rotation[1] * Math.PI / 180,
            values.rotation[2] * Math.PI / 180
        )
        ref.current.scale.set(values.scale[0] * w, values.scale[1] * h, values.scale[2])

        // Apply opacity
        const opacity = values.opacity ?? 1
        if (Array.isArray(ref.current.material)) {
            ref.current.material.forEach(m => {
                m.transparent = true
                m.opacity = opacity
            })
        } else {
            ref.current.material.transparent = true
            ref.current.material.opacity = opacity
        }
    })

    // Initial transform handled by useFrame now

    return (
        <mesh ref={ref}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={texture} toneMapped={false} transparent alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
    )
}

// Target Image Plane representing the marker
function TargetImagePlane({ thumbnail }: { thumbnail?: string }) {
    if (!thumbnail) return null
    // Wrap in Suspense to handle async texture loading
    return (
        <Suspense fallback={null}>
            <TargetImagePlaneMesh url={thumbnail} />
        </Suspense>
    )
}

// Inner component that uses hooks unconditionally
function TargetImagePlaneMesh({ url }: { url: string }) {
    const texture = useTexture(url)
    // Target lies flat on ground (XZ plane) for easier Studio visualization
    // In AR it would be vertical, but we apply conversion in
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial map={texture} transparent opacity={0.3} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
    )
}

// Loading fallback
function Loader() {
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="animate-spin text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Loading Asset...</span>
            </div>
        </Html>
    )
}

// Safe Environment with error handling
function SafeEnvironment({ url, onLoadError }: { url: string; onLoadError?: () => void }) {
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

    useEffect(() => {
        if (!url) {
            setStatus('ok')
            return
        }

        const checkUrl = async () => {
            console.log('🔍 Checking Environment URL:', url)
            try {
                // Try HEAD request first (more efficient) to check status and content type
                const response = await fetch(url, { method: 'HEAD' })

                const contentType = response.headers.get('Content-Type') || ''
                if (response.status === 404 || contentType.includes('text/html') || contentType.includes('application/json')) {
                    console.warn(`HDR Load Fallback: ${url} is invalid (Status: ${response.status}, Type: ${contentType}). Falling back to ambient lighting.`)
                    setStatus('error')
                    onLoadError?.()
                    return
                }

                setStatus('ok')
            } catch (e) {
                // Fallback to GET if HEAD is blocked (some servers block HEAD)
                try {
                    const response = await fetch(url)
                    const contentType = response.headers.get('Content-Type') || ''
                    if (response.status === 404 || contentType.includes('text/html') || contentType.includes('application/json')) {
                        console.warn(`HDR Load Fallback (GET): ${url} is invalid (Status: ${response.status}, Type: ${contentType}). Falling back to ambient lighting.`)
                        setStatus('error')
                        onLoadError?.()
                    } else {
                        setStatus('ok')
                    }
                } catch (e2) {
                    // CORS might prevent reading headers/status
                    // In this case, we have to let Environment try and fail via Suspense/ErrorBoundary
                    console.warn(`HDR CORS/Network warning for ${url}, attempting load anyway.`)
                    setStatus('ok')
                }
            }
        }
        checkUrl()
    }, [url, onLoadError])

    if (status === 'error') return null
    if (status === 'loading') return null

    return (
        <Suspense fallback={null}>
            <Environment files={url} background={false} />
        </Suspense>
    )
}

export default function StudioPreview({
    config,
    debugMode = false,
    onClose,
    selectedTargetIndex = -1,
    playbackState,
    onPlaybackChange
}: StudioPreviewProps) {
    // Local copy for ease of use in R3F, though we prefer the prop
    const animState = playbackState;

    const togglePlayback = () => {
        onPlaybackChange({
            ...playbackState,
            isPlaying: !playbackState.isPlaying,
            currentTime: playbackState.currentTime,
            startTimestamp: performance.now()
        })
    }

    const restartAnimation = () => {
        onPlaybackChange({
            isPlaying: true,
            currentTime: 0,
            startTimestamp: performance.now()
        })
    }

    const currentTarget = selectedTargetIndex >= 0 ? config.targets?.[selectedTargetIndex] : null

    return (
        <div className="w-full h-full relative bg-[#050505] rounded-[2.5rem] overflow-hidden">
            <Canvas
                camera={{ position: [0, 1.6, 3], fov: 50 }}
                gl={{
                    antialias: true,
                    toneMapping: config.tone_mapping === 'linear' ? THREE.LinearToneMapping
                        : config.tone_mapping === 'reinhard' ? THREE.ReinhardToneMapping
                            : config.tone_mapping === 'no' ? THREE.NoToneMapping
                                : THREE.ACESFilmicToneMapping,
                    toneMappingExposure: config.exposure ?? 1
                }}
            >
                <Suspense fallback={<Loader />}>
                    {/* Background */}
                    <color attach="background" args={['#0a0a0b']} />

                    {/* Environment Map (HDR) with Error Handling */}
                    {config.environment_url && (
                        <SafeEnvironment
                            url={config.environment_url}
                            onLoadError={() => console.warn('⚠️ Environment HDR load failed, falling back to default lighting.')}
                        />
                    )}

                    {/* Lighting - uses config values, with fallback if HDR is missing/failed */}
                    <ambientLight intensity={config.ambient_intensity ?? (config.environment_url ? 0.3 : 0.8)} />
                    <directionalLight position={[5, 5, 5]} intensity={config.directional_intensity ?? (config.environment_url ? 0.5 : 1)} castShadow />
                    <directionalLight position={[-5, 3, -5]} intensity={0.4} />

                    {/* Grid Floor */}
                    <Grid
                        args={[20, 20]}
                        cellSize={0.5}
                        cellThickness={0.5}
                        cellColor="#222"
                        sectionSize={2}
                        sectionThickness={1}
                        sectionColor="#333"
                        fadeDistance={15}
                        fadeStrength={1}
                        position={[0, -0.01, 0]}
                    />

                    {/* Target Landmark Plane - Vertical to match AR */}
                    <group>
                        {/* Target Plane stands vertically like in AR */}
                        <Suspense fallback={null}>
                            {currentTarget?.thumbnail && (
                                <TargetImagePlane thumbnail={currentTarget.thumbnail} />
                            )}
                        </Suspense>
                    </group>

                    {/* Assets wrapped in a rotation group to match horizontal target */}
                    {/* In AR: target is vertical (XY), assets relative to it */}
                    {/* In Studio: target is horizontal (XZ), so we rotate assets -90° on X to align */}
                    <group rotation={[-Math.PI / 2, 0, 0]}>
                        {(() => {
                            // Resolve assets based on selected target
                            let currentAssets: ARAsset[] = []
                            const targetIndex = selectedTargetIndex ?? -1

                            if (targetIndex === -1) {
                                // Global defaults selected
                                currentAssets = config.default_assets || config.assets || []
                            } else {
                                // Specific target selected
                                const target = config.targets?.[targetIndex]
                                if (target) {
                                    // Check if inheriting from another target
                                    if (target.extends !== undefined) {
                                        if (target.extends === -1) {
                                            currentAssets = config.default_assets || []
                                        } else {
                                            const parentTarget = config.targets?.find(t => t.targetIndex === target.extends)
                                            currentAssets = parentTarget?.assets || config.default_assets || []
                                        }
                                    } else {
                                        currentAssets = target.assets || []
                                    }
                                }
                            }

                            return currentAssets.map(asset => {
                                const isPrimitiveOcclusion = asset.type === 'occlusion' && asset.occlusion_shape && asset.occlusion_shape !== 'model';
                                if (!asset.url && !isPrimitiveOcclusion) return null

                                if (asset.type === 'occlusion') {
                                    return <OcclusionModel key={asset.id} asset={asset} animState={animState} debugMode={debugMode} />
                                }

                                return asset.type === '3d' ? (
                                    <Model key={asset.id} asset={asset} animState={animState} />
                                ) : asset.type === 'image' ? (
                                    <ImagePlane key={asset.id} asset={asset} animState={animState} />
                                ) : (
                                    <VideoPlane key={asset.id} asset={asset} animState={animState} />
                                )
                            })
                        })()}
                    </group>

                    {/* Orbit Controls */}
                    <OrbitControls
                        target={[0, 0.5, 0]}
                        minDistance={0.5}
                        maxDistance={15}
                        enableDamping
                        dampingFactor={0.05}
                        rotateSpeed={0.5}
                    />
                </Suspense>
            </Canvas>

            {/* Header Controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto">
                    <Box size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Studio Mode</span>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-xl border border-white/10">
                        <button
                            onClick={togglePlayback}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title={animState.isPlaying ? 'Pause' : 'Play'}
                        >
                            {animState.isPlaying ? (
                                <Pause size={14} className="text-orange-400" />
                            ) : (
                                <Play size={14} className="text-green-400" />
                            )}
                        </button>
                        <button
                            onClick={restartAnimation}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Restart"
                        >
                            <RotateCcw size={14} className="text-white/60" />
                        </button>
                    </div>

                    {/* Controls Hint */}
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5 text-[9px] text-white/40 font-bold uppercase tracking-widest">
                        <Move size={12} /> Drag to Orbit
                    </div>
                </div>
            </div>
        </div>
    )
}
