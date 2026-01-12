import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

interface ImageUploadProps {
    currentImage?: string
    onImageUpload: (file: File) => Promise<void>
    label?: string
    className?: string
}

export function ImageUpload({ currentImage, onImageUpload, label, className = '' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setIsUploading(true)
            await onImageUpload(file)
        } catch (error) {
            console.error('Upload failed', error)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className={`relative group ${className}`}>
            {currentImage ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <img
                        src={currentImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <label className="cursor-pointer p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <Upload size={16} className="text-white" />
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" />
                        </div>
                    )}
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-square rounded-xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group/label">
                    {isUploading ? (
                        <Loader2 className="animate-spin text-white/40" />
                    ) : (
                        <>
                            <ImageIcon size={20} className="text-white/20 group-hover/label:text-white/40 transition-colors mb-2" />
                            <span className="text-[10px] font-bold text-white/30 group-hover/label:text-white/50 uppercase text-center px-2">
                                {label || 'Upload Image'}
                            </span>
                        </>
                    )}
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                </label>
            )}
        </div>
    )
}
