'use client'
import { useState, useRef, useMemo } from 'react'

interface POSConfig {
    pos_id: string
    pos_name: string
    prizes: Prize[]
}

interface Prize {
    name: string
    probability: number
    color: string
    image?: string
}

interface LuckyDrawConfig {
    wheel_segments?: number
    prizes: Prize[]
    // Branding
    logo_url?: string
    bg_url?: string
    bg_type?: 'image' | 'solid' | 'gradient'
    bg_color?: string
    bg_gradient_start?: string
    bg_gradient_end?: string
    banner_url?: string
    wheel_bg_url?: string
    pointer_url?: string
    spin_btn_url?: string
    // Rules
    rules_text?: string
    // Theme Options
    theme_primary_color?: string
    theme_accent_color?: string
    theme_text_color?: string
    // Result Popup Customization
    result_title_text?: string
    result_button_text?: string
    result_icon_url?: string
    // POS & Replay
    enable_pos_config?: boolean
    pos_configs?: Record<string, POSConfig>
    allow_replay?: boolean
    replay_button_text?: string
    max_plays?: number
}

interface LuckyDrawProps {
    config: LuckyDrawConfig
    onComplete: (prize: Prize) => void
    isPreview?: boolean // Disable spinning in admin preview
    posId?: string
    // Play Limit Props
    maxPlays?: number
    currentPlays?: number
}

