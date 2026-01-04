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
            { header: 'POS ID', key: 'pos_id', width: 15 },
            { header: 'Địa điểm', key: 'location', width: 25 },
            { header: 'Thời gian', key: 'created_at', width: 20 }
        ]

        // Data
        leads.forEach((lead, i) => {
            sheet.addRow({
                index: i + 1,
                name: lead.user_data?.name || '',
                phone: lead.user_data?.phone || '',
                email: lead.user_data?.email || '',
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

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/projects/${projectId}`} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Analytics</h1>
                        <p className="text-sm text-gray-500">{project.name || project.client_slug}</p>
                    </div>
                </div>
                <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tổng Leads</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Calendar className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Hôm nay</p>
                            <p className="text-2xl font-bold">{stats.today}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="text-orange-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">7 ngày qua</p>
                            <p className="text-2xl font-bold">{stats.thisWeek}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <MapPin className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Điểm bán</p>
                            <p className="text-2xl font-bold">{stats.byPosId.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Daily Chart */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Leads theo ngày (7 ngày gần nhất)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={stats.byDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* By POS ID Chart */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold mb-4">Top điểm bán</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stats.byPosId}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#FF6B35" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h3 className="font-bold">Danh sách Leads gần nhất</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-sm text-gray-600">
                        <tr>
                            <th className="px-6 py-3">Họ tên</th>
                            <th className="px-6 py-3">SĐT</th>
                            <th className="px-6 py-3">POS ID</th>
                            <th className="px-6 py-3">Thời gian</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {leads.slice(0, 20).map(lead => (
                            <tr key={lead.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3">{lead.user_data?.name || '-'}</td>
                                <td className="px-6 py-3">{lead.user_data?.phone || '-'}</td>
                                <td className="px-6 py-3">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">{lead.pos_id || '-'}</span>
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-500">
                                    {new Date(lead.created_at).toLocaleString('vi-VN')}
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chưa có leads</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
