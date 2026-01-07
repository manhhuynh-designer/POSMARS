'use client'
import { useState, useRef } from 'react'
import { Code, FileText, ImagePlus, Upload, Copy, Check, Trash2, Wand2 } from 'lucide-react'
import { getDefaultTemplate } from '@/lib/templates/default-templates'

interface UploadedAsset {
    name: string
    url: string
    type: string
}

interface CustomCodeEditorProps {
    customHtml: string
    customScript: string
    useCustomCode: boolean
    templateType: string // 'image_tracking' | 'face_filter' | 'ar_checkin' | 'lucky_draw'
    onHtmlChange: (html: string) => void
    onScriptChange: (script: string) => void
    onModeChange: (useCustom: boolean) => void
    onUploadAsset: (file: File, path: string) => Promise<string>
    projectSlug: string
}


type EditorTab = 'html' | 'script' | 'assets'

export default function CustomCodeEditor({
    customHtml,
    customScript,
    useCustomCode,
    templateType,
    onHtmlChange,
    onScriptChange,
    onModeChange,
    onUploadAsset,
    projectSlug
}: CustomCodeEditorProps) {
    const [activeTab, setActiveTab] = useState<EditorTab>('html')
    const [uploading, setUploading] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
    const [assets, setAssets] = useState<UploadedAsset[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const path = `custom/${projectSlug}/${Date.now()}_${file.name}`
            const url = await onUploadAsset(file, path)
            const fileType = file.type.startsWith('image/') ? 'image' :
                file.name.endsWith('.glb') || file.name.endsWith('.gltf') ? '3d' :
                    file.name.endsWith('.mind') ? 'marker' : 'other'

            setAssets(prev => [...prev, { name: file.name, url, type: fileType }])
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload thất bại')
        }
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url)
        setCopiedUrl(url)
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    const removeAsset = (index: number) => {
        setAssets(prev => prev.filter((_, i) => i !== index))
    }

    const loadDefaultTemplate = (type: string) => {
        const template = getDefaultTemplate(type)
        if (template) {
            onHtmlChange(template.html)
            if (template.script) {
                onScriptChange(template.script)
            }
        }
    }

    const loadCurrentTemplate = () => {
        loadDefaultTemplate(templateType)
    }

    return (
        <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-xl">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Editor Framework</h3>
                    <p className="text-sm font-black text-white uppercase tracking-tighter">
                        {useCustomCode
                            ? 'Code Mode: Custom HTML/JS Engine'
                            : 'Template Mode: UI Build Protocol'}
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => onModeChange(false)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!useCustomCode ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        Standard
                    </button>
                    <button
                        onClick={() => onModeChange(true)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${useCustomCode ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        PRO CODE
                    </button>
                </div>
            </div>

            {/* Code Editor (only show in Code Mode) */}
            {useCustomCode && (
                <div className="border border-white/5 rounded-[2rem] overflow-hidden bg-[#0c0c0c] shadow-2xl">
                    {/* Tabs */}
                    <div className="flex items-center border-b border-white/5 bg-black/40 p-2">
                        <button
                            onClick={() => setActiveTab('html')}
                            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'html'
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            <FileText size={14} className="text-orange-500" /> HTML Structure
                        </button>
                        <button
                            onClick={() => setActiveTab('script')}
                            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ml-1 ${activeTab === 'script'
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            <Code size={14} className="text-blue-400" /> Logic Script
                        </button>
                        <button
                            onClick={() => setActiveTab('assets')}
                            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ml-1 ${activeTab === 'assets'
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            <ImagePlus size={14} className="text-purple-400" /> Cloud Assets ({assets.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-8">
                        {/* HTML Tab */}
                        {activeTab === 'html' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 whitespace-nowrap">
                                            Dynamic injection via <code className="bg-white/5 px-2 py-1 rounded text-orange-400">{'{{variable}}'}</code> protocol
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={loadCurrentTemplate}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            <Wand2 size={12} /> Auto-populate Template
                                        </button>
                                        <select
                                            onChange={(e) => e.target.value && loadDefaultTemplate(e.target.value)}
                                            className="text-[10px] font-black uppercase tracking-widest bg-black border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-orange-500 transition-all appearance-none pr-8"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Switch Schema...</option>
                                            <option value="image_tracking">Image Tracking</option>
                                            <option value="face_filter">Face Filter</option>
                                            <option value="ar_checkin">AR Check-in</option>
                                            <option value="lucky_draw">Lucky Draw</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/40 border-r border-white/5 text-white/10 text-[10px] font-mono leading-7 pt-4 text-right pr-3 overflow-hidden select-none pointer-events-none group-hover:text-white/40 transition-colors">
                                        {customHtml.split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={customHtml}
                                        onChange={e => onHtmlChange(e.target.value)}
                                        className="w-full min-h-[500px] bg-black/20 font-mono text-sm border border-white/5 rounded-2xl p-4 pl-16 leading-7 text-white/80 focus:border-orange-500/50 outline-none transition-all placeholder:text-white/5"
                                        placeholder="<!-- Write your custom HTML/A-Frame code here -->"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Script Tab */}
                        {activeTab === 'script' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                        Runtime script injection at footer level
                                    </p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/40 border-r border-white/5 text-white/10 text-[10px] font-mono leading-7 pt-4 text-right pr-3 overflow-hidden select-none pointer-events-none group-hover:text-white/40 transition-colors">
                                        {(customScript || '').split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={customScript}
                                        onChange={e => onScriptChange(e.target.value)}
                                        className="w-full min-h-[400px] bg-black/20 font-mono text-sm border border-white/5 rounded-2xl p-4 pl-16 leading-7 text-white/80 focus:border-blue-500/50 outline-none transition-all placeholder:text-white/5"
                                        placeholder="// Enter custom JavaScript logic..."
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Assets Tab */}
                        {activeTab === 'assets' && (
                            <div className="space-y-8">
                                {/* Upload Area */}
                                <div
                                    className="border-[3px] border-dashed border-white/5 rounded-[2.5rem] p-12 text-center hover:border-orange-500/30 hover:bg-white/5 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.glb,.gltf,.mind"
                                        onChange={handleFileUpload}
                                    />
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/10 group-hover:text-orange-500 group-hover:scale-110 transition-all duration-300">
                                        <Upload size={32} />
                                    </div>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Deploy Cloud Assets</h4>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6">
                                        Binary • GLTF • Markers • Standard Images
                                    </p>
                                    <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                                        {uploading ? 'Synchronizing...' : 'Initialize Upload'}
                                    </div>
                                </div>

                                {/* Asset List */}
                                {assets.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {assets.map((asset, index) => (
                                            <div key={index} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all group">
                                                <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-xl shadow-inner">
                                                    {asset.type === 'image' ? '🖼️' :
                                                        asset.type === '3d' ? '📦' :
                                                            asset.type === 'marker' ? '🎯' : '📄'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-white truncate uppercase tracking-tight">{asset.name}</p>
                                                    <p className="text-[9px] font-mono text-white/40 truncate">{asset.url}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url); }}
                                                        className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${copiedUrl === asset.url ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/60 hover:text-white'}`}
                                                    >
                                                        {copiedUrl === asset.url ? <><Check size={12} /> ID Copied</> : <><Copy size={12} /> Key</>}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeAsset(index); }}
                                                        className="text-white/10 hover:text-red-500 p-2 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Variable Reference */}
                                <div className="bg-orange-500/5 border border-white/5 rounded-[2rem] p-8">
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-orange-500 rounded-full" /> Compiler Variables
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        {[
                                            { key: '{{marker_url}}', desc: 'Active Marker source' },
                                            { key: '{{asset_url}}', desc: 'Primary 3D mesh' },
                                            { key: '{{filter_url}}', desc: 'Face augmentation src' },
                                            { key: '{{filter_scale}}', desc: 'Relative transform scale' },
                                            { key: '{{offset_x}}', desc: 'Horizontal translation' },
                                            { key: '{{offset_y}}', desc: 'Vertical translation' }
                                        ].map(item => (
                                            <div key={item.key} className="space-y-1">
                                                <code className="text-[11px] font-mono text-blue-400 bg-white/5 px-2 py-1 rounded-md">{item.key}</code>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
