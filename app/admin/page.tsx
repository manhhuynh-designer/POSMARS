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
            ? { label: 'AR', color: 'bg-blue-100 text-blue-700' }
            : { label: 'Game', color: 'bg-purple-100 text-purple-700' }
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
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full" />
        </div>
    )

    return (
        <div>
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Tổng Project</h3>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                            <Target size={20} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats?.totalProjects}</span>
                        <span className="text-sm text-green-600 mb-1">
                            ({stats?.activeProjects} active)
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Tổng Leads</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats?.totalLeads}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Hôm nay</h3>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <BarChart2 size={20} />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats?.todayLeads}</span>
                        <span className="text-sm text-gray-500 mb-1">leads</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Top Project</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Trophy size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 truncate" title={stats?.topProject?.name}>
                            {stats?.topProject?.name || '---'}
                        </div>
                        <div className="text-sm text-purple-600">
                            {stats?.topProject?.lead_count || 0} leads
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Danh sách Project</h1>
                <Link href="/admin/create" className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-sm transition-all hover:shadow-md">
                    <Plus size={18} /> Tạo Project mới
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Plus size={32} />
                    </div>
                    <p className="text-gray-500 mb-4">Chưa có campaign nào được tạo.</p>
                    <Link href="/admin/create" className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                        Bắt đầu ngay
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Campaign Info</th>
                                <th className="px-6 py-4">Loại hình</th>
                                <th className="px-6 py-4">Total Leads</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {projects.map(p => {
                                const typeInfo = getTypeLabel(p.interaction_type || 'ar')
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 mb-1">{p.name || p.client_slug}</div>
                                            <div className="flex flex-col gap-1 text-xs">
                                                <a href={getSubdomainUrl(p.client_slug)} target="_blank" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                    🚀 {p.client_slug}.posmars.vn
                                                </a>
                                                <div className="flex gap-2 text-gray-400 font-mono text-[10px]">
                                                    <a href={getSubdomainUrl(p.client_slug)} target="_blank" className="hover:text-gray-600">SUB</a>
                                                    <span>•</span>
                                                    <a href={getPathUrl(p.client_slug)} target="_blank" className="hover:text-gray-600">PATH</a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {getTemplateLabel(p.template || 'image_tracking')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">{p.lead_count}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.is_active ? 'bg-green-600' : 'bg-gray-600'}`}></span>
                                                {p.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link
                                                    href={`/admin/projects/${p.id}/analytics`}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Analytics"
                                                >
                                                    <BarChart2 size={18} />
                                                </Link>
                                                <Link
                                                    href={`/admin/projects/${p.id}`}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Edit Config"
                                                >
                                                    <Edit2 size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(p.id, p.name || p.client_slug)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
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
