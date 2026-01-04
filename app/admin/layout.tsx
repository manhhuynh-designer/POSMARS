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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/admin">
                            <img src="/logo-header.png" alt="POSMARS" className="h-8 w-auto px-2" />
                        </Link>
                        <nav className="flex items-center gap-4">
                            <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                            <Link href="/admin/create" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                                <Plus size={16} /> Tạo Project
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{user?.email}</span>
                        <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                            <LogOut size={16} /> Đăng xuất
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
