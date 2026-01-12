import { ChevronRight, Camera } from 'lucide-react'
import { ReactNode } from 'react'

interface PreviewPhoneProps {
    children: ReactNode
    className?: string
}

export default function PreviewPhone({ children, className = '' }: PreviewPhoneProps) {
    return (
        <div className={`relative w-full aspect-[9/16] bg-black rounded-[3rem] p-1.5 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] border-[4px] border-[#1a1a1a] ring-1 ring-white/10 transition-transform duration-500 hover:scale-[1.02] overflow-hidden ${className}`}>
            {/* Camera Notch if needed, or just container style */}
            <div className="relative w-full h-full rounded-[2.2rem] overflow-hidden bg-[#0a0a0a] flex flex-col border border-white/5">
                {children}
            </div>
        </div>
    )
}
