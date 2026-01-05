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
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                    <h3 className="font-medium text-gray-700">Chế độ chỉnh sửa</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {useCustomCode
                            ? 'Code Mode: Tùy chỉnh HTML/Script trực tiếp'
                            : 'Template Mode: Cấu hình qua giao diện visual'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-sm ${!useCustomCode ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                        Template
                    </span>
                    <button
                        onClick={() => onModeChange(!useCustomCode)}
                        className={`relative w-14 h-7 rounded-full transition-colors ${useCustomCode ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${useCustomCode ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                    <span className={`text-sm ${useCustomCode ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                        Code
                    </span>
                </div>
            </div>

            {/* Code Editor (only show in Code Mode) */}
            {useCustomCode && (
                <div className="border rounded-lg overflow-hidden">
                    {/* Tabs */}
                    <div className="flex items-center border-b bg-gray-50">
                        <button
                            onClick={() => setActiveTab('html')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'html'
                                ? 'border-blue-500 text-blue-600 bg-white'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <FileText size={16} /> HTML
                        </button>
                        <button
                            onClick={() => setActiveTab('script')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'script'
                                ? 'border-blue-500 text-blue-600 bg-white'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Code size={16} /> Script
                        </button>
                        <button
                            onClick={() => setActiveTab('assets')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'assets'
                                ? 'border-blue-500 text-blue-600 bg-white'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <ImagePlus size={16} /> Assets ({assets.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4">
                        {/* HTML Tab */}
                        {activeTab === 'html' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Dùng <code className="bg-gray-100 px-1 rounded">{'{{variable}}'}</code> để thay thế giá trị động
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={loadCurrentTemplate}
                                            className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                        >
                                            <Wand2 size={12} /> Load Template mẫu
                                        </button>
                                        <select
                                            onChange={(e) => e.target.value && loadDefaultTemplate(e.target.value)}
                                            className="text-xs border rounded px-2 py-1 text-gray-600"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Chọn template khác...</option>
                                            <option value="image_tracking">Image Tracking</option>
                                            <option value="face_filter">Face Filter</option>
                                            <option value="ar_checkin">AR Check-in</option>
                                            <option value="lucky_draw">Lucky Draw</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border-r text-gray-400 text-xs font-mono leading-6 pt-3 text-right pr-2 overflow-hidden select-none">
                                        {customHtml.split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={customHtml}
                                        onChange={e => onHtmlChange(e.target.value)}
                                        className="w-full min-h-[400px] font-mono text-sm border rounded-lg p-3 pl-12 leading-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Paste HTML code here..."
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Script Tab */}
                        {activeTab === 'script' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500">
                                    JavaScript sẽ được inject vào cuối trang (optional)
                                </p>
                                <div className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border-r text-gray-400 text-xs font-mono leading-6 pt-3 text-right pr-2 overflow-hidden select-none">
                                        {(customScript || '').split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={customScript}
                                        onChange={e => onScriptChange(e.target.value)}
                                        className="w-full min-h-[300px] font-mono text-sm border rounded-lg p-3 pl-12 leading-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="// Custom JavaScript (optional)"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Assets Tab */}
                        {activeTab === 'assets' && (
                            <div className="space-y-4">
                                {/* Upload Area */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.glb,.gltf,.mind"
                                        onChange={handleFileUpload}
                                    />
                                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 mb-2">
                                        Upload assets (images, 3D models, .mind files)
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {uploading ? 'Đang upload...' : 'Chọn file'}
                                    </button>
                                </div>

                                {/* Asset List */}
                                {assets.length > 0 && (
                                    <div className="border rounded-lg divide-y">
                                        {assets.map((asset, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg">
                                                    {asset.type === 'image' ? '🖼️' :
                                                        asset.type === '3d' ? '📦' :
                                                            asset.type === 'marker' ? '🎯' : '📄'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{asset.url}</p>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(asset.url)}
                                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                                                >
                                                    {copiedUrl === asset.url ? (
                                                        <><Check size={14} /> Copied!</>
                                                    ) : (
                                                        <><Copy size={14} /> Copy URL</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => removeAsset(index)}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Variable Reference */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-yellow-800 mb-2">📌 Available Variables</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                        <div><code className="bg-yellow-100 px-1">{'{{marker_url}}'}</code> - Target image</div>
                                        <div><code className="bg-yellow-100 px-1">{'{{asset_url}}'}</code> - 3D model</div>
                                        <div><code className="bg-yellow-100 px-1">{'{{filter_url}}'}</code> - Face filter</div>
                                        <div><code className="bg-yellow-100 px-1">{'{{filter_scale}}'}</code> - Filter size</div>
                                        <div><code className="bg-yellow-100 px-1">{'{{offset_x}}'}</code> - X position</div>
                                        <div><code className="bg-yellow-100 px-1">{'{{offset_y}}'}</code> - Y position</div>
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
