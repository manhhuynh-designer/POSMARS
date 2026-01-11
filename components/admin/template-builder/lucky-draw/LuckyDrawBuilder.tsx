import { useState } from 'react'
import { Activity, Layers, ImageIcon, Settings, Sparkles } from 'lucide-react'
import { TemplateConfigBuilderProps, LuckyDrawConfig, Prize } from '../types'
import PrizeList from './PrizeList'
import LuckyDrawBranding from './LuckyDrawBranding'
import LuckyDrawPreview from './LuckyDrawPreview'

export default function LuckyDrawBuilder({ initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {
    const [activeTab, setActiveTab] = useState<'prizes' | 'branding' | 'rules'>('prizes') // Default tab

    // Helper to update config
    const updateConfig = (key: string, value: any) => {
        const newConfig = { ...initialConfig, [key]: value }
        onChange(newConfig)
    }

    const config = initialConfig as LuckyDrawConfig
    const prizes = config.prizes || []

    // Prize Actions
    const addPrize = () => {
        const newPrize: Prize = {
            id: Date.now().toString(),
            name: 'Giải thưởng mới',
            probability: 10,
            color: '#FF6B00'
        }
        updateConfig('prizes', [...prizes, newPrize])
    }

    const updatePrize = (index: number, updates: Partial<Prize>) => {
        const newPrizes = [...prizes]
        newPrizes[index] = { ...newPrizes[index], ...updates }
        updateConfig('prizes', newPrizes)
    }

    const removePrize = (index: number) => {
        const newPrizes = [...prizes]
        newPrizes.splice(index, 1)
        updateConfig('prizes', newPrizes)
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500 max-w-none">
            {/* Left Column: Navigation / Hierarchy (1/4) */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Lucky Draw</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Campaign Kit</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 px-2">Studio Modules</p>
                        {[
                            { id: 'prizes', icon: <Layers size={16} />, label: 'Prize Tiers', sub: 'Manage win rates' },
                            { id: 'branding', icon: <ImageIcon size={16} />, label: 'Aesthetics', sub: 'Visual identity' },
                            { id: 'rules', icon: <Settings size={16} />, label: 'Game Logic', sub: 'Legal & behavior' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-start gap-4 px-6 py-5 rounded-[1.5rem] text-left transition-all border border-transparent group ${activeTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-[0_15px_30px_rgba(249,115,22,0.2)]'
                                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white'}`}
                            >
                                <div className={`p-2.5 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                    {tab.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${activeTab === tab.id ? 'text-white/60' : 'text-white/20'}`}>{tab.sub}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Column: Asset Control (2/4) */}
            <div className="lg:col-span-2 space-y-8">
                {/* Content Section */}
                <div className="animate-in slide-in-from-right-4 duration-500">
                    {activeTab === 'prizes' && (
                        <PrizeList
                            prizes={prizes}
                            onUpdatePrize={updatePrize}
                            onRemovePrize={removePrize}
                            onAddPrize={addPrize}
                            onUpload={onUpload}
                        />
                    )}

                    {activeTab === 'branding' && (
                        <LuckyDrawBranding
                            config={config}
                            onUpdateConfig={updateConfig}
                            onUpload={onUpload}
                        />
                    )}

                    {activeTab === 'rules' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Game Rules & Terms</h4>
                                </div>
                                <div className="space-y-6">
                                    <div className="relative">
                                        <textarea
                                            value={config.rules_text || ''}
                                            onChange={e => updateConfig('rules_text', e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 p-8 rounded-[2.5rem] text-sm text-white font-mono leading-relaxed outline-none focus:border-orange-500/30 transition-all shadow-inner min-h-[500px]"
                                            placeholder="Enter campaign terms and conditions..."
                                        />
                                        <div className="absolute top-6 right-6 px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
                                            Rich Text HTML
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                <Sparkles size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">PRO TIP</p>
                                                <p className="text-[11px] text-blue-400/60 leading-relaxed italic">Use &lt;b&gt; tags to highlight prize names and dates for better readability.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Phone Preview (1/4) */}
            <div className="lg:col-span-1 w-full flex-shrink-0">
                <div className="lg:sticky lg:top-8 space-y-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        <div className="space-y-1 text-center">
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center justify-center gap-2">
                                Output Sim
                            </h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Real-time Spin Experience</p>
                        </div>

                        <LuckyDrawPreview config={config} />

                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex items-center gap-5 group hover:border-orange-500/30 transition-all cursor-default">
                            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 shadow-inner">
                                <Sparkles size={24} className="group-hover:animate-spin transition-all" />
                            </div>
                            <div>
                                <h5 className="text-[12px] font-black uppercase text-white tracking-widest">Campaign Ready</h5>
                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1">{prizes.length} Prizetiers Live</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
