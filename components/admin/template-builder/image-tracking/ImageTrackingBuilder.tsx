import { useState, useRef, lazy, Suspense, useEffect } from 'react'
import { TemplateConfigBuilderProps, ImageTrackingConfig, TargetConfig, ARAsset } from '../types'
import { parseMindFile } from '@/lib/mind-parser'
import { compileFiles } from '@/lib/mind-compiler'
import SmartCompilerModal from './SmartCompilerModal'
import CloneInheritModal from './CloneInheritModal'
import PreviewPhone from '../shared/PreviewPhone'
import TargetList from './TargetList'
import AssetList from './AssetList'
import AssetEditor from './AssetEditor'
import GlobalSettingsPanel from './GlobalSettingsPanel'
import { Play, Camera, Sparkles, Layers, Box, Video, Image as ImageIcon, Trash2, ChevronRight, Plus } from 'lucide-react'

const ImageTrackingPreview = lazy(() => import('../../ImageTrackingPreview'))
const StudioPreview = lazy(() => import('../../StudioPreview'))

export default function ImageTrackingBuilder({ initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {
    const config = initialConfig as ImageTrackingConfig
    const targets = config.targets || []

    // UI State
    const [selectedTargetIndex, setSelectedTargetIndex] = useState<number>(0)
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
    const [isCompiling, setIsCompiling] = useState(false)
    const [compileProgress, setCompileProgress] = useState(0)
    const [compileStatus, setCompileStatus] = useState('')
    const [showCompileModeModal, setShowCompileModeModal] = useState(false)
    const [pendingCompileFiles, setPendingCompileFiles] = useState<File[]>([])
    const [showCloneInheritModal, setShowCloneInheritModal] = useState(false)
    const [cloneInheritMode, setCloneInheritMode] = useState<'clone' | 'inherit'>('clone')
    const [pendingActionTargetIndex, setPendingActionTargetIndex] = useState<number>(-1)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null)
    const [compileAppendMode, setCompileAppendMode] = useState(false)
    const [pendingAssetType, setPendingAssetType] = useState<'3d' | 'video' | 'image' | 'occlusion' | null>(null)
    const [isUploadingAsset, setIsUploadingAsset] = useState(false)
    const [showMaskMenu, setShowMaskMenu] = useState(false)
    const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([])

    // Animation Playback State (Shared between Studio & Timeline)
    const [playbackState, setPlaybackState] = useState({
        isPlaying: false,
        currentTime: 0,
        startTimestamp: 0 // Timestamp when play started
    })

    // Preview State
    const [showPreview, setShowPreview] = useState(false)
    const [previewMode, setPreviewMode] = useState<'ar' | 'studio'>('ar')
    const [debugMode, setDebugMode] = useState(false)

    // Refs
    const smartCompileInputRef = useRef<HTMLInputElement>(null)
    const addMoreInputRef = useRef<HTMLInputElement>(null)
    const assetUploadInputRef = useRef<HTMLInputElement>(null)

    // Helper
    const setConfig = (newConfig: any) => onChange(newConfig)

    // Handlers
    const handleMarkerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            // Read file as ArrayBuffer for parsing
            const buffer = await file.arrayBuffer()
            const { targetCount, version } = parseMindFile(buffer)

            // Upload the file
            const url = await onUpload(file, `markers/${Date.now()}_${file.name}`)

            // Update config with marker URL
            const newConfig = { ...config, marker_url: url }

            // Auto-generate targets if count detected
            if (targetCount > 0) {
                const existingTargets = config.targets || []

                // Only auto-generate if no targets exist or user confirms
                if (existingTargets.length === 0 || confirm(`Phát hiện ${targetCount} targets trong file .mind.\nBạn có muốn tự động tạo ${targetCount} targets mới không?\n\n(Chọn Cancel để giữ nguyên targets hiện tại)`)) {
                    const newTargets: TargetConfig[] = Array.from({ length: targetCount }, (_, i) => ({
                        targetIndex: i,
                        name: `Target ${i}`,
                        assets: []
                    }))
                    newConfig.targets = newTargets
                    newConfig.max_track = Math.min(targetCount, 3) // Default max_track
                    console.log(`✅ Auto-generated ${targetCount} targets from .mind file`)
                }
            }
            setConfig(newConfig)

        } catch (error) {
            console.error('Marker upload error:', error)
            alert('Upload thất bại')
        }
    }

    // Migration Effect for Legacy Image Tracking
    useEffect(() => {
        if (!config.targets || config.targets.length === 0) {
            // Check for legacy single-target props
            const hasLegacyModel = Boolean(config.model_scale || config.model_position || config.model_rotation)
            const hasAssets = Boolean(config.assets && config.assets.length > 0)

            if (hasLegacyModel || hasAssets) {
                const initialAssets = config.assets || []

                // If there were legacy model props but no assets, create a virtual asset
                if (initialAssets.length === 0 && (config.model_scale || config.model_position)) {
                    const legacyAsset: ARAsset = {
                        id: 'legacy-1',
                        name: '3D Model',
                        type: '3d',
                        url: '',
                        scale: config.model_scale || 1,
                        position: config.model_position || [0, 0, 0],
                        rotation: config.model_rotation || [0, 0, 0]
                    }
                    initialAssets.push(legacyAsset)
                }

                const initialTargets: TargetConfig[] = [{
                    targetIndex: 0,
                    name: 'Target 0',
                    assets: initialAssets
                }]

                setConfig({ ...config, targets: initialTargets, max_track: 1 })
            }
        }
    }, []) // Run once on mount

    const handleSmartCompileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return
        setPendingCompileFiles(files)
        setShowCompileModeModal(true)
    }

    const startCompile = async (useSmartMode: boolean, isAppend: boolean) => {
        setShowCompileModeModal(false)
        setCompileAppendMode(isAppend)
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
            const newTargets: TargetConfig[] = []

            // Calculate base index for append mode
            const existingCount = compileAppendMode ? (config.targets?.length || 0) : 0
            const existingTargets = compileAppendMode ? (config.targets || []) : []

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

            setConfig({
                ...config,
                marker_url: url, // Note: In append mode, this replaces the old .mind file
                targets: finalTargets,
                max_track: Math.min(finalTargets.length, 3)
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


    const removeTarget = (index: number) => {
        if (!confirm('Are you sure you want to delete this target?')) return
        const newTargets = targets.filter((_, i) => i !== index).map((t, i) => ({
            ...t,
            targetIndex: i // Re-indexing might be dangerous if .mind file is not updated, but we follow original logic
        }))
        setConfig({ ...config, targets: newTargets })
        if (selectedTargetIndex === index) setSelectedTargetIndex(Math.max(0, index - 1))
    }

    // Asset Management
    const getActiveAssets = () => {
        if (selectedTargetIndex === -1) return config.default_assets || []
        return targets[selectedTargetIndex]?.assets || []
    }

    const handleAddAsset = (type: '3d' | 'video' | 'occlusion' | 'image', options?: { url?: string, shape?: string, name?: string }) => {
        const newAsset: ARAsset = {
            id: Date.now().toString(),
            name: options?.name || `New ${type}`,
            type,
            url: options?.url || '',
            scale: 1,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            ...(options?.shape ? { shape: options.shape } : {})
        }

        let newConfig = { ...config }
        if (selectedTargetIndex === -1) {
            const current = config.default_assets || []
            newConfig = { ...config, default_assets: [...current, newAsset] }
        } else {
            const newTargets = [...targets]
            const target = newTargets[selectedTargetIndex]
            if (target) {
                target.assets = [...(target.assets || []), newAsset]
                newConfig = { ...config, targets: newTargets }
            }
        }

        setConfig(newConfig)
        setSelectedAssetId(newAsset.id)
        setShowMaskMenu(false)
    }

    const handleAssetButtonClick = (type: '3d' | 'video' | 'image' | 'occlusion') => {
        if (type === 'occlusion') {
            setShowMaskMenu(!showMaskMenu)
        } else {
            setPendingAssetType(type)
            assetUploadInputRef.current?.click()
        }
    }

    const handleAssetFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !pendingAssetType) return

        setIsUploadingAsset(true)
        try {
            const fileName = file.name.split('.').slice(0, -1).join('.') || file.name
            const path = `assets/${Date.now()}_${file.name}`
            const url = await onUpload(file, path)
            handleAddAsset(pendingAssetType, { url, name: fileName })
        } catch (error) {
            console.error('Asset upload error:', error)
            alert('Lỗi khi tải file lên')
        } finally {
            setIsUploadingAsset(false)
            setPendingAssetType(null)
            if (assetUploadInputRef.current) assetUploadInputRef.current.value = ''
        }
    }

    const removeAsset = (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return
        let newConfig = { ...config }
        if (selectedTargetIndex === -1) {
            const newAssets = (config.default_assets || []).filter(a => a.id !== id)
            newConfig = { ...config, default_assets: newAssets }
        } else {
            const newTargets = [...targets]
            const target = newTargets[selectedTargetIndex]
            if (target) {
                target.assets = (target.assets || []).filter(a => a.id !== id)
                newConfig = { ...config, targets: newTargets }
            }
        }
        setConfig(newConfig)
        if (selectedAssetId === id) setSelectedAssetId(null)
        setSelectedLayerIds(prev => prev.filter(lid => lid !== id))
    }

    const removeMultipleAssets = (ids: string[]) => {
        if (!confirm(`Are you sure you want to delete ${ids.length} assets?`)) return
        let newConfig = { ...config }
        if (selectedTargetIndex === -1) {
            const newAssets = (config.default_assets || []).filter(a => !ids.includes(a.id))
            newConfig = { ...config, default_assets: newAssets }
        } else {
            const newTargets = [...targets]
            const target = newTargets[selectedTargetIndex]
            if (target) {
                target.assets = (target.assets || []).filter(a => !ids.includes(a.id))
                newConfig = { ...config, targets: newTargets }
            }
        }
        setConfig(newConfig)
        if (selectedAssetId && ids.includes(selectedAssetId)) setSelectedAssetId(null)
        setSelectedLayerIds([])
    }

    const toggleSelectLayer = (id: string) => {
        setSelectedLayerIds(prev =>
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = (assets: ARAsset[]) => {
        if (selectedLayerIds.length === assets.length) {
            setSelectedLayerIds([])
        } else {
            setSelectedLayerIds(assets.map(a => a.id))
        }
    }

    const handleUpdateAsset = (id: string, updates: Partial<ARAsset>) => {
        if (selectedTargetIndex === -1) {
            const newAssets = (config.default_assets || []).map(a => a.id === id ? { ...a, ...updates } : a)
            setConfig({ ...config, default_assets: newAssets })
        } else {
            const newTargets = [...targets]
            const target = newTargets[selectedTargetIndex]
            target.assets = target.assets.map(a => a.id === id ? { ...a, ...updates } : a)
            setConfig({ ...config, targets: newTargets })
        }
    }

    const handleRemoveAsset = (id: string) => {
        if (selectedTargetIndex === -1) {
            const newAssets = (config.default_assets || []).filter(a => a.id !== id)
            setConfig({ ...config, default_assets: newAssets })
        } else {
            const newTargets = [...targets]
            const target = newTargets[selectedTargetIndex]
            target.assets = target.assets.filter(a => a.id !== id)
            setConfig({ ...config, targets: newTargets })
        }
        if (selectedAssetId === id) setSelectedAssetId(null)
    }

    // Animation Handlers
    const togglePlayback = () => {
        setPlaybackState(prev => ({
            ...prev,
            isPlaying: !prev.isPlaying,
            startTimestamp: performance.now(),
            currentTime: prev.currentTime // Keep current time when toggling
        }))
    }

    const seekTime = (time: number) => {
        setPlaybackState(prev => ({
            ...prev,
            isPlaying: false, // Auto-pause on seek for precise editing
            currentTime: time,
            startTimestamp: performance.now()
        }))
    }

    // Clone/Inherit Logic
    const openCloneInheritModal = (index: number, mode: 'clone' | 'inherit') => {
        setPendingActionTargetIndex(index)
        setCloneInheritMode(mode)
        setShowCloneInheritModal(true)
        setMenuOpenIndex(null)
    }

    const executeCloneInherit = (sourceIndex: number) => {
        const newTargets = [...targets]
        const sourceTarget = targets.find(t => t.targetIndex === sourceIndex)
        const destTarget = newTargets[pendingActionTargetIndex]

        if (!sourceTarget || !destTarget) return

        if (cloneInheritMode === 'clone') {
            // Deep copy assets
            const clonedAssets = JSON.parse(JSON.stringify(sourceTarget.assets || []))
            // Generate new IDs
            clonedAssets.forEach((a: ARAsset) => a.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
            destTarget.assets = clonedAssets
            destTarget.extends = undefined // Break inheritance if any
        } else {
            // Inherit
            destTarget.extends = sourceIndex
            destTarget.assets = [] // Clear local assets when inheriting
        }

        setConfig({ ...config, targets: newTargets })
        setShowCloneInheritModal(false)
        alert(`${cloneInheritMode === 'clone' ? 'Cloned' : 'Linked'} successfully!`)
    }

    const activeAssets = getActiveAssets()
    const activeAsset = activeAssets.find(a => a.id === selectedAssetId)

    return (
        <>
            {/* Upload Loading Overlay */}
            {isUploadingAsset && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-orange-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                        </div>
                        <p className="text-white font-black text-sm uppercase tracking-widest">Uploading Asset</p>
                        <p className="text-white/50 text-xs font-medium">Please wait...</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 min-h-[calc(100vh-200px)] animate-in fade-in duration-500 max-w-none">
                {/* Left Column: Target Manage / Hierarchy (1/4) */}
                <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
                    <TargetList
                        config={config}
                        selectedTargetIndex={selectedTargetIndex}
                        onSelectTarget={setSelectedTargetIndex}
                        onRemoveTarget={removeTarget}
                        onSmartCompile={handleSmartCompileSelect}
                        onClone={(idx) => openCloneInheritModal(idx, 'clone')}
                        onInherit={(idx) => openCloneInheritModal(idx, 'inherit')}
                        menuOpenIndex={menuOpenIndex}
                        setMenuOpenIndex={setMenuOpenIndex}
                        smartCompileInputRef={smartCompileInputRef}
                        addMoreInputRef={addMoreInputRef}
                        onMarkerUpload={handleMarkerUpload}
                        // Pass selectedAssetId and onSelectAsset to TargetList for Layer Explorer view
                        selectedAssetId={selectedAssetId}
                        onSelectAsset={setSelectedAssetId}
                    />
                </div>

                {/* Middle Column: Asset Control / Studio (2/4) */}
                <div className="lg:col-span-2 flex flex-col h-full space-y-6 overflow-hidden">
                    <div className="bg-[#0c0c0c] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl flex-1 flex flex-col overflow-hidden">
                        {selectedTargetIndex !== null ? (
                            <>
                                <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 bg-gradient-to-b from-[#fa9440] to-[#e7313d] rounded-full" />
                                        <div className="flex flex-col">
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                                {selectedTargetIndex === -1 ? 'Global Default Assets' : (activeAsset ? `Editing: ${activeAsset.name}` : (targets[selectedTargetIndex]?.name || 'Target Workspace'))}
                                            </h3>
                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">
                                                {selectedTargetIndex === -1 ? 'Fallback assets for all markers' : `Workspace / ${targets[selectedTargetIndex]?.name || 'Target'}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Compact Quick Actions - Right Aligned */}
                                        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 shadow-inner relative">
                                            {[
                                                { type: '3d' as const, icon: <Box size={16} />, label: '3D', color: 'hover:bg-blue-500/20 text-blue-400' },
                                                { type: 'image' as const, icon: <ImageIcon size={16} />, label: 'Img', color: 'hover:bg-emerald-500/20 text-emerald-400' },
                                                { type: 'video' as const, icon: <Video size={16} />, label: 'Vid', color: 'hover:bg-purple-500/20 text-purple-400' },
                                                { type: 'occlusion' as const, icon: <Sparkles size={16} />, label: 'Mask', color: 'hover:bg-orange-500/20 text-orange-400' }
                                            ].map((btn) => (
                                                <button
                                                    key={btn.type}
                                                    onClick={() => handleAssetButtonClick(btn.type)}
                                                    title={`Add ${btn.label}`}
                                                    className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-90 ${btn.color} ${btn.type === 'occlusion' && showMaskMenu ? 'bg-orange-500/20' : ''}`}
                                                >
                                                    {btn.icon}
                                                </button>
                                            ))}

                                            {/* Mask / Occlusion Menu Overlay */}
                                            {showMaskMenu && (
                                                <div className="absolute top-full right-0 mt-3 w-56 bg-[#161616] border border-white/10 rounded-[1.5rem] shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="p-3 border-b border-white/5 mb-2">
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Select Mask Type</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {[
                                                            { id: 'cube', label: 'Cube Shape', icon: <Box size={14} /> },
                                                            { id: 'sphere', label: 'Sphere Shape', icon: <Sparkles size={14} className="rotate-45" /> },
                                                            { id: 'plane', label: 'Plane Shape', icon: <ImageIcon size={14} /> },
                                                            { id: 'custom', label: 'Upload Model (.glb)', icon: <Box size={14} />, isUpload: true },
                                                        ].map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => {
                                                                    if (item.isUpload) {
                                                                        setPendingAssetType('occlusion')
                                                                        assetUploadInputRef.current?.click()
                                                                        setShowMaskMenu(false)
                                                                    } else {
                                                                        handleAddAsset('occlusion', { shape: item.id })
                                                                    }
                                                                }}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all group"
                                                            >
                                                                <div className="text-white/40 group-hover:text-orange-400 transition-colors">{item.icon}</div>
                                                                <span className="text-[11px] font-bold text-white/70 group-hover:text-white uppercase tracking-wider">{item.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Asset Upload Input (Hidden) */}
                                        <input
                                            type="file"
                                            ref={assetUploadInputRef}
                                            className="hidden"
                                            onChange={handleAssetFileSelect}
                                            accept={pendingAssetType === 'image' ? 'image/*' : (pendingAssetType === 'video' ? 'video/*' : '.glb,.gltf')}
                                        />

                                        {selectedTargetIndex >= 0 && targets[selectedTargetIndex]?.thumbnail && (
                                            <div className="relative group">
                                                <img src={targets[selectedTargetIndex].thumbnail} className="w-14 h-14 rounded-2xl object-cover border border-white/10 group-hover:border-orange-500/50 transition-all shadow-lg" />
                                                <div className="absolute inset-0 rounded-2xl bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    {activeAsset ? (
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                            <AssetEditor
                                                asset={activeAsset}
                                                onUpdateAsset={handleUpdateAsset}
                                                onUpload={onUpload}
                                                onAddAsset={handleAssetButtonClick}
                                                playbackState={playbackState}
                                                onSeek={seekTime}
                                                onTogglePlayback={togglePlayback}
                                            />
                                        </div>
                                    ) : activeAssets.length > 0 ? (
                                        /* Layer Explorer - List View with Bulk Actions */
                                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-6">
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">Layer Explorer</h4>
                                                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">{activeAssets.length} layers in workspace</p>
                                                    </div>

                                                    {selectedLayerIds.length > 0 && (
                                                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                                            <div className="h-4 w-[1px] bg-white/10" />
                                                            <button
                                                                onClick={() => removeMultipleAssets(selectedLayerIds)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                                            >
                                                                <Trash2 size={14} /> Xóa {selectedLayerIds.length} mục đã chọn
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleAssetButtonClick('3d')}
                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all"
                                                >
                                                    <Plus size={14} /> Add Layer
                                                </button>
                                            </div>

                                            <div className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
                                                {/* Table Header */}
                                                <div className="flex items-center px-8 py-4 bg-white/[0.03] border-b border-white/5 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                    <div className="w-10 flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLayerIds.length === activeAssets.length && activeAssets.length > 0}
                                                            onChange={() => toggleSelectAll(activeAssets)}
                                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-orange-500 focus:ring-orange-500/50"
                                                        />
                                                    </div>
                                                    <div className="w-20 px-4 text-center">Type</div>
                                                    <div className="flex-1 px-4">Layer Name</div>
                                                    <div className="w-40 px-4">Instance ID</div>
                                                    <div className="w-20 text-center">Action</div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                    <div className="divide-y divide-white/5">
                                                        {activeAssets.map((asset) => (
                                                            <div
                                                                key={asset.id}
                                                                className={`group flex items-center px-8 py-4 hover:bg-white/[0.03] transition-all cursor-pointer ${selectedAssetId === asset.id ? 'bg-orange-500/[0.03]' : ''} ${selectedLayerIds.includes(asset.id) ? 'bg-white/[0.04]' : ''}`}
                                                                onClick={() => setSelectedAssetId(asset.id)}
                                                            >
                                                                {/* Checkbox */}
                                                                <div className="w-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedLayerIds.includes(asset.id)}
                                                                        onChange={() => toggleSelectLayer(asset.id)}
                                                                        className="w-4 h-4 rounded border-white/10 bg-black/40 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                                                                    />
                                                                </div>

                                                                {/* Icon Type */}
                                                                <div className="w-20 px-4 flex justify-center">
                                                                    <div className={`w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center transition-all ${selectedLayerIds.includes(asset.id) ? 'text-orange-400 border-orange-500/20' : 'text-white/20 group-hover:text-white/40'}`}>
                                                                        {asset.type === '3d' ? <Box size={18} /> : (asset.type === 'video' ? <Video size={18} /> : (asset.type === 'image' ? <ImageIcon size={18} /> : <Sparkles size={18} />))}
                                                                    </div>
                                                                </div>

                                                                {/* Name */}
                                                                <div className="flex-1 px-4 min-w-0">
                                                                    <h4 className="font-extrabold text-sm text-white/80 group-hover:text-white truncate transition-colors uppercase tracking-tight">
                                                                        {asset.name}
                                                                    </h4>
                                                                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-0.5">{asset.type}</p>
                                                                </div>

                                                                {/* ID */}
                                                                <div className="w-40 px-4">
                                                                    <span className="font-mono text-[10px] text-white/10 bg-white/5 px-2 py-1 rounded-lg">ID: {asset.id.slice(-8)}</span>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="w-20 flex justify-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                                                        className="p-2 text-white/10 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                                        title="Xóa layer"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Empty State Workspace */
                                        <div className="flex-1 flex flex-col items-center justify-center text-white/10 p-12 space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-orange-500/10 blur-[60px] animate-pulse rounded-full" />
                                                <div className="w-40 h-40 rounded-[4rem] bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center relative z-10">
                                                    <Sparkles size={64} className="text-orange-500/40" />
                                                </div>
                                            </div>
                                            <div className="text-center space-y-4">
                                                <p className="text-2xl font-black uppercase tracking-tighter text-white/40">Studio Workspace</p>
                                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/20 italic">Start building your scene by adding a magic layer</p>
                                            </div>

                                            {/* Quick Add Actions - Refined Style */}
                                            <div className="w-full max-w-lg bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.01] to-transparent pointer-events-none" />
                                                <div className="flex items-center justify-between relative z-10">
                                                    <h5 className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Initialize New Layer</h5>
                                                    <div className="w-24 h-[1px] bg-white/5" />
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 relative z-10">
                                                    {[
                                                        { type: '3d' as const, icon: <Box size={20} />, label: '3D Model', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5' },
                                                        { type: 'image' as const, icon: <ImageIcon size={20} />, label: 'Image', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' },
                                                        { type: 'video' as const, icon: <Video size={20} />, label: 'Video', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5' },
                                                        { type: 'occlusion' as const, icon: <Sparkles size={20} />, label: 'Mask', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5' }
                                                    ].map((btn) => (
                                                        <button
                                                            key={btn.type}
                                                            onClick={() => handleAssetButtonClick(btn.type)}
                                                            className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all hover:scale-105 active:scale-95 ${btn.color} hover:bg-white/5 hover:shadow-2xl group/btn overflow-hidden relative`}
                                                        >
                                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                            <div className="transition-transform duration-700 group-hover/btn:rotate-12 relative z-10">{btn.icon}</div>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] relative z-10 text-center">{btn.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Global Settings Panel */}
                                <div className="mt-8 pt-6 border-t border-white/5 bg-[#0c0c0c]">
                                    <GlobalSettingsPanel
                                        config={config}
                                        onUpdateConfig={(key, value) => setConfig({ ...config, [key]: value })}
                                        onUpload={onUpload}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                                <Layers size={48} className="opacity-20" />
                                <p className="font-black uppercase tracking-tighter text-sm">Select a target to begin</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Phone Preview (1/4) */}
                <div className="lg:col-span-1 w-full flex-shrink-0">
                    <div className="lg:sticky lg:top-8 space-y-6">
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
                                    <Suspense fallback={
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
                                            <div className="animate-spin w-16 h-16 border-4 border-white/5 border-t-orange-500 rounded-full" />
                                            <div className="text-center">
                                                <p className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Preview</p>
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
                                                playbackState={playbackState}
                                                onPlaybackChange={setPlaybackState}
                                            />
                                        )}
                                    </Suspense>
                                ) : (
                                    <div
                                        onClick={() => setShowPreview(true)}
                                        className="absolute inset-0 flex flex-col items-center justify-center text-white/60 cursor-pointer group bg-[radial-gradient(circle_at_center,rgba(255,100,0,0.05),transparent)] hover:bg-black/80 transition-all duration-700"
                                    >
                                        <div className="block w-24 h-24 bg-white/5 shadow-2xl shadow-orange-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-orange-500 transition-all duration-500 transform border border-white/10">
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

                {/* Compiling Overlay */}
                {isCompiling && (
                    <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-[400px] max-w-full p-8 text-center space-y-8 relative">
                            {/* Simple loading for now */}
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-purple-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl">{compileProgress}%</div>
                            </div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest animate-pulse">{compileStatus}</p>
                        </div>
                    </div>
                )}

                <SmartCompilerModal
                    isOpen={showCompileModeModal}
                    onClose={() => setShowCompileModeModal(false)}
                    files={pendingCompileFiles}
                    onCompile={startCompile}
                />

                <CloneInheritModal
                    isOpen={showCloneInheritModal}
                    onClose={() => setShowCloneInheritModal(false)}
                    mode={cloneInheritMode}
                    currentTargetIndex={pendingActionTargetIndex}
                    config={config}
                    onExecute={executeCloneInherit}
                />
            </div>
            )
        </>
    )
}
