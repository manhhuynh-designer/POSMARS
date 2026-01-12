import { Loader2, Upload, Trash2 } from 'lucide-react'
import { ReactNode, useState } from 'react'

interface FileUploaderProps {
    label?: string
    accept?: string
    currentUrl?: string
    onUpload: (file: File) => Promise<string | null>
    onClear?: () => void
    isUploading?: boolean
    className?: string
    children?: ReactNode
    renderPreview?: (url: string) => ReactNode
    helperText?: string
}

export default function FileUploader({
    label,
    accept = 'image/*',
    currentUrl,
    onUpload,
    onClear,
    isUploading,
    className = '',
    children,
    renderPreview,
    helperText
}: FileUploaderProps) {

    const [internalUploading, setInternalUploading] = useState(false)
    const effectiveUploading = isUploading !== undefined ? isUploading : internalUploading

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setInternalUploading(true)
            await onUpload(file)
        } finally {
            setInternalUploading(false)
        }
    }

    if (children) {
        return (
            <label className={`cursor-pointer ${className}`}>
                {children}
                <input type="file" className="hidden" accept={accept} onChange={handleChange} disabled={effectiveUploading} />
            </label>
        )
    }

    return (
        <div className={`relative ${className}`}>
            {/* If we have a custom preview renderer and a URL */}
            {currentUrl && renderPreview ? (
                <div className="relative group/uploader">
                    {renderPreview(currentUrl)}
                    {effectiveUploading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-[inherit] z-20">
                            <Loader2 className="animate-spin text-white" />
                        </div>
                    )}
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 transition-colors">
                    {effectiveUploading ? (
                        <Loader2 className="animate-spin text-white/50" />
                    ) : (
                        <>
                            <Upload size={24} className="text-white/40" />
                            {label && <span className="text-[10px] font-black text-white/60 uppercase mt-2">{label}</span>}
                            {helperText && <span className="text-[9px] text-white/30 font-medium mt-1">{helperText}</span>}
                        </>
                    )}
                    <input type="file" className="hidden" accept={accept} onChange={handleChange} disabled={effectiveUploading} />
                </label>
            )}

            {currentUrl && onClear && !renderPreview && (
                <button
                    onClick={(e) => { e.preventDefault(); onClear() }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg z-10"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    )
}
