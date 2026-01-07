'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Edit2, ExternalLink, Trash2, BarChart2, Users, Target, Trophy } from 'lucide-react'
import { getSubdomainUrl, getPathUrl } from '@/lib/utils/url'

export default function AdminDashboard() {
    const [projects, setProjects] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadProjects()
    }, [])

    const loadProjects = async () => {
        const { data } = await supabase
            .from('projects')
            .select('*, leads(count)')
            .order('created_at', { ascending: false })

        // 2. Fetch today's leads
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: todayCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        if (data) {
            // Process data for stats
            const projectsWithCounts = data.map(p => ({
                ...p,
                lead_count: p.leads?.[0]?.count || 0
            }))

            setProjects(projectsWithCounts)

            // Calculate stats
            const totalLeads = projectsWithCounts.reduce((sum, p) => sum + p.lead_count, 0)
            const activeProjects = projectsWithCounts.filter(p => p.is_active).length
            const paramStats = {
                totalProjects: projectsWithCounts.length,
                activeProjects,
                totalLeads,
                todayLeads: todayCount || 0,
                topProject: projectsWithCounts.sort((a, b) => b.lead_count - a.lead_count)[0]
            }
            setStats(paramStats)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa project "${name}"?`)) return
        await supabase.from('projects').delete().eq('id', id)
        loadProjects()
    }

    const getTypeLabel = (type: string) => {
        return type === 'ar'
            ? { label: 'AR', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' }
            : { label: 'Game', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' }
    }

    const getTemplateLabel = (template: string) => {
        const labels: Record<string, string> = {
            image_tracking: 'Image Tracking',
            ar_checkin: 'AR Check-in',
            lucky_draw: 'Lucky Draw',
            scratch_card: 'Scratch Card',
            quiz: 'Quiz',
            world_tracking: 'World Tracking',
            face_filter: 'Face Filter'
        }
        return labels[template] || template
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-2 border-white/5 border-t-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(249,115,22,0.2)]" />
            <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Đang tải dữ liệu...</div>
        </div>
    )

    return (
        <div>
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-[#0c0c0c] p-6 rounded-2xl shadow-2xl border border-white/5 group hover:border-orange-500/30 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Tổng Project</h3>
                        <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Target size={18} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-white tracking-tighter">{stats?.totalProjects}</span>
                        <span className="text-[10px] font-bold text-green-500/80 mb-2 uppercase tracking-widest">
                            ({stats?.activeProjects} active)
                        </span>
                    </div>
                </div>

                <div className="bg-[#0c0c0c] p-6 rounded-2xl shadow-2xl border border-white/5 group hover:border-blue-500/30 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Tổng Leads</h3>
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Users size={18} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-white tracking-tighter">{stats?.totalLeads}</span>
                    </div>
                </div>

                <div className="bg-[#0c0c0c] p-6 rounded-2xl shadow-2xl border border-white/5 group hover:border-green-500/30 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Hôm nay</h3>
                        <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                            <BarChart2 size={18} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-white tracking-tighter">{stats?.todayLeads}</span>
                        <span className="text-[10px] font-bold text-white/20 mb-2 uppercase tracking-widest italic ml-1">leads current</span>
                    </div>
                </div>

                <div className="bg-[#0c0c0c] p-6 rounded-2xl shadow-2xl border border-white/5 group hover:border-purple-500/30 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Top Project</h3>
                        <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Trophy size={18} />
                        </div>
                    </div>
                    <div>
                        <div className="font-bold text-white/80 truncate text-sm mb-1" title={stats?.topProject?.name}>
                            {stats?.topProject?.name || '---'}
                        </div>
                        <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                            {stats?.topProject?.lead_count || 0} leads recorded
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Danh sách Project</h1>
                <Link href="/admin/create" className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.2)] transition-all hover:scale-105 active:scale-95 font-black uppercase text-[11px] tracking-widest">
                    <Plus size={18} /> Tạo Project mới
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="bg-[#0c0c0c] rounded-3xl shadow-2xl p-16 text-center border border-white/5 border-dashed">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white/10">
                        <Plus size={40} />
                    </div>
                    <p className="text-white/40 mb-8 font-medium italic">Chưa có campaign nào được tạo.</p>
                    <Link href="/admin/create" className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl hover:bg-orange-500 hover:border-orange-500 transition-all font-black uppercase text-[11px] tracking-[0.3em]">
                        Bắt đầu ngay
                    </Link>
                </div>
            ) : (
                <div className="bg-[#0c0c0c] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-black/40 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-5">Campaign Info</th>
                                <th className="px-8 py-5">Loại hình</th>
                                <th className="px-8 py-5">Total Leads</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {projects.map(p => {
                                const typeInfo = getTypeLabel(p.interaction_type || 'ar')
                                return (
                                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-white/90 mb-2 group-hover:text-orange-500 transition-colors uppercase tracking-tight">{p.name || p.client_slug}</div>
                                            <div className="flex flex-col gap-1.5 text-xs">
                                                <a href={getSubdomainUrl(p.client_slug)} target="_blank" className="flex items-center gap-1.5 text-blue-400/60 hover:text-blue-400 font-mono text-[10px] tracking-tight">
                                                    🚀 {p.client_slug}.posmars.vn
                                                </a>
                                                <div className="flex gap-3 text-white/10 font-black text-[9px] tracking-widest">
                                                    <a href={getSubdomainUrl(p.client_slug)} target="_blank" className="hover:text-white transition-colors">SBDR</a>
                                                    <span>|</span>
                                                    <a href={getPathUrl(p.client_slug)} target="_blank" className="hover:text-white transition-colors">PATH</a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex w-fit items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
                                                    {getTemplateLabel(p.template || 'image_tracking')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-white/90 text-xl tracking-tighter">{p.lead_count}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-white/5 text-white/20'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${p.is_active ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`}></span>
                                                {p.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/projects/${p.id}/analytics`}
                                                    className="p-2.5 bg-white/5 border border-white/5 hover:border-blue-500/50 text-white/40 hover:text-blue-400 rounded-xl transition-all hover:scale-110"
                                                    title="Analytics"
                                                >
                                                    <BarChart2 size={16} />
                                                </Link>
                                                <Link
                                                    href={`/admin/projects/${p.id}`}
                                                    className="p-2.5 bg-white/5 border border-white/5 hover:border-orange-500/50 text-white/40 hover:text-orange-500 rounded-xl transition-all hover:scale-110"
                                                    title="Edit Config"
                                                >
                                                    <Edit2 size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(p.id, p.name || p.client_slug)}
                                                    className="p-2.5 bg-white/5 border border-white/5 hover:border-red-500/50 text-white/40 hover:text-red-500 rounded-xl transition-all hover:scale-110"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
