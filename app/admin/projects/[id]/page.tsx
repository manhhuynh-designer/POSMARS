'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, ExternalLink, Upload, BarChart2, Settings, Users, UserX, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import LeadFormBuilder from '@/components/admin/LeadFormBuilder'
import ResultScreenEditor from '@/components/admin/ResultScreenEditor'
import TemplateConfigBuilder from '@/components/admin/TemplateConfigBuilder'
import CustomCodeEditor from '@/components/admin/CustomCodeEditor'
import LocationManager from '@/components/admin/LocationManager'
import { getSubdomainUrl, getPathUrl } from '@/lib/utils/url'
import { generateCodeFromConfig } from '@/lib/templates/default-templates'

type Tab = 'basic' | 'lead_form' | 'template' | 'result_screen' | 'locations' | 'analytics'

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
        end_date: '',
        // Code Mode fields
        custom_html: '',
        custom_script: '',
        use_custom_code: false
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
            end_date: data.end_date ? data.end_date.split('T')[0] : '',
            // Code Mode fields
            custom_html: data.custom_html || '',
            custom_script: data.custom_script || '',
            use_custom_code: data.use_custom_code || false
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
                end_date: formData.end_date || null,
                // Code Mode fields
                custom_html: formData.custom_html,
                custom_script: formData.custom_script,
                use_custom_code: formData.use_custom_code
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

        if (!res.ok) {
            const errData = await res.json()
            const msg = errData.details || errData.error || 'Failed to get signed URL'
            const diag = errData.diagnostic ? `\nDiagnostic: ${JSON.stringify(errData.diagnostic)}` : ''
            throw new Error(msg + diag)
        }
        const { url: signedUrl, publicUrl, token } = await res.json()

        // 1. Upload file to GCS directly
        await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
        })

        // 2. Finalize upload (set metadata)
        // We reuse the auth token from the current session
        const finalizeRes = await fetch('/api/upload/finalize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ filename: path, token })
        })

        if (!finalizeRes.ok) {
            console.warn('Failed to set download token metadata, public link might be unstable')
        }

        console.log('✅ Upload Finalized. Public URL:', publicUrl)

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-2 border-white/5 border-t-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(249,115,22,0.2)]" />
            <div className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Cấu hình đang tải...</div>
        </div>
    )

    const isAR = project.interaction_type === 'ar'
    const templateName = TEMPLATE_NAMES[project.template] || project.template

    return (
        <div className="w-full px-4 transition-all duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                    <Link href="/admin" className="w-10 h-10 bg-white/5 border border-white/5 flex items-center justify-center rounded-xl text-white/60 hover:text-white transition-all hover:border-white/20">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{project.name || project.client_slug}</h1>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isAR
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                                }`}>
                                {isAR ? 'AR' : 'Game'} • {templateName}
                            </span>
                            <div className="flex flex-col gap-1">
                                <a href={getSubdomainUrl(project.client_slug)} target="_blank" className="flex items-center gap-1.5 hover:text-orange-500 font-mono text-[10px] tracking-tight transition-colors">
                                    🚀 {project.client_slug}.posmars.vn <ExternalLink size={10} className="opacity-40" />
                                </a>
                                <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest text-white/10">
                                    <a href={getSubdomainUrl(project.client_slug)} target="_blank" className="hover:text-white transition-colors">
                                        Subdomain
                                    </a>
                                    <span>|</span>
                                    <a href={getPathUrl(project.client_slug)} target="_blank" className="hover:text-white transition-colors">
                                        Path
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl hover:bg-orange-600 disabled:opacity-50 font-black uppercase text-[11px] tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all active:scale-95">
                    <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-10 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto">
                {(['basic', 'lead_form', 'template', 'result_screen', 'locations', 'analytics'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab === 'basic' ? 'Cơ bản' :
                            tab === 'lead_form' ? 'Lead Form' :
                                tab === 'result_screen' ? 'Kết quả' :
                                    tab === 'locations' ? 'Điểm bán' :
                                        tab === 'analytics' ? 'Analytics' : 'Visual Build'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {/* Tab Content */}
            <div className={`${activeTab === 'template' ? 'bg-transparent border-none p-0 shadow-none' : 'bg-[#0c0c0c] rounded-[2.5rem] shadow-2xl p-10 border border-white/5'} transition-all duration-500`}>
                {activeTab === 'basic' && (
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Tên Project</label>
                                    <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white hover:border-orange-500/50 focus:border-orange-500 transition-all outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Subdomain</label>
                                    <input className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white/60 font-mono text-sm cursor-not-allowed" value={project.client_slug} disabled />
                                </div>
                            </div>

                            <div className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Trạng thái chiến dịch</label>
                                <div className="flex flex-col gap-6">
                                    <label className="flex items-center gap-4 group cursor-pointer">
                                        <div className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-green-500' : 'bg-white/10'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                                        </div>
                                        <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="hidden" />
                                        <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Dự án Đang hoạt động</span>
                                    </label>

                                    <div className="flex items-center gap-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Current status</label>
                                        {(() => {
                                            const now = new Date()
                                            const start = formData.start_date ? new Date(formData.start_date) : null
                                            const end = formData.end_date ? new Date(formData.end_date) : null

                                            if (!formData.is_active) {
                                                return <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white/5 text-white/30 border border-white/5">⏸️ Tạm dừng</span>
                                            } else if (start && now < start) {
                                                return <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">🕐 Chờ khởi chạy</span>
                                            } else if (end && now > end) {
                                                return <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">⏹️ Đã kết thúc</span>
                                            } else {
                                                return <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">✅ Đang chạy</span>
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-10 bg-white/5 rounded-[2rem] border border-white/5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white hover:border-orange-500/50 focus:border-orange-500 transition-all outline-none"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                                <p className="text-[9px] font-bold text-white/10 mt-3 uppercase tracking-widest italic">Để trống = không giới hạn thời gian</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Ngày kết thúc</label>
                                <input
                                    type="date"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white hover:border-orange-500/50 focus:border-orange-500 transition-all outline-none"
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                                <p className="text-[9px] font-bold text-white/10 mt-3 uppercase tracking-widest italic">Để trống = không giới hạn thời gian</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Google Analytics Measurement ID</label>
                            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-mono placeholder:text-white/10 outline-none focus:border-orange-500" value={formData.ga_id} onChange={e => setFormData({ ...formData, ga_id: e.target.value })} placeholder="G-XXXXXXXXXX" />
                        </div>
                    </div>
                )}

                {activeTab === 'lead_form' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                            <h3 className="font-black text-white uppercase tracking-tighter">Thu thập thông tin khách hàng</h3>
                        </div>

                        {/* Toggle Enable/Disable Lead Form */}
                        <div
                            onClick={() => {
                                if (formData.lead_form_config) {
                                    // Disable - store current config temporarily and set to null
                                    setFormData({ ...formData, lead_form_config: null })
                                } else {
                                    // Enable - restore default config
                                    setFormData({
                                        ...formData,
                                        lead_form_config: {
                                            fields: [
                                                { id: 'name', type: 'text', label: 'Họ và tên', required: true },
                                                { id: 'phone', type: 'tel', label: 'Số điện thoại', required: true }
                                            ],
                                            submit_text: 'Tiếp tục',
                                            consent_text: 'Tôi đồng ý với điều khoản sử dụng'
                                        }
                                    })
                                }
                            }}
                            className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-5 ${formData.lead_form_config
                                ? 'bg-green-500/10 border-2 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                                : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-all ${formData.lead_form_config
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/10 text-white/30'
                                }`}>
                                {formData.lead_form_config ? <Users size={24} /> : <UserX size={24} />}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold text-lg ${formData.lead_form_config ? 'text-green-400' : 'text-white/60'
                                    }`}>
                                    {formData.lead_form_config ? 'Thu thập thông tin khách hàng' : 'Không thu thập thông tin'}
                                </div>
                                <div className={`text-sm mt-1 ${formData.lead_form_config ? 'text-green-400/60' : 'text-white/30'
                                    }`}>
                                    {formData.lead_form_config
                                        ? 'Khách hàng sẽ điền form trước khi trải nghiệm AR/Game'
                                        : 'Khách hàng trải nghiệm ngay mà không cần đăng ký'
                                    }
                                </div>
                            </div>
                            <div className={`transition-all ${formData.lead_form_config ? 'text-green-400' : 'text-white/20'
                                }`}>
                                {formData.lead_form_config
                                    ? <ToggleRight size={40} strokeWidth={1.5} />
                                    : <ToggleLeft size={40} strokeWidth={1.5} />
                                }
                            </div>
                        </div>

                        {/* Show Lead Form Builder only when enabled */}
                        {formData.lead_form_config && (
                            <LeadFormBuilder
                                initialConfig={formData.lead_form_config}
                                onChange={config => setFormData({ ...formData, lead_form_config: config })}
                                onUpload={async (file, path) => await uploadFile(file, path)}
                            />
                        )}

                        {/* No form info */}
                        {!formData.lead_form_config && (
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 flex items-start gap-4">
                                <div className="text-3xl">⚡</div>
                                <div>
                                    <div className="text-yellow-400 font-bold text-base mb-2">Trải nghiệm nhanh</div>
                                    <div className="text-yellow-400/60 text-sm leading-relaxed">Khách hàng sẽ được trải nghiệm AR/Game ngay lập tức mà không cần điền thông tin. Phù hợp cho các sự kiện public, demo nhanh, hoặc khi bạn không cần thu thập data khách hàng.</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'result_screen' && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                            <h3 className="font-black text-white uppercase tracking-tighter">Cấu hình Màn hình Kết quả</h3>
                        </div>
                        <ResultScreenEditor
                            initialConfig={formData.template_config?.result_config}
                            onChange={config => setFormData({
                                ...formData,
                                template_config: { ...formData.template_config, result_config: config }
                            })}
                            onUpload={async (file) => await uploadFile(file, `vouchers/${project.client_slug}/${Date.now()}_${file.name}`)}
                        />
                    </div>
                )}

                {/* Assets tab removed - consolidated into TemplateConfigBuilder */}
                {/* Result Screen tab logic above */}

                {activeTab === 'template' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                <h3 className="font-black text-white uppercase tracking-tighter text-xl">Visual Builder: {templateName}</h3>
                            </div>
                        </div>

                        {/* Mode Toggle & Code Editor */}
                        <CustomCodeEditor
                            customHtml={formData.custom_html}
                            customScript={formData.custom_script}
                            useCustomCode={formData.use_custom_code}
                            templateType={project.template}
                            onHtmlChange={html => setFormData({ ...formData, custom_html: html })}
                            onScriptChange={script => setFormData({ ...formData, custom_script: script })}
                            onModeChange={useCustom => {
                                // When switching TO code mode, auto-generate code from template config
                                if (useCustom && !formData.use_custom_code && formData.template_config) {
                                    const generated = generateCodeFromConfig(project.template, formData.template_config)
                                    if (generated) {
                                        setFormData({
                                            ...formData,
                                            use_custom_code: useCustom,
                                            custom_html: generated.html,
                                            custom_script: generated.script
                                        })
                                        return
                                    }
                                }
                                setFormData({ ...formData, use_custom_code: useCustom })
                            }}
                            onUploadAsset={async (file, path) => await uploadFile(file, path)}
                            projectSlug={project.client_slug}
                        />

                        {/* Template Mode: Visual Config */}
                        {!formData.use_custom_code && (
                            <>
                                <TemplateConfigBuilder
                                    template={project.template}
                                    initialConfig={formData.template_config}
                                    onChange={config => setFormData({ ...formData, template_config: config })}
                                    onUpload={async (file, path) => await uploadFile(file, path)}
                                    availableLocations={formData.locations}
                                />
                                {/* Fallback JSON for debugging/other templates without builder */}
                                {!['lucky_draw', 'ar_checkin', 'face_filter', 'image_tracking'].includes(project.template) && (
                                    <div className="mt-12 border-t border-white/5 pt-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Settings size={14} className="text-white/40" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Advanced Config (JSON)</p>
                                        </div>
                                        <textarea
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-mono text-xs focus:border-orange-500 outline-none transition-all"
                                            rows={12}
                                            value={JSON.stringify(formData.template_config, null, 2)}
                                            onChange={e => {
                                                try { setFormData({ ...formData, template_config: JSON.parse(e.target.value) }) }
                                                catch { }
                                            }}
                                        />
                                    </div>
                                )}
                            </>
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
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                        <div className="relative inline-block mb-8">
                            <BarChart2 size={64} className="mx-auto text-orange-500/20" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BarChart2 size={32} className="text-orange-500" />
                            </div>
                        </div>
                        <h3 className="font-black text-2xl text-white uppercase tracking-tighter mb-3">Analytics Engine</h3>
                        <p className="text-white/60 mb-10 max-w-md mx-auto italic">Thống kê chi tiết về tương tác người dùng, leads và hiệu quả chiến dịch thời gian thực.</p>
                        <Link
                            href={`/admin/projects/${projectId}/analytics`}
                            className="inline-flex items-center gap-3 bg-orange-500 text-white px-10 py-4 rounded-2xl hover:bg-orange-600 font-black uppercase text-[11px] tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all active:scale-95"
                        >
                            <BarChart2 size={18} /> Open Dashboard
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
