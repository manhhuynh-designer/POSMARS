import { LuckyDrawConfig } from '../types'
import PreviewPhone from '../shared/PreviewPhone'

interface LuckyDrawPreviewProps {
    config: LuckyDrawConfig
}

export default function LuckyDrawPreview({ config }: LuckyDrawPreviewProps) {
    const prizes = config.prizes || []

    return (
        <PreviewPhone>
            {/* Theme Mockup */}
            <div className="absolute inset-0 bg-[#0a0a0a]">
                {/* Header Banner Mockup */}
                <div className="h-24 w-full bg-white/5 relative overflow-hidden">
                    {config.banner_url ? (
                        <img src={config.banner_url} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-2xl rotate-3 text-center px-4 uppercase">LUCKY DRAW</div>
                    )}
                    {config.logo_url && (
                        <img src={config.logo_url} className="absolute bottom-4 left-4 w-10 h-10 bg-black/40 border border-white/10 rounded-xl shadow-lg p-1" />
                    )}
                </div>

                {/* Wheel Mockup (Simplified representation) */}
                <div className="mt-12 flex flex-col items-center justify-center space-y-10">
                    <div className="relative">
                        {/* Pointer */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 z-20 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                            {config.pointer_url ? (
                                <img src={config.pointer_url} className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-orange-500 text-3xl">▼</div>
                            )}
                        </div>

                        {/* Wheel Disk */}
                        <div className="w-64 h-64 rounded-full border-[8px] border-orange-500/20 bg-black shadow-[0_0_40px_rgba(249,115,22,0.1)] relative overflow-hidden flex items-center justify-center border-dashed">
                            {prizes.length > 0 ? (
                                <div className="w-full h-full relative" style={{ transform: 'rotate(0deg)' }}>
                                    {prizes.map((p, i) => {
                                        const angle = 360 / prizes.length
                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 h-full origin-bottom"
                                                style={{
                                                    width: '1px',
                                                    transform: `rotate(${i * angle}deg)`,
                                                    background: 'rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                <div className="absolute top-4 -translate-x-1/2 w-8 h-8 rounded-full border border-white/20 shadow-xl" style={{ backgroundColor: p.color || '#333' }}></div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-[10px] font-black text-white/10 uppercase italic">Add Prizes</div>
                            )}

                            {/* Center Button */}
                            <div className="absolute inset-0 m-auto w-16 h-16 bg-[#121212] rounded-full shadow-2xl border-4 border-orange-500 z-10 flex items-center justify-center overflow-hidden">
                                {config.spin_btn_url ? (
                                    <img src={config.spin_btn_url} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">SPIN</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-48 h-10 bg-orange-500 rounded-full shadow-lg shadow-orange-900/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer">
                        <span className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Live Simulation</span>
                    </div>
                </div>

                {/* Rules placeholder */}
                <div className="mt-8 px-6 space-y-4">
                    <div className="h-2 w-24 bg-white/5 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-white/2 rounded-full"></div>
                        <div className="h-1.5 w-full bg-white/2 rounded-full"></div>
                        <div className="h-1.5 w-3/4 bg-white/2 rounded-full"></div>
                    </div>
                </div>
            </div>
        </PreviewPhone>
    )
}
