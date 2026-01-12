'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Users, MapPin, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function AnalyticsPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.id as string

    const [loading, setLoading] = useState(true)
    const [project, setProject] = useState<any>(null)
    const [leads, setLeads] = useState<any[]>([])
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        thisWeek: 0,
        byPosId: [] as any[],
        byDay: [] as any[]
    })

    useEffect(() => {
        loadData()
    }, [projectId])

    const loadData = async () => {
        // Load project
        const { data: proj } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (!proj) {
            router.push('/admin')
            return
        }
        setProject(proj)

        // Load leads
        const { data: leadsData } = await supabase
            .from('leads')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        const allLeads = leadsData || []
        setLeads(allLeads)

        // Calculate stats
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

        const todayLeads = allLeads.filter(l => new Date(l.created_at) >= todayStart)
        const weekLeads = allLeads.filter(l => new Date(l.created_at) >= weekStart)

        // Group by pos_id
        const posIdCounts: Record<string, number> = {}
        allLeads.forEach(l => {
            const key = l.pos_id || 'Không xác định'
            posIdCounts[key] = (posIdCounts[key] || 0) + 1
        })
        const byPosId = Object.entries(posIdCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // Group by day (last 7 days)
        const dayMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            dayMap[key] = 0
        }
        weekLeads.forEach(l => {
            const d = new Date(l.created_at)
            const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            if (dayMap[key] !== undefined) dayMap[key]++
        })
        const byDay = Object.entries(dayMap).map(([name, count]) => ({ name, count }))

        setStats({
            total: allLeads.length,
            today: todayLeads.length,
            thisWeek: weekLeads.length,
            byPosId,
            byDay
        })

        setLoading(false)
    }

    const exportToExcel = async () => {
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet('Leads')

        // Headers
        sheet.columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Họ tên', key: 'name', width: 25 },
            { header: 'SĐT', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Giải thưởng', key: 'prize', width: 25 },
            { header: 'POS ID', key: 'pos_id', width: 15 },
            { header: 'Địa điểm', key: 'location', width: 25 },
            { header: 'Thời gian', key: 'created_at', width: 20 }
        ]

        // Data
        leads.forEach((lead, i) => {
            // Extract prize name from game_result
            const prizeName = lead.game_result?.prize?.name || lead.game_result?.voucher?.label || lead.game_result?.prize || ''
            sheet.addRow({
                index: i + 1,
                name: lead.user_data?.name || '',
                phone: lead.user_data?.phone || '',
                email: lead.user_data?.email || '',
                prize: prizeName,
                pos_id: lead.pos_id || '',
                location: lead.location_name || '',
                created_at: new Date(lead.created_at).toLocaleString('vi-VN')
            })
        })

        // Style header
        sheet.getRow(1).font = { bold: true }

        // Download
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `leads-${project.client_slug}-${new Date().toISOString().split('T')[0]}.xlsx`
        link.click()
    }

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-4 border-white/5 border-t-orange-500 rounded-full" />
        </div>
    )

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#121212] p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <Link href={`/admin/projects/${projectId}`} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter">Project Analytics</h1>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-1">{project.name || project.client_slug}</p>
                        </div>
                    </div>
                    <button onClick={exportToExcel} className="flex items-center gap-3 bg-green-600 text-white px-8 py-3 rounded-2xl hover:bg-green-500 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-green-900/20 transition-all active:scale-95">
                        <Download size={18} /> EXPORT EXCEL
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'TỔNG LEADS', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                        { label: 'HÔM NAY', value: stats.today, icon: Calendar, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                        { label: '7 NGÀY QUA', value: stats.thisWeek, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                        { label: 'ĐIỂM BÁN', value: stats.byPosId.length, icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-[#121212] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-14 h-14 ${stat.bg} ${stat.border} border rounded-2xl flex items-center justify-center ${stat.color} shadow-lg shadow-black/40`}>
                                    <stat.icon size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-3xl font-black tracking-tighter mt-1">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Daily Chart */}
                    <div className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Leads theo ngày</h3>
                            <div className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-500/20">7 NGÀY GẦN NHẤT</div>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={stats.byDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="900" />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="900" />
                                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} />
                                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={4} dot={{ fill: '#f97316', r: 4, strokeWidth: 2, stroke: '#0a0a0a' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* By POS ID Chart */}
                    <div className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Top điểm bán</h3>
                            <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20">THEO POS ID</div>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.byPosId}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="900" />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="900" />
                                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="bg-[#121212] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/5 bg-white/20 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Danh sách Leads gần nhất</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">LIVE UPDATES</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-black/40 text-left text-[10px] font-black text-white/60 uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Họ tên</th>
                                    <th className="px-8 py-5">SĐT</th>
                                    <th className="px-8 py-5">Giải thưởng</th>
                                    <th className="px-8 py-5">POS ID</th>
                                    <th className="px-8 py-5">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {leads.slice(0, 20).map(lead => {
                                    // Extract prize name from game_result
                                    const prizeName = lead.game_result?.prize?.name || lead.game_result?.voucher?.label || lead.game_result?.prize || ''
                                    return (
                                        <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="font-black text-sm uppercase tracking-tighter text-white group-hover:text-orange-500 transition-colors">{lead.user_data?.name || '-'}</p>
                                            </td>
                                            <td className="px-8 py-5 font-mono text-xs text-white/60">{lead.user_data?.phone || '-'}</td>
                                            <td className="px-8 py-5">
                                                {prizeName ? (
                                                    <span className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[10px] font-black border border-orange-500/20 uppercase tracking-widest">{prizeName}</span>
                                                ) : (
                                                    <span className="text-white/20">-</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black border border-white/10 uppercase tracking-widest">{lead.pos_id || '-'}</span>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                                                {new Date(lead.created_at).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {leads.length === 0 && (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 grayscale opacity-20">
                                            <Users size={48} />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Chưa có leads nào được ghi nhận</p>
                                        </div>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
