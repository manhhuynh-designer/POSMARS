'use client'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
    Plus, Trash2, GripVertical, Upload, Image as ImageIcon, Eye,
    Settings, Layers, Video, Box, Activity, ChevronRight, HelpCircle,
    RefreshCw, Play, SkipForward, Sun, Maximize, Smartphone,
    Camera, Check, Sparkles, Loader2
} from 'lucide-react'

// Dynamic imports for Previews (camera only loaded when needed)
const FaceFilterPreview = lazy(() => import('./FaceFilterPreview'))
const ImageTrackingPreview = lazy(() => import('./ImageTrackingPreview'))

// Lucky Draw Types
export interface Prize {
    id: string
    name: string
    image?: string // URL
    probability: number // 0-100
    color: string
}

export interface LuckyDrawConfig {
    banner_url?: string // KV
    wheel_bg_url?: string // Custom wheel shape
    prizes: Prize[]
}

// AR Check-in Types
export interface ARCheckinConfig {
    frame_url?: string
    instructions?: string
}

// Image Tracking Types
export interface AnimationStep {
    id: string
    property: 'position' | 'rotation' | 'scale'
    to: string // VD: "0 1 0" cho position hoặc "1.5" cho scale
    duration: number
    easing: string
}

export interface ARAsset {
    id: string
    name: string
    type: '3d' | 'video'
    url: string
    scale: number
    position: [number, number, number]
    rotation: [number, number, number]
    // Video settings
    video_width?: number
    video_height?: number
    video_autoplay?: boolean
    video_loop?: boolean
    video_muted?: boolean
    // 3D Animation settings
    animation_mode?: 'auto' | 'loop_clips' | 'tap_to_play'
    enable_tap_animation?: boolean
    // Sequential Animation
    steps?: AnimationStep[]
    loop_animation?: boolean
}

export interface ImageTrackingConfig {
    assets: ARAsset[]
    marker_url?: string // NEW: .mind file URL
    enable_capture?: boolean
    show_scan_hint?: boolean

    // Lighting & Env (Global)
    ambient_intensity?: number
    directional_intensity?: number
    environment_url?: string
    exposure?: number
    tone_mapping?: 'no' | 'acesfilmic' | 'linear' | 'reinhard'

    // Capture Settings
    max_video_duration?: number
    capture_quality?: number

    // Legacy support (to be migrated)
    model_scale?: number
    model_position?: [number, number, number]
    model_rotation?: [number, number, number]
}

