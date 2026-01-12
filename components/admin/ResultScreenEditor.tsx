import { useState, useEffect } from 'react'
import { Settings, Share2, Link, MessageSquare, Plus, Trash2, Image as ImageIcon, RotateCcw } from 'lucide-react'
import { ImageUpload } from './ImageUpload'

export interface ResultScreenConfig {
    type?: 'standard' | 'voucher' | 'redirect'
    title?: string
    success_message?: string
    share_title?: string
    share_text?: string
    cta_text?: string
    cta_url?: string

    // Voucher specific
    voucher_list?: {
        id: string
        code: string
        label: string
        image_url?: string
        probability?: number
    }[]
    randomize?: boolean

    // Redirect specific
    redirect_url?: string
    redirect_delay?: number
    redirect_auto?: boolean
}

interface ResultScreenEditorProps {
    initialConfig: ResultScreenConfig
    onChange: (config: ResultScreenConfig) => void
    onUpload?: (file: File) => Promise<string>
}

export default function ResultScreenEditor({ initialConfig, onChange, onUpload }: ResultScreenEditorProps) {
    const [config, setConfig] = useState<ResultScreenConfig>(initialConfig || {})
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        onChange(config)
    }, [config])

    const updateConfig = (key: keyof ResultScreenConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    const refreshRandom = () => {
        // Force a new reference for the list to trigger a re-randomization in the preview
        if (config.voucher_list) {
            setConfig({ ...config, voucher_list: [...config.voucher_list] })
        }
    }

    return (
        <div className="space-y-10 relative">
            {isUploading && (
                <div className="fixed top-20 right-10 z-50 bg-orange-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
                    <ImageIcon size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Đang tải ảnh...</span>
                </div>
            )}

            {/* General Settings */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                        <MessageSquare size={14} className="text-orange-500" /> Nội dung hiển thị
                    </h3>
                    {config.type === 'voucher' && (config.voucher_list?.length || 0) > 1 && (
                        <button
                            onClick={refreshRandom}
                            className="text-[9px] font-black uppercase tracking-widest text-orange-400/60 hover:text-orange-400 transition-colors flex items-center gap-1.5"
                        >
                            <RotateCcw size={10} /> Test ngẫu nhiên
                        </button>
                    )}
                </div>

                {/* Result Type Selector */}
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Loại kết quả (Result Type)</label>
                    <div className="flex gap-2">
                        {['standard', 'voucher', 'redirect'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateConfig('type', type)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${(config.type || 'standard') === type
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {type === 'standard' && 'Cơ bản'}
                                {type === 'voucher' && 'Voucher'}
                                {type === 'redirect' && 'Chuyển hướng'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                            Tiêu đề (Title)
                            <span className="float-right text-[9px] text-orange-400 normal-case tracking-normal">Hỗ trợ biến {'{{name}}'}</span>
                        </label>
                        <input
                            value={config.title || ''}
                            onChange={e => updateConfig('title', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Chúc mừng {{name}}!"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                            Lời nhắn (Message)
                            <span className="float-right text-[9px] text-orange-400 normal-case tracking-normal">Hỗ trợ biến {'{{name}}'}</span>
                        </label>
                        <input
                            value={config.success_message || ''}
                            onChange={e => updateConfig('success_message', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Bạn đã hoàn thành..."
                        />
                    </div>
                </div>

                {/* Conditional Fields based on Type */}
                {config.type === 'voucher' && (
                    <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                                Danh sách Voucher (Random)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-9 h-5 rounded-full transition-all relative ${config.randomize ? 'bg-orange-500' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.randomize ? 'left-5' : 'left-1'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={config.randomize || false}
                                        onChange={e => updateConfig('randomize', e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-[10px] font-bold text-white/40 group-hover:text-white transition-colors uppercase tracking-wider">Ngẫu nhiên</span>
                                </label>
                                <button
                                    onClick={() => {
                                        const newList = [
                                            ...(config.voucher_list || []),
                                            { id: crypto.randomUUID(), code: '', label: '', probability: 10 }
                                        ]
                                        setConfig({ ...config, voucher_list: newList })
                                    }}
                                    className="flex items-center gap-2 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider"
                                >
                                    <Plus size={14} /> Thêm Voucher
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(config.voucher_list || []).map((voucher, index) => (
                                <div key={voucher.id} className="group relative bg-black/40 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5">
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-black text-orange-400">
                                                {index + 1}
                                            </div>
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Voucher Item</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newList = config.voucher_list?.filter(item => item.id !== voucher.id)
                                                setConfig({ ...config, voucher_list: newList })
                                            }}
                                            className="p-1.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Xóa voucher"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4 flex gap-4">
                                        {/* Image Section */}
                                        <div className="w-24 shrink-0">
                                            <ImageUpload
                                                currentImage={voucher.image_url}
                                                onImageUpload={async (file) => {
                                                    if (onUpload) {
                                                        try {
                                                            setIsUploading(true)
                                                            const url = await onUpload(file)
                                                            const newList = [...(config.voucher_list || [])]
                                                            newList[index].image_url = url
                                                            setConfig({ ...config, voucher_list: newList })
                                                        } finally {
                                                            setIsUploading(false)
                                                        }
                                                    }
                                                }}
                                                label="Quà"
                                                className="aspect-square"
                                            />
                                        </div>

                                        {/* Inputs Section */}
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <label className="block text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1">Mã Code</label>
                                                <input
                                                    value={voucher.code}
                                                    onChange={e => {
                                                        const newList = [...(config.voucher_list || [])]
                                                        newList[index].code = e.target.value
                                                        setConfig({ ...config, voucher_list: newList })
                                                    }}
                                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500/50 outline-none font-mono placeholder:text-white/10"
                                                    placeholder="VD: SALE50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1">Tên/Nhãn Quà</label>
                                                <input
                                                    value={voucher.label}
                                                    onChange={e => {
                                                        const newList = [...(config.voucher_list || [])]
                                                        newList[index].label = e.target.value
                                                        setConfig({ ...config, voucher_list: newList })
                                                    }}
                                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500/50 outline-none placeholder:text-white/10"
                                                    placeholder="VD: Giảm 50%"
                                                />
                                            </div>
                                            {config.randomize && (
                                                <div>
                                                    <label className="block text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1">Tỷ lệ xuất hiện (%)</label>
                                                    <input
                                                        type="number"
                                                        value={voucher.probability || 0}
                                                        onChange={e => {
                                                            const newList = [...(config.voucher_list || [])]
                                                            newList[index].probability = parseInt(e.target.value) || 0
                                                            setConfig({ ...config, voucher_list: newList })
                                                        }}
                                                        className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500/50 outline-none font-mono placeholder:text-white/10"
                                                        placeholder="10"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {(!config.voucher_list || config.voucher_list.length === 0) && (
                                <div className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/20 space-y-3">
                                    <ImageIcon size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Chưa có voucher nào</p>
                                    <button
                                        onClick={() => {
                                            const newList = [
                                                ...(config.voucher_list || []),
                                                { id: crypto.randomUUID(), code: '', label: '' }
                                            ]
                                            setConfig({ ...config, voucher_list: newList })
                                        }}
                                        className="px-4 py-2 bg-white/5 hover:bg-orange-500 hover:text-white rounded-xl text-[10px] font-black transition-all uppercase tracking-widest"
                                    >
                                        + Thêm Voucher Đầu Tiên
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {config.type === 'redirect' && (
                    <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 animate-in fade-in slide-in-from-top-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Link chuyển hướng</label>
                            <input
                                value={config.redirect_url || ''}
                                onChange={e => updateConfig('redirect_url', e.target.value)}
                                className="w-full bg-black/40 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-blue-500/20"
                                placeholder="https://..."
                            />

                            <div className="mt-4 pt-4 border-t border-blue-500/20">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-10 h-5 rounded-full transition-all relative ${config.redirect_auto ? 'bg-blue-500' : 'bg-blue-900/40'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.redirect_auto ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={config.redirect_auto || false}
                                        onChange={e => setConfig({ ...config, redirect_auto: e.target.checked })}
                                        className="hidden"
                                    />
                                    <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Tự động chuyển hướng</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Tự động sau (giây)</label>
                            <input
                                type="number"
                                value={config.redirect_delay || 5}
                                onChange={e => updateConfig('redirect_delay', e.target.value)}
                                className="w-full bg-black/40 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-100 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Sharing Settings */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                    <Share2 size={14} className="text-blue-500" /> Cấu hình chia sẻ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Tiêu đề Share Title</label>
                        <input
                            value={config.share_title || ''}
                            onChange={e => updateConfig('share_title', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="POSMARS Experience"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Nội dung Share Text</label>
                        <input
                            value={config.share_text || ''}
                            onChange={e => updateConfig('share_text', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Hãy xem trải nghiệm của tôi!"
                        />
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                    <Link size={14} className="text-green-500" /> Nút hành động (CTA)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Nhãn nút (Button Text)</label>
                        <input
                            value={config.cta_text || ''}
                            onChange={e => updateConfig('cta_text', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Tìm hiểu thêm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Đường dẫn (URL)</label>
                        <input
                            value={config.cta_url || ''}
                            onChange={e => updateConfig('cta_url', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="https://posmars.com"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
