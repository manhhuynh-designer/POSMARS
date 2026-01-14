'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations, Grid, useVideoTexture, useTexture, Html, Environment, useProgress } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Box, Loader2, Move, RotateCcw, Play, Pause } from 'lucide-react'
import { ImageTrackingConfig, ARAsset, VideoKeyframe } from './template-builder/types'
import { AssetRenderer } from './shared/ARModelRenderer'
import { interpolateKeyframes, getKeyframeDuration } from '@/lib/animation-utils'

// Shared animation state for playback control
interface AnimationState {
    isPlaying: boolean
    currentTime: number
    startTimestamp: number
}

interface StudioPreviewProps {
    assets: ARAsset[]
    lightingConfig?: {
        ambient_intensity?: number
        directional_intensity?: number
        environment_url?: string
        exposure?: number
        tone_mapping?: 'no' | 'acesfilmic' | 'linear' | 'reinhard'
    }
    thumbnail?: string  // Reference image/marker thumbnail
    debugMode?: boolean
    onClose: () => void
    playbackState: AnimationState
    onPlaybackChange: (state: AnimationState) => void
}

// --- Helper Components ---

function Loader() {
    const { progress } = useProgress()
    return (
        <Html center>
            <div className="flex flex-col items-center gap-3 bg-black/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 min-w-[200px] shadow-2xl">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                    <div
                        className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"
                        style={{ borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-blue-400">
                        {Math.round(progress)}%
                    </div>
                </div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] animate-pulse">Initializing Studio</div>
            </div>
        </Html>
    )
}

function SafeEnvironment({ url, onLoadError }: { url: string, onLoadError: () => void }) {
    try {
        return <Environment files={url} />
    } catch (e) {
        onLoadError()
        return null
    }
}

function TargetImagePlaneMesh({ thumbnail }: { thumbnail: string }) {
    const texture = useTexture(thumbnail)
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={texture} transparent opacity={0.3} />
        </mesh>
    )
}

function TargetImagePlane({ thumbnail }: { thumbnail: string }) {
    return (
        <Suspense fallback={null}>
            <TargetImagePlaneMesh thumbnail={thumbnail} />
        </Suspense>
    )
}

// (Moved components to shared/ARModelRenderer.tsx)

export default function StudioPreview({
    assets = [],
    lightingConfig = {},
    thumbnail,
    debugMode = false,
    onClose,
    playbackState,
    onPlaybackChange
}: StudioPreviewProps) {
    const animState = playbackState;

    const togglePlayback = () => {
        onPlaybackChange({
            ...playbackState,
            isPlaying: !playbackState.isPlaying,
            currentTime: playbackState.currentTime,
            startTimestamp: Date.now()
        })
    }

    const restartAnimation = () => {
        onPlaybackChange({
            isPlaying: true,
            currentTime: 0,
            startTimestamp: Date.now()
        })
    }

    return (
        <div className="w-full h-full relative bg-[#050505] rounded-[2.5rem] overflow-hidden">
            <Canvas
                camera={{ position: [0, 1.6, 3], fov: 50 }}
                gl={{
                    antialias: true,
                    toneMapping: lightingConfig.tone_mapping === 'linear' ? THREE.LinearToneMapping
                        : lightingConfig.tone_mapping === 'reinhard' ? THREE.ReinhardToneMapping
                            : lightingConfig.tone_mapping === 'no' ? THREE.NoToneMapping
                                : THREE.ACESFilmicToneMapping,
                    toneMappingExposure: lightingConfig.exposure ?? 1
                }}
            >
                <Suspense fallback={<Loader />}>
                    {/* Background */}
                    <color attach="background" args={['#0a0a0b']} />

                    {/* Environment Map (HDR) with Error Handling */}
                    {lightingConfig.environment_url && (
                        <SafeEnvironment
                            url={lightingConfig.environment_url}
                            onLoadError={() => console.warn('⚠️ Environment HDR load failed')}
                        />
                    )}

                    {/* Lighting */}
                    <ambientLight intensity={lightingConfig.ambient_intensity ?? (lightingConfig.environment_url ? 0.3 : 0.8)} />
                    <directionalLight position={[5, 5, 5]} intensity={lightingConfig.directional_intensity ?? (lightingConfig.environment_url ? 0.5 : 1)} castShadow />
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

                    {/* Target Landmark Plane */}
                    <group>
                        <Suspense fallback={null}>
                            {thumbnail && (
                                <TargetImagePlane thumbnail={thumbnail} />
                            )}
                        </Suspense>
                    </group>

                    {/* Assets - Alignment: rotate -90° on X to align with horizontal target plane */}
                    <group rotation={[-Math.PI / 2, 0, 0]}>
                        {assets.map((asset) => (
                            <AssetRenderer
                                key={asset.id}
                                asset={asset}
                                isPlaying={animState.isPlaying}
                                debugMode={debugMode}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        target={[0, 0.5, 0]}
                        minDistance={0.5}
                        maxDistance={15}
                        enableDamping
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
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-xl border border-white/10">
                        <button
                            onClick={togglePlayback}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {animState.isPlaying ? <Pause size={14} className="text-orange-400" /> : <Play size={14} className="text-green-400" />}
                        </button>
                        <button
                            onClick={restartAnimation}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <RotateCcw size={14} className="text-white/60" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5 text-[9px] text-white/40 font-bold uppercase tracking-widest">
                        <Move size={12} /> Drag to Orbit
                    </div>
                </div>
            </div>
        </div>
    )
}
