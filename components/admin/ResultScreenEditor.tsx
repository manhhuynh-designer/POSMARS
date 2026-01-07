'use client'
import { useState, useEffect } from 'react'
import { Settings, Share2, Link, MessageSquare } from 'lucide-react'

export interface ResultScreenConfig {
    title?: string
    success_message?: string
    share_title?: string
    share_text?: string
    cta_text?: string
    cta_url?: string
}

interface ResultScreenEditorProps {
    initialConfig: ResultScreenConfig
    onChange: (config: ResultScreenConfig) => void
}

export default function ResultScreenEditor({ initialConfig, onChange }: ResultScreenEditorProps) {
    const [config, setConfig] = useState<ResultScreenConfig>(initialConfig || {})

    useEffect(() => {
        onChange(config)
    }, [config])

    const updateConfig = (key: keyof ResultScreenConfig, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="space-y-10">
            {/* General Settings */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                    <MessageSquare size={14} className="text-orange-500" /> Nội dung hiển thị
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Tiêu đề (Title)</label>
                        <input
                            value={config.title || ''}
                            onChange={e => updateConfig('title', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Chúc mừng!"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Lời nhắn (Message)</label>
                        <input
                            value={config.success_message || ''}
                            onChange={e => updateConfig('success_message', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Bạn đã hoàn thành trải nghiệm..."
                        />
                    </div>
                </div>
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
