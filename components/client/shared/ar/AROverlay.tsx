'use client'

import { X } from 'lucide-react'

interface AROverlayProps {
    logoUrl?: string
    instructions?: string
    showScanHint?: boolean
    onClose: () => void
}

/**
 * Shared AR Overlay Component
 * Provides consistent UI elements across all AR templates:
 * - Logo (top-left)
 * - Scanner hint (center)
 * - Close button (top-right)
 */
export default function AROverlay({
    logoUrl,
    instructions,
    showScanHint = false,
    onClose
}: AROverlayProps) {
    return (
        <>
            {/* Logo */}
            {logoUrl && (
                <div className="absolute top-4 left-4 z-20">
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-10 object-contain drop-shadow-lg"
                    />
                </div>
            )}

            {/* Scan Hint - Center overlay */}
            {showScanHint && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-center text-white bg-black/60 backdrop-blur-sm px-8 py-6 rounded-2xl border border-white/10 shadow-2xl max-w-sm mx-4">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-lg font-medium leading-relaxed">
                            {instructions || 'Scan the object to activate AR'}
                        </p>
                        <p className="text-sm text-white/60 mt-2">Positioning camera...</p>
                    </div>
                </div>
            )}

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-20 hover:bg-black/70 transition-colors active:scale-95"
                aria-label="Close AR"
            >
                <X size={24} />
            </button>
        </>
    )
}
