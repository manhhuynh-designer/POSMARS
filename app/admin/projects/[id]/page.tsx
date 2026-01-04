'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, ExternalLink, Upload, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import LeadFormBuilder from '@/components/admin/LeadFormBuilder'
import TemplateConfigBuilder from '@/components/admin/TemplateConfigBuilder'
import LocationManager from '@/components/admin/LocationManager'
import { getSubdomainUrl, getPathUrl } from '@/lib/utils/url'

type Tab = 'basic' | 'lead_form' | 'template' | 'locations' | 'analytics'

const TEMPLATE_NAMES: Record<string, string> = {
    image_tracking: 'Image Tracking',
    ar_checkin: 'AR Check-in',
    lucky_draw: 'Lucky Draw',
    scratch_card: 'Scratch Card',
    quiz: 'Quiz',
    face_filter: 'Face Filter'
}

export default function EditProjectPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('basic')
    const [project, setProject] = useState<any>(null)

    const [formData, setFormData] = useState({
        name: '',
        is_active: true,
        ga_id: '',
        lead_form_config: {} as any,
        template_config: {} as any,
        asset_url: '',
        marker_url: '',
        locations: [] as any[],
        start_date: '',
        end_date: ''
    })

    useEffect(() => {
        loadProject()
    }, [projectId])

    const loadProject = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (error || !data) {
            alert('Project không tồn tại')
            router.push('/admin')
            return
        }

        setProject(data)
        setFormData({
            name: data.name || '',
            is_active: data.is_active ?? true,
            ga_id: data.ga_id || '',
            lead_form_config: data.lead_form_config || {},
            template_config: data.template_config || {},
            asset_url: data.asset_url || '',
            marker_url: data.marker_url || '',
            locations: data.locations || [],
            start_date: data.start_date ? data.start_date.split('T')[0] : '',
            end_date: data.end_date ? data.end_date.split('T')[0] : ''
        })
        setLoading(false)
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase
            .from('projects')
            .update({
                name: formData.name,
                is_active: formData.is_active,
                ga_id: formData.ga_id,
                lead_form_config: formData.lead_form_config,
                template_config: formData.template_config,
                asset_url: formData.asset_url,
                marker_url: formData.marker_url,
                locations: formData.locations,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null
            })
            .eq('id', projectId)

        setSaving(false)
        if (error) alert(error.message)
        else loadProject()
    }

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error("Please login again")

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ filename: path, contentType: file.type })
        })

        if (!res.ok) throw new Error('Failed to get signed URL')
        const { url: signedUrl, publicUrl } = await res.json()

        await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
        })

        return publicUrl
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'asset_url' | 'marker_url') => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const path = `assets/${project.client_slug}/${field === 'marker_url' ? 'marker_' : ''}${file.name}`
            const publicUrl = await uploadFile(file, path)
            setFormData({ ...formData, [field]: publicUrl })
            alert('Upload thành công!')
        } catch (error) {
            console.error(error)
            alert('Upload failed')
        }
    }

    if (loading) return <div className="p-8">Loading...</div>

    const isAR = project.interaction_type === 'ar'
    const templateName = TEMPLATE_NAMES[project.template] || project.template

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{project.name || project.client_slug}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isAR ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {isAR ? 'AR' : 'Game'} • {templateName}
                            </span>
                            <div className="flex flex-col gap-1">
                                <a href={getSubdomainUrl(project.client_slug)} target="_blank" className="flex items-center gap-1 hover:text-orange-500 font-medium">
                                    🚀 {project.client_slug}.posmars.vn <ExternalLink size={12} />
                                </a>
                                <div className="flex gap-3 text-xs text-gray-400">
                                    <a href={getSubdomainUrl(project.client_slug)} target="_blank" className="hover:text-gray-600 hover:underline">
                                        Subdomain
                                    </a>
                                    <span>|</span>
                                    <a href={getPathUrl(project.client_slug)} target="_blank" className="hover:text-gray-600 hover:underline">
                                        Path
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                    <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                {(['basic', 'lead_form', 'template', 'locations', 'analytics'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {tab === 'basic' ? 'Cơ bản' :
                            tab === 'lead_form' ? 'Lead Form' :
                                tab === 'locations' ? 'Điểm bán' :
                                    tab === 'analytics' ? 'Analytics' : 'Template Config'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'basic' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên Project</label>
                            <input className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Subdomain</label>
                            <input className="w-full border p-2 rounded bg-gray-50 font-mono" value={project.client_slug} disabled />
                        </div>

                        {/* Status & Active */}
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
                                <span className="text-sm">Đang hoạt động</span>
                            </label>

                            {/* Status Badge */}
                            {(() => {
                                const now = new Date()
                                const start = formData.start_date ? new Date(formData.start_date) : null
                                const end = formData.end_date ? new Date(formData.end_date) : null

                                if (!formData.is_active) {
                                    return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">⏸️ Tạm dừng</span>
                                } else if (start && now < start) {
                                    return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-600">🕐 Chưa bắt đầu</span>
                                } else if (end && now > end) {
                                    return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600">⏹️ Đã kết thúc</span>
                                } else {
                                    return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-600">✅ Đang chạy</span>
                                }
                            })()}
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    className="w-full border p-2 rounded"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Để trống = không giới hạn</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                                <input
                                    type="date"
                                    className="w-full border p-2 rounded"
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Để trống = không giới hạn</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Google Analytics ID</label>
                            <input className="w-full border p-2 rounded" value={formData.ga_id} onChange={e => setFormData({ ...formData, ga_id: e.target.value })} placeholder="G-XXXXXXXXXX" />
                        </div>
                    </div>
                )}

                {activeTab === 'lead_form' && (
                    <div className="space-y-4">
                        <h3 className="font-medium mb-4">Cấu hình Form Thu thập</h3>
                        <LeadFormBuilder
                            initialConfig={formData.lead_form_config}
                            onChange={config => setFormData({ ...formData, lead_form_config: config })}
                        />
                    </div>
                )}


                {/* Assets tab removed - consolidated into TemplateConfigBuilder */}

                {activeTab === 'template' && (
                    <div className="space-y-4">
                        <h3 className="font-medium mb-4">Template: {templateName}</h3>
                        <TemplateConfigBuilder
                            template={project.template}
                            initialConfig={formData.template_config}
                            onChange={config => setFormData({ ...formData, template_config: config })}
                            onUpload={async (file, path) => await uploadFile(file, path)}
                        />
                        {/* Fallback JSON for debugging/other templates without builder */}
                        {!['lucky_draw', 'ar_checkin'].includes(project.template) && (
                            <div className="mt-8 border-t pt-4">
                                <p className="text-xs text-gray-400 mb-2">Advanced Config (JSON)</p>
                                <textarea
                                    className="w-full border p-2 rounded font-mono text-sm"
                                    rows={10}
                                    value={JSON.stringify(formData.template_config, null, 2)}
                                    onChange={e => {
                                        try { setFormData({ ...formData, template_config: JSON.parse(e.target.value) }) }
                                        catch { }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'locations' && (
                    <LocationManager
                        clientSlug={project.client_slug}
                        locations={formData.locations}
                        onChange={locs => setFormData({ ...formData, locations: locs })}
                    />
                )}

                {activeTab === 'analytics' && (
                    <div className="text-center py-8">
                        <BarChart2 size={48} className="mx-auto text-orange-400 mb-4" />
                        <h3 className="font-bold text-lg mb-2">Analytics Dashboard</h3>
                        <p className="text-gray-500 mb-6">Xem thống kê chi tiết về leads và hiệu quả chiến dịch</p>
                        <Link
                            href={`/admin/projects/${projectId}/analytics`}
                            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
                        >
                            <BarChart2 size={20} /> Mở Analytics
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
