'use client'

import { useState } from 'react'
import { Building, Layers, ImageIcon, Settings, Play } from 'lucide-react'
import { TemplateConfigBuilderProps, ArchitecturalTrackingConfig, OverlayModel } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'
import PreviewPhone from '../shared/PreviewPhone'
import ModelPanel from './ModelPanel'
import WebARRocksObjectPreview from '../../WebARRocksObjectPreview'
import StudioPreview from '../../StudioPreview'
import { ARAsset } from '../types'
import ObjectTrainingWizard from './ObjectTrainingWizard'

/**
 * Architectural Tracking Builder
 * Admin interface for configuring WebAR.rocks Object tracking templates
 */
export default function ArchitecturalTrackingBuilder({
    initialConfig,
    onChange,
    onUpload
}: TemplateConfigBuilderProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'branding' | 'settings'>('content')
    const [selectedModelIndex, setSelectedModelIndex] = useState(0)
    const [showPreview, setShowPreview] = useState(false)
    const [previewMode, setPreviewMode] = useState<'ar' | 'studio'>('ar')
    const [debugMode, setDebugMode] = useState(false)
    const [playbackState, setPlaybackState] = useState({
        isPlaying: true,
        currentTime: 0,
        startTimestamp: Date.now()
    })
    const [showTrainingWizard, setShowTrainingWizard] = useState(false)

    const config = initialConfig as ArchitecturalTrackingConfig

    const updateConfig = (key: keyof ArchitecturalTrackingConfig, value: any) => {
        onChange({ ...initialConfig, [key]: value })
    }

    const addOverlayModel = () => {
        const newModel: OverlayModel = {
            id: `model-${Date.now()}`,
            name: `Model ${(config.overlay_models?.length || 0) + 1}`,
            url: '',
            scale: 1.0,
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        }

        const models = [...(config.overlay_models || []), newModel]
        updateConfig('overlay_models', models)
        setSelectedModelIndex(models.length - 1)
    }

    const updateOverlayModel = (index: number, updates: Partial<OverlayModel>) => {
        const models = [...(config.overlay_models || [])]
        models[index] = { ...models[index], ...updates }
        updateConfig('overlay_models', models)
    }

    const removeOverlayModel = (index: number) => {
        const models = config.overlay_models?.filter((_, i) => i !== index) || []
        updateConfig('overlay_models', models)
        if (selectedModelIndex >= models.length) {
            setSelectedModelIndex(Math.max(0, models.length - 1))
        }
    }

    const tabs = [
        { id: 'content', icon: <Layers size={16} />, label: 'Content', sub: 'Models & Objects' },
        { id: 'branding', icon: <ImageIcon size={16} />, label: 'Branding', sub: 'Visual identity' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Settings', sub: 'Capture & Options' },
    ]

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500">

            {/* LEFT SIDEBAR */}
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 h-fit lg:sticky lg:top-8">

                    {/* Header */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                            <Building size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Architectural</h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">Object Tracking</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 px-2">Modules</p>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                data-testid={`tab-${tab.id}`}
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

            {/* MAIN CONTENT */}
            <div className="lg:col-span-2 space-y-8">
                <div className="animate-in slide-in-from-right-4 duration-500">

                    {activeTab === 'content' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            {/* Section Header */}
                            <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Content Settings</h4>
                            </div>

                            <div className="space-y-8">
                                {/* Object Model Upload */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                        NN Object Model (.zip)
                                    </label>
                                    <FileUploader
                                        accept=".zip"
                                        currentUrl={config.object_model_url}
                                        onUpload={async (file) => {
                                            const url = await onUpload(file, `architectural-tracking/models/${Date.now()}_${file.name}`)
                                            updateConfig('object_model_url', url)
                                            return url
                                        }}
                                        onClear={() => updateConfig('object_model_url', undefined)}
                                        helperText="WebAR.rocks trained object model (ZIP)"
                                        className="w-full h-32 border border-dashed border-white/10 rounded-2xl"
                                    />
                                    <p className="text-[9px] text-white/30 mt-2">
                                        Upload your trained Neural Network model for object recognition
                                    </p>

                                    <div className="mt-4 flex items-center gap-4">
                                        <div className="h-[1px] flex-1 bg-white/5"></div>
                                        <span className="text-[9px] font-bold text-white/20 uppercase">OR</span>
                                        <div className="h-[1px] flex-1 bg-white/5"></div>
                                    </div>

                                    <button
                                        onClick={() => setShowTrainingWizard(true)}
                                        className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Building size={14} />
                                        Train New Object Model
                                    </button>
                                </div>

                                {/* Training Wizard */}
                                <ObjectTrainingWizard
                                    isOpen={showTrainingWizard}
                                    onClose={() => setShowTrainingWizard(false)}
                                    onComplete={(url) => {
                                        updateConfig('object_model_url', url)
                                        setShowTrainingWizard(false)
                                    }}
                                />

                                {/* Overlay Models */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                            Overlay 3D Models
                                        </label>
                                        <button
                                            onClick={addOverlayModel}
                                            className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[10px] font-black text-orange-500 uppercase tracking-widest hover:bg-orange-500/20 transition-all"
                                        >
                                            + Add Model
                                        </button>
                                    </div>

                                    {config.overlay_models && config.overlay_models.length > 0 ? (
                                        <ModelPanel
                                            models={config.overlay_models}
                                            selectedIndex={selectedModelIndex}
                                            onSelect={setSelectedModelIndex}
                                            onUpdate={updateOverlayModel}
                                            onRemove={removeOverlayModel}
                                            onUpload={onUpload}
                                        />
                                    ) : (
                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                                            <p className="text-white/40 text-sm">No overlay models yet</p>
                                            <p className="text-white/20 text-xs mt-1">Click "Add Model" to get started</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'branding' && (
                        <section className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-8">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">Branding</h4>
                            </div>

                            <div className="space-y-6">
                                {/* Logo */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">Logo</label>
                                    <FileUploader
                                        accept="image/*"
                                        currentUrl={config.logo_url}
                                        onUpload={async (file) => {
                                            const url = await onUpload(file, 'architectural-tracking/branding/logo')
                                            updateConfig('logo_url', url)
                                            return url
                                        }}
                                        onClear={() => updateConfig('logo_url', undefined)}
                                        renderPreview={(url) => (
                                            <img src={url} className="w-full h-32 object-contain rounded-2xl" alt="Logo" />
                                        )}
                                    />
                                </div>

                                {/* Instructions */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                        Scan Instructions
                                    </label>
                                    <input
                                        type="text"
                                        value={config.instructions || ''}
                                        onChange={e => updateConfig('instructions', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                        placeholder="e.g., 'Scan the building'"
                                    />
                                </div>

                                {/* Capture Button Color */}
                                <div>
                                    <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                        Capture Button Color
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <ColorPicker
                                            value={config.capture_btn_color || '#ec4899'}
                                            onChange={(color) => updateConfig('capture_btn_color', color)}
                                            size={12}
                                        />
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
                                {/* Enable Capture */}
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                        Enable Capture
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={config.enable_capture !== false}
                                        onChange={e => updateConfig('enable_capture', e.target.checked)}
                                        className="w-5 h-5 accent-orange-500"
                                    />
                                </div>

                                {/* Enable Record */}
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                        Enable Video Recording
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={config.enable_record !== false}
                                        onChange={e => updateConfig('enable_record', e.target.checked)}
                                        className="w-5 h-5 accent-orange-500"
                                    />
                                </div>

                                {/* Max Video Duration */}
                                {config.enable_record !== false && (
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                                            Max Video Duration (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={config.max_video_duration || 30}
                                            onChange={e => updateConfig('max_video_duration', parseInt(e.target.value))}
                                            min={5}
                                            max={60}
                                            className="w-full bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500/30 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* RIGHT PREVIEW */}
            <div className="lg:col-span-1 w-full flex-shrink-0">
                <div className="lg:sticky lg:top-8 space-y-8">
                    <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                        <div className="flex items-center justify-between mb-2 px-2">
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
                                            <WebARRocksObjectPreview
                                                config={config}
                                                onClose={() => setShowPreview(false)}
                                            />
                                        ) : (
                                            <StudioPreview
                                                assets={(config.overlay_models || []).map(m => ({
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
