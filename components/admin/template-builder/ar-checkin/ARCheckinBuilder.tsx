import { Camera, Sparkles } from 'lucide-react'
import { TemplateConfigBuilderProps, ARCheckinConfig } from '../types'
import FrameConfig from './FrameConfig'
import ARCheckinPreview from './ARCheckinPreview'

export default function ARCheckinBuilder({ initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {
    const config = initialConfig as ARCheckinConfig

    const updateConfig = (key: string, value: any) => {
        onChange({ ...config, [key]: value })
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500 max-w-none">
            {/* Left Column: Focus / Hierarchy (1/4) */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 lg:sticky lg:top-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#be123c] flex items-center justify-center text-white shadow-xl shadow-rose-900/20">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Check-in</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Event Identity</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Active Scene</p>
                        <div className="bg-rose-500 text-white p-6 rounded-[1.5rem] shadow-[0_15px_30px_rgba(236,72,153,0.2)] flex items-center gap-4 border border-white/10">
                            <div className="p-2.5 bg-white/20 rounded-xl">
                                <Sparkles size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-widest">Main Frame</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">Overlay Layer</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                        <p className="text-[9px] text-white/40 leading-relaxed font-medium">Design your custom photo frames and social overlays. Ensure your branding is clear and doesn't obstruct the user's face.</p>
                    </div>
                </div>
            </div>

            {/* Middle Column: Asset Control (2/4) */}
            <div className="lg:col-span-2 space-y-8">
                <div className="animate-in slide-in-from-right-4 duration-500">
                    <FrameConfig
                        config={config}
                        onUpdateConfig={updateConfig}
                        onUpload={onUpload}
                    />
                </div>
            </div>

            {/* Right Column: Phone Preview (1/4) */}
            <div className="lg:col-span-1 w-full flex-shrink-0">
                <div className="lg:sticky lg:top-8 space-y-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        <div className="space-y-1 text-center">
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center justify-center gap-2">
                                Output Studio
                            </h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Simulated Capture View</p>
                        </div>

                        <ARCheckinPreview config={config} />

                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center gap-4 group hover:border-rose-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 shadow-inner">
                                <Sparkles size={20} className="group-hover:animate-spin transition-all" />
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black uppercase text-white tracking-widest">Social Ready</h5>
                                <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] mt-0.5">Optimized for Real-time Sharing</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
