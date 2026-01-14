'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows, Html, useCursor } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ProductConfiguratorConfig, ConfigurablePart } from '../types'
import { Loader2, Plus } from 'lucide-react'

// --- Types ---
interface ConfiguratorPreviewProps {
    config: ProductConfiguratorConfig
    mode?: 'view' | 'inspect' | 'hotspot' // Interaction mode
    highlightMeshName?: string | null // For flashing the mesh when hovering in list
    selectedConfigStates?: Record<string, string> // Map partId -> variantId (current selection)
    onMeshClick?: (meshName: string) => void
    onPointClick?: (point: [number, number, number], normal: [number, number, number]) => void
    onHotspotClick?: (hotspotId: string) => void
}

// --- Helper Components ---
function Loader() {
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-orange-500" size={32} />
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Loading 3D</span>
            </div>
        </Html>
    )
}

function ModelRenderer({
    url,
    parts = [],
    selectedConfigStates = {},
    mode,
    highlightMeshName,
    onMeshClick,
    onPointClick
}: {
    url: string
    parts?: ConfigurablePart[]
    selectedConfigStates: Record<string, string>
    mode?: string
    highlightMeshName?: string | null
    onMeshClick?: (name: string) => void
    onPointClick?: (pt: [number, number, number], normal: [number, number, number]) => void
}) {
    const { scene } = useGLTF(url)
    const [hovered, set] = useState<string | null>(null)
    useCursor(!!hovered)

    // Apply configurations
    useEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                const originalMaterial = (mesh.userData.originalMaterial = mesh.userData.originalMaterial || mesh.material)

                // 1. Find if this mesh is controlled by a Part
                const part = parts.find(p => p.mesh_name === mesh.name)

                // 2. Determine Material
                if (part) {
                    const selectedVariantId = selectedConfigStates[part.id]
                    const variant = part.variants.find(v => v.id === selectedVariantId)

                    if (variant) {
                        // Create or reuse variant material
                        // For simplicity, we clone the original and change color
                        // In production, we might want PBR texture swapping
                        const mat = (originalMaterial as THREE.MeshStandardMaterial).clone()
                        mat.color.set(variant.color)
                        if (variant.metalness !== undefined) mat.metalness = variant.metalness
                        if (variant.roughness !== undefined) mat.roughness = variant.roughness
                        mesh.material = mat
                    } else {
                        mesh.material = originalMaterial
                    }
                }

                // 3. Highlight Effect (Inspector)
                if (highlightMeshName === mesh.name) {
                    const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
                    mat.emissive.setHex(0xffaa00)
                    mat.emissiveIntensity = 0.5
                    mesh.material = mat
                }
            }
        })
    }, [scene, parts, selectedConfigStates, highlightMeshName])

    const handleClick = (e: any) => {
        // Stop propagation to prevent hitting background
        e.stopPropagation()

        const meshName = e.object.name
        const point = e.point
        const normal = e.face?.normal?.clone().transformDirection(e.object.matrixWorld) || new THREE.Vector3(0, 1, 0)

        console.log('🔹 Clicked Mesh:', meshName)

        if (mode === 'inspect' && onMeshClick) {
            onMeshClick(meshName)
        }

        if (mode === 'hotspot' && onPointClick) {
            onPointClick([point.x, point.y, point.z], [normal.x, normal.y, normal.z])
        }
    }

    return (
        <primitive
            object={scene}
            scale={1}
            onClick={handleClick}
            onPointerOver={(e: any) => { e.stopPropagation(); set(e.object.name) }}
            onPointerOut={(e: any) => { e.stopPropagation(); set(null) }}
        />
    )
}

function Hotspots({ bookmarks, onClick }: { bookmarks?: any[], onClick?: (id: string) => void }) {
    if (!bookmarks) return null
    return (
        <group>
            {bookmarks.map((hs, i) => (
                <Html key={i} position={hs.position}>
                    <div
                        onClick={(e) => { e.stopPropagation(); onClick?.(hs.id) }}
                        className="w-4 h-4 bg-white/20 border border-white rounded-full backdrop-blur-sm -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                    >
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        {hs.label && (
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {hs.label}
                            </div>
                        )}
                    </div>
                </Html>
            ))}
        </group>
    )
}

export default function ConfiguratorPreview({
    config,
    mode = 'view',
    highlightMeshName,
    selectedConfigStates = {},
    onMeshClick,
    onPointClick,
    onHotspotClick
}: ConfiguratorPreviewProps) {
    if (!config.model_url) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white/40 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Plus size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Upload Model to Start</span>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative bg-[#050505] rounded-[2rem] overflow-hidden">
            <Canvas
                shadows
                camera={{ position: [2, 2, 2], fov: 45 }}
                gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
            >
                <color attach="background" args={['#0a0a0b']} />

                <Suspense fallback={<Loader />}>
                    {/* Environment */}
                    <Environment
                        files={config.environment_url || 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr'}
                        blur={0.8}
                    />

                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

                    {/* Model */}
                    <group position={[0, -0.5, 0]}>
                        <ModelRenderer
                            url={config.model_url}
                            parts={config.parts}
                            selectedConfigStates={selectedConfigStates}
                            mode={mode}
                            highlightMeshName={highlightMeshName}
                            onMeshClick={onMeshClick}
                            onPointClick={onPointClick}
                        />

                        <Hotspots bookmarks={config.hotspots} onClick={onHotspotClick} />

                        <ContactShadows opacity={0.4} scale={10} blur={1.5} far={0.8} />
                    </group>

                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                </Suspense>
            </Canvas>

            {/* Mode Indicator */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
                <div className={`w-2 h-2 rounded-full ${mode === 'view' ? 'bg-blue-500' : mode === 'inspect' ? 'bg-orange-500' : 'bg-green-500'}`} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{mode} Mode</span>
            </div>
        </div>
    )
}
