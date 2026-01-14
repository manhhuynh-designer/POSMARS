'use client'

import { useGLTF, useAnimations, useVideoTexture, useTexture } from '@react-three/drei'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { ARAsset } from '../template-builder/types'

// --- Helper Components ---

export function Model({ asset, isPlaying = true }: { asset: ARAsset; isPlaying?: boolean }) {
    const { scene, animations } = useGLTF(asset.url)
    const { actions, names } = useAnimations(animations, scene)

    useEffect(() => {
        if (!names.length) return
        if (isPlaying) {
            names.forEach(name => actions[name]?.play())
        } else {
            names.forEach(name => actions[name]?.stop())
        }
    }, [isPlaying, actions, names])

    return (
        <primitive
            object={scene}
            position={asset.position || [0, 0, 0]}
            rotation={asset.rotation || [0, 0, 0]}
            scale={asset.scale || 1}
        />
    )
}

export function ImagePlane({ asset }: { asset: ARAsset }) {
    const texture = useTexture(asset.url)
    return (
        <mesh
            position={asset.position || [0, 0, 0]}
            rotation={asset.rotation || [0, 0, 0]}
            scale={asset.scale || 1}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
        </mesh>
    )
}

export function VideoPlane({ asset }: { asset: ARAsset }) {
    const texture = useVideoTexture(asset.url)
    return (
        <mesh
            position={asset.position || [0, 0, 0]}
            rotation={asset.rotation || [0, 0, 0]}
            scale={asset.scale || 1}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
        </mesh>
    )
}

export function OcclusionGLTF({ asset, debugMode }: { asset: ARAsset; debugMode: boolean }) {
    const { scene } = useGLTF(asset.url)
    useEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                mesh.material = new THREE.MeshBasicMaterial({
                    colorWrite: debugMode,
                    color: debugMode ? '#ff00ff' : '#000000',
                    transparent: debugMode,
                    opacity: debugMode ? 0.3 : 1
                })
            }
        })
    }, [scene, debugMode])

    return (
        <primitive
            object={scene}
            position={asset.position || [0, 0, 0]}
            rotation={asset.rotation || [0, 0, 0]}
            scale={asset.scale || 1}
        />
    )
}

export function OcclusionPrimitive({ asset, debugMode }: { asset: ARAsset; debugMode: boolean }) {
    return (
        <mesh
            position={asset.position || [0, 0, 0]}
            rotation={asset.rotation || [0, 0, 0]}
            scale={asset.scale || 1}
        >
            {asset.occlusion_shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
            {asset.occlusion_shape === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
            {asset.occlusion_shape === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
            <meshBasicMaterial
                colorWrite={debugMode}
                color={debugMode ? '#ff00ff' : '#000000'}
                transparent={debugMode}
                opacity={debugMode ? 0.3 : 1}
            />
        </mesh>
    )
}

export function OcclusionRenderer({ asset, debugMode }: { asset: ARAsset; debugMode: boolean }) {
    if (asset.occlusion_shape === 'model' && asset.url) {
        return (
            <Suspense fallback={null}>
                <OcclusionGLTF asset={asset} debugMode={debugMode} />
            </Suspense>
        )
    }
    return <OcclusionPrimitive asset={asset} debugMode={debugMode} />
}

export function AssetRenderer({ asset, isPlaying = true, debugMode = false }: { asset: ARAsset; isPlaying?: boolean; debugMode?: boolean }) {
    if (asset.type === 'occlusion') {
        return <OcclusionRenderer asset={asset} debugMode={debugMode} />
    }

    if (asset.type === 'video') {
        return (
            <Suspense fallback={null}>
                <VideoPlane asset={asset} />
            </Suspense>
        )
    }

    if (asset.type === 'image') {
        return (
            <Suspense fallback={null}>
                <ImagePlane asset={asset} />
            </Suspense>
        )
    }

    return (
        <Suspense fallback={null}>
            <Model asset={asset} isPlaying={isPlaying} />
        </Suspense>
    )
}
