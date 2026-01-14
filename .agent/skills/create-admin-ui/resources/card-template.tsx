import { LucideIcon } from 'lucide-react'

interface AdminCardProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    children: React.ReactNode
    className?: string
}

export default function AdminCard({
    title,
    subtitle,
    icon: Icon,
    children,
    className = ''
}: AdminCardProps) {
    return (
        <div className={`bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                {Icon && (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa9440] to-[#e7313d] flex items-center justify-center text-white shadow-xl shadow-orange-900/20">
                        <Icon size={24} />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{title}</h3>
                    {subtitle && (
                        <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    )
}
