import { ReactNode } from 'react'

interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
    size?: number
    className?: string
}

export default function ColorPicker({ value, onChange, size = 10, className = '' }: ColorPickerProps) {
    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-${size} h-${size} border-4 border-black shadow-lg rounded-xl cursor-pointer p-0`}
            />
            {/* <span className="font-mono text-[9px] font-bold text-white/50 uppercase">{value}</span> */}
        </div>
    )
}
