'use client'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import {
    Plus, Trash2, GripVertical, Upload, Image as ImageIcon, Eye, EyeOff,
    Settings, Layers, Video, Box, Activity, ChevronRight, HelpCircle,
    RefreshCw, Play, SkipForward, Sun, Maximize, Smartphone,
    Camera, Check, Sparkles, Loader2, Clock, Minus, ExternalLink, Globe, Scan, MoreVertical, Copy, Link, AlertCircle
} from 'lucide-react'

const FaceFilterPreview = lazy(() => import('./FaceFilterPreview'))
const ImageTrackingPreview = lazy(() => import('./ImageTrackingPreview'))
const StudioPreview = lazy(() => import('./StudioPreview'))
import ProMixerTimeline from './ProMixerTimeline'
import { parseMindFile } from '@/lib/mind-parser'
import { processImageForCompiler } from '@/lib/image-processor'
import { compileFiles } from '@/lib/mind-compiler'

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

export interface VideoKeyframe {
    id: string
    time: number           // Timestamp in seconds (0 = targetFound)
    property: 'position' | 'rotation' | 'scale' | 'opacity'
    value: string          // "0 0.5 0" for position/rotation, "1.2" for scale, "0.8" for opacity
    easing: string         // 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
}

export interface ARAsset {
    id: string
    name: string
    type: '3d' | 'video' | 'occlusion' | 'image'
    url: string
    scale: number
    position: [number, number, number]
    rotation: [number, number, number]
    video_autoplay?: boolean
    video_loop?: boolean
    video_muted?: boolean
    video_width?: number // Aspect ratio width (relative to height=1)
    video_height?: number
    keyframes?: VideoKeyframe[]
    animation_duration?: number
    loop_animation?: boolean
    occlusion_shape?: 'model' | 'cube' | 'sphere' | 'plane'

    // Image settings
    image_width?: number  // Aspect ratio width
    image_height?: number // Aspect ratio height

    // 3D Animation settings
    animation_mode?: 'auto' | 'loop_clips' | 'tap_to_play'
    enable_tap_animation?: boolean

    // Sequential Animation
    steps?: AnimationStep[]
}

// Multi-target support
export interface TargetConfig {
    targetIndex: number      // Index in .mind file (0-based)
    name: string             // Display name for admin UI
    thumbnail?: string       // Reference image thumbnail
    assets: ARAsset[]        // Assets for THIS target only
    extends?: number         // Inherit from target index
}

export interface ImageTrackingConfig {
    // Multi-target mode
    targets?: TargetConfig[]
    max_track?: number
    default_assets?: ARAsset[] // Global fallback assets

    // Legacy mode
    assets?: ARAsset[]
    marker_url?: string // .mind file URL

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
    const [uploadingField, setUploadingField] = useState<string | null>(null)

    // UI State for premium templates
    const [activeTab, setActiveTab] = useState<string>('content')
    const [showPreview, setShowPreview] = useState(false)
    const [debugMode, setDebugMode] = useState(true)
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

    // Pro Mixer Redesign State
    const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<string[]>([])
    const [previewMode, setPreviewMode] = useState<'ar' | 'studio'>('ar')

