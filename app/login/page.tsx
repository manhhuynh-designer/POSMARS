'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        setLoading(false)
        if (error) {
            setError(error.message)
        } else {
            router.push('/admin')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src="/logo-long.png" alt="POSMARS" className="h-16 w-auto object-contain mx-auto mb-4" />
                    <p className="text-gray-500">Admin Portal</p>
                </div>

                <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-lg p-8 space-y-4">
                    <h2 className="text-xl font-bold text-center">Đăng nhập</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full border p-3 rounded-lg"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@posmars.vn"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            className="w-full border p-3 rounded-lg"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                    >
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    )
}
