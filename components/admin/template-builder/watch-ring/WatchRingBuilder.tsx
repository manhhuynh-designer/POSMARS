'use client'

import { useState } from 'react'
import { Watch, Layers, ImageIcon, Settings, Play } from 'lucide-react'
import { TemplateConfigBuilderProps, WatchRingConfig, AccessoryModel } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import PreviewPhone from '../shared/PreviewPhone'
import WebARRocksHandPreview from '../../WebARRocksHandPreview'
import StudioPreview from '../../StudioPreview'
import { ARAsset } from '../types'

export default function WatchRingBuilder({
    initialConfig,
    onChange,
    onUpload
}: TemplateConfigBuilderProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'branding' | 'settings'>('content')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [previewMode, setPreviewMode] = useState<'ar' | 'studio'>('ar')
    const [debugMode, setDebugMode] = useState(false)
    const [playbackState, setPlaybackState] = useState({
        isPlaying: true,
        currentTime: 0,
        startTimestamp: Date.now()
    })

    const config = initialConfig as WatchRingConfig

    const updateConfig = (key: keyof WatchRingConfig, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }

    const addAccessory = () => {
        const newAccessory: AccessoryModel = {
            id: `accessory-${Date.now()}`,
            name: `Accessory ${(config.accessory_models?.length || 0) + 1}`,
            type: 'watch',
            url: '',
            scale: 1.0,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        }

        const models = [...(config.accessory_models || []), newAccessory]
        updateConfig('accessory_models', models)
        setSelectedIndex(models.length - 1)
    }

    const updateAccessory = (index: number, updates: Partial<AccessoryModel>) => {
        const models = [...(config.accessory_models || [])]
        models[index] = { ...models[index], ...updates }
        updateConfig('accessory_models', models)
    }

    const removeAccessory = (index: number) => {
        const models = config.accessory_models?.filter((_, i) => i !== index) || []
        updateConfig('accessory_models', models)
        if (selectedIndex >= models.length) {
            setSelectedIndex(Math.max(0, models.length - 1))
        }
    }

    const tabs = [
        { id: 'content', icon: <Layers size={16} />, label: 'Content', sub: 'Accessories' },
        { id: 'branding', icon: <ImageIcon size={16} />, label: 'Branding', sub: 'Visual' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Settings', sub: 'Options' },
    ]

    const selectedModel = config.accessory_models?.[selectedIndex]

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)]">
            {/* LEFT SIDEBAR */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white">
                            <Watch size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Watch & Ring</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Virtual Try-on</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 px-2">Modules</p>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                data-testid={`tab-${tab.id}`}
                                className={`flex items-start gap-4 px-6 py-5 rounded-[1.5rem] text-left transition-all ${activeTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-[0_15px_30px_rgba(249,115,22,0.2)]'
                                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white'
                                    }`}
                            >
                                <div className={`p-2.5 rounded-xl ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>
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

            {/* MAIN CONTENT */}
            <div className="lg:col-span-2 space-y-8">
                {activeTab === 'content' && (
                    <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Accessories</h4>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Models</label>
                            <button onClick={addAccessory} className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[10px] font-black text-orange-500 uppercase tracking-widest hover:bg-orange-500/20">
                                + Add
                            </button>
                        </div>

                        {config.accessory_models && config.accessory_models.length > 0 && selectedModel ? (
                            <div className="space-y-6">
                                <div className="flex gap-2 flex-wrap">
                                    {config.accessory_models.map((model, i) => (
                                        <button key={model.id} onClick={() => setSelectedIndex(i)} className={`px-4 py-2 rounded-xl text-xs font-bold ${selectedIndex === i ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                            {model.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Name</label>
                                        <input type="text" value={selectedModel.name} onChange={e => updateAccessory(selectedIndex, { name: e.target.value })} className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30" />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Type</label>
                                        <select value={selectedModel.type} onChange={e => updateAccessory(selectedIndex, { type: e.target.value as any })} className="w-full bg-black/40 border border-white/5 px-4 py-3 rounded-xl text-sm text-white outline-none focus:border-orange-500/30">
                                            <option value="watch">Watch</option>
                                            <option value="ring">Ring</option>
                                            <option value="bracelet">Bracelet</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">3D Model</label>
                                        <FileUploader accept=".glb,.gltf" currentUrl={selectedModel.url} onUpload={async (file) => {
                                            const url = await onUpload(file, `watch-ring/${Date.now()}_${file.name}`)
                                            updateAccessory(selectedIndex, { url })
                                            return url
                                        }} onClear={() => updateAccessory(selectedIndex, { url: '' })} helperText="GLB or GLTF" className="w-full h-24 border border-dashed border-white/10 rounded-xl" />
                                    </div>

                                    <button onClick={() => removeAccessory(selectedIndex)} className="w-full px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/20">Remove</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                                <p className="text-white/40 text-sm">No accessories yet</p>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'branding' && (
                    <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Branding</h4>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Logo</label>
                                <FileUploader accept="image/*" currentUrl={config.logo_url} onUpload={async (file) => {
                                    const url = await onUpload(file, 'watch-ring/logo')
                                    updateConfig('logo_url', url)
                                    return url
                                }} onClear={() => updateConfig('logo_url', undefined)} renderPreview={(url) => <img src={url} className="w-full h-32 object-contain rounded-2xl" alt="Logo" />} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Instructions</label>
                                <input type="text" value={config.instructions || ''} onChange={e => updateConfig('instructions', e.target.value)} className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30" placeholder="Show your hand..." />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Button Color</label>
                                <div className="flex items-center gap-4">
                                    <ColorPicker value={config.capture_btn_color || '#ec4899'} onChange={(color) => updateConfig('capture_btn_color', color)} size={12} />
                                    <span className="text-white/60 text-sm">{config.capture_btn_color || '#ec4899'}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'settings' && (
                    <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Settings</h4>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Hand Preference</label>
                                <select value={config.hand_preference || 'both'} onChange={e => updateConfig('hand_preference', e.target.value)} className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30">
                                    <option value="left">Left Hand</option>
                                    <option value="right">Right Hand</option>
                                    <option value="both">Both Hands</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Enable Capture</label>
                                <input type="checkbox" checked={config.enable_capture !== false} onChange={e => updateConfig('enable_capture', e.target.checked)} className="w-5 h-5 accent-orange-500" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Enable Recording</label>
                                <input type="checkbox" checked={config.enable_record !== false} onChange={e => updateConfig('enable_record', e.target.checked)} className="w-5 h-5 accent-orange-500" />
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* RIGHT PREVIEW */}
            <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center gap-2">
                                    Mô phỏng AR
                                </h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Real-time Simulation</p>
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                                <button
                                    onClick={() => setPreviewMode('ar')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${previewMode === 'ar' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white uppercase'}`}
                                >
                                    AR VIEW
                                </button>
                                <button
                                    onClick={() => setPreviewMode('studio')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${previewMode === 'studio' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white uppercase'}`}
                                >
                                    STUDIO
                                </button>
                                <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                <button
                                    onClick={() => setDebugMode(!debugMode)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debugMode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white uppercase'}`}
                                >
                                    DEBUG
                                </button>
                            </div>
                        </div>

                        <PreviewPhone>
                            <div className="absolute inset-0 bg-black">
                                {showPreview ? (
                                    <div className="w-full h-full relative">
                                        {previewMode === 'ar' ? (
                                            <WebARRocksHandPreview
                                                config={config}
                                                onClose={() => setShowPreview(false)}
                                            />
                                        ) : (
                                            <StudioPreview
                                                assets={(config.accessory_models || []).map(m => ({
                                                    ...m,
                                                    type: '3d'
                                                })) as ARAsset[]}
                                                onClose={() => setShowPreview(false)}
                                                playbackState={playbackState}
                                                onPlaybackChange={setPlaybackState}
                                                debugMode={debugMode}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setShowPreview(true)}
                                        data-testid="start-simulation"
                                        className="absolute inset-0 flex flex-col items-center justify-center text-white/60 cursor-pointer group bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.05),transparent)] hover:bg-black/80 transition-all duration-700"
                                    >
                                        <div className="w-24 h-24 bg-white/5 shadow-2xl shadow-orange-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-orange-500 transition-all duration-500 transform border border-white/10">
                                            <Play size={40} className="text-orange-500 group-hover:text-white transition-colors fill-current ml-2" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h4 className="text-lg font-black text-white px-8 leading-tight tracking-tight uppercase">Bắt đầu mô phỏng AR</h4>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] group-hover:text-orange-500 transition-all duration-300">Cần quyền truy cập Camera</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </PreviewPhone>
                    </div>
                </div>
            </div>
        </div>
    )
}
