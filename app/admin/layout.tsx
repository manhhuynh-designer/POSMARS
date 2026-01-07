'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Plus, LogOut, Settings } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
        } else {
            setUser(session.user)
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-white/5 border-t-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(249,115,22,0.2)]" />
                    <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Xác thực quyền truy cập...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/admin">
                            <img src="/logo-header.png" alt="POSMARS" className="h-8 w-auto px-2" />
                        </Link>
                        <nav className="flex items-center gap-6">
                            <Link href="/admin" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                <LayoutDashboard size={14} className="text-orange-500" /> Dashboard
                            </Link>
                            <Link href="/admin/create" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                <Plus size={14} className="text-orange-500" /> Tạo Project
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest hidden md:block">{user?.email}</span>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all">
                            <LogOut size={14} /> Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}
