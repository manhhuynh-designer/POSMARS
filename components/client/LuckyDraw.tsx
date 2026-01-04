'use client'
import { useState, useRef } from 'react'

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
    banner_url?: string
    wheel_bg_url?: string
    pointer_url?: string
    spin_btn_url?: string
    // Rules
    rules_text?: string
}

interface LuckyDrawProps {
    config: LuckyDrawConfig
    onComplete: (prize: string) => void
}

export default function LuckyDraw({ config, onComplete }: LuckyDrawProps) {
    const [spinning, setSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [result, setResult] = useState<string | null>(null)

    const prizes = config.prizes || []
    const segmentAngle = 360 / prizes.length

    const spin = () => {
        if (spinning) return
        setSpinning(true)
        setResult(null)

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
            setResult(prizes[winnerIndex].name)
            onComplete(prizes[winnerIndex].name)
        }, 4000)
    }

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
            style={{
                backgroundColor: '#1e293b',
                ...(config.bg_url ? {
                    backgroundImage: `url(${config.bg_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                } : {})
            }}
        >
            {/* Background Overlay (if custom bg) */}
            {config.bg_url && <div className="absolute inset-0 bg-black/30"></div>}

            {/* Default Background Pattern */}
            {!config.bg_url && <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>}

            {/* Logo */}
            {config.logo_url && (
                <div className="w-32 mb-4 z-10">
                    <img src={config.logo_url} alt="Logo" className="w-full h-auto object-contain drop-shadow-lg" />
                </div>
            )}

            {/* Banner KV */}
            {config.banner_url && (
                <div className="w-full max-w-md mb-8 z-10">
                    <img src={config.banner_url} alt="Banner" className="w-full h-auto object-contain drop-shadow-xl animate-in fade-in slide-in-from-top-4 duration-700" />
                </div>
            )}

            {!config.banner_url && !config.logo_url && (
                <h2 className="text-2xl font-bold text-white mb-8 z-10 drop-shadow-md">Vòng quay may mắn</h2>
            )}

            {/* Wheel Container */}
            <div className="relative w-80 h-80 mb-8 z-10">
                {/* Custom Wheel BG (Frame) */}
                {config.wheel_bg_url && (
                    <div className="absolute -inset-4 z-0 pointer-events-none">
                        <img src={config.wheel_bg_url} className="w-full h-full object-contain scale-110" />
                    </div>
                )}

                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                    {config.pointer_url ? (
                        <img src={config.pointer_url} className="w-10 h-12 object-contain drop-shadow-lg" />
                    ) : (
                        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-lg" />
                    )}
                </div>

                {/* Wheel */}
                <div
                    className="w-full h-full rounded-full shadow-2xl overflow-hidden border-4 border-white/20 relative"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                        // Use custom wheel background if provided, otherwise use conic-gradient
                        ...(config.wheel_bg_url ? {
                            backgroundImage: `url(${config.wheel_bg_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        } : {
                            background: `conic-gradient(${prizes.map((p, i) =>
                                `${p.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
                            ).join(', ')})`
                        })
                    }}
                >
                    {/* Prize Labels / Images */}
                    {prizes.map((prize, i) => {
                        const angle = i * segmentAngle + segmentAngle / 2 - 90 // -90 to start from top
                        const radius = 100 // Distance from center (wheel is 320px = 160 radius, so 100 is good)
                        const radian = (angle * Math.PI) / 180
                        const x = 160 + radius * Math.cos(radian) // 160 = center of 320px wheel
                        const y = 160 + radius * Math.sin(radian)
                        const textRotation = angle + 90 // Rotate text to be tangent to circle
                        const fontSize = prizes.length > 8 ? 9 : prizes.length > 6 ? 10 : 11
                        const displayName = prize.name.length > 10 ? prize.name.slice(0, 10) + '..' : prize.name

                        return (
                            <div
                                key={i}
                                className="absolute text-white font-semibold whitespace-nowrap"
                                style={{
                                    left: `${x}px`,
                                    top: `${y}px`,
                                    fontSize: `${fontSize}px`,
                                    transform: `translate(-50%, -50%) rotate(${textRotation}deg)`,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                {prize.image ? (
                                    <img
                                        src={prize.image}
                                        className="w-7 h-7 object-contain bg-white/90 rounded-full p-0.5 shadow"
                                    />
                                ) : (
                                    displayName
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Center Button */}
                {config.spin_btn_url ? (
                    <button
                        onClick={spin}
                        disabled={spinning}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 z-20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        <img src={config.spin_btn_url} className="w-full h-full object-contain drop-shadow-xl" />
                    </button>
                ) : (
                    <button
                        onClick={spin}
                        disabled={spinning}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white border-4 border-orange-500 text-orange-600 font-bold shadow-[0_0_15px_rgba(255,165,0,0.5)] z-20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {spinning ? '...' : 'QUAY'}
                    </button>
                )}
            </div>

            {/* Game Rules */}
            {config.rules_text && (
                <div className="w-full max-w-sm mx-auto mt-4 mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        📋 Thể lệ chương trình
                    </h4>
                    <div
                        className="text-white/80 text-xs leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: config.rules_text }}
                    />
                </div>
            )}

            {/* Result */}
            {result && !spinning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                            🎁
                        </div>
                        <p className="text-gray-600 mb-2">Chúc mừng bạn nhận được</p>
                        <h3 className="text-2xl font-bold text-orange-600 mb-6">{result}</h3>
                        <button
                            onClick={() => setResult(null)}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            Nhận quà
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

