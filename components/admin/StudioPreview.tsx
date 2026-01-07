'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Grid, useVideoTexture, Html, Environment } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { Box, Loader2, Move, RotateCcw, Play, Pause } from 'lucide-react'
import { ImageTrackingConfig, ARAsset, VideoKeyframe } from './TemplateConfigBuilder'
import { interpolateKeyframes, getKeyframeDuration } from '@/lib/animation-utils'

interface StudioPreviewProps {
    config: ImageTrackingConfig
    onClose: () => void
}

// Shared animation state for playback control
interface AnimationState {
    isPlaying: boolean
    currentTime: number
    startTimestamp: number
}

// GLTF Model Component with keyframe animation
function Model({ asset, animState }: { asset: ARAsset; animState: AnimationState }) {
    const { scene } = useGLTF(asset.url)
    const ref = useRef<THREE.Group>(null)

    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current || keyframes.length === 0) return
        if (!animState.isPlaying) return

        const elapsed = (performance.now() - animState.startTimestamp) / 1000
        const values = interpolateKeyframes(keyframes as VideoKeyframe[], elapsed, duration, loop, {
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
                } else if (mesh.material) {
                    mesh.material.transparent = true
                    mesh.material.opacity = opacity
                }
            }
        })
    })

    // Initial transform (before animation starts or if no keyframes)
    const initialPos = asset.position
    const initialRot = asset.rotation.map(d => d * Math.PI / 180) as [number, number, number]
    const initialScale = asset.scale

    return (
        <primitive
            ref={ref}
            object={scene.clone()}
            position={initialPos}
            rotation={initialRot}
            scale={[initialScale, initialScale, initialScale]}
        />
    )
}

// Video Plane Component with keyframe animation
function VideoPlane({ asset, animState }: { asset: ARAsset; animState: AnimationState }) {
    const ref = useRef<THREE.Mesh>(null)
    const texture = useVideoTexture(asset.url, {
        loop: asset.video_loop !== false,
        muted: asset.video_muted !== false,
        start: true
    })

    const width = asset.video_width || 1
    const height = asset.video_height || 0.56
    const duration = asset.animation_duration || getKeyframeDuration(asset.keyframes || []) || 5
    const keyframes = asset.keyframes || []
    const loop = asset.loop_animation !== false

    useFrame(() => {
        if (!ref.current || keyframes.length === 0) return
        if (!animState.isPlaying) return

        const elapsed = (performance.now() - animState.startTimestamp) / 1000
        const values = interpolateKeyframes(keyframes as VideoKeyframe[], elapsed, duration, loop, {
            position: asset.position,
            rotation: asset.rotation,
            scale: [asset.scale, asset.scale, asset.scale],
            opacity: 1
        })

        if (ref.current) {
            ref.current.position.set(...values.position)
            ref.current.rotation.set(
                values.rotation[0] * Math.PI / 180,
                values.rotation[1] * Math.PI / 180,
                values.rotation[2] * Math.PI / 180
            )
            const s = values.scale[0]
            ref.current.scale.set(s, s, s)

            // Update opacity
            if (ref.current.material) {
                const mat = ref.current.material as THREE.Material
                mat.opacity = values.opacity ?? 1
                // console.log('VideoPlane opacity:', mat.opacity)
                mat.transparent = true
                mat.needsUpdate = true
            }
        }
    })

    const initialPos = asset.position
    const initialRot = asset.rotation.map(d => d * Math.PI / 180) as [number, number, number]

    return (
        <mesh ref={ref} position={initialPos} rotation={initialRot} scale={asset.scale}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} transparent opacity={1} />
        </mesh>
    )
}

// Loading fallback
function Loader() {
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-orange-500" size={32} />
                <p className="text-white/60 text-xs font-bold">Loading...</p>
            </div>
        </Html>
    )
}

export default function StudioPreview({ config, onClose }: StudioPreviewProps) {
    const [animState, setAnimState] = useState<AnimationState>({
        isPlaying: true,
        currentTime: 0,
        startTimestamp: performance.now()
    })

    const togglePlayback = () => {
        setAnimState(prev => ({
            ...prev,
            isPlaying: !prev.isPlaying,
            startTimestamp: prev.isPlaying ? prev.startTimestamp : performance.now()
        }))
    }

    const restartAnimation = () => {
        setAnimState({
            isPlaying: true,
            currentTime: 0,
            startTimestamp: performance.now()
        })
    }

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

                    {/* Environment Map (HDR) */}
                    {config.environment_url && (
                        <Environment files={config.environment_url} background={false} />
                    )}

                    {/* Lighting - uses config values */}
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
                        position={[0, 0, 0]}
                    />

                    {/* Assets */}
                    {config.assets?.map(asset => {
                        if (!asset.url) return null

                        return asset.type === '3d' ? (
                            <Model key={asset.id} asset={asset} animState={animState} />
                        ) : (
                            <VideoPlane key={asset.id} asset={asset} animState={animState} />
                        )
                    })}

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
