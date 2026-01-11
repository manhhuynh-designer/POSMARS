import { Plus, Sparkles, MoreVertical, Copy, Link, Trash2, CheckCircle2, AlertCircle, Upload, Eye, EyeOff, Box, Image as ImageIcon, Video, Layers, ChevronDown, ChevronRight, Focus } from 'lucide-react'
import { TargetConfig, ImageTrackingConfig, ARAsset } from '../types'

interface TargetListProps {
    config: ImageTrackingConfig
    selectedTargetIndex: number
    onSelectTarget: (index: number) => void
    onRemoveTarget: (index: number) => void
    onSmartCompile: (e: React.ChangeEvent<HTMLInputElement>) => void
    onClone: (index: number) => void
    onInherit: (index: number) => void
    menuOpenIndex: number | null
    setMenuOpenIndex: (index: number | null) => void
    smartCompileInputRef: React.RefObject<HTMLInputElement>
    addMoreInputRef: React.RefObject<HTMLInputElement>
    onMarkerUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void

    // New Props for Layer Explorer
    selectedAssetId?: string | null
    onSelectAsset?: (id: string | null) => void
    onToggleVisibility?: (assetId: string) => void
}

export default function TargetList({
    config,
    selectedTargetIndex,
    onSelectTarget,
    onRemoveTarget,
    onSmartCompile,
    onClone,
    onInherit,
    menuOpenIndex,
    setMenuOpenIndex,
    smartCompileInputRef,
    addMoreInputRef,
    onMarkerUpload,
    selectedAssetId,
    onSelectAsset,
    onToggleVisibility
}: TargetListProps) {
    const targets = config.targets || []

    const renderAssetLayer = (asset: ARAsset, isSelected: boolean) => {
        const Icon = asset.type === '3d' ? Box : (asset.type === 'video' ? Video : ImageIcon)

        return (
            <div
                key={asset.id}
                onClick={(e) => {
                    e.stopPropagation()
                    onSelectAsset?.(asset.id)
                }}
                className={`flex items-center gap-3 pl-8 pr-4 py-2 group/layer cursor-pointer transition-all border-l-2 ${isSelected
                    ? 'bg-orange-500/10 border-orange-500'
                    : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                    }`}
            >
                <Icon size={14} className={isSelected ? 'text-orange-500' : 'text-white/20 group-hover:text-white/40'} />
                <span className={`text-[11px] font-bold flex-1 truncate ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                    {asset.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover/layer:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleVisibility?.(asset.id)
                        }}
                        className="p-1 hover:text-white text-white/20"
                    >
                        <Eye size={12} />
                    </button>
                    <button className="p-1 hover:text-white text-white/20">
                        <Focus size={12} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <section className="flex flex-col h-full bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Layers size={20} className="text-orange-500" />
                        Explorer
                    </h3>
                    <div className="flex gap-2">
                        <label className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white/40 hover:text-white">
                            <Upload size={14} />
                            <input type="file" accept=".mind" className="hidden" onChange={onMarkerUpload} />
                        </label>
                    </div>
                </div>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Layer Hierarchy & Space</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Search / Filter placeholder if needed */}

                <div className="flex flex-col">
                    {/* Global Defaults - Special Layer */}
                    <div className="py-2">
                        <div
                            onClick={() => {
                                onSelectTarget(-1)
                                onSelectAsset?.(null)
                            }}
                            className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-all group ${selectedTargetIndex === -1 ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                                }`}
                        >
                            <Sparkles size={16} className={selectedTargetIndex === -1 ? 'text-orange-500' : 'text-white/20'} />
                            <span className={`text-xs font-black uppercase tracking-widest ${selectedTargetIndex === -1 ? 'text-white' : 'text-white/40'}`}>Global Settings</span>
                        </div>
                        {selectedTargetIndex === -1 && (config.default_assets || []).map(asset =>
                            renderAssetLayer(asset, selectedAssetId === asset.id)
                        )}
                    </div>

                    <div className="h-px bg-white/5 mx-6 my-2" />

                    {/* Targets Table */}
                    {targets.map((target, idx) => (
                        <div key={idx} className="flex flex-col">
                            <div
                                onClick={() => {
                                    onSelectTarget(idx)
                                    onSelectAsset?.(null)
                                }}
                                className={`flex items-center gap-3 px-6 py-4 group cursor-pointer transition-all ${selectedTargetIndex === idx ? 'bg-orange-500/5' : 'hover:bg-white/[0.02]'
                                    }`}
                            >
                                {selectedTargetIndex === idx ? <ChevronDown size={14} className="text-orange-500" /> : <ChevronRight size={14} className="text-white/20" />}

                                <div className="relative w-8 h-8 rounded-lg bg-black border border-white/10 overflow-hidden flex-shrink-0">
                                    {target.thumbnail ? (
                                        <img src={target.thumbnail} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white/20">{idx}</div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h5 className={`text-[12px] font-black uppercase tracking-tight truncate ${selectedTargetIndex === idx ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                                        {target.name}
                                    </h5>
                                    {target.extends !== undefined && (
                                        <p className="text-[8px] font-black uppercase text-purple-400 tracking-widest">Inherited</p>
                                    )}
                                </div>

                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setMenuOpenIndex(menuOpenIndex === idx ? null : idx)}
                                        className={`p-1.5 rounded-lg transition-colors ${menuOpenIndex === idx ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {menuOpenIndex === idx && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                            <button onClick={() => { onClone(idx); setMenuOpenIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5 rounded-xl transition-colors">
                                                <Copy size={12} className="text-cyan-400" /> Duplicate
                                            </button>
                                            <button onClick={() => { onInherit(idx); setMenuOpenIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5 rounded-xl transition-colors">
                                                <Link size={12} className="text-purple-400" /> Link Parent
                                            </button>
                                            <div className="h-px bg-white/5 my-2" />
                                            <button onClick={() => { onRemoveTarget(idx); setMenuOpenIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nested Assets (Layers) */}
                            {selectedTargetIndex === idx && (target.assets || []).map(asset =>
                                renderAssetLayer(asset, selectedAssetId === asset.id)
                            )}
                        </div>
                    ))}

                    {/* Footer Actions inside the scroll area */}
                    <div className="p-6 mt-4">
                        <label className="relative group cursor-pointer block">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#fa9440] to-[#e7313d] rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative bg-black/40 border border-white/5 hover:border-orange-500/30 p-5 rounded-[2rem] flex items-center justify-center gap-4 transition-all active:scale-95 overflow-hidden">
                                <Sparkles size={24} className="text-orange-500" />
                                <div className="text-left">
                                    <span className="text-xs font-black text-white uppercase tracking-tighter block leading-none mb-1">Smart Compile</span>
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block leading-none">Perspective Training</span>
                                </div>
                                <input ref={smartCompileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={onSmartCompile} />
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </section>
    )
}
