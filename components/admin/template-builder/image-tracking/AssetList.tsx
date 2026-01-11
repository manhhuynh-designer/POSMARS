import { Box, Play, Video, Eye, Image as ImageIcon, Trash2 } from 'lucide-react'
import { ARAsset } from '../types'

interface AssetListProps {
    assets: ARAsset[]
    selectedAssetId: string | null
    onSelectAsset: (id: string) => void
    onAddAsset: (type: '3d' | 'video' | 'occlusion' | 'image') => void
    onRemoveAsset: (id: string) => void
}

export default function AssetList({ assets, selectedAssetId, onSelectAsset, onAddAsset, onRemoveAsset }: AssetListProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case '3d': return <Box size={14} className="text-cyan-400" />
            case 'video': return <Video size={14} className="text-purple-400" />
            case 'image': return <ImageIcon size={14} className="text-green-400" />
            case 'occlusion': return <Eye size={14} className="text-white/40" />
            default: return <Box size={14} />
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Scene Assets</h4>
                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                    <button onClick={() => onAddAsset('3d')} className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-cyan-400 transition-colors" title="Add 3D"><Box size={14} /></button>
                    <button onClick={() => onAddAsset('video')} className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-purple-400 transition-colors" title="Add Video"><Video size={14} /></button>
                    <button onClick={() => onAddAsset('image')} className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-green-400 transition-colors" title="Add Image"><ImageIcon size={14} /></button>
                    <button onClick={() => onAddAsset('occlusion')} className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-colors" title="Add Occlusion"><Eye size={14} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {assets.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-white/5 rounded-2xl bg-black/20">
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No Assets</p>
                    </div>
                ) : (
                    assets.map((asset, idx) => (
                        <div
                            key={asset.id}
                            onClick={() => onSelectAsset(asset.id)}
                            className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAssetId === asset.id
                                    ? 'bg-[#1a1a1a] border-white/10 shadow-lg'
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-black border border-white/5 flex items-center justify-center">
                                {getIcon(asset.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className={`text-xs font-bold truncate ${selectedAssetId === asset.id ? 'text-white' : 'text-white/50'}`}>
                                    {asset.name}
                                </h5>
                                <p className="text-[9px] text-white/20 truncate font-mono">
                                    {(asset.type === '3d' || asset.type === 'image') ? `S:${asset.scale}` : (asset.type === 'video' ? 'Video Plane' : 'Mask')}
                                </p>
                            </div>

                            {selectedAssetId === asset.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.id) }}
                                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
