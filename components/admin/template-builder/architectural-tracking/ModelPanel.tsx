'use client'

import { Trash2 } from 'lucide-react'
import { OverlayModel } from '../types'
import FileUploader from '../shared/FileUploader'

interface ModelPanelProps {
    models: OverlayModel[]
    selectedIndex: number
    onSelect: (index: number) => void
    onUpdate: (index: number, updates: Partial<OverlayModel>) => void
    onRemove: (index: number) => void
    onUpload: (file: File, path: string) => Promise<string>
}

/**
 * Model Panel Component
 * Displays and edits overlay 3D models for Architectural Tracking
 */
export default function ModelPanel({
    models,
    selectedIndex,
    onSelect,
    onUpdate,
    onRemove,
    onUpload
}: ModelPanelProps) {
    const selectedModel = models[selectedIndex]

    return (
        <div className="space-y-6">
            {/* Model List */}
            <div className="flex gap-2 flex-wrap">
                {models.map((model, index) => (
                    <button
                        key={model.id}
                        onClick={() => onSelect(index)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedIndex === index
                                ? 'bg-orange-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {model.name || `Model ${index + 1}`}
                    </button>
                ))}
            </div>

            {/* Selected Model Editor */}
            {selectedModel && (
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6">
                    {/* Model Name */}
                    <div>
                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                            Model Name
                        </label>
                        <input
                            type="text"
                            value={selectedModel.name}
                            onChange={e => onUpdate(selectedIndex, { name: e.target.value })}
                            className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                            placeholder="e.g., 'Historical Info'"
                        />
                    </div>

                    {/* Model File Upload */}
                    <div>
                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                            3D Model (.glb/.gltf)
                        </label>
                        <FileUploader
                            accept=".glb,.gltf"
                            currentUrl={selectedModel.url}
                            onUpload={async (file) => {
                                const url = await onUpload(file, `architectural-tracking/overlay/${Date.now()}_${file.name}`)
                                onUpdate(selectedIndex, { url })
                                return url
                            }}
                            onClear={() => onUpdate(selectedIndex, { url: '' })}
                            helperText="GLB or GLTF format"
                            className="w-full h-24 border border-dashed border-white/10 rounded-xl"
                        />
                    </div>

                    {/* Scale */}
                    <div>
                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                            Scale: {selectedModel.scale}
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={selectedModel.scale}
                            onChange={e => onUpdate(selectedIndex, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-orange-500"
                        />
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                            Position (X, Y, Z)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['x', 'y', 'z'].map((axis, i) => (
                                <input
                                    key={axis}
                                    type="number"
                                    value={selectedModel.position[i]}
                                    onChange={e => {
                                        const newPos = [...selectedModel.position] as [number, number, number]
                                        newPos[i] = parseFloat(e.target.value) || 0
                                        onUpdate(selectedIndex, { position: newPos })
                                    }}
                                    step="0.1"
                                    className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-orange-500/30 transition-all"
                                    placeholder={axis.toUpperCase()}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Rotation */}
                    <div>
                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                            Rotation (X, Y, Z) degrees
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['x', 'y', 'z'].map((axis, i) => (
                                <input
                                    key={axis}
                                    type="number"
                                    value={selectedModel.rotation[i]}
                                    onChange={e => {
                                        const newRot = [...selectedModel.rotation] as [number, number, number]
                                        newRot[i] = parseFloat(e.target.value) || 0
                                        onUpdate(selectedIndex, { rotation: newRot })
                                    }}
                                    step="15"
                                    className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-orange-500/30 transition-all"
                                    placeholder={axis.toUpperCase()}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Remove Button */}
                    <button
                        onClick={() => {
                            if (confirm(`Remove "${selectedModel.name}"?`)) {
                                onRemove(selectedIndex)
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                        <Trash2 size={14} />
                        Remove Model
                    </button>
                </div>
            )}
        </div>
    )
}