    // Smart Compiler State
    const [isCompiling, setIsCompiling] = useState(false)
    const [compileProgress, setCompileProgress] = useState(0)
    const [compileStatus, setCompileStatus] = useState<string>('')
    const smartCompileInputRef = useRef<HTMLInputElement>(null)
    const addMoreInputRef = useRef<HTMLInputElement>(null)
    const [showCompileModeModal, setShowCompileModeModal] = useState(false)
    const [pendingCompileFiles, setPendingCompileFiles] = useState<File[]>([])
    const [compileAppendMode, setCompileAppendMode] = useState(false) // false = replace, true = append

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
                    rotation: config.model_rotation || [0, 0, 0]
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
            setUploadingField(subPath)
            const url = await onUpload(file, `${subPath}/${Date.now()}_${file.name}`)
            if (key !== 'temp_url' && key !== 'temp') {
                setConfig({ ...config, [key]: url })
            }
            setUploadingField(null)
            return url
        } catch (error) {
            console.error(error)
            setUploadingField(null)
            alert('Upload thất bại')
            return null
        }
    }

    // Specialized handler for .mind file upload with auto-detect target count
    const handleMarkerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingField('marker_url')

            // Read file as ArrayBuffer for parsing
            const buffer = await file.arrayBuffer()
            const { targetCount, version } = parseMindFile(buffer)

            // Upload the file
            const url = await onUpload(file, `markers/${Date.now()}_${file.name}`)

            // Update config with marker URL
            setConfig(prev => {
                const newConfig = { ...prev, marker_url: url }

                // Auto-generate targets if count detected
                if (targetCount > 0) {
                    const existingTargets = prev.targets || []

                    // Only auto-generate if no targets exist or user confirms
                    if (existingTargets.length === 0 || confirm(`Phát hiện ${targetCount} targets trong file .mind.\nBạn có muốn tự động tạo ${targetCount} targets mới không?\n\n(Chọn Cancel để giữ nguyên targets hiện tại)`)) {
                        const newTargets: TargetConfig[] = Array.from({ length: targetCount }, (_, i) => ({
                            targetIndex: i,
                            name: `Target ${i}`,
                            assets: []
                        }))
                        newConfig.targets = newTargets
                        newConfig.max_track = Math.min(targetCount, 3) // Default max_track

                        // Note: Selection reset will happen naturally when targets change
                        console.log(`✅ Auto-generated ${targetCount} targets from .mind file (version ${version})`)
                    }
                }

                return newConfig
            })

            setUploadingField(null)
        } catch (error) {
            console.error('Marker upload error:', error)
            setUploadingField(null)
            alert('Upload thất bại')
        }
    }

    // Smart Compiler Handler - Replace Mode (replaces all targets)
    const handleSmartCompile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return
        const files = Array.from(fileList)

        // Store files and show modal - REPLACE mode
        setPendingCompileFiles(files)
        setCompileAppendMode(false)
        setShowCompileModeModal(true)

        // Reset input so same file can be selected again
        if (smartCompileInputRef.current) {
            smartCompileInputRef.current.value = ''
        }
    }

    // Add More Targets Handler - Append Mode (adds to existing targets)
    const handleAddMoreTargets = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return
        const files = Array.from(fileList)

        // Store files and show modal - APPEND mode
        setPendingCompileFiles(files)
        setCompileAppendMode(true)
        setShowCompileModeModal(true)

        // Reset input so same file can be selected again
        if (addMoreInputRef.current) {
            addMoreInputRef.current.value = ''
        }
    }

    // Actual Compile Logic - Called from modal
    const startCompile = async (useSmartMode: boolean) => {
        setShowCompileModeModal(false)
        const files = pendingCompileFiles
        if (files.length === 0) return

        try {
            setIsCompiling(true)
            setCompileProgress(0)

            let processedFiles: File[];
            let targetsPerImage: number;

            if (useSmartMode) {
                // SMART MODE: 5 angles per image
                setCompileStatus(`Đang xử lý ${files.length} ảnh (Tạo biến thể 5 góc)...`)
                const { processFilesForCompiler } = await import('@/lib/image-processor')
                processedFiles = await processFilesForCompiler(files)
                targetsPerImage = 5;
            } else {
                // QUICK MODE: 1 target per image (just optimize, no variations)
                setCompileStatus(`Đang xử lý ${files.length} ảnh (Quick Mode)...`)
                const { optimizeImageFile } = await import('@/lib/image-processor')
                processedFiles = await Promise.all(files.map(f => optimizeImageFile(f)))
                targetsPerImage = 1;
            }

            // 2. Compiling
            setCompileStatus(`Đang training Neural Network (${processedFiles.length} targets)...`)
            await new Promise(r => setTimeout(r, 100))

            const blob = await compileFiles(processedFiles, (progress) => {
                setCompileProgress(Math.round(progress))
            })

            // 3. Uploading .mind file
            setCompileStatus('Đang upload file .mind...')
            const mindFile = new File([blob], `smart_batch_${Date.now()}.mind`, { type: 'application/octet-stream' })
            const url = await onUpload(mindFile, `markers/${mindFile.name}`)

            // 4. Generate and Upload Thumbnails for ALL processed files (including perspectives)
            setCompileStatus('Đang tạo thumbnails...')
            const { generateThumbnail } = await import('@/lib/image-processor')
            const thumbnailUrls: string[] = []
            for (let i = 0; i < processedFiles.length; i++) {
                try {
                    const thumbFile = await generateThumbnail(processedFiles[i])
                    const thumbUrl = await onUpload(thumbFile, `thumbnails/${thumbFile.name}`)
                    thumbnailUrls.push(thumbUrl)
                } catch (err) {
                    console.error('Thumbnail generation failed for:', processedFiles[i].name, err)
                    thumbnailUrls.push('') // Empty if failed
                }
            }

            // 5. Auto Config
            setConfig(prev => {
                const newTargets: TargetConfig[] = []

                // Calculate base index for append mode
                const existingCount = compileAppendMode ? (prev.targets?.length || 0) : 0
                const existingTargets = compileAppendMode ? (prev.targets || []) : []

                files.forEach((originalFile, fileIdx) => {
                    const baseName = originalFile.name.split('.')[0]

                    if (targetsPerImage === 5) {
                        // SMART MODE: 5 targets per image with inheritance
                        const baseIndex = existingCount + fileIdx * 5
                        const thumbBaseIdx = fileIdx * 5 // Index in thumbnailUrls array

                        // Main target (0°)
                        newTargets.push({
                            targetIndex: baseIndex,
                            name: baseName,
                            assets: [],
                            thumbnail: thumbnailUrls[thumbBaseIdx] || ''
                        })
                        // Perspective targets (Left, Right, Top, Bottom)
                        const angles = ['Left', 'Right', 'Top', 'Bottom']
                        angles.forEach((angle, i) => {
                            newTargets.push({
                                targetIndex: baseIndex + i + 1,
                                name: `${baseName} (${angle})`,
                                assets: [],
                                extends: baseIndex,
                                thumbnail: thumbnailUrls[thumbBaseIdx + i + 1] || '' // Each angle gets its own thumbnail
                            })
                        })
                    } else {
                        // QUICK MODE: 1 target per image
                        newTargets.push({
                            targetIndex: existingCount + fileIdx,
                            name: baseName,
                            assets: [],
                            thumbnail: thumbnailUrls[fileIdx] || ''
                        })
                    }
                })

                // Combine: existing (if append) + new
                const finalTargets = [...existingTargets, ...newTargets]

                return {
                    ...prev,
                    marker_url: url, // Note: In append mode, this replaces the old .mind file
                    targets: finalTargets,
                    max_track: Math.min(finalTargets.length, 3)
                }
            })

            setIsCompiling(false)
            setCompileStatus('')
            setPendingCompileFiles([])
            const mode = targetsPerImage === 5 ? 'Smart' : 'Quick'
            alert(`${mode} Compile thành công! Đã tạo ${processedFiles.length} targets từ ${files.length} ảnh.`)

        } catch (error) {
            console.error('Smart Compile Failed:', error)
            setIsCompiling(false)
            setCompileStatus('')
            alert('Có lỗi xảy ra khi Smart Compile')
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
            setUploadingField(`prize-${index}`)
            const url = await onUpload(file, `prizes/${Date.now()}_${file.name}`)
            updatePrize(index, { image: url })
            setUploadingField(null)
        } catch (error) {
            setUploadingField(null)
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Lucky Draw</h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Premium Configuration</p>
                            </div>
                        </div>
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                            {[
                                { id: 'prizes', icon: <Layers size={14} />, label: 'Prizes' },
                                { id: 'branding', icon: <ImageIcon size={14} />, label: 'Branding' },
                                { id: 'rules', icon: <Settings size={14} />, label: 'Rules' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-white/60 hover:text-white uppercase tracking-tighter'}`}
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
                                        <div className={`text-xs font-black px-2 py-0.5 rounded ${totalProb === 100 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            TOTAL: {totalProb}%
                                        </div>
                                        {totalProb !== 100 && <span className="text-[9px] font-bold text-red-400 italic">Needs to be exactly 100%</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={addPrize}
                                    className="px-6 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add New Prize
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {prizes.length > 0 ? (
                                    prizes.map((prize: Prize, idx: number) => (
                                        <div key={idx} className="group bg-[#121212] border border-white/5 p-4 rounded-[2rem] shadow-xl hover:border-orange-500/30 transition-all duration-300">
                                            <div className="flex items-center gap-6">
                                                <div className="relative w-20 h-20 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                    {prize.image ? (
                                                        <img src={prize.image} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <ImageIcon size={24} className="text-white/10" />
                                                    )}
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handlePrizeImageUpload(e, idx)} />
                                                    <div className="absolute inset-0 bg-orange-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Upload size={16} className="text-white" />
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                                    <div className="md:col-span-5 space-y-1">
                                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Prize Name</label>
                                                        <input
                                                            value={prize.name}
                                                            onChange={e => updatePrize(idx, { name: e.target.value })}
                                                            className="w-full bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 placeholder:text-white/10"
                                                            placeholder="Enter prize name..."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-widest text-center block">Probability (%)</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={prize.probability}
                                                                onChange={e => updatePrize(idx, { probability: Number(e.target.value) })}
                                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-center text-white focus:border-orange-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-widest text-center block">Theme Color</label>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={prize.color}
                                                                onChange={e => updatePrize(idx, { color: e.target.value })}
                                                                className="w-10 h-10 border-4 border-black shadow-lg rounded-xl cursor-pointer p-0"
                                                            />
                                                            <span className="font-mono text-[9px] font-bold text-white/50 uppercase">{prize.color}</span>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <button onClick={() => removePrize(idx)} className="p-3 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 text-center space-y-4">
                                        <div className="w-16 h-16 bg-[#121212] rounded-2xl shadow-xl flex items-center justify-center mx-auto text-white/10 border border-white/5"><Plus size={32} /></div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tighter">No prizes added yet</p>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Add your first prize to start the wheel</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <section className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                                    <ImageIcon size={14} className="text-orange-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Visual Branding</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Logo & Banner */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Brand Logo</label>
                                            <div className="flex items-center gap-6 p-6 bg-black/40 rounded-3xl border border-white/5">
                                                <div className="relative w-24 h-24 rounded-2xl bg-black border border-white/10 p-2 shadow-inner flex-shrink-0">
                                                    {config.logo_url ? (
                                                        <>
                                                            <img src={config.logo_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('logo_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-white shadow-lg"><Trash2 size={10} /></button>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={24} /></div>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold py-2 px-4 bg-orange-500 text-white rounded-xl cursor-pointer hover:bg-orange-600 transition shadow-lg inline-block">
                                                        UPLOAD LOGO
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'logos')} />
                                                    </label>
                                                    <p className="text-[9px] text-white/40 font-medium">Clear PNG, 512x512px</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Header Banner</label>
                                            <div className="relative aspect-[21/9] rounded-3xl border-2 border-dashed border-white/10 bg-black/40 overflow-hidden group">
                                                {config.banner_url ? (
                                                    <>
                                                        <img src={config.banner_url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <button onClick={() => updateConfig('banner_url', '')} className="bg-red-500 text-white p-3 rounded-2xl shadow-2xl transition hover:bg-red-600"><Trash2 size={20} /></button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-orange-500/10 transition-colors">
                                                        <Upload size={24} className="text-white/40" />
                                                        <span className="text-[10px] font-black text-white/60 uppercase mt-2">Upload Banner</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner_url', 'branding')} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Asset Customization */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Custom Center Button</label>
                                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4 text-center">
                                                <div className="relative w-24 h-24 mx-auto rounded-full bg-black border border-white/10 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                                                    {config.spin_btn_url ? (
                                                        <>
                                                            <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('spin_btn_url', '')} className="absolute inset-0 bg-red-500/80 text-white opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><Trash2 size={16} /></button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-orange-500 uppercase">QUAY</span>
                                                    )}
                                                </div>
                                                <label className="text-[10px] font-bold py-2 px-6 bg-[#121212] border border-white/5 text-white/60 rounded-xl cursor-pointer hover:bg-white hover:text-black transition shadow-lg inline-block">
                                                    REPLACE BUTTON
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'spin_btn_url', 'branding')} />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Wheel Pointer Icon</label>
                                            <div className="flex items-center gap-6 p-6 bg-black/40 rounded-3xl border border-white/5">
                                                <div className="w-16 h-16 bg-black rounded-2xl border border-white/10 flex items-center justify-center p-2 relative">
                                                    {config.pointer_url ? (
                                                        <>
                                                            <img src={config.pointer_url} className="w-full h-full object-contain" />
                                                            <button onClick={() => updateConfig('pointer_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-white"><Trash2 size={10} /></button>
                                                        </>
                                                    ) : (
                                                        <span className="text-2xl text-white">▼</span>
                                                    )}
                                                </div>
                                                <label className="text-[10px] font-bold py-2 px-4 bg-[#121212] border border-white/5 text-white/60 rounded-xl cursor-pointer hover:bg-white hover:text-black transition shadow-lg inline-block">
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
                            <section className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                                    <Settings size={14} className="text-orange-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Game Rules & Terms</h4>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Nội dung thể lệ (HTML Supported)</label>
                                    <textarea
                                        value={config.rules_text || ''}
                                        onChange={e => updateConfig('rules_text', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 p-6 rounded-[2rem] text-sm text-white font-mono leading-relaxed outline-none focus:border-orange-500/50 transition-all shadow-inner"
                                        rows={10}
                                        placeholder="Enter rules here..."
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/10">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">💡 Tip</p>
                                            <p className="text-[10px] text-blue-400/60 italic">Sử dụng &lt;b&gt; hoặc &lt;li&gt; để làm nổi bật nội dung.</p>
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
                                <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center gap-2">
                                    Game Preview
                                </h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em]">Live Spin Simulation</p>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-black rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] border-[12px] border-[#1a1a1a] ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.02] overflow-hidden">
                            {/* Inner Screen */}
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-[#0a0a0a] flex flex-col border border-white/5">
                                {/* Theme Mockup */}
                                <div className="absolute inset-0 bg-[#0a0a0a]">
                                    {/* Header Banner Mockup */}
                                    <div className="h-24 w-full bg-white/5 relative overflow-hidden">
                                        {config.banner_url ? (
                                            <img src={config.banner_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-2xl rotate-3 text-center px-4 uppercase">LUCKY DRAW</div>
                                        )}
                                        {config.logo_url && (
                                            <img src={config.logo_url} className="absolute bottom-4 left-4 w-10 h-10 bg-black/40 border border-white/10 rounded-xl shadow-lg p-1" />
                                        )}
                                    </div>

                                    {/* Wheel Mockup (Simplified representation) */}
                                    <div className="mt-12 flex flex-col items-center justify-center space-y-10">
                                        <div className="relative">
                                            {/* Pointer */}
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 z-20 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                                {config.pointer_url ? (
                                                    <img src={config.pointer_url} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="text-orange-500 text-3xl">▼</div>
                                                )}
                                            </div>

                                            {/* Wheel Disk */}
                                            <div className="w-64 h-64 rounded-full border-[8px] border-orange-500/20 bg-black shadow-[0_0_40px_rgba(249,115,22,0.1)] relative overflow-hidden flex items-center justify-center border-dashed">
                                                {prizes.length > 0 ? (
                                                    <div className="w-full h-full relative" style={{ transform: 'rotate(0deg)' }}>
                                                        {prizes.map((p: Prize, i: number) => {
                                                            const angle = 360 / prizes.length
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full origin-bottom"
                                                                    style={{
                                                                        width: '1px',
                                                                        transform: `rotate(${i * angle}deg)`,
                                                                        background: 'rgba(255,255,255,0.05)'
                                                                    }}
                                                                >
                                                                    <div className="absolute top-4 -translate-x-1/2 w-8 h-8 rounded-full border border-white/20 shadow-xl" style={{ backgroundColor: p.color || '#333' }}></div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-black text-white/10 uppercase italic">Add Prizes</div>
                                                )}

                                                {/* Center Button */}
                                                <div className="absolute inset-0 m-auto w-16 h-16 bg-[#121212] rounded-full shadow-2xl border-4 border-orange-500 z-10 flex items-center justify-center overflow-hidden">
                                                    {config.spin_btn_url ? (
                                                        <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">SPIN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-48 h-10 bg-orange-500 rounded-full shadow-lg shadow-orange-900/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer">
                                            <span className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Live Simulation</span>
                                        </div>
                                    </div>

                                    {/* Rules placeholder */}
                                    <div className="mt-8 px-6 space-y-4">
                                        <div className="h-2 w-24 bg-white/5 rounded-full"></div>
                                        <div className="space-y-2">
                                            <div className="h-1.5 w-full bg-white/2 rounded-full"></div>
                                            <div className="h-1.5 w-full bg-white/2 rounded-full"></div>
                                            <div className="h-1.5 w-3/4 bg-white/2 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Label */}
                        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0 animate-pulse">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-white tracking-tight">Gamification Ready</h5>
                                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">{prizes.length} Prizes Configured</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
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
                    <div className="flex items-center gap-4 bg-[#121212] p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">AR Check-in</h3>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Premium Configuration</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Frame Upload Section */}
                        <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                                <Layers size={14} className="text-blue-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Frame Configuration</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Event Frame (.PNG)</label>
                                    <div className="relative aspect-[9/16] rounded-[2.5rem] border-2 border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 group hover:border-blue-400 hover:bg-blue-500/5 transition-all duration-500 cursor-pointer overflow-hidden shadow-inner">
                                        {config.frame_url ? (
                                            <div className="relative w-full h-full">
                                                <img src={config.frame_url} className="w-full h-full object-contain drop-shadow-2xl" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateConfig('frame_url', '') }}
                                                        className="bg-red-500 text-white p-3 rounded-2xl hover:bg-red-600 transition shadow-2xl"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl shadow-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform border border-white/5">
                                                    {uploadingField === 'frames' ? <Loader2 size={24} className="text-blue-500 animate-spin" /> : <Upload size={24} className="text-blue-500" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tighter">{uploadingField === 'frames' ? 'Uploading...' : 'Upload Frame'}</p>
                                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">PNG Transparent ONLY</p>
                                                </div>
                                            </div>
                                        )}
                                        <input type="file" disabled={uploadingField === 'frames'} className="absolute inset-0 opacity-0 cursor-pointer" accept=".png" onChange={e => handleFileUpload(e, 'frame_url', 'frames')} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">User Instructions</label>
                                        <textarea
                                            value={config.instructions || ''}
                                            onChange={e => updateConfig('instructions', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 p-6 rounded-[2rem] text-sm text-white font-medium leading-relaxed outline-none focus:border-blue-500/50 transition-all shadow-inner"
                                            rows={6}
                                            placeholder="Ví dụ: Hãy cười thật tươi và tạo dáng cùng thần tượng..."
                                        />
                                    </div>

                                    <div className="bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/10 space-y-3">
                                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <HelpCircle size={14} /> Design Tips
                                        </h5>
                                        <ul className="text-[10px] text-blue-400/60 font-bold space-y-2 uppercase tracking-tight">
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
                                <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center gap-2">
                                    Frame Preview
                                </h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em]">AR Overlay Simulation</p>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-black rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] border-[12px] border-[#1a1a1a] ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.02] overflow-hidden">
                            {/* Inner Screen */}
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center">
                                {/* Simulation Camera Background */}
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-40"></div>

                                {/* The Frame Overlay */}
                                {config.frame_url && (
                                    <img src={config.frame_url} className="absolute inset-0 w-full h-full object-contain z-10 animate-in fade-in zoom-in duration-500" />
                                )}

                                {/* Camera Interface Mockup */}
                                <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">
                                    <div className="flex justify-between items-start pt-4">
                                        <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                                            <ChevronRight size={18} className="rotate-180" />
                                        </div>
                                        <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                                            AR CAMERA
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 pb-4">
                                        {config.instructions && (
                                            <div className="bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl text-white text-[9px] font-black uppercase tracking-widest text-center border border-white/20 max-w-[80%] shadow-2xl">
                                                {config.instructions}
                                            </div>
                                        )}
                                        <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Label */}
                        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 animate-pulse">
                                <Maximize size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-white tracking-tight">AR Layer Active</h5>
                                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">High-Precision Masking</p>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-900/20">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Face Filter</h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Premium Configuration</p>
                            </div>
                        </div>
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                            {[
                                { id: 'content', icon: <Box size={14} />, label: 'Content' },
                                { id: 'transform', icon: <Maximize size={14} />, label: 'Transform' },
                                { id: 'settings', icon: <Settings size={14} />, label: 'Settings' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-[#1a1a1a] text-pink-500 shadow-xl border border-white/10' : 'text-white/60 hover:text-white uppercase tracking-tighter'}`}
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
                                <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 flex items-center gap-2">
                                            <Layers size={14} /> Asset Type & Content
                                        </h4>
                                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                                            <button
                                                onClick={() => updateConfig('filter_type', '2d')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${config.filter_type !== '3d' ? 'bg-[#1a1a1a] text-pink-500 shadow-xl border border-white/10' : 'text-white/40'}`}
                                            >
                                                2D STICKER
                                            </button>
                                            <button
                                                onClick={() => updateConfig('filter_type', '3d')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${config.filter_type === '3d' ? 'bg-[#1a1a1a] text-pink-500 shadow-xl border border-white/10' : 'text-white/40'}`}
                                            >
                                                3D MODEL
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Main Content</label>
                                            <div className="relative aspect-square rounded-[2rem] border-2 border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 group hover:border-pink-500 hover:bg-pink-500/5 transition-all duration-500 cursor-pointer overflow-hidden shadow-inner">
                                                {config.filter_url || config.filter_3d_url ? (
                                                    <div className="relative w-full h-full">
                                                        {config.filter_type === '3d' ? (
                                                            <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-2xl shadow-inner border border-white/5">
                                                                <Box size={48} className="text-pink-500" />
                                                            </div>
                                                        ) : (
                                                            <img src={config.filter_url} className="w-full h-full object-contain drop-shadow-2xl" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateConfig(config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', '') }}
                                                                className="bg-red-500 text-white p-3 rounded-2xl hover:bg-red-600 transition shadow-2xl"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-4">
                                                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl shadow-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform border border-white/5">
                                                            {uploadingField === 'filters' ? <Loader2 size={24} className="text-pink-500 animate-spin" /> : <Upload size={24} className="text-pink-500" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white uppercase tracking-tighter">{uploadingField === 'filters' ? 'Uploading...' : `Upload ${config.filter_type === '3d' ? '.GLB' : '.PNG'}`}</p>
                                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Sử dụng định dạng file tối ưu</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <input type="file" disabled={uploadingField === 'filters'} className="hidden" accept={config.filter_type === '3d' ? '.glb,.gltf' : '.png'} onChange={e => handleFileUpload(e, config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', 'filters')} />
                                                {!config.filter_url && !config.filter_3d_url && <input type="file" disabled={uploadingField === 'filters'} className="absolute inset-0 opacity-0 cursor-pointer" accept={config.filter_type === '3d' ? '.glb,.gltf' : '.png'} onChange={e => handleFileUpload(e, config.filter_type === '3d' ? 'filter_3d_url' : 'filter_url', 'filters')} />}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            {/* Client Logo */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Client Logo</label>
                                                <div className="flex items-center gap-6 p-6 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                                                    <div className="relative w-16 h-16 rounded-2xl bg-black border border-white/10 p-2 shadow-xl flex-shrink-0 overflow-hidden">
                                                        {config.logo_url ? (
                                                            <>
                                                                <img src={config.logo_url} className="w-full h-full object-contain" />
                                                                <button onClick={() => updateConfig('logo_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-lg border-2 border-black/50 shadow-lg active:scale-95 transition-transform"><Trash2 size={10} /></button>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={20} /></div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={`text-[10px] font-black py-2.5 px-6 bg-[#1a1a1a] border border-white/10 text-white rounded-xl cursor-pointer hover:bg-pink-500/10 hover:border-pink-500/50 hover:text-pink-500 transition-all shadow-xl inline-flex items-center gap-2 uppercase tracking-widest ${uploadingField === 'logos' ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            {uploadingField === 'logos' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                            CHANGE LOGO
                                                            <input type="file" disabled={uploadingField === 'logos'} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'logos')} />
                                                        </label>
                                                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Kích thước gợi ý: 400x400px</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Hướng dẫn (Scan-hint)</label>
                                                <input
                                                    value={config.instructions || ''}
                                                    onChange={e => updateConfig('instructions', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm text-white font-medium outline-none focus:border-pink-500/50 transition-all shadow-inner placeholder:text-white/10"
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
                                <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                                        <Maximize size={14} className="text-pink-500" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Anchor & Position</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Anchor Point Selector */}
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Anchor Point (Điểm neo)</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {ANCHOR_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateConfig('anchor_position', opt.value)}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${config.anchor_position === opt.value ? 'bg-pink-500/10 border-pink-500 text-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/10 text-white/60'}`}
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
                                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Kích thước (Scale)</span>
                                                    <span className="text-xs font-black text-pink-500 px-3 py-1 bg-pink-500/10 rounded-lg border border-pink-500/20 shadow-xl shadow-pink-500/5">{(config.filter_scale ?? 0.5)}x</span>
                                                </div>
                                                <div className="relative h-6 flex items-center">
                                                    <div className="absolute inset-0 h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{ width: `${((config.filter_scale ?? 0.5) / 2) * 100}%` }} />
                                                    </div>
                                                    <input type="range" min="0.1" max="2" step="0.05" value={config.filter_scale ?? 0.5} onChange={(e) => updateConfig('filter_scale', parseFloat(e.target.value))} className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer z-10" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 p-8 bg-black/40 rounded-[2.5rem] border border-white/5 shadow-inner">
                                                {[
                                                    { label: 'Dịch ngang (X)', key: 'offset_x', min: -0.5, max: 0.5, color: '#3b82f6' },
                                                    { label: 'Dịch dọc (Y)', key: 'offset_y', min: -0.5, max: 0.5, color: '#a855f7' },
                                                    { label: 'Độ sâu (Z)', key: 'offset_z', min: -1, max: 1, color: '#22c55e' }
                                                ].map(axis => (
                                                    <div key={axis.key} className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{axis.label}</span>
                                                            <span className="text-[10px] font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{config[axis.key] || 0}</span>
                                                        </div>
                                                        <div className="relative h-4 flex items-center">
                                                            <div className="absolute inset-0 h-1 bg-white/5 rounded-full" />
                                                            <input type="range" min={axis.min} max={axis.max} step="0.01" value={config[axis.key] || 0} onChange={(e) => updateConfig(axis.key, parseFloat(e.target.value))} className="relative w-full h-1 bg-transparent appearance-none cursor-pointer accent-white hover:accent-pink-500 transition-all" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    onClick={() => setConfig({ ...config, filter_scale: 0.5, offset_x: 0, offset_y: 0, offset_z: 0 })}
                                                    className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
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
                                <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                                        <Settings size={14} className="text-pink-500" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Occlusion & Rendering</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block flex items-center gap-1">
                                                <Eye size={12} className="text-blue-400" /> Head Occluder (Che phủ đầu)
                                            </label>
                                            <button
                                                onClick={() => updateConfig('full_head_occlusion', !config.full_head_occlusion)}
                                                className={`flex items-center justify-between w-full p-6 rounded-3xl border transition-all ${config.full_head_occlusion ? 'bg-pink-500/10 border-pink-500 text-pink-500 shadow-xl shadow-pink-500/5' : 'bg-black/40 border-white/5 text-white/40'}`}
                                            >
                                                <div className="text-left">
                                                    <span className="text-xs font-black uppercase tracking-tight block">Full Head Occluder</span>
                                                    <p className="text-[10px] opacity-70 mt-1 font-medium">Bật nếu filter có phần che khuất sau đầu (mũ, nón...)</p>
                                                </div>
                                                <div className={`w-10 h-6 rounded-full relative transition-colors ${config.full_head_occlusion ? 'bg-pink-500' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-xl ${config.full_head_occlusion ? 'left-5' : 'left-1'}`} />
                                                </div>
                                            </button>

                                            {config.full_head_occlusion && (
                                                <div className="space-y-6 p-8 bg-black/40 rounded-3xl border border-pink-500/10 mt-4 animate-in zoom-in-95 duration-200 shadow-inner">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Kích thước Occluder</span>
                                                            <span className="text-xs font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{config.occlusion_radius ?? 0.15}</span>
                                                        </div>
                                                        <input type="range" min="0.1" max="0.5" step="0.01" value={config.occlusion_radius ?? 0.15} onChange={(e) => updateConfig('occlusion_radius', parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Capture Controls</label>
                                            <div className="space-y-4">
                                                <div className="p-8 bg-black/40 rounded-3xl border border-white/5 space-y-6 shadow-inner">
                                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Nút Chụp (Button Style)</label>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex-1">
                                                            <input
                                                                value={config.capture_btn_text || 'CHỤP ẢNH'}
                                                                onChange={e => updateConfig('capture_btn_text', e.target.value)}
                                                                className="w-full bg-[#1a1a1a] border border-white/10 px-6 py-4 rounded-2xl text-xs text-white font-black uppercase tracking-widest outline-none focus:border-pink-500/50 transition-all placeholder:text-white/5 shadow-xl"
                                                                placeholder="CHỤP ẢNH"
                                                            />
                                                        </div>
                                                        <label className="w-16 h-16 rounded-2xl cursor-pointer border-2 border-white/20 shadow-2xl transition-transform active:scale-95 flex-shrink-0 bg-pink-500 ring-4 ring-pink-500/10" style={{ backgroundColor: config.capture_btn_color || '#ec4899' }}>
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
                                <h3 className="font-black text-xl text-white uppercase tracking-tighter flex items-center gap-2">
                                    Face Preview
                                </h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em]">AR Face Tracking</p>
                            </div>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                                <button
                                    onClick={() => setDebugMode(!debugMode)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debugMode ? 'bg-[#1a1a1a] text-pink-500 shadow-xl border border-white/10' : 'text-white/40 hover:text-white uppercase'}`}
                                >
                                    MESH: {debugMode ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-black rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] border-[12px] border-[#1a1a1a] ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.02]">
                            {/* Camera Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-40 bg-[#1a1a1a] rounded-b-3xl z-40 flex items-center justify-center gap-4">
                                <div className="w-16 h-1 bg-white/10 rounded-full"></div>
                                <div className="w-2 h-2 bg-blue-500/40 rounded-full"></div>
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
                                    <div className="text-center p-12 space-y-8">
                                        <div className="relative">
                                            <div className="w-28 h-28 bg-gradient-to-tr from-pink-600 to-pink-400 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-pink-500/40 relative z-10 border border-white/20 scale-110">
                                                <Camera size={44} className="text-white" />
                                            </div>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
                                        </div>
                                        <div className="space-y-6 relative z-10">
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-tighter text-xl">Start Simulation</h4>
                                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] mt-2 leading-relaxed">Kết nối Camera để xem Filter<br />ngay trên gương mặt bạn</p>
                                            </div>
                                            <button
                                                onClick={() => setShowPreview(true)}
                                                className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-pink-500 hover:text-white transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                                            >
                                                Start Camera
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Label */}
                        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0 animate-pulse">
                                <Camera size={18} />
                            </div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-white tracking-tight">System Ready</h5>
                                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">Real-time Soft Updates Active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // RENDER: Image Tracking
    if (template === 'image_tracking') {
        const [selectedTargetIndex, setSelectedTargetIndex] = useState(0)
        const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null)
        const [timelineZoom, setTimelineZoom] = useState(100)
        // Clone/Inherit Modal State
        const [showCloneInheritModal, setShowCloneInheritModal] = useState(false)
        const [cloneInheritMode, setCloneInheritMode] = useState<'clone' | 'inherit'>('clone')
        const [pendingActionTargetIndex, setPendingActionTargetIndex] = useState<number>(0)

        // Initialize targets if missing (Migration/Init)
        useEffect(() => {
            if (!config.targets || config.targets.length === 0) {
                const initialTargets: TargetConfig[] = [{
                    targetIndex: 0,
                    name: 'Target 0',
                    assets: config.assets || []
                }]
                setConfig(prev => ({
                    ...prev,
                    targets: initialTargets,
                    max_track: prev.max_track || 3
                }))
            }
        }, [])

        // Get Current Target & Assets
        // Index -1 = GLOBAL DEFAULTS
        const currentTarget = selectedTargetIndex === -1
            ? { targetIndex: -1, name: 'GLOBAL DEFAULTS', assets: config.default_assets || [] }
            : (config.targets?.[selectedTargetIndex] || { targetIndex: 0, name: 'Target 0', assets: [] })

        const isInherited = currentTarget.extends !== undefined
        const currentAssets = isInherited
            ? (config.targets?.find((t: any) => t.targetIndex === currentTarget.extends)?.assets || [])
            : (currentTarget.assets || [])

        // Initialize selected asset if not set but assets exist
        if (!selectedAssetId && currentAssets.length > 0) {
            // Defer state update to avoid loops, or just rely on user click.
            // Actually, the original code did this. Let's keep it safe.
            // setSelectedAssetId(currentAssets[0].id)
        }

        const selectedAsset = currentAssets.find((a: ARAsset) => a.id === selectedAssetId)

        // Target Management
        const updateConfig = (key: string, value: any) => {
            setConfig({ ...config, [key]: value })
        }

        const addTarget = () => {
            const newIndex = (config.targets?.length || 0)
            const newTarget: TargetConfig = {
                targetIndex: newIndex,
                name: `Target ${newIndex}`,
                assets: []
            }
            const newTargets = [...(config.targets || []), newTarget]
            updateConfig('targets', newTargets)
            setSelectedTargetIndex(newIndex)
            setSelectedAssetId(null)
        }

        const removeTarget = (index: number) => {
            const targets = config.targets || []
            if (targets.length <= 1) {
                alert("Cannot remove the last target")
                return
            }
            // Remove and re-index
            const newTargets = targets
                .filter((_, i) => i !== index)
                .map((t: TargetConfig, i) => ({ ...t, targetIndex: i, name: t.name.startsWith('Target ') ? `Target ${i}` : t.name }))

            updateConfig('targets', newTargets)

            // Adjust selection
            if (selectedTargetIndex >= index) {
                setSelectedTargetIndex(Math.max(0, selectedTargetIndex - 1))
            }
            setSelectedAssetId(null)
        }

        const updateTarget = (index: number, updates: Partial<TargetConfig>) => {
            // GLOBAL
            if (index === -1) {
                if (updates.assets) {
                    updateConfig('default_assets', updates.assets)
                }
                return
            }

            const newTargets = (config.targets || []).map((t: TargetConfig, i) =>
                i === index ? { ...t, ...updates } : t
            )
            updateConfig('targets', newTargets)
        }

        const handleClone = (targetIndex: number) => {
            setPendingActionTargetIndex(targetIndex)
            setCloneInheritMode('clone')
            setShowCloneInheritModal(true)
            setMenuOpenIndex(null)
        }

        const handleInherit = (targetIndex: number) => {
            setPendingActionTargetIndex(targetIndex)
            setCloneInheritMode('inherit')
            setShowCloneInheritModal(true)
            setMenuOpenIndex(null)
        }

        const executeCloneInherit = (parentIdx: number) => {
            setShowCloneInheritModal(false)
            const targetIdx = pendingActionTargetIndex

            // Check self-reference
            if (config.targets?.[targetIdx]?.targetIndex === parentIdx) {
                alert('Không thể chọn chính target này!')
                return
            }

            if (cloneInheritMode === 'clone') {
                // Clone: Copy assets
                let assetsToClone: ARAsset[] = []
                if (parentIdx === -1) {
                    assetsToClone = config.default_assets || []
                } else {
                    const parent = config.targets?.find((t: any) => t.targetIndex === parentIdx)
                    assetsToClone = parent?.assets || []
                }

                if (assetsToClone.length === 0) {
                    alert('Target nguồn không có assets!')
                    return
                }

                // Deep copy assets
                const newAssets = JSON.parse(JSON.stringify(assetsToClone))
                // Regenerate IDs
                newAssets.forEach((a: ARAsset) => a.id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
                updateTarget(targetIdx, { assets: newAssets, extends: undefined })
            } else {
                // Inherit: Link to parent
                updateTarget(targetIdx, { extends: parentIdx, assets: [] })
            }
        }

        // Asset Management (Scoped to Selected Target)
        const addAsset = (type: '3d' | 'video' | 'occlusion' | 'image') => {
            const newAsset: ARAsset = {
                id: `asset-${Date.now()}`,
                name: type === '3d' ? 'New 3D Model' : (type === 'occlusion' ? 'New Occlusion' : (type === 'image' ? 'New Image' : 'New Video')),
                type,
                url: '',
                scale: 1,
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                video_autoplay: true,
                video_loop: true,
                occlusion_shape: 'model',
                image_width: 1,
                image_height: 1
            }

            const updatedAssets = [...currentAssets, newAsset]
            updateTarget(selectedTargetIndex, { assets: updatedAssets })
            setSelectedAssetId(newAsset.id)
        }

        const removeAsset = (id: string) => {
            const updatedAssets = currentAssets.filter((a: ARAsset) => a.id !== id)
            updateTarget(selectedTargetIndex, { assets: updatedAssets })
            if (selectedAssetId === id) setSelectedAssetId(null)
        }

        const updateAsset = (id: string, updates: Partial<ARAsset>) => {
            const updatedAssets = currentAssets.map((a: ARAsset) =>
                a.id === id ? { ...a, ...updates } : a
            )
            updateTarget(selectedTargetIndex, { assets: updatedAssets })
        }

        // Pro Mixer: Drag Handlers
        const updateKeyframe = (kfId: string, updates: Partial<VideoKeyframe>) => {
            if (!selectedAssetId || !selectedAsset) return
            const newKeyframes = (selectedAsset.keyframes || []).map(kf =>
                kf.id === kfId ? { ...kf, ...updates } : kf
            )
            updateAsset(selectedAssetId, { keyframes: newKeyframes })
        }

        const deleteKeyframes = (ids: string[]) => {
            if (!selectedAssetId || !selectedAsset) return
            const newKeyframes = (selectedAsset.keyframes || []).filter(kf => !ids.includes(kf.id))
            updateAsset(selectedAssetId, { keyframes: newKeyframes })
            setSelectedKeyframeIds(prev => prev.filter(id => !ids.includes(id)))
        }

        const bulkUpdateEasing = (ids: string[], easing: string) => {
            if (!selectedAssetId || !selectedAsset || !easing) return
            const newKeyframes = (selectedAsset.keyframes || []).map(kf =>
                ids.includes(kf.id) ? { ...kf, easing } : kf
            )
            updateAsset(selectedAssetId, { keyframes: newKeyframes })
        }

        const addKeyframeAtTime = (prop: string, time: number) => {
            if (!selectedAssetId) return
            const newKeyframe: VideoKeyframe = {
                id: `kf-${Date.now()}`,
                time,
                property: prop as any,
                value: prop === 'scale' ? "1 1 1" : (prop === 'opacity' ? "1" : "0 0 0"),
                easing: 'linear'
            };
            updateAsset(selectedAssetId, { keyframes: [...(selectedAsset?.keyframes || []), newKeyframe] });
        }

        return (
            <div className="flex flex-col xl:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 max-w-full">
                {/* Left Column: Configuration */}
                <div className="flex-1 space-y-8">

                    {/* -1. Marker Configuration */}
                    {/* Unified AR Space Configuration */}
                    <section className="bg-[#121212] border border-white/5 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col min-h-[600px] border-l-4 border-l-purple-500">

                        {/* 1. Header & Marker Actions */}
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                        <Layers className="text-purple-500" size={20} /> AR Space Config
                                    </h3>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                                        Quản lý Marker & Targets
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Marker Status Badge */}
                                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${config.marker_url ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                        {config.marker_url ? <Check size={12} /> : <AlertCircle size={12} />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {config.marker_url ? 'Active' : 'Missing'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center gap-2">
                                {/* Upload Button */}
                                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] hover:bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 group`}>
                                    <Upload size={16} className="text-white/40 group-hover:text-white transition-colors" />
                                    <span>Upload .mind</span>
                                    <input
                                        type="file"
                                        disabled={uploadingField === 'marker_url'}
                                        className="hidden"
                                        accept=".mind"
                                        onChange={handleMarkerUpload}
                                    />
                                </label>

                                {/* Smart Batch Button */}
                                <label className="flex-1 relative inline-flex items-center justify-center px-4 py-3 overflow-hidden font-black text-white transition duration-300 ease-out border border-white/10 rounded-xl shadow-md group cursor-pointer bg-[#1a1a1a] hover:bg-white/5">
                                    <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:translate-x-0 ease">
                                        <Sparkles size={18} className="text-white" />
                                    </span>
                                    <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">
                                        <span className="flex items-center gap-2 text-xs uppercase tracking-widest">
                                            <Sparkles size={16} className="text-purple-500" /> Smart Batch
                                        </span>
                                    </span>
                                    <span className="relative invisible flex items-center gap-2 text-xs uppercase tracking-widest">
                                        <Sparkles size={16} /> Smart Batch
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        accept="image/png,image/jpeg"
                                        onChange={handleSmartCompile}
                                        disabled={isCompiling}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* 0. Target Manager */}
                        {/* 2. Target List */}
                        <div className="border-b border-white/5 bg-black/20 flex flex-col max-h-[300px] shrink-0">
                            {/* Header */}
                            <div className="p-3 px-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/50 backdrop-blur-md z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                                    <ImageIcon size={12} /> Target List ({config.targets?.length || 0})
                                </h4>
                                {/* Add Target via Upload */}
                                <label className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50">
                                    <Plus size={14} />
                                    <input
                                        type="file"
                                        ref={addMoreInputRef}
                                        multiple
                                        className="hidden"
                                        accept="image/png,image/jpeg"
                                        onChange={handleAddMoreTargets}
                                        disabled={isCompiling || (config.targets?.length || 0) >= 100}
                                    />
                                </label>
                            </div>

                            <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 gap-2">

                                    {config.targets?.map((target: TargetConfig, idx: number) => (
                                        <div
                                            key={target.targetIndex}
                                            onClick={() => { setSelectedTargetIndex(idx); setSelectedAssetId(null); }}
                                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${selectedTargetIndex === idx
                                                ? 'bg-[#1a1a1a] border border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                {/* Thumbnail or Index */}
                                                {target.thumbnail ? (
                                                    <img
                                                        src={target.thumbnail}
                                                        alt={target.name}
                                                        className={`w-10 h-10 rounded-lg object-cover border ${selectedTargetIndex === idx ? 'border-pink-500' : 'border-white/10'}`}
                                                    />
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs border border-white/10 ${selectedTargetIndex === idx ? 'bg-pink-500 text-white' : 'bg-white/5 text-white/40'}`}>
                                                        {target.targetIndex}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={target.name}
                                                        onChange={(e) => updateTarget(idx, { name: e.target.value })}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-transparent border-none p-0 text-sm font-black uppercase tracking-tight text-white focus:ring-0 w-full placeholder:text-white/20"
                                                        placeholder={`Target ${target.targetIndex}`}
                                                    />
                                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                                        {target.assets?.length || 0} Assets
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setMenuOpenIndex(menuOpenIndex === idx ? null : idx)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>

                                                {menuOpenIndex === idx && (
                                                    <div className="absolute right-0 top-8 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleClone(idx); }}
                                                            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all uppercase tracking-wider text-left"
                                                        >
                                                            <Copy size={12} /> Clone Content
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleInherit(idx); }}
                                                            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all uppercase tracking-wider text-left"
                                                        >
                                                            <Link size={12} /> Inherit Content
                                                        </button>
                                                        <div className="h-px bg-white/5 my-0.5" />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                                            disabled={(config.targets?.length || 0) <= 1}
                                                            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-all uppercase tracking-wider text-left disabled:opacity-50"
                                                        >
                                                            <Trash2 size={12} /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 1. Asset Manager */}
                        {/* 3. Asset Manager */}
                        <div className="flex-1 bg-black/10 flex flex-col relative overflow-hidden">
                            {/* Header */}
                            <div className="p-3 px-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/30">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                                    <Layers size={12} /> {currentTarget ? `Assets: ${currentTarget.name}` : 'Select a Target'}
                                </h4>
                                <div className="flex items-center gap-1">
                                    {isInherited ? (
                                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px]">
                                            <Link size={10} className="text-blue-500" />
                                            <span className="text-blue-400 font-bold uppercase tracking-wider">Linked</span>
                                            <button
                                                onClick={() => updateTarget(selectedTargetIndex, { extends: undefined, assets: [] })}
                                                className="ml-1 px-1.5 py-0.5 bg-blue-500 hover:bg-blue-600 text-white rounded-[4px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Unlink
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => addAsset('3d')} title="Add 3D Model" className="p-1.5 hover:bg-white/10 rounded-md text-blue-400 transition-colors"><Box size={14} /></button>
                                            <button onClick={() => addAsset('video')} title="Add Video" className="p-1.5 hover:bg-white/10 rounded-md text-purple-400 transition-colors"><Video size={14} /></button>
                                            <button onClick={() => addAsset('image')} title="Add Image" className="p-1.5 hover:bg-white/10 rounded-md text-green-400 transition-colors"><ImageIcon size={14} /></button>
                                            <button onClick={() => addAsset('occlusion')} title="Add Occlusion" className="p-1.5 hover:bg-white/10 rounded-md text-red-400 transition-colors"><EyeOff size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Asset Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {currentAssets.length > 0 ? (
                                    currentAssets.map((asset: ARAsset) => (
                                        <div
                                            key={asset.id}
                                            onClick={() => setSelectedAssetId(asset.id)}
                                            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedAssetId === asset.id
                                                ? 'bg-white/10 border border-white/20'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`p-1.5 rounded-md ${asset.type === '3d' ? 'bg-blue-500/20 text-blue-400' : (asset.type === 'image' ? 'bg-green-500/20 text-green-400' : (asset.type === 'video' ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'))}`}>
                                                    {asset.type === '3d' ? <Box size={10} /> : (asset.type === 'image' ? <ImageIcon size={10} /> : (asset.type === 'video' ? <Video size={10} /> : <EyeOff size={10} />))}
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${selectedAssetId === asset.id ? 'text-white' : 'text-white/60'}`}>
                                                    {asset.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                                        <Layers size={24} className="mb-2 opacity-50" />
                                        <p className="text-[9px] uppercase tracking-widest font-bold">No Assets</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 2. Selected Asset Configuration */}
                    {selectedAsset ? (
                        <section className="bg-[#121212] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-xl">
                            <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 px-3 border border-white/10 rounded-lg text-[8px] font-black uppercase bg-[#1a1a1a] shadow-xl text-white/60 tracking-widest">
                                        ID: {selectedAsset.id.slice(-4)}
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedAsset.name}
                                        onChange={(e) => updateAsset(selectedAsset.id, { name: e.target.value })}
                                        className="bg-transparent font-black text-white border-none p-0 focus:ring-0 w-48 text-lg uppercase tracking-tighter"
                                    />
                                </div>
                                <nav className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                                    {[
                                        { id: 'transform', label: 'Transform', icon: Maximize },
                                        { id: 'content', label: 'Asset', icon: Upload },
                                        { id: 'animation', label: 'Timeline', icon: Play }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest ${activeTab === tab.id
                                                ? 'bg-orange-500 text-white shadow-xl scale-105'
                                                : 'text-white/60 hover:text-white'
                                                }`}
                                        >
                                            <tab.icon size={12} /> {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-8">
                                {/* TAB: Transform */}
                                {activeTab === 'transform' && (
                                    <div className="space-y-10">
                                        {/* Scale Slider */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                                                    Kích thước (Scale)
                                                </label>
                                                <span className="text-xs font-black bg-orange-500/10 px-4 py-1 rounded-full text-orange-500 shadow-xl border border-orange-500/20">
                                                    {selectedAsset.scale.toFixed(2)}x
                                                </span>
                                            </div>
                                            <div className="relative h-6 flex items-center">
                                                <div className="absolute inset-0 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${(selectedAsset.scale / 5) * 100}%` }} />
                                                </div>
                                                <input
                                                    type="range" min="0.01" max="5" step="0.01"
                                                    value={selectedAsset.scale}
                                                    onChange={(e) => updateAsset(selectedAsset.id, { scale: parseFloat(e.target.value) })}
                                                    className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer z-10"
                                                />
                                            </div>
                                        </div>

                                        {/* Position Sliders */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {['X-Axis', 'Y-Axis', 'Z-Axis'].map((axis, i) => (
                                                <div key={axis} className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{axis}</label>
                                                        <span className="font-black text-[10px] text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{selectedAsset.position[i].toFixed(2)}</span>
                                                    </div>
                                                    <div className="relative h-4 flex items-center">
                                                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full" />
                                                        <input
                                                            type="range" min="-3" max="3" step="0.01"
                                                            value={selectedAsset.position[i]}
                                                            onChange={(e) => {
                                                                const newPos = [...selectedAsset.position] as [number, number, number]
                                                                newPos[i] = parseFloat(e.target.value)
                                                                updateAsset(selectedAsset.id, { position: newPos })
                                                            }}
                                                            className="relative w-full h-4 bg-transparent appearance-none cursor-pointer accent-blue-500 hover:accent-orange-500 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Rotation Sliders */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                                            {['Pitch', 'Yaw', 'Roll'].map((axis, i) => (
                                                <div key={axis} className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{axis}</label>
                                                        <span className="font-black text-[10px] text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{selectedAsset.rotation[i]}°</span>
                                                    </div>
                                                    <div className="relative h-4 flex items-center">
                                                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full" />
                                                        <input
                                                            type="range" min="-180" max="180" step="1"
                                                            value={selectedAsset.rotation[i]}
                                                            onChange={(e) => {
                                                                const newRot = [...selectedAsset.rotation] as [number, number, number]
                                                                newRot[i] = parseInt(e.target.value)
                                                                updateAsset(selectedAsset.id, { rotation: newRot })
                                                            }}
                                                            className="relative w-full h-4 bg-transparent appearance-none cursor-pointer accent-purple-500 hover:accent-orange-500 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: Content Specific */}
                                {activeTab === 'content' && (
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        {/* Occlusion Shape Selector */}
                                        {selectedAsset.type === 'occlusion' && (
                                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                                                        Geometry Type
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['model', 'cube', 'sphere', 'plane'].map((type) => (
                                                        <button
                                                            key={type}
                                                            onClick={() => updateAsset(selectedAsset.id, { occlusion_shape: type as any })}
                                                            className={`
                                                                py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all
                                                                ${(selectedAsset.occlusion_shape || 'model') === type
                                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg'
                                                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'
                                                                }
                                                            `}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* File Upload / Link - Only for Model type or non-occlusion */}
                                        {((selectedAsset.type !== 'occlusion') || ((selectedAsset.occlusion_shape || 'model') === 'model')) && (
                                            <div className="bg-black/40 p-8 rounded-3xl border border-white/5 space-y-6 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                                                        Nguồn {(selectedAsset.type === '3d' || selectedAsset.type === 'occlusion') ? '3D Model (.glb)' : (selectedAsset.type === 'image' ? 'Image (.png/.webp)' : 'Video (.mp4/.webm)')}
                                                    </label>
                                                    {selectedAsset.url && <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-1 uppercase tracking-widest"><Check size={10} /> ĐÃ UPLOAD</span>}
                                                </div>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Dán URL file ở đây hoặc nhấn nút Upload..."
                                                        value={selectedAsset.url}
                                                        onChange={(e) => updateAsset(selectedAsset.id, { url: e.target.value })}
                                                        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-xl placeholder:text-white/5"
                                                    />
                                                    <label className={`bg-orange-600 text-white p-4 rounded-2xl cursor-pointer hover:bg-orange-500 active:scale-95 transition-all shadow-2xl shadow-orange-900/40 border border-white/10 ${uploadingField === 'content' ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        {uploadingField === 'content' ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                                                        <input
                                                            type="file"
                                                            disabled={uploadingField === 'content'}
                                                            className="hidden"
                                                            accept={(selectedAsset.type === '3d' || selectedAsset.type === 'occlusion') ? '.glb' : (selectedAsset.type === 'image' ? '.png,.webp,.jpg,.jpeg' : '.mp4,.webm,.webp')}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0]
                                                                const url = await handleFileUpload(e, 'temp_url', 'content')
                                                                if (url && file) {
                                                                    // Use filename if asset name is default
                                                                    const currentAssetName = selectedAsset.name
                                                                    const isDefaultName = currentAssetName === 'New 3D Model' || currentAssetName === 'New Video' || currentAssetName === 'New Occlusion' || currentAssetName === 'New Image'
                                                                    const newName = isDefaultName ? file.name : currentAssetName

                                                                    // Auto-detect video dimensions
                                                                    if (selectedAsset.type === 'video') {
                                                                        const videoEl = document.createElement('video')
                                                                        videoEl.src = URL.createObjectURL(file)
                                                                        videoEl.onloadedmetadata = () => {
                                                                            const aspectRatio = videoEl.videoWidth / videoEl.videoHeight
                                                                            updateAsset(selectedAsset.id, {
                                                                                url,
                                                                                name: newName,
                                                                                video_width: parseFloat(aspectRatio.toFixed(2)),
                                                                                video_height: 1
                                                                            })
                                                                            URL.revokeObjectURL(videoEl.src)
                                                                        }
                                                                    } else {
                                                                        updateAsset(selectedAsset.id, { url, name: newName })
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>


                                                {/* Preview Player for Video */}
                                                {selectedAsset.type === 'video' && selectedAsset.url && (
                                                    <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black ring-1 ring-white/5">
                                                        <div className="bg-[#1a1a1a] px-5 py-3 border-b border-white/5 flex justify-between items-center text-white/60">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Video Preview</span>
                                                            <Video size={14} />
                                                        </div>
                                                        <video
                                                            src={selectedAsset.url}
                                                            controls
                                                            className="w-full max-h-[300px] object-contain"
                                                            crossOrigin="anonymous"
                                                            playsInline
                                                        >
                                                            Your browser does not support the video tag.
                                                        </video>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Video Specific Settings */}
                                        {selectedAsset.type === 'video' && (
                                            <div className="grid grid-cols-2 gap-8 bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tỷ lệ Rộng (AR plane)</label>
                                                    <input type="number" step="0.1" value={selectedAsset.video_width || 1} onChange={(e) => updateAsset(selectedAsset.id, { video_width: parseFloat(e.target.value) })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-orange-500/50 outline-none transition-all" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tỷ lệ Cao (AR plane)</label>
                                                    <input type="number" step="0.1" value={selectedAsset.video_height || 0.56} onChange={(e) => updateAsset(selectedAsset.id, { video_height: parseFloat(e.target.value) })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-orange-500/50 outline-none transition-all" />
                                                </div>
                                                <div className="col-span-2 flex flex-wrap gap-4 pt-4">
                                                    <button
                                                        onClick={() => updateAsset(selectedAsset.id, { video_loop: !selectedAsset.video_loop })}
                                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-xl ${selectedAsset.video_loop ? 'bg-orange-500 text-white border-orange-500' : 'bg-[#1a1a1a] text-white/60 border-white/10 hover:border-orange-500/50 hover:text-white'
                                                            }`}
                                                    >
                                                        <RefreshCw size={14} className={selectedAsset.video_loop ? 'animate-spin-slow' : ''} /> Lặp lại video
                                                    </button>
                                                    <button
                                                        onClick={() => updateAsset(selectedAsset.id, { video_muted: !selectedAsset.video_muted })}
                                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-xl ${selectedAsset.video_muted ? 'bg-white/10 text-white border-white/20' : 'bg-[#1a1a1a] text-white/60 border-white/10 hover:border-white'
                                                            }`}
                                                    >
                                                        <Activity size={14} /> {selectedAsset.video_muted ? 'Đã tắt tiếng' : 'Có tiếng'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Image Specific Settings */}
                                        {selectedAsset.type === 'image' && (
                                            <div className="space-y-6 bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                                                <div className="flex items-center gap-2 text-white/50">
                                                    <ImageIcon size={16} className="text-green-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Kích thước Image Plane</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Chiều rộng</label>
                                                            <span className="font-black text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{(selectedAsset.image_width || 1).toFixed(1)}</span>
                                                        </div>
                                                        <div className="relative h-4 flex items-center">
                                                            <input
                                                                type="range" min="0.1" max="5" step="0.1"
                                                                value={selectedAsset.image_width || 1}
                                                                onChange={(e) => updateAsset(selectedAsset.id, { image_width: parseFloat(e.target.value) })}
                                                                className="relative w-full cursor-pointer accent-green-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Chiều cao</label>
                                                            <span className="font-black text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{(selectedAsset.image_height || 1).toFixed(1)}</span>
                                                        </div>
                                                        <div className="relative h-4 flex items-center">
                                                            <input
                                                                type="range" min="0.1" max="5" step="0.1"
                                                                value={selectedAsset.image_height || 1}
                                                                onChange={(e) => updateAsset(selectedAsset.id, { image_height: parseFloat(e.target.value) })}
                                                                className="relative w-full cursor-pointer accent-green-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Image Preview */}
                                                {selectedAsset.url && (
                                                    <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a]">
                                                        <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Preview</span>
                                                            <ImageIcon size={12} className="text-green-500" />
                                                        </div>
                                                        <div className="p-4 flex justify-center" style={{ background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 50% / 16px 16px' }}>
                                                            <img src={selectedAsset.url} alt="Preview" className="max-h-[200px] object-contain" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: Animation Specific */}
                                {activeTab === 'animation' && (
                                    <div className="space-y-12 animate-in fade-in duration-500">
                                        {/* Unified Pro Mixer Timeline */}
                                        <div className="bg-black/60 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden group/timeline ring-1 ring-white/5">
                                            <div className="p-4 border-b border-white/5 bg-gradient-to-r from-orange-500/5 to-transparent flex items-center justify-between">
                                                {/* Zoom Controls */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setTimelineZoom(z => Math.max(10, z - 10))}
                                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all border border-white/5"
                                                        title="Zoom Out"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-[10px] font-black text-white/40 w-12 text-center uppercase tracking-widest">{timelineZoom}%</span>
                                                    <button
                                                        onClick={() => setTimelineZoom(z => Math.min(200, z + 10))}
                                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all border border-white/5"
                                                        title="Zoom In"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                {/* Duration Control */}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Duration</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="1"
                                                            value={selectedAsset.animation_duration || 5}
                                                            onChange={(e) => updateAsset(selectedAsset.id, { animation_duration: parseFloat(e.target.value) })}
                                                            className="w-10 bg-transparent text-white font-black text-center text-xs outline-none"
                                                        />
                                                        <span className="text-[9px] font-black text-white/30 uppercase">s</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <ProMixerTimeline
                                                keyframes={selectedAsset.keyframes || []}
                                                duration={selectedAsset.animation_duration || 5}
                                                onKeyframeUpdate={(id, updates) => updateKeyframe(id, updates)}
                                                onKeyframeSelect={setSelectedKeyframeIds}
                                                onAddKeyframe={(prop, time) => addKeyframeAtTime(prop, time)}
                                                selectedIds={selectedKeyframeIds}
                                                zoom={timelineZoom}
                                            />
                                        </div>

                                        {/* Dynamic Keyframe Inspector (Selection Based) */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 flex items-center gap-2">
                                                    <Maximize size={14} /> Keyframe Inspector
                                                </h4>
                                                {selectedKeyframeIds.length > 0 && (
                                                    <button
                                                        onClick={() => deleteKeyframes(selectedKeyframeIds)}
                                                        className="text-[10px] font-black text-red-400/60 uppercase tracking-widest hover:text-red-400 transition-all flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> Delete Selected ({selectedKeyframeIds.length})
                                                    </button>
                                                )}
                                            </div>

                                            {selectedKeyframeIds.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedKeyframeIds.map(id => {
                                                        const kf = selectedAsset.keyframes?.find(k => k.id === id)
                                                        if (!kf) return null
                                                        return (
                                                            <div key={id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-orange-500/30 transition-all group">
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${kf.property === 'position' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                                        kf.property === 'rotation' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                                                            kf.property === 'scale' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                                                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                                                        }`}>
                                                                        {kf.property}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock size={12} className="text-white/20" />
                                                                        <span className="text-xs font-black text-white/60">{kf.time.toFixed(1)}s</span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Target Value</label>
                                                                    {(kf.property === 'position' || kf.property === 'rotation' || kf.property === 'scale') ? (
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {['X', 'Y', 'Z'].map((axis, idx) => {
                                                                                const values = kf.value.split(' ')
                                                                                return (
                                                                                    <div key={axis} className="space-y-1">
                                                                                        <span className="text-[8px] text-white/20 font-bold uppercase">{axis}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.1"
                                                                                            value={values[idx] || '0'}
                                                                                            onChange={(e) => {
                                                                                                const newValues = [...values]
                                                                                                newValues[idx] = e.target.value
                                                                                                updateKeyframe(kf.id, { value: newValues.join(' ') })
                                                                                            }}
                                                                                            className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white text-center font-mono focus:border-orange-500 outline-none transition-all"
                                                                                        />
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            min="0"
                                                                            max="1"
                                                                            value={kf.value}
                                                                            onChange={(e) => updateKeyframe(kf.id, { value: e.target.value })}
                                                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white text-center font-mono focus:border-orange-500 outline-none transition-all shadow-inner"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Easing</label>
                                                                    <select
                                                                        value={kf.easing}
                                                                        onChange={(e) => updateKeyframe(kf.id, { easing: e.target.value })}
                                                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500 transition-all"
                                                                    >
                                                                        {['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic'].map(e => (
                                                                            <option key={e} value={e} className="bg-[#121212]">{e}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}

                                                    {/* Bulk Edit Option (if multiple selected) */}
                                                    {selectedKeyframeIds.length > 1 && (
                                                        <div className="col-span-full bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                                                                    <Layers size={20} className="text-white" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-sm text-white uppercase tracking-tight">Bulk Edit Easing</h5>
                                                                    <p className="text-[10px] text-orange-200/60 font-medium">Apply same easing to {selectedKeyframeIds.length} keyframes</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {['linear', 'easeInOutQuad', 'easeInOutCubic'].map(e => (
                                                                    <button
                                                                        key={e}
                                                                        onClick={() => bulkUpdateEasing(selectedKeyframeIds, e)}
                                                                        className="px-4 py-2 bg-black/40 hover:bg-orange-500 text-[10px] text-white font-black uppercase tracking-widest rounded-xl border border-white/5 transition-all shadow-xl"
                                                                    >
                                                                        {e}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 border-2 border-dashed border-white/5 rounded-[2.5rem] p-16 text-center space-y-4 group/hint hover:border-white/10 transition-all">
                                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover/hint:scale-110 transition-transform duration-500 border border-white/5">
                                                        <Activity size={24} className="text-white/20" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-white/40 uppercase tracking-widest">No Keyframes Selected</p>
                                                        <p className="text-[10px] text-white/20 font-medium">Click on a diamond in the timeline to view and edit its detailed properties.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 4. Loop Toggle */}
                                        <div className="pt-6 border-t border-white/5">
                                            <label className="flex items-center gap-4 cursor-pointer group bg-orange-500/5 p-8 rounded-[2rem] border border-orange-500/10 hover:bg-orange-500/10 transition-all">
                                                <div className={`w-14 h-7 rounded-full relative transition-all duration-500 ${selectedAsset.loop_animation ? 'bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'bg-white/5 border border-white/10'}`}>
                                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-500 ${selectedAsset.loop_animation ? 'translate-x-7 scale-110 shadow-lg' : 'opacity-40'}`} />
                                                </div>
                                                <input type="checkbox" checked={selectedAsset.loop_animation || false} onChange={(e) => updateAsset(selectedAsset.id, { loop_animation: e.target.checked })} className="hidden" />
                                                <div className="space-y-1">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-orange-400 transition-colors">Vòng lặp Animation (Loop)</span>
                                                    <p className="text-[10px] text-white/40 font-medium uppercase tracking-[0.1em]">Tự động khởi động lại chuỗi keyframe sau khi kết thúc.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section >
                    ) : (
                        <div className="bg-orange-500/5 rounded-[2.5rem] border-2 border-dashed border-orange-500/10 p-20 text-center space-y-6">
                            <div className="w-24 h-24 bg-orange-500/10 rounded-[2rem] shadow-2xl shadow-orange-500/5 flex items-center justify-center mx-auto border border-orange-500/20 animate-pulse">
                                <Box size={40} className="text-orange-300" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white uppercase">Sẵn sàng thiết kế AR</h3>
                                <p className="text-white/60 max-w-sm mx-auto text-sm font-medium leading-relaxed">Chọn một asset từ danh sách bên trên hoặc thêm mới để bắt đầu cấu hình các thuộc tính 3D.</p>
                            </div>
                        </div>
                    )
                    }

                    {/* 3. Global Settings */}
                    <section className="bg-[#121212] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-black/80 border border-white/5 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] pointer-events-none group-hover:bg-orange-500/20 transition-all duration-1000"></div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10">
                                    <Settings size={20} className="text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-2xl uppercase tracking-tighter">THIẾT LẬP CHUNG</h3>
                                    <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.3em]">GLOBAL SCENE CONFIGURATION</p>
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
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">AMBIENT LIGHT</span>
                                            <span className="text-xs font-black text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10 shadow-inner">{(config.ambient_intensity || 1.0).toFixed(1)}</span>
                                        </div>
                                        <div className="relative h-6 flex items-center">
                                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${((config.ambient_intensity || 1) / 3) * 100}%` }} />
                                            </div>
                                            <input type="range" min="0" max="3" step="0.1" value={config.ambient_intensity || 1} onChange={(e) => updateConfig('ambient_intensity', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="absolute w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] pointer-events-none top-1/2 -translate-y-1/2" style={{ left: `calc(${((config.ambient_intensity || 1) / 3) * 100}% - 8px)` }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">PHƠI SÁNG (EXPOSURE)</span>
                                            <span className="text-xs font-black text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10 shadow-inner">{(config.exposure || 1.0).toFixed(1)}</span>
                                        </div>
                                        <div className="relative h-6 flex items-center">
                                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${((config.exposure || 1) / 3) * 100}%` }} />
                                            </div>
                                            <input type="range" min="0.1" max="3" step="0.1" value={config.exposure || 1} onChange={(e) => updateConfig('exposure', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="absolute w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] pointer-events-none top-1/2 -translate-y-1/2" style={{ left: `calc(${((config.exposure || 1) / 3) * 100}% - 8px)` }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">ENVIRONMENT MAP (HDR)</label>
                                        <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 shadow-inner group focus-within:border-orange-500/50 transition-all">
                                            <input type="text" value={config.environment_url || ''} onChange={(e) => updateConfig('environment_url', e.target.value)} className="flex-1 bg-transparent border-none rounded-lg px-4 py-2 text-xs text-white outline-none placeholder:text-white/5 font-mono" placeholder="https://..." />
                                            <label className="bg-orange-500 text-white p-3 rounded-xl cursor-pointer hover:bg-orange-600 transition shadow-lg shadow-orange-900/40">
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
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">VIDEO DURATION (SECONDS)</span>
                                            <span className="text-xs font-black text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10 shadow-inner">{config.max_video_duration || 30}s</span>
                                        </div>
                                        <div className="relative h-6 flex items-center">
                                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-white/20" style={{ width: `${((config.max_video_duration || 30) / 60) * 100}%` }} />
                                            </div>
                                            <input type="range" min="5" max="60" step="5" value={config.max_video_duration || 30} onChange={(e) => updateConfig('max_video_duration', parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] pointer-events-none top-1/2 -translate-y-1/2" style={{ left: `calc(${((config.max_video_duration || 30) / 60) * 100}% - 8px)` }}></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <button
                                            onClick={() => updateConfig('enable_capture', !config.enable_capture)}
                                            className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all duration-500 scale-active group ${config.enable_capture ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.1)]' : 'bg-white/5 border-white/5 text-white/40'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${config.enable_capture ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-white/40'}`}>
                                                    <Camera size={20} />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${config.enable_capture ? 'text-orange-500' : 'text-white/40'}`}>CHO PHÉP CHỤP/QUAY</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${config.enable_capture ? 'border-orange-500 bg-orange-500 rotate-0' : 'border-white/10 bg-transparent rotate-90'}`}>
                                                {config.enable_capture && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => updateConfig('show_scan_hint', config.show_scan_hint === false)}
                                            className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all duration-500 scale-active group ${config.show_scan_hint !== false ? 'bg-blue-600/10 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)]' : 'bg-white/5 border-white/5 text-white/40'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${config.show_scan_hint !== false ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/40'}`}>
                                                    <HelpCircle size={20} />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${config.show_scan_hint !== false ? 'text-blue-500' : 'text-white/40'}`}>HƯỚNG DẪN SCAN</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${config.show_scan_hint !== false ? 'border-blue-600 bg-blue-600 rotate-0' : 'border-white/10 bg-transparent rotate-90'}`}>
                                                {config.show_scan_hint !== false && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </button>
                                    </div>


                                </div>
                            </div>
                        </div>
                    </section>
                </div >

                {/* Right Column: Sticky Preview Panel */}
                < div className="w-full xl:w-[420px] flex-shrink-0" >
                    <div className="xl:sticky xl:top-8 space-y-6">
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

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-[#0c0c0c] rounded-[3.5rem] p-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-[12px] border-[#1a1a1a] ring-2 ring-white/5 transition-transform duration-500 hover:scale-[1.02]">
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-40 bg-[#1a1a1a] rounded-b-3xl z-40 flex items-center justify-center gap-4 border-x border-b border-white/5">
                                <div className="w-16 h-1 bg-white/10 rounded-full shadow-inner"></div>
                                <div className="w-2.5 h-2.5 bg-black rounded-full border border-white/5 ring-1 ring-blue-500/20"></div>
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
                                                <p className="text-white/50 text-[9px] mt-1 italic">Vui lòng cho phép quyền truy cập camera...</p>
                                            </div>
                                        </div>
                                    }>
                                        {previewMode === 'ar' ? (
                                            <ImageTrackingPreview
                                                markerUrl={config.marker_url}
                                                config={config}
                                                onClose={() => setShowPreview(false)}
                                            />
                                        ) : (
                                            <StudioPreview
                                                config={config}
                                                debugMode={debugMode}
                                                onClose={() => setShowPreview(false)}
                                                selectedTargetIndex={selectedTargetIndex}
                                            />
                                        )}
                                    </Suspense>
                                ) : (
                                    <div
                                        onClick={() => setShowPreview(true)}
                                        className="absolute inset-0 flex flex-col items-center justify-center text-white/60 cursor-pointer group bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.05),transparent)] hover:bg-black/80 transition-all duration-700"
                                    >
                                        <div className="w-24 h-24 bg-white/5 shadow-2xl shadow-orange-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-orange-500 transition-all duration-500 transform border border-white/10">
                                            <Play size={40} className="text-orange-500 group-hover:text-white transition-colors fill-current ml-2" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h4 className="text-lg font-black text-white px-8 leading-tight tracking-tight uppercase">Bắt đầu mô phỏng AR</h4>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] group-hover:text-orange-500 transition-all duration-300">Cần quyền truy cập Camera</p>
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
                </div >

                {/* Smart Compile Overlay */}
                {isCompiling && (
                    <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-[400px] max-w-full p-8 text-center space-y-8 relative">
                            {/* Animated Mesh/Brain Effect (Simulated) */}
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-purple-500 animate-spin" />
                                <div className="absolute inset-4 rounded-full border-4 border-white/5 border-t-pink-500 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={32} className="text-white animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 uppercase tracking-tighter">
                                    AI Compiler
                                </h3>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-widest animate-pulse">
                                    {compileStatus}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                                    style={{ width: `${compileProgress}%` }}
                                />
                            </div>
                            <p className="text-white/40 text-[10px] font-mono">{compileProgress}%</p>

                            <p className="text-white/20 text-[9px] italic max-w-[80%] mx-auto">
                                Hệ thống đang tự động tạo 5 góc nhìn biến thể và training Neural Network. Vui lòng không tắt trình duyệt.
                            </p>
                        </div>
                    </div>
                )}

                {/* Compile Mode Selection Modal */}
                {showCompileModeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                                    <Sparkles size={28} className="text-cyan-400" />
                                </div>
                                <h3 className="text-white font-black text-lg tracking-tight">Chọn Chế Độ Compile</h3>
                                <p className="text-white/50 text-xs mt-1">{pendingCompileFiles.length} ảnh đã chọn</p>
                            </div>

                            {/* Mode Options */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {/* Quick Mode */}
                                <button
                                    onClick={() => startCompile(false)}
                                    className="group relative p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-2xl text-left transition-all"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                            <Sparkles size={16} className="text-cyan-400" />
                                        </div>
                                        <span className="font-bold text-white text-sm">Quick</span>
                                    </div>
                                    <ul className="space-y-1.5 text-[10px] text-white/60">
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-cyan-500" /> 1 target/ảnh
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-cyan-500" /> ~30 giây/ảnh
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-cyan-500" /> Tracking cơ bản
                                        </li>
                                    </ul>
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-cyan-500/20 rounded text-[8px] font-bold text-cyan-400 uppercase">
                                        Nhanh
                                    </div>
                                </button>

                                {/* Smart Mode */}
                                <button
                                    onClick={() => startCompile(true)}
                                    className="group relative p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl text-left transition-all"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Sparkles size={16} className="text-purple-400" />
                                        </div>
                                        <span className="font-bold text-white text-sm">Smart</span>
                                    </div>
                                    <ul className="space-y-1.5 text-[10px] text-white/60">
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-purple-500" /> 5 targets/ảnh
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-purple-500" /> 5 góc nhìn
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check size={10} className="text-purple-500" /> Tracking mạnh
                                        </li>
                                    </ul>
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-purple-500/30 rounded text-[8px] font-bold text-purple-300 uppercase flex items-center gap-1">
                                        <Sparkles size={8} /> Khuyên dùng
                                    </div>
                                </button>
                            </div>

                            {/* Cancel */}
                            <button
                                onClick={() => { setShowCompileModeModal(false); setPendingCompileFiles([]) }}
                                className="w-full py-2.5 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                )}

                {/* Clone/Inherit Modal */}
                {showCloneInheritModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="text-center mb-5">
                                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${cloneInheritMode === 'clone' ? 'bg-cyan-500/20' : 'bg-purple-500/20'}`}>
                                    {cloneInheritMode === 'clone' ? (
                                        <Copy size={28} className="text-cyan-400" />
                                    ) : (
                                        <Link size={28} className="text-purple-400" />
                                    )}
                                </div>
                                <h3 className="text-white font-black text-lg tracking-tight">
                                    {cloneInheritMode === 'clone' ? 'Clone Assets' : 'Inherit Content'}
                                </h3>
                                <p className="text-white/50 text-xs mt-1">
                                    {cloneInheritMode === 'clone'
                                        ? 'Sao chép assets từ target khác (tạo bản sao độc lập)'
                                        : 'Liên kết với target khác (thay đổi theo source)'}
                                </p>
                            </div>

                            {/* Target Selection List */}
                            <div className="mb-4">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Chọn Target Nguồn</p>
                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1.5 p-1 -mx-1">
                                    {config.targets?.map((target: TargetConfig, idx: number) => (
                                        target.targetIndex !== pendingActionTargetIndex && (
                                            <button
                                                key={target.targetIndex}
                                                onClick={() => executeCloneInherit(target.targetIndex)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border border-transparent hover:border-white/20 hover:bg-white/5 ${cloneInheritMode === 'clone' ? 'hover:border-cyan-500/30' : 'hover:border-purple-500/30'
                                                    }`}
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs border border-white/10 bg-white/5 text-white/60`}>
                                                    {target.targetIndex}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{target.name}</p>
                                                    <p className="text-[10px] text-white/40">{target.assets?.length || 0} assets</p>
                                                </div>
                                                <ChevronRight size={14} className="text-white/20" />
                                            </button>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Cancel */}
                            <button
                                onClick={() => setShowCloneInheritModal(false)}
                                className="w-full py-2.5 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                )}
            </div >
        )
    }

    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl">
            <Settings size={48} className="text-white/10 mb-4 animate-spin-slow" />
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Template không xác định</h3>
            <p className="text-white/60 text-[10px] mt-2 font-medium">Cấu hình visual cho template này đang được phát triển hoặc không tồn tại.</p>
        </div>
    )
}
