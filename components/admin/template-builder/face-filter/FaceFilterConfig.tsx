import { Sliders, Maximize, Smartphone } from 'lucide-react'
import { FaceFilterConfig } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'

interface FaceFilterConfigProps {
    config: FaceFilterConfig
    onUpdateConfig: (key: string, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function FaceFilterConfigPanel({ config, onUpdateConfig, onUpload }: FaceFilterConfigProps) {
    const ANCHOR_OPTIONS = [
        { value: 'nose_bridge', label: '👓 Sống mũi (Kính)', icon: '👓' },
        { value: 'forehead', label: '🎩 Trán (Mũ/Vương miện)', icon: '🎩' },
        { value: 'nose_tip', label: '🤡 Đầu mũi (Mũi hề)', icon: '🤡' },
        { value: 'chin', label: '🧔 Cằm (Râu)', icon: '🧔' },
        { value: 'full_face', label: '🎭 Toàn mặt (Mặt nạ)', icon: '🎭' },
    ]

    const handleUpload = async (file: File, key: string, path: string) => {
        try {
            const url = await onUpload(file, path)
            onUpdateConfig(key, url)
            return url
        } catch (error) {
            console.error(error)
            return null
        }
    }

    return (
        <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
            <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                <Sliders size={14} className="text-orange-500" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Filter Configuration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Visual Assets */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Main Filter Content (PNG/GLB)</label>
                        <div className="relative aspect-square rounded-3xl border-2 border-dashed border-white/10 bg-black/40 overflow-hidden group">
                            <FileUploader
                                currentUrl={config.filter_url}
                                onUpload={(f) => handleUpload(f, 'filter_url', `filters/${Date.now()}_${f.name}`)}
                                onClear={() => onUpdateConfig('filter_url', '')}
                                renderPreview={(url) => <img src={url} className="w-full h-full object-contain pointer-events-none" />}
                                label="Upload 2D/3D Asset"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Brand Logo (Optional)</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 overflow-hidden relative">
                                <FileUploader
                                    currentUrl={config.logo_url}
                                    onUpload={(f) => handleUpload(f, 'logo_url', `logos/${Date.now()}_${f.name}`)}
                                    onClear={() => onUpdateConfig('logo_url', '')}
                                    renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                />
                            </div>
                            <div className="text-[9px] text-white/40 italic">Displayed in corner</div>
                        </div>
                    </div>
                </div>

                {/* Transform Settings */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Anchor Point</label>
                        <div className="grid grid-cols-1 gap-2">
                            {ANCHOR_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => onUpdateConfig('anchor_position', opt.value)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${config.anchor_position === opt.value
                                        ? 'bg-orange-500/10 border-orange-500 text-white'
                                        : 'bg-black/40 border-white/5 text-white/40 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{opt.icon}</span>
                                        <span className="text-xs font-bold">{opt.label}</span>
                                    </div>
                                    {config.anchor_position === opt.value && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                                <Maximize size={12} /> Scale
                            </label>
                            <span className="text-xs font-mono text-white/60">{config.filter_scale || 1}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={config.filter_scale || 1}
                            onChange={e => onUpdateConfig('filter_scale', parseFloat(e.target.value))}
                            className="w-full accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[9px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                            Offset (X, Y)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.offset_x || 0}
                                    onChange={e => onUpdateConfig('offset_x', parseFloat(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center"
                                />
                                <span className="text-[8px] text-white/30 uppercase text-center block">Horizontal</span>
                            </div>
                            <div className="space-y-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.offset_y || 0}
                                    onChange={e => onUpdateConfig('offset_y', parseFloat(e.target.value))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center"
                                />
                                <span className="text-[8px] text-white/30 uppercase text-center block">Vertical</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Occlusion & Rendering */}
                <div className="md:col-span-2 space-y-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Sliders size={14} className="text-orange-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Occlusion & Rendering</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block flex items-center gap-1">
                                <span>Head Occluder (Che phủ đầu)</span>
                            </label>
                            <button
                                onClick={() => onUpdateConfig('full_head_occlusion', !config.full_head_occlusion)}
                                className={`flex items-center justify-between w-full p-6 rounded-3xl border transition-all ${config.full_head_occlusion ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-xl shadow-orange-500/5' : 'bg-black/40 border-white/5 text-white/40'}`}
                            >
                                <div className="text-left">
                                    <span className="text-xs font-black uppercase tracking-tight block">Full Head Occluder</span>
                                    <p className="text-[10px] opacity-70 mt-1 font-medium">Bật nếu filter có phần che khuất sau đầu (mũ, nón...)</p>
                                </div>
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${config.full_head_occlusion ? 'bg-orange-500' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-xl ${config.full_head_occlusion ? 'left-5' : 'left-1'}`} />
                                </div>
                            </button>

                            {config.full_head_occlusion && (
                                <div className="space-y-4 p-6 bg-black/40 rounded-3xl border border-orange-500/10 mt-4 animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Kích thước Occluder</span>
                                        <span className="text-xs font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{config.occlusion_radius ?? 0.15}</span>
                                    </div>
                                    <input type="range" min="0.1" max="0.5" step="0.01" value={config.occlusion_radius ?? 0.15} onChange={(e) => onUpdateConfig('occlusion_radius', parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block flex items-center gap-2">
                                <Smartphone size={12} /> Capture Controls
                            </label>
                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Nút Chụp (Label)</label>
                                    <input
                                        type="text"
                                        value={config.capture_btn_text || 'Chụp ảnh'}
                                        onChange={e => onUpdateConfig('capture_btn_text', e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-xl text-xs text-white font-bold outline-none focus:border-orange-500/50 transition-all placeholder:text-white/10"
                                        placeholder="CHỤP ẢNH"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Màu Nút (Color)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-10 rounded-xl border border-white/10" style={{ backgroundColor: config.capture_btn_color || '#ec4899' }}></div>
                                        <ColorPicker
                                            value={config.capture_btn_color || '#F97316'}
                                            onChange={color => onUpdateConfig('capture_btn_color', color)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
