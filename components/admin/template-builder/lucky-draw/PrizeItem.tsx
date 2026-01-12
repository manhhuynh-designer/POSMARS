'use client'
import { useState } from 'react'
import { Trash2, ImageIcon, Upload } from 'lucide-react'
import { Prize } from '../types'
import FileUploader from '../shared/FileUploader'
import ColorPicker from '../shared/ColorPicker'

interface PrizeItemProps {
    prize: Prize
    index: number
    onUpdate: (index: number, updates: Partial<Prize>) => void
    onRemove: (index: number) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function PrizeItem({ prize, index, onUpdate, onRemove, onUpload }: PrizeItemProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleImageUpload = async (file: File) => {
        try {
            setIsUploading(true)
            const url = await onUpload(file, `prizes/${Date.now()}_${file.name}`)
            onUpdate(index, { image: url })
            return url
        } catch (error) {
            console.error(error)
            return null
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="group bg-[#0c0c0c] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl hover:border-orange-500/30 transition-all duration-500">
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Image Upload */}
                <div className="relative w-28 h-28 rounded-3xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                    <FileUploader
                        onUpload={handleImageUpload}
                        isUploading={isUploading}
                        className="w-full h-full absolute inset-0 z-10 opacity-0 hover:opacity-100 transition-all bg-orange-500/60 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                    >
                        <div className="w-full h-full flex flex-col items-center justify-center text-white font-black text-[10px] uppercase tracking-widest gap-2">
                            <Upload size={16} />
                            Update
                        </div>
                    </FileUploader>

                    {prize.image ? (
                        <img src={prize.image} className="w-full h-full object-contain p-3" alt={prize.name} />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-white/10">
                            <ImageIcon size={32} />
                            <span className="text-[8px] font-black uppercase tracking-widest">No Icon</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
                    {/* Name Input */}
                    <div className="lg:col-span-5 space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Prize Identifier</label>
                        <input
                            value={prize.name}
                            onChange={e => onUpdate(index, { name: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:border-orange-500/50 transition-all placeholder:text-white/5"
                            placeholder="e.g. Voucher 50k, Iphone 15..."
                        />
                    </div>

                    {/* Probability Input */}
                    <div className="lg:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center block">Drop Rate (%)</label>
                        <div className="relative group">
                            <input
                                type="number"
                                value={prize.probability}
                                onChange={e => onUpdate(index, { probability: Number(e.target.value) })}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-center text-white outline-none focus:border-orange-500/50 transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500/40">%</div>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="lg:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center block">Visual Theme</label>
                        <ColorPicker
                            value={prize.color}
                            onChange={color => onUpdate(index, { color })}
                        />
                    </div>

                    {/* Delete Button */}
                    <div className="lg:col-span-1 flex justify-end">
                        <button
                            onClick={() => onRemove(index)}
                            className="w-12 h-12 flex items-center justify-center text-white/10 hover:text-white hover:bg-red-500 rounded-2xl transition-all shadow-xl active:scale-90"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
