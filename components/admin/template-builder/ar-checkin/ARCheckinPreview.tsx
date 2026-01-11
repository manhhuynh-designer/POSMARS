import { ARCheckinConfig } from '../types'
import PreviewPhone from '../shared/PreviewPhone'
import { Camera } from 'lucide-react'

interface ARCheckinPreviewProps {
    config: ARCheckinConfig
}

export default function ARCheckinPreview({ config }: ARCheckinPreviewProps) {
    return (
        <PreviewPhone>
            {/* Camera View Simulator */}
            <div className="absolute inset-0 bg-[#1a1a1a] flex flex-col">
                <div className="flex-1 relative overflow-hidden">
                    {/* Simulated Camera Feed */}
                    <img
                        src="https://images.unsplash.com/photo-1542038784424-48ed70432451?w=800&q=80"
                        className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale"
                    />

                    {/* Frame Overlay */}
                    {config.frame_url && (
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            <img src={config.frame_url} className="w-full h-full object-contain" />
                        </div>
                    )}

                    {/* Scan Hint/Instructions */}
                    <div className="absolute top-24 left-0 right-0 z-20 flex flex-col items-center">
                        {config.instructions && (
                            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 max-w-[80%] text-center">
                                <p className="text-white text-xs font-medium">{config.instructions}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Camera UI */}
                <div className="h-32 bg-black/80 backdrop-blur-xl flex items-center justify-center gap-8 relative z-30">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="w-20 h-20 rounded-full border-4 border-white p-1">
                        <div className="w-full h-full bg-white rounded-full" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                    </div>
                </div>
            </div>
        </PreviewPhone>
    )
}
