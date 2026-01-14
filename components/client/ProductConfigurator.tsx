'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, X, Box, Info, MapPin, MousePointer2, Check, ArrowRight, Share2, Scan } from 'lucide-react'

import DOMPurify from 'isomorphic-dompurify'
import ConfiguratorPreview from '@/components/admin/template-builder/product-configurator/ConfiguratorPreview'
import { ProductConfiguratorConfig, ConfigurablePart, Hotspot } from '@/components/admin/template-builder/types'

interface Props {
    config: ProductConfiguratorConfig
    onCapture?: (data: string) => void
    onComplete?: () => void
}

export default function ProductConfigurator({ config, onCapture, onComplete }: Props) {
    // Initialize state with default variants (first variant of each part)
    const [selectedStates, setSelectedStates] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        config.parts?.forEach(p => {
            if (p.variants?.[0]) {
                initial[p.id] = p.variants[0].id
            }
        })
        return initial
    })

    const [activePartId, setActivePartId] = useState<string | null>(
        config.parts?.[0]?.id || null
    )
    const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null)

    // Find active part object
    const activePart = config.parts?.find(p => p.id === activePartId)

    const handlePartSelect = (meshName: string) => {
        // Reverse lookup: find part by mesh_name
        const part = config.parts?.find(p => p.mesh_name === meshName)
        if (part) {
            setActivePartId(part.id)
        }
    }

    const captureRef = useRef<HTMLDivElement>(null)

    const handleSnapshot = () => {
        // In a real app, we would grab the canvas buffer.
        // For standard R3F, we need `gl.preserveDrawingBuffer: true` which ConfiguratorPreview has.
        const canvas = document.querySelector('canvas')
        if (canvas && onCapture) {
            const data = canvas.toDataURL('image/jpeg', 0.9)
            onCapture(data)
        }
    }

    return (
        <div className="fixed inset-0 bg-[#0F0F0F] text-white overflow-hidden">
            {/* 3D Viewport - occupies full screen */}
            <div className="absolute inset-0 z-0">
                <ConfiguratorPreview
                    config={config}
                    mode="view"
                    selectedConfigStates={selectedStates}
                    onMeshClick={handlePartSelect}
                    onHotspotClick={(id) => {
                        const hs = config.hotspots?.find(h => h.id === id)
                        if (hs) setActiveHotspot(hs)
                    }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                {config.logo_url && (
                    <img src={config.logo_url} className="h-10 object-contain drop-shadow-lg" />
                )}
                <div className="flex gap-2 pointer-events-auto">
                    {/* AR Button */}
                    <button
                        className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white shadow-lg active:scale-95 transition-all"
                        onClick={() => alert('AR Mode: Coming soon!\n(Requires .usdz/.gltf export pipeline)')}
                    >
                        <Scan size={20} />
                    </button>
                    {onComplete && (
                        <button
                            onClick={onComplete}
                            className="bg-orange-500 p-3 rounded-full text-white shadow-lg active:scale-95 transition-all"
                        >
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Config Panel */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 backdrop-blur-xl border-t border-white/10 pb-8 pt-4 rounded-t-3xl transition-transform transform">

                {/* Part Selector (Tabs) */}
                <div className="flex overflow-x-auto gap-4 px-6 pb-4 no-scrollbar">
                    {config.parts?.map(part => (
                        <button
                            key={part.id}
                            onClick={() => setActivePartId(part.id)}
                            className={`flex flex-col items-center gap-1 min-w-[60px] transition-opacity ${activePartId === part.id ? 'opacity-100' : 'opacity-40'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${activePartId === part.id ? 'border-orange-500 bg-white/10' : 'border-white/10 bg-black/20'}`}>
                                {/* Simple icon or first letter */}
                                <span className="text-xs font-bold uppercase">{part.name.substring(0, 2)}</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{part.name}</span>
                        </button>
                    ))}
                </div>

                <div className="h-[1px] bg-white/10 mx-6 mb-4" />

                {/* Variant Selector (Swatches) */}
                <div className="px-6">
                    {activePart ? (
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                            {activePart.variants.map((variant) => {
                                const isSelected = selectedStates[activePart.id] === variant.id
                                return (
                                    <button
                                        key={variant.id}
                                        onClick={() => setSelectedStates(prev => ({ ...prev, [activePart.id]: variant.id }))}
                                        className={`group relative w-12 h-12 rounded-full border-2 transition-all flex-shrink-0 ${isSelected ? 'border-white' : 'border-transparent'}`}
                                    >
                                        <div
                                            className="w-full h-full rounded-full shadow-inner"
                                            style={{ backgroundColor: variant.color }}
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center text-black/50 drop-shadow-md">
                                                <Check size={16} strokeWidth={4} color={variant.color === '#ffffff' ? '#000' : '#fff'} />
                                            </div>
                                        )}
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black px-2 py-1 rounded">
                                            {variant.name}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-white/30 text-xs py-2">Select a part to customize</div>
                    )}
                </div>

                {/* Capture Button (Floating above panel) */}
                {onCapture && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <button
                            onClick={handleSnapshot}
                            className="bg-white text-black p-4 rounded-full shadow-2xl active:scale-95 transition-all border-4 border-black/50"
                        >
                            <Camera size={24} />
                        </button>
                    </div>
                )}
            </div>

            {/* Hotspot Info Modal */}
            {activeHotspot && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                                {activeHotspot.label}
                            </h3>
                            <button
                                onClick={() => setActiveHotspot(null)}
                                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-sm text-white/80 leading-relaxed max-h-[60vh] overflow-y-auto">
                            {/* Securely render HTML content */}
                            {activeHotspot.content && (
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeHotspot.content) }} />
                            )}
                            {!activeHotspot.content && (
                                <p className="italic text-white/30">No description available.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
