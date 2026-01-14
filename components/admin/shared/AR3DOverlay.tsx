import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Environment } from '@react-three/drei'
import { Suspense, useRef, MutableRefObject } from 'react'
import { ARAsset } from '../template-builder/types'
import { AssetRenderer } from './ARModelRenderer'
import * as THREE from 'three'

interface AR3DOverlayProps {
    assets: ARAsset[]
    lightingConfig?: {
        ambient_intensity?: number
        directional_intensity?: number
        environment_url?: string
        exposure?: number
    }
    trackingRef?: MutableRefObject<{
        position: [number, number, number]
        rotation: [number, number, number]
        scale: [number, number, number]
        visible: boolean
    } | null>
}

function ARTrackingUpdate({ trackingRef }: { trackingRef: MutableRefObject<any> }) {
    const groupRef = useRef<THREE.Group>(null)

    useFrame(() => {
        if (!trackingRef?.current || !groupRef.current) {
            if (groupRef.current) groupRef.current.visible = false
            return
        }

        const { position, rotation, scale, visible } = trackingRef.current

        groupRef.current.visible = visible
        if (visible) {
            groupRef.current.position.set(position[0], position[1], position[2])
            groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2])
            groupRef.current.scale.set(scale[0], scale[1], scale[2])
        }
    })

    return <group ref={groupRef}>{/* This group will move */}</group>
}

// Wrapper to inject the group ref into children or wrap them
// Actually, since we want to move ALL assets together with the hand, 
// we should wrap the AssetRenderers in a group controlled by tracking.

export default function AR3DOverlay({ assets, lightingConfig = {}, trackingRef }: AR3DOverlayProps) {
    // If trackingRef is provided, we use the internal group logic within a wrapper
    // But we need to put the Assets INSIDE that group.

    // Let's create a component that renders the Group and puts children inside.

    return (
        <div className="absolute inset-0 z-20 pointer-events-none bg-transparent">
            <Canvas
                shadows
                gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
                style={{ background: 'transparent' }}
            >
                <PerspectiveCamera makeDefault position={[0, 0, 0]} fov={45} />

                {/* Lighting */}
                <ambientLight intensity={lightingConfig.ambient_intensity ?? 0.8} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={lightingConfig.directional_intensity ?? 0.5}
                    castShadow
                />

                {lightingConfig.environment_url && (
                    <Suspense fallback={null}>
                        <Environment files={lightingConfig.environment_url} />
                    </Suspense>
                )}

                {/* Content */}
                {trackingRef ? (
                    <TrackingGroup trackingRef={trackingRef}>
                        {assets.map((asset) => (
                            <AssetRenderer
                                key={asset.id}
                                asset={asset}
                                isPlaying={true}
                            />
                        ))}
                    </TrackingGroup>
                ) : (
                    // Fallback for no tracking (or different camera setup?)
                    // For now, if no trackingRef, we just place them at world 0,0,0 (studio mode behavior)
                    // But maybe we want a default cam position for studio.
                    // The original code had Camera at [0,0,3].
                    // With tracking, the Camera is usually 0,0,0 and Object moves, or Camera moves and Object is 0,0,0.
                    // Let's assume Camera is 0,0,0 and we move the group relative to it.
                    <group position={[0, 0, -5]}> {/* Default distance if no tracking */}
                        {assets.map((asset) => (
                            <AssetRenderer
                                key={asset.id}
                                asset={asset}
                                isPlaying={true}
                            />
                        ))}
                    </group>
                )}
            </Canvas>
        </div>
    )
}

function TrackingGroup({ trackingRef, children }: { trackingRef: MutableRefObject<any>, children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null)

    useFrame(() => {
        if (!trackingRef.current || !groupRef.current) {
            if (groupRef.current) groupRef.current.visible = false
            return
        }

        const { position, rotation, scale, visible } = trackingRef.current

        groupRef.current.visible = visible
        if (visible) {
            // WebAR.rocks usually gives ModelViewMatrix.
            // If we have decomposed pos/rot/scale:
            groupRef.current.position.set(position[0], position[1], position[2])
            groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2])
            // Scale might need adjustment depending on unit conversion
            groupRef.current.scale.set(scale[0], scale[1], scale[2])
        }
    })

    return <group ref={groupRef}>{children}</group>
}
