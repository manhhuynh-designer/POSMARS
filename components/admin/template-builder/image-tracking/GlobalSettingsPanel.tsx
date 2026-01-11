'use client'
import { useState } from 'react'
import { ImageTrackingConfig } from '../types'
import { Sun, Upload, Loader2, Settings, Sparkles, Zap, Maximize, AlertCircle } from 'lucide-react'

interface GlobalSettingsPanelProps {
    config: ImageTrackingConfig
    onUpdateConfig: (key: keyof ImageTrackingConfig, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function GlobalSettingsPanel({ config, onUpdateConfig, onUpload }: GlobalSettingsPanelProps) {
    const [uploading, setUploading] = useState(false)

    const handleEnvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploading(true)
            const url = await onUpload(file, `environments/${Date.now()}_${file.name}`)
            onUpdateConfig('environment_url', url)
        } catch (error) {
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl transition-all duration-700 hover:border-orange-500/20">
            {/* Ambient Background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/[0.03] blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/[0.03] blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl border border-orange-500/20 shadow-inner">
                        <Settings size={22} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-white uppercase tracking-tighter leading-tight">Global Stage</h3>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-0.5">Environmental Configuration</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {/* Lighting Group */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-orange-500" />
                        <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Lighting & Radiance</h4>
                    </div>

                    {/* Ambient Light */}
                    <div className="space-y-3 p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-orange-500/10 transition-all">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Ambient Intensity</span>
                            <span className="text-[11px] font-mono text-white bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 font-black">
                                {(config.ambient_intensity || 1.0).toFixed(1)}
                            </span>
                        </div>
                        <div className="relative h-2 flex items-center">
                            <div className="absolute inset-0 h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-300"
                                    style={{ width: `${((config.ambient_intensity || 1) / 3) * 100}%` }}
                                />
                            </div>
                            <input
                                type="range" min="0" max="3" step="0.1"
                                value={config.ambient_intensity || 1}
                                onChange={(e) => onUpdateConfig('ambient_intensity', parseFloat(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                            />
                        </div>
                    </div>

                    {/* Exposure */}
                    <div className="space-y-3 p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-orange-500/10 transition-all">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Scene Exposure</span>
                            <span className="text-[11px] font-mono text-white bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 font-black">
                                {(config.exposure || 1.0).toFixed(1)}
                            </span>
                        </div>
                        <div className="relative h-2 flex items-center">
                            <div className="absolute inset-0 h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-300"
                                    style={{ width: `${((config.exposure || 1) / 3) * 100}%` }}
                                />
                            </div>
                            <input
                                type="range" min="0.1" max="3" step="0.1"
                                value={config.exposure || 1}
                                onChange={(e) => onUpdateConfig('exposure', parseFloat(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                            />
                        </div>
                    </div>

                    {/* Environment HDR */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">HDRI Environment</label>
                            {config.environment_url && !/\.(hdr|exr)(\?|$)/i.test(config.environment_url) && (
                                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                    <AlertCircle size={10} /> Not .hdr/.exr format
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 relative group">
                                <input
                                    type="text"
                                    value={config.environment_url || ''}
                                    onChange={(e) => onUpdateConfig('environment_url', e.target.value)}
                                    className={`w-full bg-black/40 border ${config.environment_url && !config.environment_url.match(/\.(hdr|exr)(\?|$)/i) ? 'border-orange-500/50' : 'border-white/10 group-hover:border-orange-500/30'} rounded-xl px-4 py-3 text-[11px] text-white outline-none placeholder:text-white/10 font-mono transition-all`}
                                    placeholder="Source URL (.hdr, .exr)..."
                                />
                            </div>
                            <label className={`bg-gradient-to-br from-orange-500 to-red-600 text-white px-4 py-3 rounded-xl cursor-pointer hover:shadow-lg transition-all border border-white/10 flex items-center justify-center min-w-[50px] ${uploading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}>
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".hdr,.exr"
                                    onChange={handleEnvUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>
                    {config.environment_url && (
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">File:</span>
                            <span className="text-[10px] text-orange-400 font-mono truncate max-w-[200px]" title={decodeURIComponent(config.environment_url).split('?')[0].split('/').pop()}>
                                {decodeURIComponent(config.environment_url).split('?')[0].split('/').pop()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Capture Settings */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Maximize size={14} className="text-blue-500" />
                        <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Capture Pipeline</h4>
                    </div>

                    {/* Max Video Duration */}
                    <div className="space-y-3 p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-blue-500/10 transition-all">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Max Export Duration</span>
                            <span className="text-[11px] font-mono text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 font-black">
                                {(config.max_video_duration || 30)}S
                            </span>
                        </div>
                        <input
                            type="range" min="5" max="120" step="5"
                            value={config.max_video_duration || 30}
                            onChange={(e) => onUpdateConfig('max_video_duration', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-orange-500 border border-white/5"
                        />
                    </div>

                    {/* Capture Quality */}
                    <div className="space-y-3 p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-blue-500/10 transition-all">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Resolution Target</span>
                            <span className="text-[11px] font-mono text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 font-black">
                                {(config.capture_quality || 0.8) * 100}%
                            </span>
                        </div>
                        <input
                            type="range" min="0.3" max="1" step="0.1"
                            value={config.capture_quality || 0.8}
                            onChange={(e) => onUpdateConfig('capture_quality', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-blue-500 border border-white/5"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Enable Capture Toggle */}
                        <label className="flex flex-col gap-3 cursor-pointer group bg-white/[0.02] p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-tight">Camera Capture</span>
                                <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${config.enable_capture !== false ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.enable_capture !== false ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={config.enable_capture !== false}
                                onChange={(e) => onUpdateConfig('enable_capture', e.target.checked)}
                                className="hidden"
                            />
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Enable Photo/Video Export</p>
                        </label>

                        {/* Show Scan Hint Toggle */}
                        <label className="flex flex-col gap-3 cursor-pointer group bg-white/[0.02] p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-tight">Scan Overlay</span>
                                <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${config.show_scan_hint !== false ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${config.show_scan_hint !== false ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={config.show_scan_hint !== false}
                                onChange={(e) => onUpdateConfig('show_scan_hint', e.target.checked)}
                                className="hidden"
                            />
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Guide user for tracking</p>
                        </label>
                    </div>
                </div>
            </div>

            {/* Tone Mapping footer */}
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-orange-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Tone Mapping Architecture</span>
                </div>
                <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 min-w-[300px]">
                    {['no', 'acesfilmic', 'linear', 'reinhard'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onUpdateConfig('tone_mapping', mode)}
                            className={`flex-1 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${(config.tone_mapping || 'no') === mode
                                ? 'bg-white/10 text-white shadow-lg'
                                : 'text-white/30 hover:text-white'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
        </div >
    )
}
