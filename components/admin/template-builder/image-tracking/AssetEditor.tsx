'use client'
import { useState } from 'react'
import { ARAsset, VideoKeyframe } from '../types'
import FileUploader from '../shared/FileUploader'
import ProMixerTimeline from '../../ProMixerTimeline'
import { Box, Video, Image as ImageIcon, Sparkles, Upload, Check, RefreshCw, Loader2, Clock, Trash2, RotateCcw } from 'lucide-react'

interface AssetEditorProps {
    asset: ARAsset
    onUpdateAsset: (id: string, updates: Partial<ARAsset>) => void
    onUpload: (file: File, path: string) => Promise<string>
    onAddAsset: (type: '3d' | 'image' | 'video' | 'occlusion') => void
    playbackState: { isPlaying: boolean; currentTime: number; startTimestamp: number }
    onSeek: (time: number) => void
    onTogglePlayback: () => void
}

export default function AssetEditor({ asset, onUpdateAsset, onUpload, onAddAsset, playbackState, onSeek, onTogglePlayback }: AssetEditorProps) {
    const [activeTab, setActiveTab] = useState<'transform' | 'asset'>('transform')
    const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [rotationMultipliers, setRotationMultipliers] = useState<[number, number, number]>([1, 1, 1])

    // Get selected keyframe (first one if multiple selected)
    const selectedKeyframe = selectedKeyframeIds.length > 0
        ? asset.keyframes?.find(kf => kf.id === selectedKeyframeIds[0])
        : null

    // Determine what we're editing - keyframe or initial transform
    const isEditingKeyframe = selectedKeyframe !== null
    const editingLabel = isEditingKeyframe
        ? `Editing: Keyframe @ ${selectedKeyframe?.time.toFixed(1)}s`
        : 'Initial Transform'

    // Get current values based on selection
    const getCurrentScale = (): number => {
        if (isEditingKeyframe && selectedKeyframe?.property === 'scale') {
            const vals = selectedKeyframe.value.split(' ')
            return parseFloat(vals[0]) || 1
        }
        return asset.scale
    }

    const getCurrentPosition = (): [number, number, number] => {
        if (isEditingKeyframe && selectedKeyframe?.property === 'position') {
            const vals = selectedKeyframe.value.split(' ').map(v => parseFloat(v) || 0)
            return [vals[0] || 0, vals[1] || 0, vals[2] || 0]
        }
        return asset.position
    }

    const getCurrentRotation = (): [number, number, number] => {
        if (isEditingKeyframe && selectedKeyframe?.property === 'rotation') {
            const vals = selectedKeyframe.value.split(' ').map(v => parseFloat(v) || 0)
            return [vals[0] || 0, vals[1] || 0, vals[2] || 0]
        }
        return asset.rotation
    }

    // Handle upload with auto-detect for video
    const handleUpload = async (file: File) => {
        try {
            setUploading(true)
            const url = await onUpload(file, `assets/${Date.now()}_${file.name}`)

            // Auto-detect video dimensions
            if (asset.type === 'video' && file.type.startsWith('video/')) {
                const videoEl = document.createElement('video')
                videoEl.src = URL.createObjectURL(file)
                videoEl.onloadedmetadata = () => {
                    const aspectRatio = videoEl.videoWidth / videoEl.videoHeight
                    onUpdateAsset(asset.id, {
                        url,
                        name: file.name,
                        video_width: parseFloat(aspectRatio.toFixed(2)),
                        video_height: 1
                    })
                    URL.revokeObjectURL(videoEl.src)
                }
            } else {
                onUpdateAsset(asset.id, { url, name: file.name })
            }
            setUploading(false)
            return url
        } catch (error) {
            console.error(error)
            setUploading(false)
            return null
        }
    }

    // Update transform - either keyframe or initial
    const updateTransform = (key: 'position' | 'rotation' | 'scale', axis: number | null, value: number) => {
        // ONLY update keyframe if the selected keyframe's property matches the slider we are moving
        if (isEditingKeyframe && selectedKeyframe && selectedKeyframe.property === key) {
            // Update keyframe value
            let newValue = selectedKeyframe.value
            if (key === 'scale') {
                newValue = `${value} ${value} ${value}`
            } else {
                const vals = selectedKeyframe.value.split(' ').map(v => parseFloat(v) || 0)
                if (axis !== null) vals[axis] = value
                newValue = vals.join(' ')
            }
            handleKeyframeUpdate(selectedKeyframe.id, { value: newValue })
        } else {
            // Update initial transform (Global)
            if (key === 'scale') {
                onUpdateAsset(asset.id, { scale: value })
            } else {
                const current = [...asset[key]] as [number, number, number]
                if (axis !== null) current[axis] = value
                onUpdateAsset(asset.id, { [key]: current })
            }
        }
    }

    const handleRemoveKeyframes = () => {
        if (selectedKeyframeIds.length === 0) return
        const newKeyframes = (asset.keyframes || []).filter(kf => !selectedKeyframeIds.includes(kf.id))
        onUpdateAsset(asset.id, { keyframes: newKeyframes })
        setSelectedKeyframeIds([])
    }

    const handleResetTransform = () => {
        onUpdateAsset(asset.id, {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1.0
        })
    }

    // Keyframe Handlers
    const handleKeyframeUpdate = (id: string, updates: Partial<VideoKeyframe>) => {
        const newKeyframes = (asset.keyframes || []).map(kf =>
            kf.id === id ? { ...kf, ...updates } : kf
        )
        onUpdateAsset(asset.id, { keyframes: newKeyframes })
    }

    const handleAddKeyframe = (property: string, time: number) => {
        // Use current asset values as initial keyframe values
        let initialValue = '0 0 0'
        if (property === 'scale') initialValue = `${asset.scale} ${asset.scale} ${asset.scale}`
        else if (property === 'position') initialValue = `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`
        else if (property === 'rotation') initialValue = `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`
        else if (property === 'opacity') initialValue = '1'

        const id = Date.now().toString()
        const newKf: VideoKeyframe = {
            id,
            time,
            property: property as any,
            value: initialValue,
            easing: 'linear'
        }
        const newKeyframes = [...(asset.keyframes || []), newKf]
        onUpdateAsset(asset.id, { keyframes: newKeyframes })

        // Auto-select the NEW keyframe
        setSelectedKeyframeIds([id])

        // Sync playhead to the new keyframe position so they can see/edit it immediately
        onSeek(time)
    }

    const currentScale = getCurrentScale()
    const currentPosition = getCurrentPosition()
    const currentRotation = getCurrentRotation()

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Tabs */}
            <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-900/40 border border-white/20">
                        {asset.type === '3d' ? <Box size={32} /> : (asset.type === 'video' ? <Video size={32} /> : <ImageIcon size={32} />)}
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter leading-tight mb-1">{asset.name}</h4>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Instance ID: {asset.id.slice(-8)}</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button
                        onClick={() => setActiveTab('transform')}
                        className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === 'transform'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20'
                            : 'text-white/40 hover:text-white'
                            }`}
                    >
                        Transform & Animation
                    </button>
                    <button
                        onClick={() => setActiveTab('asset')}
                        className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === 'asset'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20'
                            : 'text-white/40 hover:text-white'
                            }`}
                    >
                        Asset Content
                    </button>
                </div>
            </div>



            {/* Tab Content */}
            {activeTab === 'transform' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Transform Sliders */}
                    <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Object Transformation</h5>
                                <button
                                    onClick={handleResetTransform}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-black uppercase text-white/40 hover:text-white transition-all"
                                    title="Reset All Transforms"
                                >
                                    <RotateCcw size={10} /> Reset
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${isEditingKeyframe
                                    ? 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                                    : 'bg-white/5 border-white/10 text-white/40'
                                    }`}>
                                    <Clock size={12} className="inline mr-2" />
                                    {editingLabel}
                                </div>
                                {isEditingKeyframe && (
                                    <button
                                        onClick={handleRemoveKeyframes}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all shadow-lg"
                                        title="Delete Selected Keyframe"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Position Sliders */}
                        <div className="space-y-6">
                            <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Position Vectors [m]</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {['X', 'Y', 'Z'].map((label, i) => (
                                    <div key={`pos-${i}`} className="space-y-3 p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{label} Axis</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={currentPosition[i].toFixed(2)}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val === '' || val === '-') return // Allow typing negative sign
                                                    updateTransform('position', i, parseFloat(val))
                                                }}
                                                className="w-16 text-[11px] font-mono text-white/80 font-bold bg-black/40 border border-blue-500/30 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            />
                                        </div>
                                        <input
                                            type="range" min="-3" max="3" step="0.01"
                                            value={currentPosition[i]}
                                            onChange={(e) => updateTransform('position', i, parseFloat(e.target.value))}
                                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-black/40 border border-white/5"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rotation Sliders */}
                        <div className="space-y-6">
                            <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Rotation Angles [deg]</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {['X', 'Y', 'Z'].map((label, i) => (
                                    <div key={`rot-${i}`} className="space-y-3 p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{label} Axis</span>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    value={Math.round(currentRotation[i] / (rotationMultipliers[i] || 1))}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        if (val === '' || val === '-') return
                                                        updateTransform('rotation', i, parseFloat(val) * (rotationMultipliers[i] || 1))
                                                    }}
                                                    className="w-14 text-[11px] font-mono text-white/80 font-bold bg-black/40 border border-purple-500/30 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                />
                                                <span className="text-[9px] text-purple-400/60">×</span>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    value={rotationMultipliers[i]}
                                                    onChange={(e) => {
                                                        const mult = parseInt(e.target.value) || 1
                                                        const baseVal = Math.round(currentRotation[i] / (rotationMultipliers[i] || 1))
                                                        const newMultipliers = [...rotationMultipliers] as [number, number, number]
                                                        newMultipliers[i] = mult
                                                        setRotationMultipliers(newMultipliers)
                                                        updateTransform('rotation', i, baseVal * mult)
                                                    }}
                                                    className="w-10 text-[11px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/30 rounded-lg px-1 py-1 text-center focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="range" min="-360" max="360" step="1"
                                                value={currentRotation[i]}
                                                onChange={(e) => {
                                                    const raw = parseFloat(e.target.value)
                                                    // Snap to nearest 30 degree tick
                                                    const snapped = Math.round(raw / 30) * 30
                                                    updateTransform('rotation', i, snapped)
                                                }}
                                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500 bg-black/40 border border-white/5"
                                            />
                                            {/* Snap Ticks - show marks only */}
                                            <div className="flex justify-between mt-1">
                                                {Array.from({ length: 13 }, (_, idx) => (
                                                    <span key={idx} className="text-[7px] text-white/20 font-mono">|</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scale Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Global Scale</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max="10"
                                    value={currentScale.toFixed(2)}
                                    onChange={(e) => updateTransform('scale', null, parseFloat(e.target.value) || 0.01)}
                                    className="w-20 text-xs font-black bg-emerald-500/10 px-4 py-1.5 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                />
                            </div>
                            <div className="flex flex-col space-y-1">
                                <input
                                    type="range" min="0.5" max="5" step="0.01"
                                    value={currentScale}
                                    style={{ accentColor: '#10b981' }} // Enforce Emerald-500
                                    onChange={(e) => {
                                        const raw = parseFloat(e.target.value)
                                        const snaps = [0.5, 1, 2, 3, 4, 5]
                                        const closest = snaps.reduce((p, c) => Math.abs(c - raw) < Math.abs(p - raw) ? c : p)
                                        updateTransform('scale', null, closest)
                                    }}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-black/40 border border-white/5"
                                />
                                {/* Snap Ticks */}
                                <div className="flex justify-between mt-1">
                                    {[0.5, 1, 2, 3, 4, 5].map(v => (
                                        <span key={v} className="text-[8px] text-white/30 font-mono">{v}x</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Animation Timeline */}
                    <div className="bg-[#080808] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none" />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-black text-white uppercase tracking-tight">Pro Animation Timeline</h5>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Keyframe Orchestration</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-black/40 px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sequence Duration</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={asset.animation_duration || 5}
                                        onChange={e => onUpdateAsset(asset.id, { animation_duration: parseFloat(e.target.value) })}
                                        className="w-12 bg-transparent text-sm font-mono text-orange-500 text-center focus:outline-none font-black"
                                    />
                                    <span className="text-[10px] font-black text-white/20 uppercase">SEC</span>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[320px] bg-black/40 rounded-[2rem] border border-white/5 border-dashed p-6 shadow-inner relative z-10">
                            <ProMixerTimeline
                                keyframes={asset.keyframes || []}
                                duration={asset.animation_duration || 5}
                                onKeyframeUpdate={handleKeyframeUpdate}
                                onKeyframeSelect={setSelectedKeyframeIds}
                                onAddKeyframe={handleAddKeyframe}
                                onKeyframesDelete={handleRemoveKeyframes}
                                selectedIds={selectedKeyframeIds}
                                playbackState={playbackState}
                                onSeek={onSeek}
                            />
                        </div>

                        {/* Loop Animation Toggle */}
                        <label className="flex items-center gap-6 cursor-pointer group bg-gradient-to-r from-orange-500/5 to-transparent p-6 rounded-[1.5rem] border border-orange-500/10 hover:border-orange-500/30 transition-all relative z-10">
                            <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${asset.loop_animation ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : 'bg-white/10 shadow-inner'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${asset.loop_animation ? 'left-7' : 'left-1'}`} />
                            </div>
                            <input
                                type="checkbox"
                                checked={asset.loop_animation || false}
                                onChange={(e) => onUpdateAsset(asset.id, { loop_animation: e.target.checked })}
                                className="hidden"
                            />
                            <div>
                                <span className="text-sm font-black text-white uppercase tracking-tight">Looping Sequence</span>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Continuous auto-replay of animation steps</p>
                            </div>
                        </label>
                    </div >
                </div >
            )
            }

            {
                activeTab === 'asset' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        {/* File Source Upload */}
                        <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
                                    Asset Source: {asset.type.toUpperCase()}
                                </h5>
                                {asset.url && (
                                    <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Link Active</span>
                                    </div>
                                )}
                            </div>

                            {/* URL Input + Upload */}
                            <div className="flex gap-4">
                                <div className="flex-1 relative group">
                                    <input
                                        type="text"
                                        placeholder="Enter media URL directly or browse files..."
                                        value={asset.url || ''}
                                        onChange={(e) => onUpdateAsset(asset.id, { url: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 group-hover:border-orange-500/30 rounded-[1.5rem] px-6 py-4 text-xs text-white focus:border-orange-500 outline-none transition-all placeholder:text-white/10 font-medium"
                                    />
                                </div>
                                <label className={`bg-gradient-to-br from-orange-500 to-red-600 text-white px-8 py-4 rounded-[1.5rem] cursor-pointer hover:shadow-2xl hover:shadow-orange-500/20 active:scale-95 transition-all shadow-xl flex items-center gap-3 border border-white/10 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    <span className="text-xs font-black uppercase tracking-widest">Browse</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        disabled={uploading}
                                        accept={asset.type === '3d' ? '.glb,.gltf' : asset.type === 'video' ? '.mp4,.webm' : '.png,.webp,.jpg,.jpeg'}
                                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                                    />
                                </label>
                            </div>

                            {/* Video Preview */}
                            {asset.type === 'video' && asset.url && (
                                <div className="mt-4 rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-2xl relative group">
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 text-purple-400">
                                            <Video size={16} />
                                        </div>
                                    </div>
                                    <video
                                        src={asset.url}
                                        controls
                                        className="w-full max-h-[300px] object-contain group-hover:scale-[1.02] transition-transform duration-700"
                                        crossOrigin="anonymous"
                                        playsInline
                                    />
                                    <div className="bg-white/5 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Hardware Accelerated Player</p>
                                    </div>
                                </div>
                            )}

                            {/* Image Preview */}
                            {asset.type === 'image' && asset.url && (
                                <div className="mt-4 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 text-emerald-400">
                                            <ImageIcon size={16} />
                                        </div>
                                    </div>
                                    <div
                                        className="p-12 flex justify-center bg-black transition-all duration-700 group-hover:p-8"
                                        style={{ background: 'repeating-conic-gradient(#080808 0% 25%, #111 0% 50%) 50% / 32px 32px' }}
                                    >
                                        <img src={asset.url} alt="Preview" className="max-h-[300px] object-contain shadow-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <div className="bg-white/5 px-6 py-3 border-t border-white/5 flex justify-between items-center">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Texture Inspector (Transparency Grid)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Video Specific Settings */}
                        {asset.type === 'video' && (
                            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                                <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Video Projection Canvas</h5>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Projection Width</label>
                                            <span className="text-[11px] font-mono text-purple-400 font-bold">{asset.video_width || 1}</span>
                                        </div>
                                        <input
                                            type="number" step="0.1"
                                            value={asset.video_width || 1}
                                            onChange={(e) => onUpdateAsset(asset.id, { video_width: parseFloat(e.target.value) })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Projection Height</label>
                                            <span className="text-[11px] font-mono text-purple-400 font-bold">{asset.video_height || 1}</span>
                                        </div>
                                        <input
                                            type="number" step="0.1"
                                            value={asset.video_height || 1}
                                            onChange={(e) => onUpdateAsset(asset.id, { video_height: parseFloat(e.target.value) })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-4">
                                    <button
                                        onClick={() => onUpdateAsset(asset.id, { video_loop: !asset.video_loop })}
                                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${asset.video_loop
                                            ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-purple-500/30'
                                            }`}
                                    >
                                        <RefreshCw size={14} /> Loop Video
                                    </button>
                                    <button
                                        onClick={() => onUpdateAsset(asset.id, { video_muted: !asset.video_muted })}
                                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${asset.video_muted
                                            ? 'bg-white/10 text-white border-white/20'
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        {asset.video_muted ? 'Muted' : 'Audio Enabled'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Image Specific Settings */}
                        {asset.type === 'image' && (
                            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                                <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Image Plane Geometry</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Plane Width</label>
                                            <span className="text-[11px] font-mono text-emerald-400 font-bold">{(asset.image_width || 1).toFixed(1)}m</span>
                                        </div>
                                        <div className="relative h-2 flex items-center">
                                            <div className="absolute inset-0 h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                                <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${((asset.image_width || 1) / 5) * 100}%` }} />
                                            </div>
                                            <input
                                                type="range" min="0.1" max="5" step="0.1"
                                                value={asset.image_width || 1}
                                                onChange={(e) => onUpdateAsset(asset.id, { image_width: parseFloat(e.target.value) })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer accent-emerald-500 z-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Plane Height</label>
                                            <span className="text-[11px] font-mono text-emerald-400 font-bold">{(asset.image_height || 1).toFixed(1)}m</span>
                                        </div>
                                        <div className="relative h-2 flex items-center">
                                            <div className="absolute inset-0 h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                                <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${((asset.image_height || 1) / 5) * 100}%` }} />
                                            </div>
                                            <input
                                                type="range" min="0.1" max="5" step="0.1"
                                                value={asset.image_height || 1}
                                                onChange={(e) => onUpdateAsset(asset.id, { image_height: parseFloat(e.target.value) })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer accent-emerald-500 z-10"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Occlusion Settings */}
                        {asset.type === 'occlusion' && (
                            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                                <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Mask Primitive Geometry</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['model', 'cube', 'sphere', 'plane'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => onUpdateAsset(asset.id, { occlusion_shape: type as any })}
                                            className={`py-4 rounded-[1.2rem] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${(asset.occlusion_shape || 'cube') === type
                                                ? 'bg-orange-500 border-orange-400 text-white shadow-xl shadow-orange-500/20'
                                                : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    )
}
