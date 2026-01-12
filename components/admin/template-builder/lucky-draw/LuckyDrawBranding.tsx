'use client'
import { useState } from 'react'
import { ImageIcon, Trash2, Upload } from 'lucide-react'
import { LuckyDrawConfig } from '../types'
import FileUploader from '../shared/FileUploader'

interface LuckyDrawBrandingProps {
    config: LuckyDrawConfig
    onUpdateConfig: (key: string, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function LuckyDrawBranding({ config, onUpdateConfig, onUpload }: LuckyDrawBrandingProps) {
    const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})

    const handleUpload = async (file: File, key: string, path: string) => {
        try {
            setUploadingFields(prev => ({ ...prev, [key]: true }))
            const url = await onUpload(file, path)
            onUpdateConfig(key, url)
            return url
        } catch (error) {
            console.error(error)
            return null
        } finally {
            setUploadingFields(prev => ({ ...prev, [key]: false }))
        }
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-10">
                <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Creative Branding & Identity</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Logo & Banner */}
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Brand/Partner Logo</label>
                            <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 group hover:border-orange-500/20 transition-all">
                                <div className="relative w-28 h-28 rounded-[2rem] bg-black border border-white/5 p-3 shadow-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <FileUploader
                                        currentUrl={config.logo_url}
                                        onUpload={(f) => handleUpload(f, 'logo_url', `logos/${Date.now()}_${f.name}`)}
                                        onClear={() => onUpdateConfig('logo_url', '')}
                                        isUploading={uploadingFields['logo_url']}
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.logo_url && <ImageIcon size={32} className="absolute inset-0 m-auto text-white/5" />}
                                </div>
                                <div className="space-y-3">
                                    <label className="px-6 py-3 bg-white/5 hover:bg-orange-500 text-white rounded-2xl cursor-pointer transition-all shadow-xl font-black uppercase text-[10px] tracking-widest inline-block active:scale-95">
                                        Upload Logo
                                        <FileUploader
                                            children={<span className="hidden" />} // Hidden input
                                            isUploading={uploadingFields['logo_url']}
                                            onUpload={(f) => handleUpload(f, 'logo_url', `logos/${Date.now()}_${f.name}`)}
                                        />
                                    </label>
                                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-loose">High-quality PNG<br />Min size: 512px</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Campaign Cover Banner</label>
                                {config.banner_url && <button onClick={() => onUpdateConfig('banner_url', '')} className="text-[9px] font-black text-red-500/60 uppercase hover:text-red-500 transition-colors">Clear</button>}
                            </div>
                            <div className="relative aspect-[16/7] rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.02] overflow-hidden group hover:border-orange-500/20 transition-all">
                                <FileUploader
                                    currentUrl={config.banner_url}
                                    onUpload={(f) => handleUpload(f, 'banner_url', `branding/${Date.now()}_${f.name}`)}
                                    onClear={() => onUpdateConfig('banner_url', '')}
                                    isUploading={uploadingFields['banner_url']}
                                    renderPreview={(url) => <img src={url} className="w-full h-full object-cover" />}
                                    label="Drop banner here or click to upload"
                                />
                            </div>
                        </div>

                        {/* App Background Customization */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">App Background</label>

                            {/* Background Type Selector */}
                            <div className="flex gap-2">
                                {(['image', 'solid', 'gradient'] as const).map((bgType) => (
                                    <button
                                        key={bgType}
                                        onClick={() => onUpdateConfig('bg_type', bgType)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${(config.bg_type || 'image') === bgType
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                            }`}
                                    >
                                        {bgType === 'image' ? 'Hình ảnh' : bgType === 'solid' ? 'Màu đơn' : 'Gradient'}
                                    </button>
                                ))}
                            </div>

                            {/* Image Upload - Show when type is 'image' */}
                            {(config.bg_type === 'image' || !config.bg_type) && (
                                <div className="relative aspect-[9/16] max-h-[200px] rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.02] overflow-hidden group hover:border-orange-500/20 transition-all">
                                    <FileUploader
                                        currentUrl={config.bg_url}
                                        onUpload={(f) => handleUpload(f, 'bg_url', `branding/${Date.now()}_${f.name}`)}
                                        onClear={() => onUpdateConfig('bg_url', '')}
                                        isUploading={uploadingFields['bg_url']}
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-cover" />}
                                        label="Upload Background"
                                    />
                                </div>
                            )}

                            {/* Solid Color - Show when type is 'solid' */}
                            {config.bg_type === 'solid' && (
                                <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                    <input
                                        type="color"
                                        value={config.bg_color || '#1e293b'}
                                        onChange={(e) => onUpdateConfig('bg_color', e.target.value)}
                                        className="w-16 h-16 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                    />
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Màu nền</p>
                                        <p className="text-sm font-mono text-white/60">{config.bg_color || '#1e293b'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Gradient - Show when type is 'gradient' */}
                            {config.bg_type === 'gradient' && (
                                <div className="space-y-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Màu bắt đầu</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={config.bg_gradient_start || '#1e293b'}
                                                    onChange={(e) => onUpdateConfig('bg_gradient_start', e.target.value)}
                                                    className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                                />
                                                <span className="text-[10px] text-white/40 font-mono">{config.bg_gradient_start || '#1e293b'}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Màu kết thúc</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={config.bg_gradient_end || '#0f172a'}
                                                    onChange={(e) => onUpdateConfig('bg_gradient_end', e.target.value)}
                                                    className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                                />
                                                <span className="text-[10px] text-white/40 font-mono">{config.bg_gradient_end || '#0f172a'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Preview */}
                                    <div
                                        className="w-full h-16 rounded-xl"
                                        style={{ background: `linear-gradient(to bottom, ${config.bg_gradient_start || '#1e293b'}, ${config.bg_gradient_end || '#0f172a'})` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Asset Customization */}
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Center Action Trigger</label>
                            <div className="p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-6 text-center group hover:border-orange-500/20 transition-all">
                                <div className="relative w-32 h-32 mx-auto rounded-full bg-black border border-white/5 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                                    <FileUploader
                                        currentUrl={config.spin_btn_url}
                                        onUpload={(f) => handleUpload(f, 'spin_btn_url', `branding/${Date.now()}_${f.name}`)}
                                        onClear={() => onUpdateConfig('spin_btn_url', '')}
                                        isUploading={uploadingFields['spin_btn_url']}
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.spin_btn_url && <span className="absolute pointer-events-none text-xs font-black text-orange-500 uppercase tracking-tighter">SPIN</span>}
                                </div>
                                <label className="px-8 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                    Change Button Asset
                                    <FileUploader
                                        children={<span className="hidden" />}
                                        isUploading={uploadingFields['spin_btn_url']}
                                        onUpload={(f) => handleUpload(f, 'spin_btn_url', `branding/${Date.now()}_${f.name}`)}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Wheel Frame (Outer Ring)</label>
                            <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 group hover:border-orange-500/20 transition-all">
                                <div className="w-20 h-20 bg-black rounded-full border border-white/5 flex items-center justify-center p-3 relative group-hover:scale-110 transition-transform shadow-2xl overflow-hidden">
                                    <FileUploader
                                        currentUrl={config.wheel_bg_url}
                                        onUpload={(f) => handleUpload(f, 'wheel_bg_url', `branding/${Date.now()}_${f.name}`)}
                                        onClear={() => onUpdateConfig('wheel_bg_url', '')}
                                        isUploading={uploadingFields['wheel_bg_url']}
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.wheel_bg_url && <Upload size={20} className="absolute pointer-events-none text-orange-500 opacity-20" />}
                                </div>
                                <div className="space-y-3">
                                    <label className="px-6 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                        Upload Frame
                                        <FileUploader
                                            children={<span className="hidden" />}
                                            isUploading={uploadingFields['wheel_bg_url']}
                                            onUpload={(f) => handleUpload(f, 'wheel_bg_url', `branding/${Date.now()}_${f.name}`)}
                                        />
                                    </label>
                                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-loose">Decorative outer ring<br />isolated on transparent/black</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Selection Pointer</label>
                            <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 group hover:border-orange-500/20 transition-all">
                                <div className="w-20 h-20 bg-black rounded-[1.5rem] border border-white/5 flex items-center justify-center p-3 relative group-hover:rotate-12 transition-transform shadow-2xl">
                                    <FileUploader
                                        currentUrl={config.pointer_url}
                                        onUpload={(f) => handleUpload(f, 'pointer_url', `branding/${Date.now()}_${f.name}`)}
                                        onClear={() => onUpdateConfig('pointer_url', '')}
                                        isUploading={uploadingFields['pointer_url']}
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.pointer_url && <span className="absolute pointer-events-none text-3xl text-orange-500 transition-transform group-hover:scale-125">▼</span>}
                                </div>
                                <div className="space-y-3">
                                    <label className="px-6 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                        Replace Pointer
                                        <FileUploader
                                            children={<span className="hidden" />}
                                            isUploading={uploadingFields['pointer_url']}
                                            onUpload={(f) => handleUpload(f, 'pointer_url', `branding/${Date.now()}_${f.name}`)}
                                        />
                                    </label>
                                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Icon positioned at top center</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Theme & Result Customization */}
            <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-10">
                <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Theme & Result Customization</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Colors */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Brand Colors</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Primary</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_primary_color || '#f97316'}
                                        onChange={(e) => onUpdateConfig('theme_primary_color', e.target.value)}
                                        className="w-10 h-10 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                    />
                                    <span className="text-[9px] text-white/40 font-mono">{config.theme_primary_color || '#f97316'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Accent</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_accent_color || '#ef4444'}
                                        onChange={(e) => onUpdateConfig('theme_accent_color', e.target.value)}
                                        className="w-10 h-10 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                    />
                                    <span className="text-[9px] text-white/40 font-mono">{config.theme_accent_color || '#ef4444'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Text</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.theme_text_color || '#ffffff'}
                                        onChange={(e) => onUpdateConfig('theme_text_color', e.target.value)}
                                        className="w-10 h-10 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                                    />
                                    <span className="text-[9px] text-white/40 font-mono">{config.theme_text_color || '#ffffff'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Popup Text & Replay */}
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Result Popup</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Title Text</label>
                                    <input
                                        type="text"
                                        value={config.result_title_text || ''}
                                        onChange={(e) => onUpdateConfig('result_title_text', e.target.value)}
                                        placeholder="Chúc mừng bạn nhận được"
                                        className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Button Text</label>
                                    <input
                                        type="text"
                                        value={config.result_button_text || ''}
                                        onChange={(e) => onUpdateConfig('result_button_text', e.target.value)}
                                        placeholder="Nhận quà"
                                        className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Replay Config */}
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Replay Options</p>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.allow_replay ? 'bg-orange-500 border-orange-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                        {config.allow_replay && <span className="text-white text-xs font-bold">✓</span>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={config.allow_replay || false}
                                        onChange={(e) => onUpdateConfig('allow_replay', e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Allow Replay (Chơi lại)</span>
                                </label>

                                {config.allow_replay && (
                                    <div className="animate-in slide-in-from-top-2 space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Replay Button Text</label>
                                            <input
                                                type="text"
                                                value={config.replay_button_text || ''}
                                                onChange={(e) => onUpdateConfig('replay_button_text', e.target.value)}
                                                placeholder="Chơi lại"
                                                className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Max Plays per User</label>
                                            <input
                                                type="number"
                                                value={config.max_plays || 1}
                                                min={1}
                                                onChange={(e) => onUpdateConfig('max_plays', Number(e.target.value))}
                                                className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white font-mono outline-none focus:border-orange-500/30 transition-all"
                                            />
                                            <p className="text-[9px] text-white/20 font-medium mt-1">Total plays allowed before requiring new registration</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result Icon */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Result Icon</p>
                    <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 group hover:border-orange-500/20 transition-all">
                        <div className="w-20 h-20 bg-black rounded-full border border-white/5 flex items-center justify-center p-3 relative group-hover:scale-110 transition-transform shadow-2xl overflow-hidden">
                            <FileUploader
                                currentUrl={config.result_icon_url}
                                onUpload={(f) => handleUpload(f, 'result_icon_url', `branding/${Date.now()}_${f.name}`)}
                                onClear={() => onUpdateConfig('result_icon_url', '')}
                                isUploading={uploadingFields['result_icon_url']}
                                renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                            />
                            {!config.result_icon_url && <span className="absolute pointer-events-none text-3xl">🎁</span>}
                        </div>
                        <div className="space-y-3">
                            <label className="px-6 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                Upload Icon
                                <FileUploader
                                    children={<span className="hidden" />}
                                    isUploading={uploadingFields['result_icon_url']}
                                    onUpload={(f) => handleUpload(f, 'result_icon_url', `branding/${Date.now()}_${f.name}`)}
                                />
                            </label>
                            <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-loose">Shown in result popup<br />Default: 🎁 emoji</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

