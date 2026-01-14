'use client'

import { useState } from 'react'
import { Plus, Trash2, Box, Info, MapPin, MousePointer2, Check, ArrowRight } from 'lucide-react'
import { ProductConfiguratorConfig, ConfigurablePart, Hotspot } from '../types'
import ConfiguratorPreview from './ConfiguratorPreview'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import { v4 as uuidv4 } from 'uuid'

interface Props {
    config: ProductConfiguratorConfig
    onChange: (config: ProductConfiguratorConfig) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function ProductConfiguratorBuilder({ config, onChange, onUpload }: Props) {
    const [activeTab, setActiveTab] = useState<'general' | 'parts' | 'hotspots'>('general')
    const [interactionMode, setInteractionMode] = useState<'view' | 'inspect' | 'hotspot'>('view')
    const [inspectingPartId, setInspectingPartId] = useState<string | null>(null)
    const [highlightMesh, setHighlightMesh] = useState<string | null>(null)

    // --- Actions ---
    const updateConfig = (key: keyof ProductConfiguratorConfig, value: any) => {
        onChange({ ...config, [key]: value })
    }

    const addPart = () => {
        const newPart: ConfigurablePart = {
            id: uuidv4(),
            name: 'New Part',
            mesh_name: '',
            variants: [{ id: uuidv4(), name: 'Default', color: '#ffffff' }]
        }
        const parts = [...(config.parts || []), newPart]
        updateConfig('parts', parts)
        setInspectingPartId(newPart.id)
        setInteractionMode('inspect') // Auto-switch to pick mode
    }

    const updatePart = (index: number, changes: Partial<ConfigurablePart>) => {
        const parts = [...(config.parts || [])]
        parts[index] = { ...parts[index], ...changes }
        updateConfig('parts', parts)
    }

    const removePart = (index: number) => {
        const parts = [...(config.parts || [])]
        parts.splice(index, 1)
        updateConfig('parts', parts)
        if (inspectingPartId && !parts.find(p => p.id === inspectingPartId)) {
            setInspectingPartId(null)
            setInteractionMode('view')
        }
    }

    const addHotspot = (point: [number, number, number], normal: [number, number, number]) => {
        const newHotspot: Hotspot = {
            id: uuidv4(),
            position: point,
            normal: normal,
            label: 'Info Point',
            content: 'Description here...'
        }
        const hotspots = [...(config.hotspots || []), newHotspot]
        updateConfig('hotspots', hotspots)
        setInteractionMode('view') // Reset to view after adding
    }

    const removeHotspot = (index: number) => {
        const hotspots = [...(config.hotspots || [])]
        hotspots.splice(index, 1)
        updateConfig('hotspots', hotspots)
    }

    // --- Event Handlers from Preview ---
    const handleMeshClick = (meshName: string) => {
        if (interactionMode === 'inspect' && inspectingPartId) {
            // Find the part we are editing
            const parts = [...(config.parts || [])]
            const index = parts.findIndex(p => p.id === inspectingPartId)
            if (index !== -1) {
                updatePart(index, { mesh_name: meshName })
                // Optional: Flash success or something
                setHighlightMesh(meshName)
                setTimeout(() => setHighlightMesh(null), 500)
            }
        }
    }

    const handlePointClick = (point: [number, number, number], normal: [number, number, number]) => {
        if (interactionMode === 'hotspot') {
            addHotspot(point, normal)
        }
    }

    return (
        <div className="grid grid-cols-4 gap-8 h-[calc(100vh-140px)]">
            {/* LEFT PANEL: Navigation */}
            <div className="col-span-1 flex flex-col gap-6">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-2 h-full">
                    {/* Tabs */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { setActiveTab('general'); setInteractionMode('view'); }}
                            className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all ${activeTab === 'general' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            <Box size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">General</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('parts'); setInteractionMode('view'); }}
                            className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all ${activeTab === 'parts' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            <MousePointer2 size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Configurable Parts</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('hotspots'); setInteractionMode('hotspot'); }}
                            className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all ${activeTab === 'hotspots' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/50'}`}
                        >
                            <MapPin size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Hotspots</span>
                        </button>
                    </div>

                    <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-start gap-3">
                            <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
                            <p className="text-[11px] text-white/60 leading-relaxed">
                                {activeTab === 'general' && "Upload your GLB functionality files here."}
                                {activeTab === 'parts' && "Click 'Inspect' to select meshes directly from the 3D model."}
                                {activeTab === 'hotspots' && "Click anywhere on the model to place an information hotspot."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE PANEL: Editors */}
            <div className="col-span-2 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 space-y-8 min-h-full">

                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Assets</span>
                            </div>

                            <FileUploader
                                label="3D Model (.glb)"
                                accept=".glb,.gltf"
                                currentUrl={config.model_url}
                                onUpload={async (file) => {
                                    const url = await onUpload(file, `models/${uuidv4()}_${file.name}`)
                                    updateConfig('model_url', url)
                                    return url
                                }}
                            />

                            <FileUploader
                                label="Instructions Logo"
                                accept="image/*"
                                currentUrl={config.logo_url}
                                onUpload={async (file) => {
                                    const url = await onUpload(file, `logos/${uuidv4()}_${file.name}`)
                                    updateConfig('logo_url', url)
                                    return url
                                }}
                            />

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                    Instructions Text
                                </label>
                                <textarea
                                    value={config.instructions || ''}
                                    onChange={(e) => updateConfig('instructions', e.target.value)}
                                    placeholder="e.g. Swipe to rotate, tap to change colors..."
                                    className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all h-24 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                    Environment Map (HDR)
                                </label>
                                <input
                                    type="text"
                                    value={config.environment_url || ''}
                                    onChange={(e) => updateConfig('environment_url', e.target.value)}
                                    placeholder="https://.../studio.hdr"
                                    className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                />
                                <p className="text-[10px] text-white/30 mt-2">Leave empty for default studio lighting.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'parts' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Parts Configuration</span>
                                <button
                                    onClick={addPart}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                                >
                                    <Plus size={14} /> Add Part
                                </button>
                            </div>

                            <div className="space-y-4">
                                {config.parts?.map((part, pIndex) => (
                                    <div key={part.id} className={`p-6 bg-white/[0.02] border ${inspectingPartId === part.id ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5'} rounded-[2rem] transition-all`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={part.name}
                                                        onChange={(e) => updatePart(pIndex, { name: e.target.value })}
                                                        placeholder="Part Name"
                                                        className="bg-transparent border-b border-white/10 focus:border-orange-500 px-0 py-1 text-sm font-bold text-white outline-none w-40"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-white/40 uppercase">Mesh:</span>
                                                        <code className="text-xs bg-black/40 px-2 py-1 rounded text-orange-400 font-mono">
                                                            {part.mesh_name || 'None'}
                                                        </code>
                                                        <button
                                                            onClick={() => {
                                                                if (inspectingPartId === part.id) {
                                                                    setInspectingPartId(null)
                                                                    setInteractionMode('view')
                                                                } else {
                                                                    setInspectingPartId(part.id)
                                                                    setInteractionMode('inspect')
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-colors ${inspectingPartId === part.id ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                            title="Click to pick from model"
                                                        >
                                                            <MousePointer2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removePart(pIndex)}
                                                className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Variants */}
                                        <div className="space-y-3 pl-4 border-l border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-white/40 uppercase">Variants</span>
                                                <button
                                                    onClick={() => {
                                                        const newVar = { id: uuidv4(), name: 'New Color', color: '#ffffff' }
                                                        updatePart(pIndex, { variants: [...part.variants, newVar] })
                                                    }}
                                                    className="text-[10px] bg-white/5 px-2 py-1 rounded hover:bg-white/10 text-white/60"
                                                >
                                                    + Add Color
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {part.variants.map((variant, vIndex) => (
                                                    <div key={variant.id} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
                                                        <ColorPicker
                                                            value={variant.color}
                                                            onChange={(c) => {
                                                                const vars = [...part.variants]
                                                                vars[vIndex].color = c
                                                                updatePart(pIndex, { variants: vars })
                                                            }}
                                                        />
                                                        <input
                                                            value={variant.name}
                                                            onChange={(e) => {
                                                                const vars = [...part.variants]
                                                                vars[vIndex].name = e.target.value
                                                                updatePart(pIndex, { variants: vars })
                                                            }}
                                                            className="bg-transparent text-xs text-white outline-none w-20"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const vars = [...part.variants]
                                                                vars.splice(vIndex, 1)
                                                                updatePart(pIndex, { variants: vars })
                                                            }}
                                                            className="ml-auto text-white/20 hover:text-red-500"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(!config.parts || config.parts.length === 0) && (
                                    <div className="text-center py-10 border border-dashed border-white/10 rounded-3xl">
                                        <p className="text-xs text-white/30">No config parts yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'hotspots' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Interactive Hotspots</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${interactionMode === 'hotspot' ? 'bg-green-500/20 text-green-400' : 'text-white/30'}`}>
                                        {interactionMode === 'hotspot' ? 'Click on model to add' : 'Select tab to add'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(config.hotspots || []).map((hs, i) => (
                                    <div key={hs.id} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:border-white/10 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                value={hs.label}
                                                onChange={(e) => {
                                                    const list = [...(config.hotspots || [])]
                                                    list[i].label = e.target.value
                                                    updateConfig('hotspots', list)
                                                }}
                                                placeholder="Label"
                                                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/20"
                                            />
                                            <input
                                                value={hs.content}
                                                onChange={(e) => {
                                                    const list = [...(config.hotspots || [])]
                                                    list[i].content = e.target.value
                                                    updateConfig('hotspots', list)
                                                }}
                                                placeholder="Description content..."
                                                className="w-full bg-transparent text-xs text-white/60 outline-none placeholder:text-white/20"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeHotspot(i)}
                                            className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                {(!config.hotspots || config.hotspots.length === 0) && (
                                    <div className="text-center py-10 border border-dashed border-white/10 rounded-3xl">
                                        <p className="text-xs text-white/30">Click "Hotspots" tab, then click on the model to place.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: Preview */}
            <div className="col-span-1">
                <div className="sticky top-6 h-[calc(100vh-140px)] bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
                    <div className="flex-1 relative">
                        {/* We use exact same preview here but pass callbacks */}
                        <ConfiguratorPreview
                            config={config}
                            mode={interactionMode}
                            highlightMeshName={highlightMesh}
                            onMeshClick={handleMeshClick}
                            onPointClick={handlePointClick}
                            // To preview variants, we could add a state in Builder to select them
                            // For now, let's select the first variant of each part by default in preview
                            selectedConfigStates={
                                (config.parts || []).reduce((acc, part) => ({
                                    ...acc,
                                    [part.id]: part.variants[0]?.id
                                }), {})
                            }
                        />
                    </div>
                    <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur">
                        <p className="text-[10px] text-center text-white/40 uppercase tracking-widest">
                            Interactive Preview
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
