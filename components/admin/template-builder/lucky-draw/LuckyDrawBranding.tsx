import { ImageIcon, Trash2, Upload } from 'lucide-react'
import { LuckyDrawConfig } from '../types'
import FileUploader from '../shared/FileUploader'

interface LuckyDrawBrandingProps {
    config: LuckyDrawConfig
    onUpdateConfig: (key: string, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function LuckyDrawBranding({ config, onUpdateConfig, onUpload }: LuckyDrawBrandingProps) {
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
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.logo_url && <ImageIcon size={32} className="absolute inset-0 m-auto text-white/5" />}
                                </div>
                                <div className="space-y-3">
                                    <label className="px-6 py-3 bg-white/5 hover:bg-orange-500 text-white rounded-2xl cursor-pointer transition-all shadow-xl font-black uppercase text-[10px] tracking-widest inline-block active:scale-95">
                                        Upload Logo
                                        <FileUploader
                                            children={<span className="hidden" />} // Hidden input
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
                                    renderPreview={(url) => <img src={url} className="w-full h-full object-cover" />}
                                    label="Drop banner here or click to upload"
                                />
                            </div>
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
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.spin_btn_url && <span className="absolute pointer-events-none text-xs font-black text-orange-500 uppercase tracking-tighter">SPIN</span>}
                                </div>
                                <label className="px-8 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                    Change Button Asset
                                    <FileUploader
                                        children={<span className="hidden" />}
                                        onUpload={(f) => handleUpload(f, 'spin_btn_url', `branding/${Date.now()}_${f.name}`)}
                                    />
                                </label>
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
                                        renderPreview={(url) => <img src={url} className="w-full h-full object-contain" />}
                                    />
                                    {!config.pointer_url && <span className="absolute pointer-events-none text-3xl text-orange-500 transition-transform group-hover:scale-125">▼</span>}
                                </div>
                                <div className="space-y-3">
                                    <label className="px-6 py-3 bg-[#121212] border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-xl inline-block active:scale-95">
                                        Replace Pointer
                                        <FileUploader
                                            children={<span className="hidden" />}
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
        </div>
    )
}
