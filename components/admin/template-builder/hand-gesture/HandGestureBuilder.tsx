'use client'

import { useState } from 'react'
import { Hand, Layers, ImageIcon, Settings, Play, Plus, Trash2 } from 'lucide-react'
import { TemplateConfigBuilderProps, HandGestureConfig, GestureModel } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import PreviewPhone from '../shared/PreviewPhone'
import HandGesturePreview from '../../HandGesturePreview'
import StudioPreview from '../../StudioPreview'
import { ARAsset } from '../types'

export default function HandGestureBuilder({
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

    const config = initialConfig as HandGestureConfig

    const updateConfig = (key: keyof HandGestureConfig, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }

    const addGestureModel = () => {
        const newModel: GestureModel = {
            id: `gesture-${Date.now()}`,
            name: `Gesture ${(config.gesture_models?.length || 0) + 1}`,
            gesture: 'open',
            url: '',
            scale: 1.0,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        }

        const models = [...(config.gesture_models || []), newModel]
        updateConfig('gesture_models', models)
        setSelectedIndex(models.length - 1)
    }

    const updateGestureModel = (index: number, updates: Partial<GestureModel>) => {
        const models = [...(config.gesture_models || [])]
        models[index] = { ...models[index], ...updates }
        updateConfig('gesture_models', models)
    }

    const removeGestureModel = (index: number) => {
        const models = config.gesture_models?.filter((_, i) => i !== index) || []
        updateConfig('gesture_models', models)
        if (selectedIndex >= models.length) {
            setSelectedIndex(Math.max(0, models.length - 1))
        }
    }

    const tabs = [
        { id: 'content', icon: <Layers size={16} />, label: 'Content', sub: 'Gesture Models' },
        { id: 'branding', icon: <ImageIcon size={16} />, label: 'Branding', sub: 'Visuals' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Settings', sub: 'Options' },
    ]

    const selectedModel = config.gesture_models?.[selectedIndex]

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)]">
            {/* LEFT SIDEBAR */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white">
                            <Hand size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Hand Gesture</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Interaction AR</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                data-testid={`tab-${tab.id}`}
                                className={`flex items-start gap-4 px-6 py-5 rounded-[1.5rem] text-left transition-all ${activeTab === tab.id
                                    ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20'
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
                    <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Interactions</h4>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Map Gestures</label>
                            <button onClick={addGestureModel} className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-[10px] font-black text-pink-500 uppercase tracking-widest hover:bg-pink-500/20">
                                <Plus size={14} /> Add Pattern
                            </button>
                        </div>

                        {config.gesture_models && config.gesture_models.length > 0 && selectedModel ? (
                            <div className="space-y-6">
                                <div className="flex gap-2 flex-wrap pb-4 border-b border-white/5">
                                    {config.gesture_models.map((model, i) => (
                                        <button key={model.id} onClick={() => setSelectedIndex(i)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedIndex === i ? 'bg-pink-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                            {model.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2rem]">
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Pattern Name</label>
                                        <input type="text" value={selectedModel.name} onChange={e => updateGestureModel(selectedIndex, { name: e.target.value })} className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-pink-500/30" />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Trigger Gesture</label>
                                        <select value={selectedModel.gesture} onChange={e => updateGestureModel(selectedIndex, { gesture: e.target.value as any })} className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-pink-500/30">
                                            <option value="open">Open Hand</option>
                                            <option value="closed">Closed Fist</option>
                                            <option value="point">Pointing Finger</option>
                                            <option value="peace">Peace Sign</option>
                                            <option value="thumbs_up">Thumbs Up</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Attached GLB</label>
                                        <FileUploader accept=".glb,.gltf" currentUrl={selectedModel.url} onUpload={async (file) => {
                                            const url = await onUpload(file, `hand-gesture/${Date.now()}_${file.name}`)
                                            updateGestureModel(selectedIndex, { url })
                                            return url
                                        }} onClear={() => updateGestureModel(selectedIndex, { url: '' })} helperText="Attached model per gesture" className="w-full h-32 border-2 border-dashed border-white/5 rounded-2xl" />
                                    </div>

                                    <div className="pt-4">
                                        <button onClick={() => removeGestureModel(selectedIndex)} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/20 transition-all">
                                            <Trash2 size={14} /> Remove Pattern
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[2rem] text-center">
                                <Hand size={48} className="text-white/10 mx-auto mb-4" />
                                <p className="text-white/40 text-sm font-medium">No gestures mapped yet</p>
                                <p className="text-white/20 text-xs mt-1 uppercase tracking-widest">Connect hand gestures to 3D models</p>
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
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Overlay Logo</label>
                                <FileUploader accept="image/*" currentUrl={config.logo_url} onUpload={async (file) => {
                                    const url = await onUpload(file, 'hand-gesture/logo')
                                    updateConfig('logo_url', url)
                                    return url
                                }} onClear={() => updateConfig('logo_url', undefined)} renderPreview={(url) => <img src={url} className="w-full h-32 object-contain rounded-2xl" alt="Logo" />} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Help Instructions</label>
                                <input type="text" value={config.instructions || ''} onChange={e => updateConfig('instructions', e.target.value)} className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30" placeholder="e.g., 'Show peace sign to reveal content'" />
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'settings' && (
                    <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Logic Settings</h4>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Recognition Sensitivity</label>
                                <input type="range" min="0.1" max="1.0" step="0.1" value={config.gesture_sensitivity || 0.7} onChange={e => updateConfig('gesture_sensitivity', parseFloat(e.target.value))} className="w-full accent-orange-500 bg-white/5 h-2 rounded-full appearance-none cursor-pointer" />
                                <div className="flex justify-between mt-2 font-mono text-[8px] text-white/20 uppercase tracking-tighter">
                                    <span>Fast</span>
                                    <span>Accurate ({config.gesture_sensitivity || 0.7})</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Enable Photo Mode</label>
                                <input type="checkbox" checked={config.enable_capture !== false} onChange={e => updateConfig('enable_capture', e.target.checked)} className="w-5 h-5 accent-orange-500" />
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
                                <h3 className="font-black text-xl text-white uppercase tracking-tighter leading-tight flex items-center gap-2">
                                    Mô phỏng AR
                                </h3>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Live Preview</p>
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
                                            <HandGesturePreview
                                                config={config}
                                                onClose={() => setShowPreview(false)}
                                            />
                                        ) : (
                                            <StudioPreview
                                                assets={(config.gesture_models || []).map(m => ({
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
                                        className="absolute inset-0 flex flex-col items-center justify-center text-white/60 cursor-pointer group bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1),transparent)] hover:bg-black/80 transition-all duration-700"
                                    >
                                        <div className="w-24 h-24 bg-white/5 shadow-2xl shadow-orange-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-orange-600 transition-all duration-500 transform border border-white/10">
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
