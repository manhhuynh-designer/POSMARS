'use client'

import { useState, useEffect } from 'react'
import { Activity, Layers, ImageIcon, Settings, Sparkles } from 'lucide-react'
import { TemplateConfigBuilderProps, NewTemplateConfig } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import PreviewPhone from '../shared/PreviewPhone'

export default function NewTemplateBuilder({
    initialConfig,
    onChange,
    onUpload
}: TemplateConfigBuilderProps) {

    const [activeTab, setActiveTab] = useState<'content' | 'branding' | 'settings'>('content')

    const config = initialConfig as NewTemplateConfig

    // Helper to update config
    const updateConfig = (key: string, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }

    // ========== TAB DATA ==========
    const tabs = [
        { id: 'content', icon: <Layers size={16} />, label: 'Content', sub: 'Main content' },
        { id: 'branding', icon: <ImageIcon size={16} />, label: 'Branding', sub: 'Visual identity' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Settings', sub: 'Behavior' },
    ]

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500">

            {/* ========== LEFT SIDEBAR (1/4) ========== */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">

                    {/* Header */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Template Name</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Builder Kit</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 px-2">Modules</p>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-start gap-4 px-6 py-5 rounded-[1.5rem] text-left transition-all border border-transparent group ${activeTab === tab.id
                                        ? 'bg-orange-500 text-white shadow-[0_15px_30px_rgba(249,115,22,0.2)]'
                                        : 'text-white/40 hover:bg-white/[0.03] hover:text-white'
                                    }`}
                            >
                                <div className={`p-2.5 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'
                                    }`}>
                                    {tab.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${activeTab === tab.id ? 'text-white/60' : 'text-white/20'
                                        }`}>{tab.sub}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT (2/4) ========== */}
            <div className="lg:col-span-2 space-y-8">
                <div className="animate-in slide-in-from-right-4 duration-500">

                    {activeTab === 'content' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Section Header */}
                            <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Content Settings</h4>
                            </div>

                            {/* Form fields here */}
                            <div className="space-y-6">
                                {/* Example input */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Title</label>
                                    <input
                                        type="text"
                                        value={config.title || ''}
                                        onChange={e => updateConfig('title', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                        placeholder="Enter title..."
                                    />
                                </div>

                                {/* Example file upload */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Background</label>
                                    <FileUploader
                                        accept="image/*"
                                        currentUrl={config.bg_url}
                                        onUpload={async (file) => {
                                            const url = await onUpload(file, 'new-template/bg')
                                            updateConfig('bg_url', url)
                                            return url
                                        }}
                                        onClear={() => updateConfig('bg_url', undefined)}
                                        className="w-full h-40 border border-dashed border-white/10 rounded-2xl"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'branding' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Branding content */}
                        </section>
                    )}

                    {activeTab === 'settings' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Settings content */}
                        </section>
                    )}
                </div>
            </div>

            {/* ========== RIGHT PREVIEW (1/4) ========== */}
            <div className="lg:col-span-1 w-full flex-shrink-0">
                <div className="lg:sticky lg:top-8 space-y-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        <div className="space-y-1 text-center">
                            <h3 className="font-black text-xl text-white uppercase tracking-tighter">Preview</h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Real-time Preview</p>
                        </div>

                        <PreviewPhone>
                            {/* Preview content */}
                            <div className="flex-1 flex items-center justify-center text-white/40">
                                Preview here
                            </div>
                        </PreviewPhone>
                    </div>
                </div>
            </div>
        </div>
    )
}
