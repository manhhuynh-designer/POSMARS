'use client'
import { useState, useEffect, lazy, Suspense } from 'react'
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon, Eye } from 'lucide-react'

// Dynamic import for FaceFilterPreview (camera only loaded when needed)
const FaceFilterPreview = lazy(() => import('./FaceFilterPreview'))

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
export interface ImageTrackingConfig {
    model_scale?: number
    model_position?: [number, number, number]
    model_rotation?: [number, number, number]
    enable_capture?: boolean
    show_scan_hint?: boolean
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

    useEffect(() => {
        onChange(config)
    }, [config])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, subPath: string = 'assets') => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const url = await onUpload(file, `${subPath}/${Date.now()}_${file.name}`)
            setConfig({ ...config, [key]: url })
            setUploading(false)
        } catch (error) {
            console.error(error)
            setUploading(false)
            alert('Upload thất bại')
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

        return (
            <div className="space-y-6">
                {/* Upload Loading Banner */}
                {uploading && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">Đang upload file...</p>
                            <p className="text-xs text-blue-600">Vui lòng chờ cho đến khi upload hoàn tất</p>
                        </div>
                    </div>
                )}

                {/* Branding */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h3 className="font-medium text-gray-700">Hình ảnh thương hiệu (Branding)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Logo */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Logo Client</label>
                            <div className="flex items-center gap-3">
                                {config.logo_url ? (
                                    <div className="relative w-16 h-16 rounded overflow-hidden border bg-white">
                                        <img src={config.logo_url} className="w-full h-full object-contain p-1" />
                                        <button
                                            onClick={() => setConfig({ ...config, logo_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <Upload size={16} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-400 mt-1">Logo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Logo hiển thị trên cùng trang game</div>
                            </div>
                        </div>

                        {/* Background */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Background toàn trang</label>
                            <div className="flex items-center gap-3">
                                {config.bg_url ? (
                                    <div className="relative w-24 h-16 rounded overflow-hidden border bg-white">
                                        <img src={config.bg_url} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setConfig({ ...config, bg_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-24 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <Upload size={16} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-400 mt-1">BG</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'bg_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Ảnh nền full trang (9:16 hoặc 16:9)</div>
                            </div>
                        </div>

                        {/* Banner KV */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Banner KV (Top)</label>
                            <div className="flex items-center gap-3">
                                {config.banner_url ? (
                                    <div className="relative w-24 h-16 rounded overflow-hidden border bg-white">
                                        <img src={config.banner_url} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setConfig({ ...config, banner_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-24 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <Upload size={16} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Ảnh banner hiển thị trên cùng (Tỷ lệ 16:9 hoặc 3:1)</div>
                            </div>
                        </div>

                        {/* Wheel Background */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Wheel Background (Khung vòng quay)</label>
                            <div className="flex items-center gap-3">
                                {config.wheel_bg_url ? (
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border bg-white">
                                        <img src={config.wheel_bg_url} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setConfig({ ...config, wheel_bg_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <Upload size={16} className="text-gray-400" />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'wheel_bg_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Ảnh nền vòng quay (thay thế màu gradient)</div>
                            </div>
                        </div>

                        {/* Pointer */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Mũi tên chỉ (Pointer)</label>
                            <div className="flex items-center gap-3">
                                {config.pointer_url ? (
                                    <div className="relative w-12 h-16 rounded overflow-hidden border bg-white">
                                        <img src={config.pointer_url} className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setConfig({ ...config, pointer_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-12 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <span className="text-lg">▼</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'pointer_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Hình mũi tên chỉ vào vòng quay (PNG trong suốt)</div>
                            </div>
                        </div>

                        {/* Spin Button */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Nút Quay (Center)</label>
                            <div className="flex items-center gap-3">
                                {config.spin_btn_url ? (
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border bg-white">
                                        <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setConfig({ ...config, spin_btn_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                        <span className="text-xs font-bold">QUAY</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'spin_btn_url', 'branding')} />
                                    </label>
                                )}
                                <div className="text-xs text-gray-400">Hình thay thế nút QUAY ở giữa (PNG trong suốt)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prize Manager */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-700">Danh sách giải thưởng ({prizes.length})</h3>
                        <div className="text-sm">
                            Tổng tỷ lệ: <span className={`font-bold ${totalProb === 100 ? 'text-green-600' : 'text-red-500'}`}>{totalProb}%</span>
                        </div>
                        <button
                            onClick={addPrize}
                            className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                        >
                            <Plus size={16} /> Thêm giải
                        </button>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-4 py-3">Hình ảnh</th>
                                    <th className="px-4 py-3">Tên giải thưởng</th>
                                    <th className="px-4 py-3 w-24">Tỷ lệ (%)</th>
                                    <th className="px-4 py-3 w-24">Màu sắc</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {prizes.map((prize: Prize, idx: number) => (
                                    <tr key={idx} className="bg-white hover:bg-gray-50">
                                        <td className="px-4 py-3 text-center text-gray-300">
                                            {idx + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative w-10 h-10 border rounded bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer group">
                                                {prize.image ? (
                                                    <img src={prize.image} className="w-full h-full object-contain" />
                                                ) : (
                                                    <ImageIcon size={16} className="text-gray-300" />
                                                )}
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    onChange={e => handlePrizeImageUpload(e, idx)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                value={prize.name}
                                                onChange={e => updatePrize(idx, { name: e.target.value })}
                                                className="w-full border rounded px-2 py-1"
                                                placeholder="Tên giải..."
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={prize.probability}
                                                onChange={e => updatePrize(idx, { probability: Number(e.target.value) })}
                                                className="w-full border rounded px-2 py-1 text-center"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={prize.color}
                                                    onChange={e => updatePrize(idx, { color: e.target.value })}
                                                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                                />
                                                <span className="text-xs uppercase text-gray-500">{prize.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => removePrize(idx)}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalProb !== 100 && (
                        <div className="text-xs text-red-500 italic mt-2">
                            * Vui lòng điều chỉnh tổng tỷ lệ về đúng 100% (Hiện tại: {totalProb}%)
                        </div>
                    )}
                </div>

                {/* Game Rules */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-medium text-gray-700">Thể lệ chương trình</h3>
                    <p className="text-xs text-gray-500">Nội dung thể lệ sẽ hiển thị dưới vòng quay (hỗ trợ định dạng HTML)</p>
                    <textarea
                        value={config.rules_text || ''}
                        onChange={e => setConfig({ ...config, rules_text: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm font-mono"
                        rows={6}
                        placeholder={`Ví dụ:
• Mỗi khách hàng chỉ được quay 1 lần/ngày
• Giải thưởng có giá trị trong vòng 7 ngày
• Áp dụng tại tất cả các cửa hàng trên toàn quốc
• Chương trình kết thúc ngày 31/12/2026`}
                    />
                </div>
            </div>
        )
    }

    // RENDER: AR Check-in
    if (template === 'ar_checkin') {
        return (
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h3 className="font-medium text-gray-700">Cấu hình AR Frame</h3>

                    {/* Frame Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Frame Image (Lớp phủ 2D)</label>
                        <div className="flex items-start gap-4">
                            {config.frame_url ? (
                                <div className="space-y-2">
                                    <div className="relative w-40 h-64 border rounded bg-[url('/transparent-grid.png')] bg-repeat overflow-hidden">
                                        <img src={config.frame_url} className="w-full h-full object-contain" />
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, frame_url: '' })}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Xóa frame
                                    </button>
                                </div>
                            ) : (
                                <label className="w-40 h-64 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 bg-white">
                                    <Upload size={24} className="text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-2 font-medium">Upload .png</span>
                                    <input type="file" className="hidden" accept=".png" onChange={e => handleFileUpload(e, 'frame_url', 'frames')} />
                                </label>
                            )}
                            <div className="flex-1 text-sm text-gray-500">
                                <p className="mb-2">⚠️ Upload ảnh PNG trong suốt (Transparent).</p>
                                <p>Ảnh này sẽ được phủ lên trên camera của người dùng khi chụp ảnh.</p>
                                <p className="mt-2 text-xs">Kích thước gợi ý: 1080x1920 (9:16)</p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Hướng dẫn người chơi</label>
                        <textarea
                            value={config.instructions || ''}
                            onChange={e => setConfig({ ...config, instructions: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Ví dụ: Hãy cười thật tươi và tạo dáng cùng thần tượng..."
                        />
                    </div>
                </div>
            </div>
        )
    }

    // RENDER: Face Filter
    if (template === 'face_filter') {
        const [showPreview, setShowPreview] = useState(false)
        const [debugMode, setDebugMode] = useState(true) // Show face mesh by default

        const ANCHOR_OPTIONS = [
            { value: 'nose_bridge', label: '👓 Sống mũi (Kính)', icon: '👓' },
            { value: 'forehead', label: '🎩 Trán (Mũ/Vương miện)', icon: '🎩' },
            { value: 'nose_tip', label: '🤡 Đầu mũi (Mũi hề)', icon: '🤡' },
            { value: 'chin', label: '🧔 Cằm (Râu)', icon: '🧔' },
            { value: 'full_face', label: '🎭 Toàn mặt (Mặt nạ)', icon: '🎭' },
        ]

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] overflow-hidden">
                {/* Left: Config Panel - Scrollable */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-20">
                    {/* Upload Loading Banner */}
                    {uploading && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-center gap-3 animate-pulse sticky top-0 z-10">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                            <div>
                                <p className="text-sm font-medium text-blue-800">Đang upload file...</p>
                                <p className="text-xs text-blue-600">Vui lòng chờ cho đến khi upload hoàn tất</p>
                            </div>
                        </div>
                    )}

                    {/* Logo Upload */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-700">Logo Client</h3>
                        <div className="flex items-center gap-3">
                            {config.logo_url ? (
                                <div className="relative w-16 h-16 rounded overflow-hidden border bg-white">
                                    <img src={config.logo_url} className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => setConfig({ ...config, logo_url: '' })}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 bg-white">
                                    <Upload size={16} className="text-gray-400" />
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url', 'logos')} />
                                </label>
                            )}
                            <div className="text-xs text-gray-500">Logo hiển thị góc trên màn hình</div>
                        </div>
                    </div>

                    {/* Filter Config */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-700">Cấu hình Filter</h3>

                        {/* Filter Type Selector */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Loại Filter</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, filter_type: '2d', filter_3d_url: '' })}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition ${(config.filter_type || '2d') === '2d'
                                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    🖼️ 2D Image (PNG)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, filter_type: '3d', filter_url: '' })}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition ${config.filter_type === '3d'
                                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    📦 3D Model (GLB)
                                </button>
                            </div>
                        </div>

                        {/* 2D Filter Image Upload */}
                        {(config.filter_type || '2d') === '2d' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Filter 2D (PNG trong suốt)</label>
                                <div className="flex items-start gap-4">
                                    {config.filter_url ? (
                                        <div className="space-y-2">
                                            <div className="relative w-24 h-24 border rounded bg-[url('/transparent-grid.png')] bg-repeat overflow-hidden">
                                                <img src={config.filter_url} className="w-full h-full object-contain" />
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, filter_url: '' })}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Xóa
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 bg-white">
                                            <Upload size={20} className="text-gray-400" />
                                            <span className="text-xs text-gray-500 mt-1">.png</span>
                                            <input type="file" className="hidden" accept=".png,image/png" onChange={e => handleFileUpload(e, 'filter_url', 'filters')} />
                                        </label>
                                    )}
                                    <div className="flex-1 text-xs text-gray-500">
                                        <p>⚠️ PNG trong suốt</p>
                                        <p className="mt-1">Gợi ý: Kính, mũ, râu, stickers...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3D Filter Model Upload */}
                        {config.filter_type === '3d' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Filter 3D (GLB/GLTF)</label>
                                <div className="flex items-start gap-4">
                                    {config.filter_3d_url ? (
                                        <div className="space-y-2">
                                            <div className="relative w-24 h-24 border rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                                <span className="text-3xl">📦</span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate max-w-[96px]">{config.filter_3d_url.split('/').pop()}</p>
                                            <button
                                                onClick={() => setConfig({ ...config, filter_3d_url: '' })}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Xóa
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 bg-white">
                                            <Upload size={20} className="text-gray-400" />
                                            <span className="text-xs text-gray-500 mt-1">.glb</span>
                                            <input type="file" className="hidden" accept=".glb,.gltf" onChange={e => handleFileUpload(e, 'filter_3d_url', 'filters-3d')} />
                                        </label>
                                    )}
                                    <div className="flex-1 text-xs text-gray-500">
                                        <p>📦 File 3D định dạng GLB</p>
                                        <p className="mt-1">✨ Có chiều sâu, xoay theo mặt</p>
                                        <p className="mt-1 text-orange-500">⚠️ Khuyến nghị &lt; 2MB</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Anchor Position */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Vị trí đặt Filter</label>
                            <select
                                value={config.anchor_position || 'nose_bridge'}
                                onChange={e => setConfig({ ...config, anchor_position: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-sm"
                            >
                                {ANCHOR_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Full Head Occlusion */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.full_head_occlusion || false}
                                    onChange={e => setConfig({ ...config, full_head_occlusion: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Che phủ đầu đầy đủ (Full Head Occlusion)</span>
                                    <p className="text-xs text-gray-500 mt-0.5">Dành cho mũ, nón, tai thỏ (che phần sau đầu)</p>
                                </div>
                            </label>
                        </div>

                        {/* Occlusion Settings - Show only when Full Head Occlusion is enabled */}
                        {config.full_head_occlusion && (
                            <div className="ml-7 space-y-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                                {/* Occlusion Radius */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Kích thước Sphere: <span className="text-pink-500">{(config.occlusion_radius ?? 0.15).toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="1.0"
                                        step="0.01"
                                        value={config.occlusion_radius ?? 0.15}
                                        onChange={e => setConfig({ ...config, occlusion_radius: parseFloat(e.target.value) })}
                                        className="w-full accent-pink-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Điều chỉnh kích thước đầu (lớn hơn = che nhiều hơn) [0.05 - 1.0]</p>
                                </div>

                                {/* Occlusion Offset Z */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Độ sâu Sphere: <span className="text-pink-500">{(config.occlusion_offset_z ?? -0.08).toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="-1.0"
                                        max="1.0"
                                        step="0.01"
                                        value={config.occlusion_offset_z ?? -0.08}
                                        onChange={e => setConfig({ ...config, occlusion_offset_z: parseFloat(e.target.value) })}
                                        className="w-full accent-pink-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Điều chỉnh vị trí trước/sau đầu (âm = ra sau, dương = ra trước) [-1.0 đến 1.0]</p>
                                </div>
                            </div>
                        )}

                        {/* Filter Scale */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Kích thước: <span className="text-pink-500">{config.filter_scale || 0.5}x</span></label>
                            <input
                                type="range"
                                min="0.2"
                                max="2"
                                step="0.1"
                                value={config.filter_scale || 0.5}
                                onChange={e => setConfig({ ...config, filter_scale: parseFloat(e.target.value) })}
                                className="w-full accent-pink-500"
                            />
                        </div>

                        {/* Offset X */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Dịch ngang (X): <span className="text-pink-500">{config.offset_x || 0}</span></label>
                            <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.05"
                                value={config.offset_x || 0}
                                onChange={e => setConfig({ ...config, offset_x: parseFloat(e.target.value) })}
                                className="w-full accent-pink-500"
                            />
                        </div>

                        {/* Offset Y */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Dịch dọc (Y): <span className="text-pink-500">{config.offset_y || 0}</span></label>
                            <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.05"
                                value={config.offset_y || 0}
                                onChange={e => setConfig({ ...config, offset_y: parseFloat(e.target.value) })}
                                className="w-full accent-pink-500"
                            />
                        </div>
                        {/* Offset Z */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Dịch sâu (Z): <span className="text-pink-500">{config.offset_z || 0}</span></label>
                            <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.01"
                                value={config.offset_z || 0}
                                onChange={e => setConfig({ ...config, offset_z: parseFloat(e.target.value) })}
                                className="w-full accent-pink-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Điều chỉnh độ xa/gần so với khuôn mặt</p>
                        </div>

                        {/* Rotation */}
                        <div className="pt-2 border-t">
                            <label className="block text-sm font-medium mb-2">Xoay (Rotation XYZ)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">X (Pitch)</label>
                                    <input
                                        type="number"
                                        value={config.rotation_x || 0}
                                        onChange={e => setConfig({ ...config, rotation_x: parseFloat(e.target.value) })}
                                        className="w-full border rounded px-2 py-1 text-sm text-center"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Y (Yaw)</label>
                                    <input
                                        type="number"
                                        value={config.rotation_y || 0}
                                        onChange={e => setConfig({ ...config, rotation_y: parseFloat(e.target.value) })}
                                        className="w-full border rounded px-2 py-1 text-sm text-center"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Z (Roll)</label>
                                    <input
                                        type="number"
                                        value={config.rotation_z || 0}
                                        onChange={e => setConfig({ ...config, rotation_z: parseFloat(e.target.value) })}
                                        className="w-full border rounded px-2 py-1 text-sm text-center"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions & Rules */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-700">Nội dung hiển thị</h3>

                        {/* Instructions */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Hướng dẫn người chơi</label>
                            <input
                                value={config.instructions || ''}
                                onChange={e => setConfig({ ...config, instructions: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="Hướng camera vào khuôn mặt để áp dụng filter..."
                            />
                        </div>

                        {/* Rules */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Thể lệ chương trình</label>
                            <textarea
                                value={config.rules_text || ''}
                                onChange={e => setConfig({ ...config, rules_text: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-sm"
                                rows={3}
                                placeholder="• Mỗi người chơi 3 lượt/ngày&#10;• Ảnh có thể share lên social..."
                            />
                        </div>
                    </div>

                    {/* Button Customization */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-700">Nút Chụp ảnh</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Text</label>
                                <input
                                    value={config.capture_btn_text || ''}
                                    onChange={e => setConfig({ ...config, capture_btn_text: e.target.value })}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="Chụp ảnh"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Màu</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={config.capture_btn_color || '#ec4899'}
                                        onChange={e => setConfig({ ...config, capture_btn_color: e.target.value })}
                                        className="w-10 h-10 rounded border cursor-pointer"
                                    />
                                    <input
                                        value={config.capture_btn_color || '#ec4899'}
                                        onChange={e => setConfig({ ...config, capture_btn_color: e.target.value })}
                                        className="flex-1 border rounded px-2 text-sm font-mono"
                                        placeholder="#ec4899"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview (Phone Style) */}
                <div className="lg:w-[320px] flex-shrink-0 flex items-center justify-center bg-gray-100/50 rounded-xl p-4">
                    <div className="space-y-4 w-full h-full flex flex-col">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-700">Live Preview</h3>
                            <div className="flex items-center gap-2">
                                {showPreview && (
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={debugMode}
                                            onChange={e => setDebugMode(e.target.checked)}
                                            className="w-3.5 h-3.5 accent-pink-500"
                                        />
                                        <span className="text-gray-600">Debug</span>
                                    </label>
                                )}
                                {!showPreview && (
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className="flex items-center gap-2 bg-pink-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-pink-600"
                                    >
                                        <Eye size={14} />
                                        Mở Camera
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Phone Container Aspect 9:16 */}
                        <div className="relative w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-900 ring-2 ring-gray-900/10">
                            {showPreview ? (
                                <Suspense fallback={
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
                                    </div>
                                }>
                                    <FaceFilterPreview
                                        config={{
                                            filter_type: config.filter_type,
                                            filter_url: config.filter_url,
                                            filter_3d_url: config.filter_3d_url,
                                            filter_scale: config.filter_scale,
                                            anchor_position: config.anchor_position,
                                            offset_x: config.offset_x,
                                            offset_y: config.offset_y,
                                            offset_z: config.offset_z,
                                            rotation_x: config.rotation_x,
                                            rotation_y: config.rotation_y,
                                            rotation_z: config.rotation_z,
                                            full_head_occlusion: config.full_head_occlusion,
                                            occlusion_radius: config.occlusion_radius,
                                            occlusion_offset_z: config.occlusion_offset_z,
                                        }}
                                        debugMode={debugMode}
                                        onClose={() => setShowPreview(false)}
                                    />
                                </Suspense>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                    <Eye size={32} className="mb-2 opacity-50" />
                                    <p className="text-xs">Preview Area</p>
                                </div>
                            )}
                        </div>

                        {/* Preview Tips */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-700">
                            💡 Preview giả lập tỷ lệ màn hình điện thoại (9:16).
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // RENDER: Image Tracking
    if (template === 'image_tracking') {
        const modelPosition = config.model_position || [0, 0, 0]
        const modelRotation = config.model_rotation || [0, 0, 0]

        const updatePosition = (index: number, value: number) => {
            const newPos = [...modelPosition]
            newPos[index] = value
            setConfig({ ...config, model_position: newPos })
        }

        const updateRotation = (index: number, value: number) => {
            const newRot = [...modelRotation]
            newRot[index] = value
            setConfig({ ...config, model_rotation: newRot })
        }

        return (
            <div className="space-y-6">
                {/* Model Scale */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-medium text-gray-700">Kích thước 3D Model</h3>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={config.model_scale || 1}
                            onChange={(e) => setConfig({ ...config, model_scale: parseFloat(e.target.value) })}
                            className="flex-1"
                        />
                        <span className="text-sm font-medium text-gray-700 w-16 text-center">
                            {(config.model_scale || 1).toFixed(1)}x
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">Điều chỉnh tỷ lệ hiển thị của 3D model</p>
                </div>

                {/* Model Position */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-medium text-gray-700">Vị trí Model (X, Y, Z)</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">X (trái-phải)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={modelPosition[0]}
                                onChange={(e) => updatePosition(0, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Y (trên-dưới)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={modelPosition[1]}
                                onChange={(e) => updatePosition(1, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Z (gần-xa)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={modelPosition[2]}
                                onChange={(e) => updatePosition(2, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Model Rotation */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-medium text-gray-700">Góc xoay Model (độ)</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">X (pitch)</label>
                            <input
                                type="number"
                                step="15"
                                value={modelRotation[0]}
                                onChange={(e) => updateRotation(0, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Y (yaw)</label>
                            <input
                                type="number"
                                step="15"
                                value={modelRotation[1]}
                                onChange={(e) => updateRotation(1, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Z (roll)</label>
                            <input
                                type="number"
                                step="15"
                                value={modelRotation[2]}
                                onChange={(e) => updateRotation(2, parseFloat(e.target.value) || 0)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h3 className="font-medium text-gray-700">Tùy chọn hiển thị</h3>

                    {/* Enable Capture */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.enable_capture !== false}
                            onChange={(e) => setConfig({ ...config, enable_capture: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-700">Cho phép chụp ảnh AR</span>
                            <p className="text-xs text-gray-500">User có thể chụp ảnh khi marker được phát hiện</p>
                        </div>
                    </label>

                    {/* Show Scan Hint */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.show_scan_hint !== false}
                            onChange={(e) => setConfig({ ...config, show_scan_hint: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-700">Hiện hướng dẫn scan</span>
                            <p className="text-xs text-gray-500">Hiển thị thông báo "Hướng camera vào poster"</p>
                        </div>
                    </label>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                        💡 <strong>Lưu ý:</strong> Cần upload file <code className="bg-blue-100 px-1 rounded">.mind</code> (marker)
                        và file <code className="bg-blue-100 px-1 rounded">.glb</code> (3D model) ở tab <strong>Basic Info</strong>.
                    </p>
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
