import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Download, Share2, RotateCcw, Copy, ExternalLink, Timer, Sparkles } from 'lucide-react'
import { replaceVariables } from '@/lib/utils/personalization'
import { ResultScreenConfig } from '@/components/admin/ResultScreenEditor'

interface ResultScreenProps {
    type: 'ar' | 'game'
    template: string
    result?: {
        prize?: any // Can be Prize object or string
        imageUrl?: string
        message?: string
    }
    config?: ResultScreenConfig
    gameConfig?: {
        bg_url?: string
        bg_type?: 'image' | 'solid' | 'gradient'
        bg_color?: string
        bg_gradient_start?: string
        bg_gradient_end?: string
        logo_url?: string
        theme_primary_color?: string
        theme_accent_color?: string
        theme_text_color?: string
        result_title_text?: string
        result_button_text?: string
        result_icon_url?: string
        allow_replay?: boolean
        replay_button_text?: string
    }
    onRestart?: () => void
    userData?: Record<string, string>
    leadId?: number | null
}

export default function ResultScreen({ type, template, result, config, gameConfig, onRestart, userData, leadId }: ResultScreenProps) {
    const [sharing, setSharing] = useState(false)
    const [copied, setCopied] = useState(false)
    const [countdown, setCountdown] = useState(config?.redirect_delay || 5)
    // Voucher state
    const [selectedVoucher, setSelectedVoucher] = useState<{ code: string; label: string; image_url?: string } | null>(null)

    // Weighted Random Voucher Logic
    useEffect(() => {
        // Priority 0: If a prize was already won in a game, use it!
        if (type === 'game' && result?.prize) {
            const prizeObj = typeof result.prize === 'string'
                ? { code: 'WINNER', label: result.prize }
                : { code: 'WINNER', label: (result.prize as any).name, image_url: (result.prize as any).image };

            setSelectedVoucher(prizeObj);
            return;
        }

        if (config?.type === 'voucher' && config.voucher_list && config.voucher_list.length > 0) {
            // Priority 1: Handle stability while editing in Admin
            if (selectedVoucher) {
                const stillExists = config.voucher_list.find(v =>
                    v.code === selectedVoucher.code && v.label === selectedVoucher.label
                );
                if (stillExists) return;
            }

            // Priority 2: If randomization is disabled, always take first
            if (!config.randomize) {
                setSelectedVoucher(config.voucher_list[0]);
                return;
            }

            // Priority 3: Weighted Random
            const totalWeight = config.voucher_list.reduce((sum, v) => sum + (v.probability || 0), 0);

            if (totalWeight > 0) {
                let r = Math.random() * totalWeight;
                for (const voucher of config.voucher_list) {
                    r -= (voucher.probability || 0);
                    if (r <= 0) {
                        setSelectedVoucher(voucher);
                        return;
                    }
                }
            }

            // Fallback: Simple random if weights are 0 or error
            const randomIndex = Math.floor(Math.random() * config.voucher_list.length);
            setSelectedVoucher(config.voucher_list[randomIndex]);
        }
    }, [config?.type, config?.voucher_list, config?.randomize, result?.prize, type])

    // Persist Voucher Selection
    useEffect(() => {
        const persistVoucher = async () => {
            if (leadId && selectedVoucher && config?.type === 'voucher') {
                try {
                    await supabase.rpc('update_lead_result', {
                        p_lead_id: leadId,
                        p_result: {
                            ...result,
                            voucher: selectedVoucher
                        }
                    })
                    console.log('✅ Voucher persisted to lead:', leadId)
                } catch (err) {
                    console.error('❌ Failed to persist voucher:', err)
                }
            }
        }
        persistVoucher()
    }, [leadId, selectedVoucher])

    // Personalized strings
    const title = replaceVariables(config?.title || '', userData || {}, config)
    const message = replaceVariables(config?.success_message || '', userData || {}, config)
    const shareTitle = replaceVariables(config?.share_title || 'POSMARS Experience', userData || {}, config)
    const shareText = replaceVariables(config?.share_text || result?.message || 'Check out my experience!', userData || {}, config)

    // Handle Redirect Type
    useEffect(() => {
        if (config?.type === 'redirect' && config.redirect_url && config.redirect_auto) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        window.location.href = config.redirect_url!
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [config?.type, config?.redirect_url, config?.redirect_auto])

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
                    title: shareTitle,
                    text: shareText,
                    url: window.location.href
                })
                // Track share event
                if ((window as any).trackGAEvent) {
                    (window as any).trackGAEvent('share', {
                        share_type: result?.imageUrl ? 'photo' : 'link',
                        source: 'result_screen'
                    })
                }
            } else {
                await navigator.clipboard.writeText(window.location.href)
                alert('Link đã được sao chép!')
            }
        } catch (e) {
            console.error(e)
        }
        setSharing(false)
    }

    const handleCopyVoucher = () => {
        if (selectedVoucher?.code) {
            navigator.clipboard.writeText(selectedVoucher.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Theme colors from game config
    const primaryColor = gameConfig?.theme_primary_color || '#f97316'
    const accentColor = gameConfig?.theme_accent_color || '#ef4444'
    const isGameTheme = template === 'lucky_draw' && type === 'game'

    // Background style computation for game theme
    const getBackgroundStyle = () => {
        if (!isGameTheme) return {}
        const bgType = gameConfig?.bg_type || 'image'
        if (bgType === 'solid') {
            return { backgroundColor: gameConfig?.bg_color || '#1e293b' }
        } else if (bgType === 'gradient') {
            return { background: `linear-gradient(to bottom, ${gameConfig?.bg_gradient_start || '#1e293b'}, ${gameConfig?.bg_gradient_end || '#0f172a'})` }
        }
        return { backgroundColor: '#1e293b' }
    }

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center p-4 ${isGameTheme ? '' : 'bg-gradient-to-b from-orange-100 to-orange-50'}`}
            style={getBackgroundStyle()}
        >
            {/* Background Image with No Opacity Reduction & No Blur for Game Theme */}
            {isGameTheme && gameConfig?.bg_type !== 'solid' && gameConfig?.bg_type !== 'gradient' && gameConfig?.bg_url && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
                    style={{
                        backgroundImage: `url(${gameConfig.bg_url})`,
                        filter: 'none'
                    }}
                />
            )}

            <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 text-center space-y-6 relative overflow-hidden z-10 ${isGameTheme ? 'bg-[#121212] border border-white/10' : 'bg-white'}`}>

                {/* Redirect Progress Bar */}
                {config?.type === 'redirect' && config.redirect_auto && (
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(countdown / (config.redirect_delay || 5)) * 100}%` }}
                    />
                )}

                {/* Main Content Based on Result Type */}
                <div className="space-y-4">
                    {config?.type === 'voucher' && (
                        <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl mb-2">
                            🎁
                        </div>
                    )}

                    {config?.type === 'redirect' && (
                        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-2">
                            <Timer size={40} />
                        </div>
                    )}

                    {(type === 'game' || !result?.imageUrl) && (
                        <div className="text-6xl mb-4">
                            {gameConfig?.result_icon_url ? (
                                <img src={gameConfig.result_icon_url} className="w-20 h-20 mx-auto object-contain" />
                            ) : (
                                type === 'game' ? '🎉' : '✨'
                            )}
                        </div>
                    )}

                    <h2 className={`text-2xl font-bold leading-tight ${isGameTheme ? 'text-white' : 'text-gray-900'}`}>
                        {gameConfig?.result_title_text || title || (config?.type === 'voucher' ? 'Bạn nhận được quà!' : 'Chúc mừng!')}
                    </h2>

                    {/* Standard/Game Message */}
                    {message && (
                        <div className={`${type === 'game' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-600'} py-4 px-6 rounded-xl`}>
                            <p className={`text-sm ${type === 'game' ? 'opacity-90' : ''}`}>{message}</p>
                        </div>
                    )}

                    {/* Prize Display for Game - Always show when prize exists */}
                    {type === 'game' && result?.prize && config?.type !== 'voucher' && (
                        <div
                            className="text-white shadow-lg py-6 px-6 rounded-xl space-y-2"
                            style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}
                        >
                            <p className="text-sm opacity-90">Bạn đã trúng giải</p>
                            <div className="flex items-center justify-center gap-3">
                                {(result.prize as any)?.image && (
                                    <img src={(result.prize as any).image} className="w-14 h-14 rounded-full border-2 border-white/40 object-contain bg-white/20" />
                                )}
                                <p className="text-2xl font-bold">
                                    {typeof result.prize === 'string' ? result.prize : (result.prize as any).name}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Voucher Display - PREMIUM REDESIGN */}
                {config?.type === 'voucher' && selectedVoucher && (
                    <div className="relative py-4 animate-in zoom-in-95 duration-700">
                        {/* Ticket Container */}
                        <div className="relative mx-auto max-w-[300px] filter drop-shadow-2xl group cursor-pointer" onClick={handleCopyVoucher}>
                            {/* The Ticket Shape */}
                            <div className="bg-white rounded-2xl overflow-hidden flex flex-col border border-orange-100 relative">
                                {/* Top Part: Image & Label */}
                                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 text-white">
                                    {selectedVoucher.image_url ? (
                                        <div className="relative w-20 h-20 mx-auto mb-3 rounded-full border-2 border-white/30 overflow-hidden shadow-inner bg-white/10 backdrop-blur-sm">
                                            <img src={selectedVoucher.image_url} alt="Gift" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="text-4xl mb-2 flex justify-center">🎁</div>
                                    )}
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Thành tích của bạn</p>
                                    <h3 className="text-xl font-black leading-tight uppercase tracking-tight">{selectedVoucher.label || 'Voucher Quà Tặng'}</h3>
                                </div>

                                {/* Perforation Line */}
                                <div className="relative h-6 bg-white flex items-center">
                                    <div className="absolute left-[-12px] w-6 h-6 bg-orange-50 rounded-full border-r border-orange-100" />
                                    <div className="absolute right-[-12px] w-6 h-6 bg-orange-50 rounded-full border-l border-orange-100" />
                                    <div className="w-full border-t-2 border-dashed border-orange-100 mx-6 opacity-50" />
                                </div>

                                {/* Bottom Part: Code & CTA */}
                                <div className="p-6 bg-white text-center">
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mã ưu đãi</p>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 inline-block min-w-[160px] relative overflow-hidden group-hover:border-orange-200 transition-colors">
                                            <code className="text-2xl font-black text-gray-800 tracking-tighter">{selectedVoucher.code}</code>
                                            {/* Shimmer Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                        </div>
                                    </div>
                                    <button
                                        className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                                            }`}
                                    >
                                        {copied ? (
                                            <span className="flex items-center justify-center gap-2">
                                                ✅ ĐÃ SAO CHÉP
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Copy size={14} /> SAO CHÉP MÃ
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Shine Sparkle animation placeholder using CSS in JSX if possible, or just standard classes */}
                                <div className="absolute top-0 right-0 p-2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                                    <Sparkles size={24} className="text-white animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Hint text */}
                        <p className="mt-4 text-[10px] font-bold text-orange-400 uppercase tracking-widest animate-bounce">
                            Chụp màn hình hoặc copy để sử dụng!
                        </p>
                    </div>
                )}

                {/* AR Result Image */}
                {type === 'ar' && result?.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden shadow-lg border-4 border-white">
                        <img src={result.imageUrl} alt="AR Result" className="w-full" />
                    </div>
                )}

                {/* Redirect Info */}
                {config?.type === 'redirect' && config.redirect_auto && (
                    <p className="text-sm text-gray-500 animate-pulse">
                        Tự động chuyển trang sau {countdown}s...
                    </p>
                )}

                {/* Optional CTA */}
                {config?.cta_text && config?.cta_url && config.type !== 'redirect' && (
                    <a
                        href={config.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full bg-black text-white py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                        {config.cta_text} <ExternalLink size={16} />
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

                    {config?.type !== 'redirect' && (
                        <button
                            onClick={handleShare}
                            disabled={sharing}
                            className="flex items-center gap-2 text-white px-6 py-3 rounded-xl font-medium hover:brightness-110 transition shadow-lg shadow-black/20"
                            style={{
                                backgroundColor: isGameTheme ? (gameConfig?.theme_accent_color || '#f97316') : '#3b82f6',
                                // Fallback to blue if not game theme
                            }}
                        >
                            <Share2 size={20} /> Chia sẻ
                        </button>
                    )}

                    {/* Replay Button */}
                    {gameConfig?.allow_replay && (
                        <button
                            onClick={onRestart}
                            className="flex items-center gap-2 bg-white text-gray-800 border border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition shadow-sm"
                        >
                            <RotateCcw size={20} />
                            {gameConfig.replay_button_text || 'Chơi lại'}
                        </button>
                    )}
                </div>


            </div>
        </div>
    )
}
