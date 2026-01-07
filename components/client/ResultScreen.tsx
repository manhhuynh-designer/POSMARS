'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, Share2, RotateCcw } from 'lucide-react'

import { ResultScreenConfig } from '@/components/admin/ResultScreenEditor'

interface ResultScreenProps {
    type: 'ar' | 'game'
    template: string
    result?: {
        prize?: string
        imageUrl?: string
        message?: string
    }
    config?: ResultScreenConfig
    onRestart?: () => void
}

export default function ResultScreen({ type, template, result, config, onRestart }: ResultScreenProps) {
    const [sharing, setSharing] = useState(false)

    const handleDownload = async () => {
        if (result?.imageUrl) {
            const link = document.createElement('a')
            link.href = result.imageUrl
            link.download = `posmars-${template}-${Date.now()}.png`
            link.click()
        }
    }

    const handleShare = async () => {
        setSharing(true)
        try {
            if (navigator.share) {
                await navigator.share({
                    title: config?.share_title || 'POSMARS Experience',
                    text: config?.share_text || result?.message || 'Check out my experience!',
                    url: window.location.href
                })
            } else {
                await navigator.clipboard.writeText(window.location.href)
                alert('Link đã được sao chép!')
            }
        } catch (e) {
            console.error(e)
        }
        setSharing(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center space-y-6">
                {/* Result Content */}
                {type === 'game' && result?.prize && (
                    <>
                        <div className="text-6xl">🎉</div>
                        <h2 className="text-2xl font-bold text-gray-900">{config?.title || 'Chúc mừng!'}</h2>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-xl">
                            <p className="text-sm opacity-80">{config?.success_message || 'Bạn đã nhận được'}</p>
                            <p className="text-2xl font-bold mt-1">{result.prize}</p>
                        </div>
                    </>
                )}

                {type === 'ar' && result?.imageUrl && (
                    <>
                        <h2 className="text-xl font-bold text-gray-900">{config?.title || 'Ảnh của bạn'}</h2>
                        {config?.success_message && <p className="text-gray-500 text-sm">{config.success_message}</p>}
                        <img src={result.imageUrl} alt="AR Result" className="w-full rounded-xl shadow-lg" />
                    </>
                )}

                {/* Optional CTA */}
                {config?.cta_text && config?.cta_url && (
                    <a
                        href={config.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full bg-black text-white py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-gray-800 transition"
                    >
                        {config.cta_text}
                    </a>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-center pt-2">
                    {result?.imageUrl && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                        >
                            <Download size={20} /> Tải về
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition"
                    >
                        <Share2 size={20} /> Chia sẻ
                    </button>
                </div>

                {onRestart && (
                    <button
                        onClick={onRestart}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mx-auto"
                    >
                        <RotateCcw size={16} /> Chơi lại
                    </button>
                )}
            </div>
        </div>
    )
}