interface TemplateConfigBuilderProps {
    template: string
    initialConfig: any
    onChange: (config: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function TemplateConfigBuilder({ template, initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {
    const [config, setConfig] = useState<any>(initialConfig)
    const [uploading, setUploading] = useState(false)

    // UI State for premium templates
    const [activeTab, setActiveTab] = useState<string>('content')
    const [showPreview, setShowPreview] = useState(false)
    const [debugMode, setDebugMode] = useState(true)
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

    useEffect(() => {
        onChange(config)
    }, [config])

    // Migration Effect for Image Tracking
    useEffect(() => {
        if (template === 'image_tracking' && !config.assets) {
            if (config.model_scale || config.model_position || config.model_rotation) {
                const legacyAsset: ARAsset = {
                    id: 'legacy-1',
                    name: '3D Model',
                    type: '3d',
                    url: '',
                    scale: config.model_scale || 1,
                    position: config.model_position || [0, 0, 0],
                    rotation: config.model_rotation || [0, 0, 0],
                    animation_mode: 'auto'
                }
                setConfig({ ...config, assets: [legacyAsset] })
                setSelectedAssetId('legacy-1')
            } else {
                setConfig({ ...config, assets: [] })
            }
        }
    }, [template])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, subPath: string = 'assets') => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const url = await onUpload(file, `${subPath}/${Date.now()}_${file.name}`)
            if (key !== 'temp_url' && key !== 'temp') {
                setConfig({ ...config, [key]: url })
            }
            setUploading(false)
            return url
        } catch (error) {
            console.error(error)
            setUploading(false)
            alert('Upload thất bại')
            return null
        }
    }

    // Lucky Draw: Add Prize
    const addPrize = () => {
        const newPrize: Prize = {
            id: Date.now().toString(),
            name: 'Giải thưởng mới',
            probability: 10,
            color: '#FF6B00'
        }
        const currentPrizes = config.prizes || []
        setConfig({ ...config, prizes: [...currentPrizes, newPrize] })
    }

    // Lucky Draw: Update Prize
    const updatePrize = (index: number, updates: Partial<Prize>) => {
        const newPrizes = [...(config.prizes || [])]
        newPrizes[index] = { ...newPrizes[index], ...updates }
        setConfig({ ...config, prizes: newPrizes })
    }

    // Lucky Draw: Remove Prize
    const removePrize = (index: number) => {
        const newPrizes = [...(config.prizes || [])]
        newPrizes.splice(index, 1)
        setConfig({ ...config, prizes: newPrizes })
    }

    // Lucky Draw: Prize Image Upload
    const handlePrizeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const url = await onUpload(file, `prizes/${Date.now()}_${file.name}`)
            updatePrize(index, { image: url })
            setUploading(false)
        } catch (error) {
            setUploading(false)
        }
    }

    // RENDER: Lucky Draw
    if (template === 'lucky_draw') {
        const prizes = config.prizes || []
        const totalProb = prizes.reduce((s: number, p: Prize) => s + (p.probability || 0), 0)

        const updateConfig = (key: string, value: any) => {
            setConfig({ ...config, [key]: value })
        }

        return (
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 max-w-full">
                {/* Left Column: Configuration */}
                <div className="flex-1 space-y-8">
                    {/* Header & Tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Lucky Draw</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Configuration</p>
                            </div>
                        </div>
                        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
                            {[
                                { id: 'prizes', icon: <Layers size={14} />, label: 'Prizes' },
                                { id: 'branding', icon: <ImageIcon size={14} />, label: 'Branding' },
                                { id: 'rules', icon: <Settings size={14} />, label: 'Rules' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-900 uppercase tracking-tighter'}`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Section */}
                    {activeTab === 'prizes' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between px-2">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Prize Management</h4>
                                    <div className="flex items-center gap-2">
                                        <div className={`text-xs font-black px-2 py-0.5 rounded ${totalProb === 100 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                            TOTAL: {totalProb}%
                                        </div>
                                        {totalProb !== 100 && <span className="text-[9px] font-bold text-red-400 italic">Needs to be exactly 100%</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={addPrize}
                                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition active:scale-95 shadow-xl flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add New Prize
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {prizes.length > 0 ? (
                                    prizes.map((prize: Prize, idx: number) => (
                                        <div key={idx} className="group bg-white border border-gray-100 p-4 rounded-[2rem] shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300">
                                            <div className="flex items-center gap-6">
                                                <div className="relative w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                    {prize.image ? (
                                                        <img src={prize.image} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <ImageIcon size={24} className="text-gray-300" />
                                                    )}
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handlePrizeImageUpload(e, idx)} />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Upload size={16} className="text-white" />
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                                    <div className="md:col-span-5 space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prize Name</label>
                                                        <input
                                                            value={prize.name}
                                                            onChange={e => updatePrize(idx, { name: e.target.value })}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-800 focus:ring-0 placeholder:text-gray-300"
                                                            placeholder="Enter prize name..."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center block">Probability (%)</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={prize.probability}
                                                                onChange={e => updatePrize(idx, { probability: Number(e.target.value) })}
                                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-black text-center focus:border-orange-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center block">Theme Color</label>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={prize.color}
                                                                onChange={e => updatePrize(idx, { color: e.target.value })}
                                                                className="w-10 h-10 border-4 border-white shadow-sm rounded-xl cursor-pointer p-0"
                                                            />
                                                            <span className="font-mono text-[9px] font-bold text-gray-400 uppercase">{prize.color}</span>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <button onClick={() => removePrize(idx)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-gray-300"><Plus size={32} /></div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">No prizes added yet</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Add your first prize to start the wheel</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <section className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-6">
                                    <ImageIcon size={14} className="text-orange-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Visual Branding</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Logo & Banner */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Brand Logo</label>
                                            <div className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                                                <div className="relative w-20 h-20 rounded-2xl bg-white border border-gray-200 p-2 shadow-sm flex-shrink-0">
                                                    {config.logo_url ? (
                                                        <>
                                                            <img src={config.logo_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('logo_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-white shadow-lg"><Trash2 size={10} /></button>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold py-2 px-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition shadow-sm inline-block">
                                                        UPLOAD LOGO
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'logos')} />
                                                    </label>
                                                    <p className="text-[9px] text-gray-400 font-medium">Clear PNG, 512x512px</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Header Banner</label>
                                            <div className="relative aspect-[21/9] rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/30 overflow-hidden group">
                                                {config.banner_url ? (
                                                    <>
                                                        <img src={config.banner_url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => updateConfig('banner_url', '')} className="bg-red-500 text-white p-2 rounded-xl"><Trash2 size={16} /></button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-orange-50/30 transition-colors">
                                                        <Upload size={24} className="text-gray-300" />
                                                        <span className="text-[10px] font-black text-gray-400 uppercase mt-2">Upload Banner</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner_url', 'branding')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Asset Customization */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Custom Center Button</label>
                                            <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-4 text-center">
                                                <div className="relative w-24 h-24 mx-auto rounded-full bg-white border border-gray-200 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                                                    {config.spin_btn_url ? (
                                                        <>
                                                            <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('spin_btn_url', '')} className="absolute inset-0 bg-red-500/80 text-white opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><Trash2 size={16} /></button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-orange-500 uppercase">QUAY</span>
                                                    )}
                                                </div>
                                                <label className="text-[10px] font-bold py-2 px-6 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition shadow-sm inline-block">
                                                    REPLACE BUTTON
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'spin_btn_url', 'branding')} />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Wheel Pointer Icon</label>
                                            <div className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                                                <div className="w-16 h-16 bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-2 relative">
                                                    {config.pointer_url ? (
                                                        <>
                                                            <img src={config.pointer_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('pointer_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-white"><Trash2 size={10} /></button>
                                                        </>
                                                    ) : (
                                                        <span className="text-2xl">▼</span>
                                                    )}
                                                </div>
                                                <label className="text-[10px] font-bold py-2 px-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition shadow-sm inline-block">
                                                    UPLOAD POINTER
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'pointer_url', 'branding')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'rules' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <section className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-6">
                                    <Settings size={14} className="text-orange-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Game Rules & Terns</h4>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nội dung thể lệ (HTML Supported)</label>
                                    <textarea
                                        value={config.rules_text || ''}
                                        onChange={e => updateConfig('rules_text', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] text-sm font-mono leading-relaxed outline-none focus:border-orange-400 focus:bg-white transition-all shadow-inner"
                                        rows={10}
                                        placeholder="Enter rules here..."
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">💡 Tip</p>
                                            <p className="text-[10px] text-blue-500 italic">Sử dụng &lt;b&gt; hoặc &lt;li&gt; để làm nổi bật nội dung.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Right Column: Sticky Preview Panel */}
                <div className="w-full xl:w-[420px] flex-shrink-0">
                    <div className="xl:sticky xl:top-8 space-y-6">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                    Game Preview
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Live Spin Simulation</p>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-[#0c0c0c] rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-gray-900 ring-2 ring-gray-900/10 transition-transform duration-500 hover:scale-[1.02] overflow-hidden">
                            {/* Inner Screen */}
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-white flex flex-col">
                                {/* Theme Mockup */}
                                <div className="absolute inset-0 bg-gray-50">
                                    {/* Header Banner Mockup */}
                                    <div className="h-24 w-full bg-orange-100 relative overflow-hidden">
                                        {config.banner_url ? (
                                            <img src={config.banner_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-orange-200 font-black text-2xl rotate-3">LUCKY DRAW</div>
                                        )}
                                        {config.logo_url && (
                                            <img src={config.logo_url} className="absolute bottom-4 left-4 w-10 h-10 bg-white rounded shadow-lg p-1" />
                                        )}
                                    </div>

                                    {/* Wheel Mockup (Simplified representation) */}
                                    <div className="mt-12 flex flex-col items-center justify-center space-y-10">
                                        <div className="relative">
                                            {/* Pointer */}
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 z-20 drop-shadow-lg">
                                                {config.pointer_url ? (
                                                    <img src={config.pointer_url} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="text-red-600 text-3xl">▼</div>
                                                )}
                                            </div>

                                            {/* Wheel Disk */}
                                            <div className="w-64 h-64 rounded-full border-[8px] border-orange-500 bg-white shadow-2xl relative overflow-hidden flex items-center justify-center">
                                                {prizes.length > 0 ? (
                                                    <div className="w-full h-full relative" style={{ transform: 'rotate(0deg)' }}>
                                                        {prizes.map((p: Prize, i: number) => {
                                                            const angle = 360 / prizes.length
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full origin-bottom"
                                                                    style={{
                                                                        width: '2px',
                                                                        transform: `rotate(${i * angle}deg)`,
                                                                        background: 'rgba(0,0,0,0.05)'
                                                                    }}
                                                                >
                                                                    <div className="absolute top-4 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: p.color || '#eee' }}></div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-black text-gray-300 uppercase italic">Add Prizes</div>
                                                )}

                                                {/* Center Button */}
                                                <div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full shadow-xl border-4 border-orange-500 z-10 flex items-center justify-center overflow-hidden">
                                                    {config.spin_btn_url ? (
                                                        <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-[8px] font-black text-orange-600">SPIN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-48 h-10 bg-orange-500 rounded-full shadow-lg shadow-orange-200 flex items-center justify-center">
                                            <span className="text-white font-black text-xs uppercase tracking-widest">Quay Thử</span>
                                        </div>
                                    </div>

                                    {/* Rules placeholder */}
                                    <div className="mt-8 px-6 space-y-4">
                                        <div className="h-2 w-24 bg-gray-200 rounded-full"></div>
                                        <div className="space-y-2">
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full"></div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full"></div>
                                            <div className="h-1.5 w-3/4 bg-gray-100 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Label */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0 animate-bounce">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-gray-900 tracking-tight">Gamification Ready</h5>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{prizes.length} Prizes Configured</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // RENDER: AR Check-in
    if (template === 'ar_checkin') {
        const updateConfig = (key: string, value: any) => {
            setConfig({ ...config, [key]: value })
        }

        return (
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 max-w-full">
                {/* Left Column: Configuration */}
                <div className="flex-1 space-y-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">AR Check-in</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Configuration</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Frame Upload Section */}
                        <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-8">
                            <div className="flex items-center gap-2 border-b border-gray-50 pb-6">
                                <Layers size={14} className="text-blue-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Frame Configuration</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Event Frame (.PNG)</label>
                                    <div className="relative aspect-[9/16] rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-gray-50/30 flex flex-col items-center justify-center p-6 group hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-500 cursor-pointer overflow-hidden">
                                        {config.frame_url ? (
                                            <div className="relative w-full h-full">
                                                <img src={config.frame_url} className="w-full h-full object-contain drop-shadow-2xl" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateConfig('frame_url', '') }}
                                                        className="bg-red-500 text-white p-3 rounded-2xl hover:bg-red-600 transition shadow-xl"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                    <Upload size={24} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 uppercase">Upload Frame</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">PNG Transparent ONLY</p>
                                                </div>
                                            </div>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".png" onChange={e => handleFileUpload(e, 'frame_url', 'frames')} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">User Instructions</label>
                                        <textarea
                                            value={config.instructions || ''}
                                            onChange={e => updateConfig('instructions', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] text-sm font-medium leading-relaxed outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
                                            rows={6}
                                            placeholder="Ví dụ: Hãy cười thật tươi và tạo dáng cùng thần tượng..."
                                        />
                                    </div>

                                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 space-y-3">
                                        <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                            <HelpCircle size={14} /> Design Tips
                                        </h5>
                                        <ul className="text-[10px] text-blue-500 font-bold space-y-2 uppercase tracking-tight">
                                            <li className="flex items-start gap-2">• Sử dụng ảnh PNG tách nền</li>
                                            <li className="flex items-start gap-2">• Kích thước chuẩn: 1080x1920px</li>
                                            <li className="flex items-start gap-2">• Để chừa khoảng trống ở giữa cho gương mặt</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Column: Sticky Preview Panel */}
                <div className="w-full xl:w-[420px] flex-shrink-0">
                    <div className="xl:sticky xl:top-8 space-y-6">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                    Frame Preview
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">AR Overlay Simulation</p>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-[#0c0c0c] rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-gray-900 ring-2 ring-gray-900/10 transition-transform duration-500 hover:scale-[1.02] overflow-hidden">
                            {/* Inner Screen */}
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center">
                                {/* Simulation Camera Background */}
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-60"></div>

                                {/* The Frame Overlay */}
                                {config.frame_url && (
                                    <img src={config.frame_url} className="absolute inset-0 w-full h-full object-contain z-10 animate-in fade-in zoom-in duration-500" />
                                )}

                                {/* Camera Interface Mockup */}
                                <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">
                                    <div className="flex justify-between items-start pt-4">
                                        <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                                            <ChevronRight size={18} className="rotate-180" />
                                        </div>
                                        <div className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                                            AR CAMERA
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 pb-4">
                                        {config.instructions && (
                                            <div className="bg-black/40 backdrop-blur-lg px-6 py-3 rounded-2xl text-white text-[9px] font-black uppercase tracking-widest text-center border border-white/10 max-w-[80%]">
                                                {config.instructions}
                                            </div>
                                        )}
                                        <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Label */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Maximize size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-gray-900 tracking-tight">AR Layer Active</h5>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">High-Precision Masking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    // RENDER: Face Filter
    if (template === 'face_filter') {

        const ANCHOR_OPTIONS = [
            { value: 'nose_bridge', label: '👓 Sống mũi (Kính)', icon: '👓' },
            { value: 'forehead', label: '🎩 Trán (Mũ/Vương miện)', icon: '🎩' },
            { value: 'nose_tip', label: '🤡 Đầu mũi (Mũi hề)', icon: '🤡' },
            { value: 'chin', label: '🧔 Cằm (Râu)', icon: '🧔' },
            { value: 'full_face', label: '🎭 Toàn mặt (Mặt nạ)', icon: '🎭' },
        ]

        const updateConfig = (key: string, value: any) => {
            setConfig({ ...config, [key]: value })
        }

        return (
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 max-w-full">
                {/* Left Column: Configuration */}
                <div className="flex-1 space-y-8">
                    {/* Header & Tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Face Filter</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Configuration</p>
                            </div>
                        </div>
                        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
                            {[
                                { id: 'content', icon: <Box size={14} />, label: 'Content' },
                                { id: 'transform', icon: <Maximize size={14} />, label: 'Transform' },
                                { id: 'settings', icon: <Settings size={14} />, label: 'Settings' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-pink-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-900 uppercase tracking-tighter'}`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-6">
                        {activeTab === 'content' && (
                            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                                {/* Filter Type & Assets */}
                                <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 flex items-center gap-2">
                                            <Layers size={14} /> Asset Type & Content
                                        </h4>
                                        <div className="flex bg-gray-50 p-1 rounded-xl">
                                            <button
                                                onClick={() => updateConfig('filter_type', '2d')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${config.filter_type !== '3d' ? 'bg-white text-pink-600 shadow-sm border border-gray-200' : 'text-gray-400'}`}
                                            >
                                                2D STICKER
                                            </button>
                                            <button
                                                onClick={() => updateConfig('filter_type', '3d')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${config.filter_type === '3d' ? 'bg-white text-pink-600 shadow-sm border border-gray-200' : 'text-gray-400'}`}
                                            >
                                                3D MODEL
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Main Content</label>
                                            <div className="relative aspect-square rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/30 flex flex-col items-center justify-center p-6 group hover:border-pink-400 hover:bg-pink-50/30 transition-all duration-500 cursor-pointer overflow-hidden">
                                                {config.filter_url || config.filter_3d_url ? (
                                                    <div className="relative w-full h-full">
                                                        {config.filter_type === '3d' ? (
                                                            <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl shadow-inner">
                                                                <Box size={48} className="text-pink-500" />
                                                            </div>
                                                        ) : (
                                                            <img src={config.filter_url} className="w-full h-full object-contain drop-shadow-2xl" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateConfig(config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', '') }}
                                                                className="bg-red-500 text-white p-3 rounded-2xl hover:bg-red-600 transition shadow-xl"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-4">
                                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                            <Upload size={24} className="text-pink-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900">Upload {config.filter_type === '3d' ? '.GLB' : '.PNG'}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sử dụng định dạng file tối ưu</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept={config.filter_type === '3d' ? '.glb,.gltf' : '.png'} onChange={e => handleFileUpload(e, config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', 'filters')} />
                                                {!config.filter_url && !config.filter_3d_url && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept={config.filter_type === '3d' ? '.glb,.gltf' : '.png'} onChange={e => handleFileUpload(e, config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', 'filters')} />}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            {/* Client Logo */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Client Logo</label>
                                                <div className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                                                    <div className="relative w-16 h-16 rounded-2xl bg-white border border-gray-200 p-2 shadow-sm flex-shrink-0">
                                                        {config.logo_url ? (
                                                            <>
                                                                <img src={config.logo_url} className="w-full h-full object-contain" />
                                                                <button onClick={() => updateConfig('logo_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-white shadow-lg"><Trash2 size={10} /></button>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold py-2 px-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition shadow-sm inline-block">
                                                            CHANGE LOGO
                                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'logos')} />
                                                        </label>
                                                        <p className="text-[9px] text-gray-400 font-medium">Kích thước gợi ý: 400x400px</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Hướng dẫn (Scan-hint)</label>
                                                <input
                                                    value={config.instructions || ''}
                                                    onChange={e => updateConfig('instructions', e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-medium outline-none focus:border-pink-400 focus:bg-white transition-all shadow-inner"
                                                    placeholder="Hướng camera vào khuôn mặt..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'transform' && (
                            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                                {/* Anchor & Transform */}
                                <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-8">
                                    <div className="flex items-center gap-2 border-b border-gray-50 pb-6">
                                        <Maximize size={14} className="text-pink-500" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Anchor & Position</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Anchor Point Selector */}
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Anchor Point (Điểm neo)</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {ANCHOR_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateConfig('anchor_position', opt.value)}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${config.anchor_position === opt.value ? 'bg-pink-500/10 border-pink-500 text-pink-600' : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-600'}`}
                                                    >
                                                        <span className="text-xl">{opt.icon}</span>
                                                        <span className="text-xs font-black uppercase tracking-tight">{opt.label}</span>
                                                        {config.anchor_position === opt.value && <Check size={14} className="ml-auto" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Transform Sliders */}
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kích thước (Scale)</span>
                                                    <span className="text-xs font-black text-pink-600 px-2 py-0.5 bg-pink-50 rounded-md border border-pink-100">{(config.filter_scale ?? 0.5)}x</span>
                                                </div>
                                                <input type="range" min="0.1" max="2" step="0.05" value={config.filter_scale ?? 0.5} onChange={(e) => updateConfig('filter_scale', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                            </div>

                                            <div className="space-y-6 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dịch ngang (X)</span>
                                                        <span className="text-xs font-bold text-gray-500">{config.offset_x || 0}</span>
                                                    </div>
                                                    <input type="range" min="-0.5" max="0.5" step="0.01" value={config.offset_x || 0} onChange={(e) => updateConfig('offset_x', parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600 focus:accent-pink-500" />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dịch dọc (Y)</span>
                                                        <span className="text-xs font-bold text-gray-500">{config.offset_y || 0}</span>
                                                    </div>
                                                    <input type="range" min="-0.5" max="0.5" step="0.01" value={config.offset_y || 0} onChange={(e) => updateConfig('offset_y', parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600 focus:accent-pink-500" />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Độ sâu (Z)</span>
                                                        <span className="text-xs font-bold text-gray-500">{config.offset_z || 0}</span>
                                                    </div>
                                                    <input type="range" min="-1" max="1" step="0.01" value={config.offset_z || 0} onChange={(e) => updateConfig('offset_z', parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600 focus:accent-pink-500" />
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    onClick={() => setConfig({ ...config, filter_scale: 0.5, offset_x: 0, offset_y: 0, offset_z: 0 })}
                                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
                                                >
                                                    Reset Transform
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                                {/* Occlusion & Rendering */}
                                <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-8">
                                    <div className="flex items-center gap-2 border-b border-gray-50 pb-6">
                                        <Settings size={14} className="text-pink-500" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Occlusion & Rendering</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                                                <Eye size={12} className="text-blue-400" /> Head Occluder (Che phủ đầu)
                                            </label>
                                            <button
                                                onClick={() => updateConfig('full_head_occlusion', !config.full_head_occlusion)}
                                                className={`flex items-center justify-between w-full p-6 rounded-3xl border transition-all ${config.full_head_occlusion ? 'bg-pink-500/10 border-pink-500 text-pink-600 shadow-lg shadow-pink-100' : 'bg-gray-50 border-transparent text-gray-400'}`}
                                            >
                                                <div className="text-left">
                                                    <span className="text-xs font-black uppercase tracking-tight block">Full Head Occluder</span>
                                                    <p className="text-[10px] opacity-70 mt-1 font-medium">Bật nếu filter có phần che khuất sau đầu (mũ, nón...)</p>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${config.full_head_occlusion ? 'bg-pink-500' : 'bg-gray-300'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.full_head_occlusion ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </button>

                                            {config.full_head_occlusion && (
                                                <div className="space-y-6 p-6 bg-pink-50/50 rounded-3xl border border-pink-100 mt-4 animate-in zoom-in-95 duration-200">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Kích thước Occluder</span>
                                                            <span className="text-xs font-bold text-pink-600">{config.occlusion_radius ?? 0.15}</span>
                                                        </div>
                                                        <input type="range" min="0.1" max="0.5" step="0.01" value={config.occlusion_radius ?? 0.15} onChange={(e) => updateConfig('occlusion_radius', parseFloat(e.target.value))} className="w-full h-1 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Capture Controls</label>
                                            <div className="space-y-4">
                                                <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-4">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Nút Chụp (Button Style)</label>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <input
                                                                value={config.capture_btn_text || 'CHỤP ẢNH'}
                                                                onChange={e => updateConfig('capture_btn_text', e.target.value)}
                                                                className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-pink-500 transition-all"
                                                                placeholder="CHỤP ẢNH"
                                                            />
                                                        </div>
                                                        <label className="w-12 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm transition-transform active:scale-90 flex-shrink-0" style={{ backgroundColor: config.capture_btn_color || '#ec4899' }}>
                                                            <input type="color" className="hidden" value={config.capture_btn_color || '#ec4899'} onChange={e => updateConfig('capture_btn_color', e.target.value)} />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sticky Preview Panel */}
                <div className="w-full xl:w-[420px] flex-shrink-0">
                    <div className="xl:sticky xl:top-8 space-y-6">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                    Face Preview
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">AR Face Tracking</p>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setDebugMode(!debugMode)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debugMode ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'text-gray-400 hover:text-gray-600 uppercase'}`}
                                >
                                    MESH: {debugMode ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-[#0c0c0c] rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-gray-900 ring-2 ring-gray-900/10 transition-transform duration-500 hover:scale-[1.02]">
                            {/* Camera Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-40 bg-gray-900 rounded-b-3xl z-40 flex items-center justify-center gap-4">
                                <div className="w-16 h-1 bg-white/10 rounded-full"></div>
                                <div className="w-2 h-2 bg-blue-500/20 rounded-full"></div>
                            </div>

                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center">
                                {/* Preview Component */}
                                {showPreview ? (
                                    <Suspense fallback={<div className="flex items-center justify-center text-white"><Loader2 className="animate-spin text-pink-500" /></div>}>
                                        <FaceFilterPreview
                                            config={config}
                                            debugMode={debugMode}
                                            onClose={() => setShowPreview(false)}
                                        />
                                    </Suspense>
                                ) : (
                                    <div className="text-center p-8 space-y-6">
                                        <div className="relative">
                                            <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-pink-400 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-pink-500/40 relative z-10">
                                                <Camera size={40} className="text-white" />
                                            </div>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl animate-pulse"></div>
                                        </div>
                                        <div className="space-y-4 relative z-10">
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-tighter text-lg">Start Simulation</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 leading-relaxed">Kết nối Camera để xem Filter<br />ngay trên gương mặt bạn</p>
                                            </div>
                                            <button
                                                onClick={() => setShowPreview(true)}
                                                className="bg-white text-gray-900 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-50 transition active:scale-95 shadow-xl"
                                            >
                                                Start Camera
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Label */}
                        <div className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                                <Camera size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-gray-900 tracking-tight">System Ready</h5>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Real-time Soft Updates Active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // RENDER: Image Tracking
    if (template === 'image_tracking') {
        // Initialize selected asset if not set
        if (!selectedAssetId && config.assets?.[0]) {
            setSelectedAssetId(config.assets[0].id)
        }

        const selectedAsset = config.assets?.find((a: ARAsset) => a.id === selectedAssetId)

        const addAsset = (type: '3d' | 'video') => {
            const newAsset: ARAsset = {
                id: `asset-${Date.now()}`,
                name: type === '3d' ? 'New 3D Model' : 'New Video',
                type,
                url: '',
                scale: 1,
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                video_autoplay: true,
                video_loop: true,
                animation_mode: 'auto'
            }
            const updatedAssets = [...(config.assets || []), newAsset]
            setConfig({ ...config, assets: updatedAssets })
            setSelectedAssetId(newAsset.id)
        }

        const removeAsset = (id: string) => {
            const updatedAssets = config.assets.filter((a: ARAsset) => a.id !== id)
            setConfig({ ...config, assets: updatedAssets })
            if (selectedAssetId === id) setSelectedAssetId(updatedAssets[0]?.id || null)
        }

        const updateAsset = (id: string, updates: Partial<ARAsset>) => {
            const updatedAssets = config.assets.map((a: ARAsset) =>
                a.id === id ? { ...a, ...updates } : a
            )
            setConfig({ ...config, assets: updatedAssets })
        }

        const updateConfig = (key: string, value: any) => {
            setConfig({ ...config, [key]: value })
        }

        return (
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 max-w-full">
                {/* Left Column: Configuration */}
                <div className="flex-1 space-y-8">

                    {/* 1. Asset Manager */}
                    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers size={18} className="text-orange-500" />
                                <h3 className="font-bold text-gray-800">Quản lý Assets</h3>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => addAsset('3d')}
                                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                                >
                                    <Plus size={14} /> 3D
                                </button>
                                <button
                                    onClick={() => addAsset('video')}
                                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                                >
                                    <Plus size={14} /> Video
                                </button>
                            </div>
                        </div>

                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {config.assets?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1">
                                    {config.assets.map((asset: ARAsset) => (
                                        <div
                                            key={asset.id}
                                            onClick={() => setSelectedAssetId(asset.id)}
                                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${selectedAssetId === asset.id
                                                ? 'bg-orange-50 border border-orange-200 ring-4 ring-orange-50'
                                                : 'hover:bg-gray-50 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl shadow-sm ${asset.type === '3d' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                    }`}>
                                                    {asset.type === '3d' ? <Box size={16} /> : <Video size={16} />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold truncate max-w-[150px] ${selectedAssetId === asset.id ? 'text-orange-900' : 'text-gray-700'}`}>
                                                        {asset.name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${asset.type === '3d' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                                            }`}>
                                                            {asset.type}
                                                        </span>
                                                        {!asset.url && <span className="text-[9px] text-red-500 font-bold animate-pulse">CHƯA CÓ FILE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-gray-300">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                        <Box size={24} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">Chưa có asset nào trên marker này.</p>
                                    <p className="text-xs opacity-60">Nhấn nút bên trên để thêm 3D model hoặc Video.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Selected Asset Configuration */}
                    {selectedAsset ? (
                        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1 px-2 border rounded-md text-[9px] font-black uppercase bg-white shadow-sm text-gray-500">
                                        ID: {selectedAsset.id.slice(-4)}
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedAsset.name}
                                        onChange={(e) => updateAsset(selectedAsset.id, { name: e.target.value })}
                                        className="bg-transparent font-bold text-gray-800 border-none p-0 focus:ring-0 w-48 text-lg"
                                    />
                                </div>
                                <nav className="flex bg-gray-100/50 p-1 rounded-xl">
                                    {[
                                        { id: 'transform', label: 'Vị trí', icon: Maximize },
                                        { id: 'content', label: 'File', icon: Upload },
                                        { id: 'animation', label: 'Hoạt ảnh', icon: Play }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === tab.id
                                                ? 'bg-white shadow-sm text-orange-600 scale-105'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            <tab.icon size={14} /> {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-8">
                                {/* TAB: Transform */}
                                {activeTab === 'transform' && (
                                    <div className="space-y-8">
                                        {/* Scale Slider */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                    Kích thước tổng thể
                                                </label>
                                                <span className="text-xs font-black bg-orange-100 px-3 py-1 rounded-full text-orange-600 shadow-sm border border-orange-200">
                                                    {selectedAsset.scale.toFixed(2)}x
                                                </span>
                                            </div>
                                            <input
                                                type="range" min="0.01" max="5" step="0.01"
                                                value={selectedAsset.scale}
                                                onChange={(e) => updateAsset(selectedAsset.id, { scale: parseFloat(e.target.value) })}
                                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                            />
                                        </div>

                                        {/* Position Sliders */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {['X', 'Y', 'Z'].map((axis, i) => (
                                                <div key={axis} className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{axis} position</label>
                                                        <span className="font-mono text-[10px] font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded border">{selectedAsset.position[i].toFixed(2)}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-3" max="3" step="0.01"
                                                        value={selectedAsset.position[i]}
                                                        onChange={(e) => {
                                                            const newPos = [...selectedAsset.position] as [number, number, number]
                                                            newPos[i] = parseFloat(e.target.value)
                                                            updateAsset(selectedAsset.id, { position: newPos })
                                                        }}
                                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Rotation Sliders */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
                                            {['Pitch', 'Yaw', 'Roll'].map((axis, i) => (
                                                <div key={axis} className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{axis}</label>
                                                        <span className="font-mono text-[10px] font-bold text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded border">{selectedAsset.rotation[i]}°</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-180" max="180" step="1"
                                                        value={selectedAsset.rotation[i]}
                                                        onChange={(e) => {
                                                            const newRot = [...selectedAsset.rotation] as [number, number, number]
                                                            newRot[i] = parseInt(e.target.value)
                                                            updateAsset(selectedAsset.id, { rotation: newRot })
                                                        }}
                                                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: Content Specific */}
                                {activeTab === 'content' && (
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        {/* File Upload / Link */}
                                        <div className="bg-orange-50/30 p-6 rounded-2xl border border-orange-100/50 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                                    Nguồn {selectedAsset.type === '3d' ? '3D Model (.glb)' : 'Video (.mp4/.webm)'}
                                                </label>
                                                {selectedAsset.url && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10} /> ĐÃ UPLOAD</span>}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Dán URL file ở đây hoặc nhấn nút Upload..."
                                                    value={selectedAsset.url}
                                                    onChange={(e) => updateAsset(selectedAsset.id, { url: e.target.value })}
                                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
                                                />
                                                <label className="bg-orange-600 text-white p-3 rounded-xl cursor-pointer hover:bg-orange-700 active:scale-95 transition-all shadow-md shadow-orange-200">
                                                    <Upload size={20} />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept={selectedAsset.type === '3d' ? '.glb' : '.mp4,.webm'}
                                                        onChange={(e) => handleFileUpload(e, 'temp_url', 'content').then(url => {
                                                            if (url) updateAsset(selectedAsset.id, { url })
                                                        })}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">💡 Bạn có thể dùng URL từ Dropbox, Google Drive (direct link) hoặc upload trực tiếp lên server.</p>
                                        </div>

                                        {/* Video Specific Settings */}
                                        {selectedAsset.type === 'video' && (
                                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tỷ lệ Rộng (AR plane)</label>
                                                    <input type="number" step="0.1" value={selectedAsset.video_width || 1} onChange={(e) => updateAsset(selectedAsset.id, { video_width: parseFloat(e.target.value) })} className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tỷ lệ Cao (AR plane)</label>
                                                    <input type="number" step="0.1" value={selectedAsset.video_height || 0.56} onChange={(e) => updateAsset(selectedAsset.id, { video_height: parseFloat(e.target.value) })} className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-orange-500 focus:border-orange-500" />
                                                </div>
                                                <div className="col-span-2 flex flex-wrap gap-4 pt-2">
                                                    <button
                                                        onClick={() => updateAsset(selectedAsset.id, { video_loop: !selectedAsset.video_loop })}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedAsset.video_loop ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                                                            }`}
                                                    >
                                                        <RefreshCw size={14} className={selectedAsset.video_loop ? 'animate-spin-slow' : ''} /> Lặp lại video
                                                    </button>
                                                    <button
                                                        onClick={() => updateAsset(selectedAsset.id, { video_muted: !selectedAsset.video_muted })}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedAsset.video_muted ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800'
                                                            }`}
                                                    >
                                                        {selectedAsset.video_muted ? <Activity size={14} /> : <Activity size={14} />} {selectedAsset.video_muted ? 'Đã tắt tiếng' : 'Có tiếng'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: Animation */}
                                {activeTab === 'animation' && (
                                    <div className="space-y-10 animate-in fade-in duration-300">
                                        {selectedAsset.type === '3d' ? (
                                            <>
                                                <div className="space-y-4">
                                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Chế độ hoạt ảnh cơ bản</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'auto', label: 'Tự động xoay', icon: RefreshCw, color: 'text-blue-500 bg-blue-50 border-blue-100' },
                                                            { id: 'loop_clips', label: 'Vòng lặp Clips', icon: Play, color: 'text-purple-500 bg-purple-50 border-purple-100' },
                                                            { id: 'tap_to_play', label: 'Chạm để lặp', icon: Activity, color: 'text-green-500 bg-green-50 border-green-100' },
                                                        ].map(mode => (
                                                            <button
                                                                key={mode.id}
                                                                onClick={() => updateAsset(selectedAsset.id, { animation_mode: mode.id as any })}
                                                                className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all group ${selectedAsset.animation_mode === mode.id
                                                                    ? `${mode.color} scale-105 shadow-lg border-current`
                                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <mode.icon size={24} />
                                                                <span className="text-[11px] font-black uppercase tracking-tighter">{mode.label}</span>
                                                                {selectedAsset.animation_mode === mode.id && <div className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-current"><Check size={10} className="text-white" /></div>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Sequential Steps (Keyframes) */}
                                                <div className="pt-8 border-t border-gray-100 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Sequential Steps (Keyframes)</h4>
                                                            <p className="text-[10px] text-gray-400 font-medium">Chuỗi chuyển động tuần tự khi phát hiện marker.</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const newStep: AnimationStep = { id: `step-${Date.now()}`, property: 'position', to: '0 1 0', duration: 1000, easing: 'easeInOutQuad' }
                                                                updateAsset(selectedAsset.id, { steps: [...(selectedAsset.steps || []), newStep] })
                                                            }}
                                                            className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all"
                                                        >
                                                            <Plus size={14} /> THÊM BƯỚC
                                                        </button>
                                                    </div>

                                                    {selectedAsset.steps?.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {selectedAsset.steps.map((step: AnimationStep, idx: number) => (
                                                                <div key={step.id} className="relative bg-white border border-gray-100 rounded-2xl p-5 group shadow-sm hover:shadow-md transition-all border-l-8 border-l-orange-500">
                                                                    <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">
                                                                        {idx + 1}
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-4 mb-4 items-end pl-2">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase">Thuộc tính</label>
                                                                            <select
                                                                                value={step.property}
                                                                                onChange={(e) => {
                                                                                    const newSteps = [...selectedAsset.steps!]
                                                                                    newSteps[idx].property = e.target.value as any
                                                                                    updateAsset(selectedAsset.id, { steps: newSteps })
                                                                                }}
                                                                                className="bg-gray-50 border-none rounded-lg p-2 text-xs font-bold outline-none ring-1 ring-gray-200"
                                                                            >
                                                                                <option value="position">Vị trí</option>
                                                                                <option value="rotation">Xoay</option>
                                                                                <option value="scale">Kích thước</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase">Giá trị đích (X Y Z)</label>
                                                                            <input
                                                                                type="text" value={step.to}
                                                                                onChange={(e) => {
                                                                                    const newSteps = [...selectedAsset.steps!]
                                                                                    newSteps[idx].to = e.target.value
                                                                                    updateAsset(selectedAsset.id, { steps: newSteps })
                                                                                }}
                                                                                placeholder="Ví dụ: 0 2 0 hoặc 1.5" className="w-full bg-gray-50 border-none rounded-lg p-2 text-xs font-bold outline-none ring-1 ring-gray-200"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newSteps = selectedAsset.steps!.filter((_, i) => i !== idx)
                                                                                updateAsset(selectedAsset.id, { steps: newSteps })
                                                                            }}
                                                                            className="mb-1 p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4 pl-2">
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex justify-between items-center">
                                                                                <label className="text-[9px] font-black text-gray-400 uppercase">Thời lượng (Duration)</label>
                                                                                <span className="text-[10px] font-bold text-orange-600">{step.duration}ms</span>
                                                                            </div>
                                                                            <input type="range" min="100" max="10000" step="100" value={step.duration} onChange={(e) => {
                                                                                const newSteps = [...selectedAsset.steps!]
                                                                                newSteps[idx].duration = parseInt(e.target.value)
                                                                                updateAsset(selectedAsset.id, { steps: newSteps })
                                                                            }} className="w-full h-1 bg-gray-100 rounded-lg accent-orange-500" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase">Loại Easing</label>
                                                                            <select
                                                                                value={step.easing}
                                                                                onChange={(e) => {
                                                                                    const newSteps = [...selectedAsset.steps!]
                                                                                    newSteps[idx].easing = e.target.value
                                                                                    updateAsset(selectedAsset.id, { steps: newSteps })
                                                                                }}
                                                                                className="w-full bg-gray-50 border-none rounded-lg p-1.5 text-[10px] font-bold outline-none ring-1 ring-gray-200"
                                                                            >
                                                                                <option value="linear">Linear (Đều)</option>
                                                                                <option value="easeInOutQuad">Ease In Out (Mềm)</option>
                                                                                <option value="easeInBack">Ease In Back (Nhún)</option>
                                                                                <option value="easeOutElastic">Elastic (Đàn hồi)</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="pt-2">
                                                                <label className="flex items-center gap-3 cursor-pointer group bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                                                                    <div className={`w-10 h-5 rounded-full relative transition-all ${selectedAsset.loop_animation ? 'bg-orange-600 shadow-inner' : 'bg-gray-300'}`}>
                                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${selectedAsset.loop_animation ? 'translate-x-5 scale-110 shadow-md' : ''}`} />
                                                                    </div>
                                                                    <input type="checkbox" checked={selectedAsset.loop_animation} onChange={(e) => updateAsset(selectedAsset.id, { loop_animation: e.target.checked })} className="hidden" />
                                                                    <div>
                                                                        <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">Lặp lại chuỗi hoạt ảnh</span>
                                                                        <p className="text-[9px] text-gray-400">Tự động quay lại Bước 1 sau khi kết thúc Bước cuối.</p>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 space-y-3 grayscale opacity-60">
                                                            <SkipForward size={32} />
                                                            <p className="text-xs font-bold italic tracking-tight uppercase">Bắt đầu tạo chuyển động tuần tự của bạn</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-16 text-gray-400 space-y-4">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-100">
                                                    <Video size={40} className="opacity-20 translate-x-1" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Video Content</p>
                                                    <p className="text-xs italic opacity-60 max-w-[200px]">Video asset không hỗ trợ các chế độ hoạt ảnh nâng cao của 3D model.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <div className="bg-orange-50/50 rounded-[2.5rem] border-2 border-dashed border-orange-200 p-20 text-center space-y-6">
                            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-orange-100 flex items-center justify-center mx-auto border border-orange-100 animate-pulse">
                                <Box size={40} className="text-orange-300" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-orange-900 uppercase">Sẵn sàng thiết kế AR</h3>
                                <p className="text-orange-700/60 max-w-sm mx-auto text-sm font-medium leading-relaxed">Chọn một asset từ danh sách bên trên hoặc thêm mới để bắt đầu cấu hình các thuộc tính 3D.</p>
                            </div>
                        </div>
                    )}

                    {/* 3. Global Settings */}
                    <section className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] pointer-events-none group-hover:bg-orange-500/20 transition-all duration-1000"></div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10">
                                    <Settings size={20} className="text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg uppercase tracking-wider">Thiết lập chung</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">Global Scene Configuration</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                            {/* Lighting Group */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 flex items-center gap-2">
                                    <Sun size={14} /> Ánh sáng & Render (PBR)
                                </h4>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ambient Light</span>
                                            <span className="text-xs font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{(config.ambient_intensity || 1.0).toFixed(1)}</span>
                                        </div>
                                        <input type="range" min="0" max="3" step="0.1" value={config.ambient_intensity || 1} onChange={(e) => updateConfig('ambient_intensity', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phơi sáng (Exposure)</span>
                                            <span className="text-xs font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{(config.exposure || 1.0).toFixed(1)}</span>
                                        </div>
                                        <input type="range" min="0.1" max="3" step="0.1" value={config.exposure || 1} onChange={(e) => updateConfig('exposure', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Environment Map (HDR)</label>
                                        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                                            <input type="text" value={config.environment_url || ''} onChange={(e) => updateConfig('environment_url', e.target.value)} className="flex-1 bg-transparent border-none rounded-lg px-2 py-1 text-xs text-white outline-none placeholder:text-gray-600" placeholder="URL .hdr hoặc .jpg..." />
                                            <label className="bg-orange-500 text-white p-2 rounded-xl cursor-pointer hover:bg-orange-600 transition shadow-lg shadow-orange-900/40">
                                                <Upload size={14} />
                                                <input type="file" className="hidden" accept=".hdr,.jpg" onChange={(e) => handleFileUpload(e, 'temp', 'env').then(url => url && updateConfig('environment_url', url))} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Capture Group */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 flex items-center gap-2">
                                    <Maximize size={14} /> Capture Settings
                                </h4>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Video Duration (seconds)</span>
                                            <span className="text-xs font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{config.max_video_duration || 30}s</span>
                                        </div>
                                        <input type="range" min="5" max="60" step="5" value={config.max_video_duration || 30} onChange={(e) => updateConfig('max_video_duration', parseInt(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <button
                                            onClick={() => updateConfig('enable_capture', !config.enable_capture)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.enable_capture ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.enable_capture ? 'bg-orange-500 text-white' : 'bg-white/10'}`}>
                                                    <Camera size={16} />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-tight">Cho phép Chụp/Quay</span>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${config.enable_capture ? 'border-orange-500 bg-orange-500' : 'border-gray-700'}`}>
                                                {config.enable_capture && <Check size={10} className="text-white" />}
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => updateConfig('show_scan_hint', config.show_scan_hint === false)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.show_scan_hint !== false ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.show_scan_hint !== false ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
                                                    <HelpCircle size={16} />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-tight">Hướng dẫn Scan</span>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${config.show_scan_hint !== false ? 'border-blue-500 bg-blue-500' : 'border-gray-700'}`}>
                                                {config.show_scan_hint !== false && <Check size={10} className="text-white" />}
                                            </div>
                                        </button>
                                    </div>

                                    {/* Marker Upload - NEW */}
                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1">
                                            <ImageIcon size={12} className="text-blue-400" /> Marker File (.mind)
                                        </label>
                                        <div className="flex gap-2 p-1.5 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                                            <input
                                                type="text"
                                                value={config.marker_url || ''}
                                                onChange={(e) => updateConfig('marker_url', e.target.value)}
                                                className="flex-1 bg-transparent border-none rounded-lg px-2 py-1 text-xs text-white outline-none placeholder:text-gray-600 font-mono"
                                                placeholder="URL file .mind..."
                                            />
                                            <label className="bg-blue-600 text-white p-2 rounded-xl cursor-pointer hover:bg-blue-700 transition shadow-lg shadow-blue-900/40">
                                                <Upload size={14} />
                                                <input type="file" className="hidden" accept=".mind" onChange={(e) => handleFileUpload(e, 'temp', 'markers').then(url => url && updateConfig('marker_url', url))} />
                                            </label>
                                        </div>
                                        <p className="text-[9px] text-gray-500 italic">Cần thiết để hệ thống nhận diện được hình ảnh mục tiêu.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Sticky Preview Panel */}
                <div className="w-full xl:w-[420px] flex-shrink-0">
                    <div className="xl:sticky xl:top-8 space-y-6">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                    Live Preview
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Real-time Simulation</p>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setDebugMode(!debugMode)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debugMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:text-gray-600 uppercase'}`}
                                >
                                    DEBUG: {debugMode ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-[#0c0c0c] rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-gray-900 ring-2 ring-gray-900/10 transition-transform duration-500 hover:scale-[1.02]">
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-40 bg-gray-900 rounded-b-3xl z-40 flex items-center justify-center gap-4">
                                <div className="w-16 h-1 w-white/10 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-800 rounded-full border border-white/5"></div>
                            </div>

                            {/* AR Content */}
                            <div className="relative h-full w-full rounded-[2.5rem] overflow-hidden bg-black">
                                {showPreview ? (
                                    <Suspense fallback={
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
                                            <div className="relative">
                                                <div className="animate-spin w-16 h-16 border-4 border-white/5 border-t-orange-500 rounded-full" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Camera size={20} className="text-orange-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Requesting Camera</p>
                                                <p className="text-white/30 text-[9px] mt-1 italic">Vui lòng cho phép quyền truy cập camera...</p>
                                            </div>
                                        </div>
                                    }>
                                        <ImageTrackingPreview
                                            markerUrl={config.marker_url}
                                            config={config}
                                            onClose={() => setShowPreview(false)}
                                        />
                                    </Suspense>
                                ) : (
                                    <div
                                        onClick={() => setShowPreview(true)}
                                        className="absolute inset-0 flex flex-col items-center justify-center text-white/40 cursor-pointer group bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.05),transparent)] hover:bg-black/80 transition-all duration-700"
                                    >
                                        <div className="w-24 h-24 bg-white shadow-2xl shadow-orange-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-orange-500 transition-all duration-500 transform border border-white/10">
                                            <Play size={40} className="text-orange-500 group-hover:text-white transition-colors fill-current ml-2" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h4 className="text-lg font-black text-white px-8 leading-tight tracking-tight">START CAMERA SIMULATION</h4>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] group-hover:text-orange-400 transition-colors">Requires Permissions</p>
                                        </div>

                                        {/* Scan Hint simulator */}
                                        <div className="absolute bottom-16 left-0 right-0 px-12 opacity-50">
                                            <div className="border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-3">
                                                <Camera size={24} className="opacity-20 translate-y-2" />
                                                <div className="h-2 w-24 bg-white/10 rounded-full"></div>
                                                <div className="h-1.5 w-16 bg-white/5 rounded-full"></div>
                                            </div>
                                        </div>

                                        {/* Decoration corners */}
                                        <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-white/10 rounded-tl-lg"></div>
                                        <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-white/10 rounded-tr-lg"></div>
                                        <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-white/10 rounded-bl-lg"></div>
                                        <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-white/10 rounded-br-lg"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="text-center text-gray-400 py-8">
            Chưa có cấu hình visual cho template này.
        </div>
    )
}