export default function LuckyDraw({ config, onComplete, isPreview = false, posId, maxPlays = 999, currentPlays = 0 }: LuckyDrawProps) {
    const [spinning, setSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [resultPrize, setResultPrize] = useState<Prize | null>(null)

    const prizes = useMemo(() => {
        let finalPrizes = config.prizes || []
        if (config.enable_pos_config && posId && config.pos_configs?.[posId]) {
            console.log('Using POS config prizes for:', posId)
            finalPrizes = config.pos_configs[posId].prizes || []
        }
        console.log('LuckyDraw Prizes:', finalPrizes)
        return finalPrizes
    }, [config, posId])

    const segmentAngle = 360 / Math.max(prizes.length, 1)

    const spin = () => {
        if (spinning || isPreview) return // Disable spin in preview mode
        setSpinning(true)
        setResultPrize(null)

        // Determine winner based on probability
        const random = Math.random() * 100
        let cumulative = 0
        let winnerIndex = 0

        for (let i = 0; i < prizes.length; i++) {
            cumulative += prizes[i].probability
            if (random <= cumulative) {
                winnerIndex = i
                break
            }
        }

        // Calculate rotation to land on winner
        const extraSpins = 5 + Math.floor(Math.random() * 3)
        const winnerAngle = winnerIndex * segmentAngle + segmentAngle / 2
        const targetRotation = rotation + (extraSpins * 360) + (360 - winnerAngle)

        setRotation(targetRotation)

        setTimeout(() => {
            setSpinning(false)
            setResultPrize(prizes[winnerIndex])
            onComplete(prizes[winnerIndex])
        }, 4000)
    }

    // Background style computation
    const getBackgroundStyle = () => {
        const bgType = config.bg_type || 'image'
        if (bgType === 'solid') {
            return { backgroundColor: config.bg_color || '#1e293b' }
        } else if (bgType === 'gradient') {
            return { background: `linear-gradient(to bottom, ${config.bg_gradient_start || '#1e293b'}, ${config.bg_gradient_end || '#0f172a'})` }
        }
        // For image type, we simply return the base color, image is handled via absolute div
        return { backgroundColor: '#1e293b' }
    }

    return (
        <div
            className={`${isPreview ? 'h-full overflow-y-auto' : 'min-h-screen'} flex flex-col items-center ${isPreview ? 'justify-start pt-4' : 'justify-center'} p-4 relative overflow-x-hidden`}
            style={getBackgroundStyle()}
        >
            {/* Background Image with No Opacity Reduction & No Blur */}
            {config.bg_type !== 'solid' && config.bg_type !== 'gradient' && config.bg_url && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
                    style={{
                        backgroundImage: `url(${config.bg_url})`,
                        filter: 'none' // Explicitly ensure no blur
                    }}
                />
            )}

            {/* Default Background Pattern (only when no custom bg) */}
            {!config.bg_url && config.bg_type !== 'solid' && config.bg_type !== 'gradient' && <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>}

            {/* Logo */}
            {config.logo_url && (
                <div className="w-32 mb-4 z-10">
                    <img src={config.logo_url} alt="Logo" className="w-full h-auto object-contain drop-shadow-lg" />
                </div>
            )}

            {/* Banner KV */}
            {config.banner_url && (
                <div className="w-full max-w-md mb-8 z-10">
                    <img src={config.banner_url} alt="Banner" className="w-full h-auto object-contain drop-shadow-xl animate-in fade-in slide-in-from-top-4 duration-700 rounded-3xl" />
                </div>
            )}

            {!config.banner_url && !config.logo_url && (
                <h2 className="text-2xl font-bold text-white mb-8 z-10 drop-shadow-md">Vòng quay may mắn</h2>
            )}

            {/* Remaining Plays Badge */}
            {maxPlays < 999 && (
                <div className="mb-6 z-10 animate-in fade-in slide-in-from-top-4 delay-100">
                    <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center gap-2">
                        <span className="text-lg">🎟️</span>
                        <span className="text-white font-bold text-sm uppercase tracking-wider">
                            Lượt quay: <span className="text-orange-400 text-base">{Math.max(0, maxPlays - currentPlays)}</span>/{maxPlays}
                        </span>
                    </div>
                </div>
            )}

            {/* Wheel Container - Responsive Square */}
            <div className="relative w-[90vw] h-[90vw] max-w-[340px] max-h-[340px] mb-8 z-10 shrink-0 aspect-square">
                {/* Custom Wheel BG (Frame) - Acts as Outer Boundary */}
                {config.wheel_bg_url && (
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <img src={config.wheel_bg_url} className="w-full h-full object-contain" />
                    </div>
                )}

                {/* Pointer - Positioned relative to Outer Frame */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[10%] z-20 w-[18%] h-[20%]">
                    {config.pointer_url ? (
                        <img src={config.pointer_url} className="w-14 h-16 object-contain drop-shadow-lg" />
                    ) : (
                        <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[36px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-lg" />
                    )}
                </div>

                {/* Wheel (Rotating Part) - Scaled down to fit INSIDE the frame */}
                <div
                    className="absolute w-[82%] h-[82%] rounded-full shadow-2xl overflow-hidden border-4 border-white/20"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                        transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                        // Only show conic-gradient when NO custom wheel is uploaded
                        background: config.wheel_bg_url
                            ? 'transparent'
                            : `conic-gradient(${prizes.map((p, i) =>
                                `${p.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
                            ).join(', ')})`
                    }}
                >
                    {/* Prize Labels / Images */}
                    {prizes.map((prize, i) => {
                        // Conic gradient starts at 0deg (Top)
                        // Segment i is from [i*seg] to [(i+1)*seg] degrees CW from Top
                        // Center of segment is i*seg + seg/2 degrees CW from Top

                        // Math.cos/sin 0 is Right (3 o'clock).
                        // To match Top (12 o'clock), we need to subtract 90 degrees from the angle passed to cos/sin.

                        const segmentCenterAngle = i * segmentAngle + segmentAngle / 2
                        const angleForTrig = segmentCenterAngle - 90

                        const radiusPercent = 34 // Reduced to 34% to fit inside the wheel track
                        const radian = (angleForTrig * Math.PI) / 180

                        // Calculate position as percentage from center (50%)
                        // Cos/Sin gives -1 to 1, multiply by radiusPercent to get offset
                        const leftPercent = 50 + radiusPercent * Math.cos(radian)
                        const topPercent = 50 + radiusPercent * Math.sin(radian)

                        const textRotation = segmentCenterAngle + 90 // Rotate text to be tangent to circle
                        // Use percentage-based font size relative to container
                        // Estimated: 4% of container width approx 12-14px on mobile
                        const fontSizeStr = prizes.length > 8 ? '3%' : prizes.length > 6 ? '3.5%' : '4%'
                        const displayName = prize.name

                        const PrizeLabel = ({ prize, fontSize }: { prize: Prize, fontSize: string }) => {
                            const [imgError, setImgError] = useState(false)

                            if (prize.image && !imgError) {
                                return (
                                    <img
                                        src={prize.image}
                                        className="w-10 h-10 object-contain drop-shadow-md"
                                        onError={() => setImgError(true)}
                                    />
                                )
                            }

                            return (
                                <span className="truncate w-full text-center">{prize.name}</span>
                            )
                        }

                        // ... inside rendering loop ...
                        return (
                            <div
                                key={i}
                                className="absolute text-white font-semibold whitespace-nowrap flex items-center justify-center max-w-[25%]"
                                style={{
                                    left: `${leftPercent}%`,
                                    top: `${topPercent}%`,
                                    fontSize: fontSizeStr,
                                    width: '30%', // Restrain width relative to wheel
                                    transform: `translate(-50%, -50%) rotate(${textRotation}deg)`,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                <PrizeLabel prize={prize} fontSize={fontSizeStr} />
                            </div>
                        )
                    })}
                </div>

                {/* Center Button */}
                {config.spin_btn_url ? (
                    <button
                        onClick={spin}
                        disabled={spinning}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        <img src={config.spin_btn_url} className="w-full h-full object-contain drop-shadow-xl" />
                    </button>
                ) : (
                    <button
                        onClick={spin}
                        disabled={spinning}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white border-4 border-orange-500 text-orange-600 font-bold shadow-[0_0_15px_rgba(255,165,0,0.5)] z-20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {spinning ? '...' : 'QUAY'}
                    </button>
                )}
            </div>

            {/* Game Rules */}
            {config.rules_text && (
                <div className="w-full max-w-sm mx-auto mt-4 mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <h4
                        className="font-semibold text-sm mb-2 flex items-center gap-2"
                        style={{ color: config.theme_text_color || '#ffffff' }}
                    >
                        📋 Thể lệ chương trình
                    </h4>
                    <div
                        className="text-xs leading-relaxed whitespace-pre-line"
                        style={{ color: config.theme_text_color ? `${config.theme_text_color}CC` : 'rgba(255,255,255,0.8)' }}
                        dangerouslySetInnerHTML={{ __html: config.rules_text }}
                    />
                </div>
            )}

            {/* Result */}
            {resultPrize && !spinning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden"
                            style={{ backgroundColor: `${config.theme_primary_color || '#f97316'}20` }}
                        >
                            {resultPrize.image ? (
                                <img src={resultPrize.image} className="w-20 h-20 object-contain" />
                            ) : config.result_icon_url ? (
                                <img src={config.result_icon_url} className="w-16 h-16 object-contain" />
                            ) : (
                                <span className="text-5xl">🎁</span>
                            )}
                        </div>
                        <p className="text-gray-600 mb-2">{config.result_title_text || 'Chúc mừng bạn nhận được'}</p>
                        <h3
                            className="text-2xl font-bold mb-6"
                            style={{ color: config.theme_primary_color || '#f97316' }}
                        >
                            {resultPrize.name}
                        </h3>
                        <button
                            onClick={() => setResultPrize(null)}
                            className="w-full text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                            style={{
                                background: `linear-gradient(to right, ${config.theme_primary_color || '#f97316'}, ${config.theme_accent_color || '#ef4444'})`
                            }}
                        >
                            {config.result_button_text || 'Nhận quà'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
