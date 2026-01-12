'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

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
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Section */}
                <div className="text-center mb-10 group cursor-default">
                    <div className="inline-block relative mb-6">
                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-150 group-hover:bg-orange-500/30 transition-all duration-700" />
                        <img
                            src="/logo-long.png"
                            alt="POSMARS"
                            className="h-20 w-auto object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-white font-black uppercase tracking-[0.4em] text-[10px] flex items-center justify-center gap-2">
                            <ShieldCheck size={12} className="text-orange-500" /> Administrative Access
                        </h1>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-[#0c0c0c]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl p-8 md:p-10 space-y-8 relative overflow-hidden group">
                    {/* Inner Glow/Border Effect */}
                    <div className="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none" />

                    <div className="relative">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Đăng nhập</h2>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Hệ thống quản trị chiến dịch</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold py-3 px-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-4">Email Address</label>
                                <div className="relative group/input">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-orange-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-white/10 focus:border-orange-500/50 outline-none transition-all duration-300"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="admin@posmars.vn"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-4">Access Key</label>
                                <div className="relative group/input">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-orange-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-white/10 focus:border-orange-500/50 outline-none transition-all duration-300"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group/btn"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                            <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Secure Login <ArrowRight size={16} />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-4 opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000">
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Built for performance</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Enterprise Secured</span>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="mt-8 text-center flex items-center justify-center gap-3">
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">© 2026 POSMARS.VN</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <button className="text-white/20 hover:text-orange-500/80 text-[9px] font-black uppercase tracking-[0.3em] transition-colors flex items-center gap-1">
                        <Sparkles size={10} /> Support
                    </button>
                </div>
            </div>
        </div>
    )
}
