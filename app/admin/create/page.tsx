'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, Target, Gamepad2, FileText, CheckCircle2, ToggleLeft, ToggleRight, Users, UserX } from 'lucide-react'

type InteractionType = 'ar' | 'game'
type ARTemplate = 'image_tracking' | 'ar_checkin' | 'face_filter' | 'architectural_tracking' | 'watch_ring_tryon' | 'world_ar' | 'hand_gesture'
type GameTemplate = 'lucky_draw' | 'scratch_card' | 'quiz'
type Template = ARTemplate | GameTemplate

const TEMPLATES = {
    ar: [
        { id: 'image_tracking', name: 'Image Tracking', desc: 'Quét poster → Overlay 3D', priority: 'P1', icon: '📷' },
        { id: 'ar_checkin', name: 'AR Check-in', desc: 'Chụp ảnh với frame branded', priority: 'P1', icon: '🤳' },
        { id: 'face_filter', name: 'Face Filter', desc: 'Filter khuôn mặt', priority: 'P1', icon: '🎭' },
        { id: 'architectural_tracking', name: 'Architectural Tracking', desc: 'Tracking công trình kiến trúc', priority: 'P1', icon: '🏛️' },
        { id: 'watch_ring_tryon', name: 'Watch & Ring Try-on', desc: 'Thử đồng hồ, nhẫn ảo', priority: 'P1', icon: '⌚' },
        { id: 'world_ar', name: 'World AR', desc: 'Đặt vật thể 3D không marker', priority: 'P1', icon: '🌍', },
        { id: 'hand_gesture', name: 'Hand Gesture AR', desc: 'Điều khiển bằng cử chỉ tay', priority: 'P1', icon: '👋' },
    ],
    game: [
        { id: 'lucky_draw', name: 'Lucky Draw', desc: 'Vòng quay may mắn', priority: 'P1', icon: '🎡' },
        { id: 'scratch_card', name: 'Scratch Card', desc: 'Cào thẻ trúng thưởng', priority: 'P2', icon: '🎫' },
        { id: 'quiz', name: 'Quiz', desc: 'Trả lời câu hỏi', priority: 'P2', icon: '❓' },
    ]
}

const STEP_INFO = [
    { icon: Target, label: 'Thông tin' },
    { icon: Gamepad2, label: 'Template' },
    { icon: FileText, label: 'Form' },
    { icon: CheckCircle2, label: 'Xác nhận' }
]

const DEFAULT_LEAD_FORM = {
    fields: [
        { id: 'name', type: 'text', label: 'Họ và tên', required: true },
        { id: 'phone', type: 'tel', label: 'Số điện thoại', required: true }
    ],
    submit_text: 'Tiếp tục',
    consent_text: 'Tôi đồng ý với điều khoản sử dụng'
}

const DEFAULT_TEMPLATE_CONFIGS: Record<Template, object> = {
    image_tracking: { model_scale: 1, model_position: [0, 0, 0], show_scan_hint: true },
    ar_checkin: { frame_url: '', watermark_text: '', share_hashtag: '' },
    face_filter: { filter_scale: 0.5 },
    architectural_tracking: { object_model_url: '', overlay_models: [], enable_capture: true },
    watch_ring_tryon: { accessory_models: [], hand_preference: 'both', enable_capture: true },
    world_ar: { placement_models: [], placement_mode: 'tap' },
    hand_gesture: { gesture_models: [], gesture_sensitivity: 0.7 },
    lucky_draw: {
        wheel_segments: 8,
        prizes: [
            { name: 'Giảm 10%', probability: 0.3, color: '#FF6B35' },
            { name: 'Thử lại', probability: 0.5, color: '#1E293B' },
            { name: 'Jackpot!', probability: 0.2, color: '#FFD700' }
        ]
    },
    scratch_card: { cover_image: '', prizes: [] },
    quiz: { questions: [] }
}

export default function CreateProjectPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        client_slug: '',
        name: '',
        interaction_type: 'ar' as InteractionType,
        template: 'image_tracking' as Template,
        enable_lead_form: true,
        lead_form_config: DEFAULT_LEAD_FORM,
        template_config: DEFAULT_TEMPLATE_CONFIGS['image_tracking']
    })

    const validateSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug) && slug.length > 0

    const handleNext = () => {
        if (step === 1 && (!formData.client_slug || !formData.name)) {
            alert('Vui lòng nhập đầy đủ thông tin')
            return
        }
        if (step === 1 && !validateSlug(formData.client_slug)) {
            alert('Slug chỉ chứa chữ thường, số và dấu gạch ngang')
            return
        }
        setStep(step + 1)
    }

    const handleBack = () => setStep(step - 1)

    const handleTypeChange = (type: InteractionType) => {
        const defaultTemplate = type === 'ar' ? 'image_tracking' : 'lucky_draw'
        setFormData({
            ...formData,
            interaction_type: type,
            template: defaultTemplate,
            template_config: DEFAULT_TEMPLATE_CONFIGS[defaultTemplate]
        })
    }

    const handleTemplateChange = (template: Template) => {
        setFormData({
            ...formData,
            template,
            template_config: DEFAULT_TEMPLATE_CONFIGS[template]
        })
    }

    const handleSubmit = async () => {
        setLoading(true)

        const payload = {
            client_slug: formData.client_slug,
            name: formData.name,
            interaction_type: formData.interaction_type,
            template: formData.template,
            lead_form_config: formData.enable_lead_form ? formData.lead_form_config : null,
            template_config: formData.template_config,
            is_active: true,
            config: {} // Legacy compatibility
        }

        const { data, error } = await supabase
            .from('projects')
            .insert(payload)
            .select('id')
            .single()

        setLoading(false)

        if (error) {
            if (error.code === '23505') {
                alert('Slug này đã tồn tại')
            } else {
                alert(error.message)
            }
        } else {
            router.push(`/admin/projects/${data.id}`)
        }
    }

    const templates = TEMPLATES[formData.interaction_type]

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-500/10 rounded-2xl">
                    <Sparkles className="text-orange-500" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Tạo Project Mới</h1>
                    <p className="text-white/40 text-sm">Khởi tạo campaign AR/Game trong vài bước</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-10 bg-[#0c0c0c] rounded-2xl p-4 border border-white/5">
                {STEP_INFO.map((s, i) => {
                    const stepNum = i + 1
                    const Icon = s.icon
                    const isCompleted = stepNum < step
                    const isCurrent = stepNum === step
                    return (
                        <div key={stepNum} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isCompleted
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                    : isCurrent
                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                                        : 'bg-white/5 text-white/20 border border-white/5'
                                    }`}>
                                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-green-400' : isCurrent ? 'text-orange-400' : 'text-white/20'
                                    }`}>
                                    {s.label}
                                </span>
                            </div>
                            {stepNum < 4 && (
                                <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500/50' : 'bg-white/5'
                                    }`} />
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="bg-[#0c0c0c] rounded-[2rem] shadow-2xl border border-white/5 p-8">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <Target className="text-orange-500" size={18} />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Thông tin cơ bản</h2>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                                Subdomain (slug) *
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all"
                                    value={formData.client_slug}
                                    onChange={e => setFormData({ ...formData, client_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    placeholder="samsung-tet-2024"
                                />
                                <span className="text-white/20 text-sm font-mono bg-white/5 px-4 py-4 rounded-xl border border-white/5">.posmars.vn</span>
                            </div>
                            <p className="text-[10px] text-white/20 mt-2 italic">Chỉ chữ thường, số và dấu gạch ngang</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                                Tên Campaign *
                            </label>
                            <input
                                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Samsung Tết 2024"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Type & Template */}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <Gamepad2 className="text-orange-500" size={18} />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Loại hình & Template</h2>
                        </div>

                        {/* Type Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('ar')}
                                className={`p-6 rounded-2xl text-left transition-all duration-300 group ${formData.interaction_type === 'ar'
                                    ? 'bg-blue-500/10 border-2 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                                    : 'bg-white/5 border-2 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="text-4xl mb-4">📱</div>
                                <div className={`font-black uppercase tracking-tight text-lg ${formData.interaction_type === 'ar' ? 'text-blue-400' : 'text-white/60'
                                    }`}>AR</div>
                                <div className={`text-xs mt-1 ${formData.interaction_type === 'ar' ? 'text-blue-400/60' : 'text-white/30'
                                    }`}>Thực tế tăng cường</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('game')}
                                className={`p-6 rounded-2xl text-left transition-all duration-300 group ${formData.interaction_type === 'game'
                                    ? 'bg-purple-500/10 border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                                    : 'bg-white/5 border-2 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="text-4xl mb-4">🎮</div>
                                <div className={`font-black uppercase tracking-tight text-lg ${formData.interaction_type === 'game' ? 'text-purple-400' : 'text-white/60'
                                    }`}>Game</div>
                                <div className={`text-xs mt-1 ${formData.interaction_type === 'game' ? 'text-purple-400/60' : 'text-white/30'
                                    }`}>Gamification</div>
                            </button>
                        </div>

                        {/* Template Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">
                                Chọn Template
                            </label>
                            <div className="space-y-3">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleTemplateChange(t.id as Template)}
                                        className={`w-full p-5 rounded-2xl text-left transition-all duration-300 flex items-center gap-4 ${formData.template === t.id
                                            ? 'bg-orange-500/10 border-2 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                                            : 'bg-white/5 border-2 border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="text-3xl">{t.icon}</div>
                                        <div className="flex-1">
                                            <div className={`font-bold ${formData.template === t.id ? 'text-orange-400' : 'text-white/80'
                                                }`}>{t.name}</div>
                                            <div className={`text-xs mt-0.5 ${formData.template === t.id ? 'text-orange-400/60' : 'text-white/30'
                                                }`}>{t.desc}</div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.priority === 'P1'
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            }`}>
                                            {t.priority === 'P1' ? 'Sẵn sàng' : 'Beta'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Lead Form Config */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <FileText className="text-orange-500" size={18} />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Thu thập thông tin</h2>
                        </div>

                        {/* Toggle Enable/Disable */}
                        <div
                            onClick={() => setFormData({ ...formData, enable_lead_form: !formData.enable_lead_form })}
                            className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-5 ${formData.enable_lead_form
                                ? 'bg-green-500/10 border-2 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                                : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-all ${formData.enable_lead_form
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/10 text-white/30'
                                }`}>
                                {formData.enable_lead_form ? <Users size={24} /> : <UserX size={24} />}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold text-lg ${formData.enable_lead_form ? 'text-green-400' : 'text-white/60'
                                    }`}>
                                    {formData.enable_lead_form ? 'Thu thập thông tin khách hàng' : 'Không thu thập thông tin'}
                                </div>
                                <div className={`text-sm mt-1 ${formData.enable_lead_form ? 'text-green-400/60' : 'text-white/30'
                                    }`}>
                                    {formData.enable_lead_form
                                        ? 'Khách hàng sẽ điền form trước khi trải nghiệm'
                                        : 'Khách hàng trải nghiệm ngay mà không cần đăng ký'
                                    }
                                </div>
                            </div>
                            <div className={`transition-all ${formData.enable_lead_form ? 'text-green-400' : 'text-white/20'
                                }`}>
                                {formData.enable_lead_form
                                    ? <ToggleRight size={40} strokeWidth={1.5} />
                                    : <ToggleLeft size={40} strokeWidth={1.5} />
                                }
                            </div>
                        </div>

                        {/* Form Config (only show when enabled) */}
                        {formData.enable_lead_form && (
                            <>
                                <p className="text-white/40 text-sm">Form builder chi tiết sẽ có trong trang Edit sau khi tạo project.</p>

                                <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Form mặc định</h3>
                                    <ul className="text-sm text-white/60 space-y-3">
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            Họ và tên (bắt buộc)
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            Số điện thoại (bắt buộc)
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-white/20"></span>
                                            Checkbox đồng ý điều khoản
                                        </li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                                        Text nút Gửi
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all"
                                        value={formData.lead_form_config.submit_text}
                                        onChange={e => setFormData({
                                            ...formData,
                                            lead_form_config: { ...formData.lead_form_config, submit_text: e.target.value }
                                        })}
                                    />
                                </div>
                            </>
                        )}

                        {/* No form info */}
                        {!formData.enable_lead_form && (
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex items-start gap-4">
                                <div className="text-2xl">⚡</div>
                                <div>
                                    <div className="text-yellow-400 font-bold text-sm mb-1">Trải nghiệm nhanh</div>
                                    <div className="text-yellow-400/60 text-sm">Khách hàng sẽ được trải nghiệm AR/Game ngay lập tức mà không cần điền thông tin. Phù hợp cho các sự kiện public hoặc demo nhanh.</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Review & Create */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/10 rounded-xl">
                                <CheckCircle2 className="text-green-500" size={18} />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Xác nhận & Tạo</h2>
                        </div>

                        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-white/40 text-sm">Subdomain</span>
                                <span className="font-mono text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-sm">{formData.client_slug}.posmars.vn</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-white/40 text-sm">Tên Campaign</span>
                                <span className="text-white font-bold">{formData.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-white/40 text-sm">Loại hình</span>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${formData.interaction_type === 'ar'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    }`}>
                                    {formData.interaction_type === 'ar' ? 'AR' : 'Game'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-white/40 text-sm">Template</span>
                                <span className="text-white/80">{templates.find(t => t.id === formData.template)?.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-white/40 text-sm">Thu thập Lead</span>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${formData.enable_lead_form
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-white/5 text-white/40 border border-white/10'
                                    }`}>
                                    {formData.enable_lead_form ? 'Có' : 'Không'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-4">
                            <div className="text-2xl">💡</div>
                            <div>
                                <div className="text-blue-400 font-bold text-sm mb-1">Bước tiếp theo</div>
                                <div className="text-blue-400/60 text-sm">Sau khi tạo, bạn sẽ được chuyển đến trang Edit để upload assets và cấu hình chi tiết.</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-10 pt-6 border-t border-white/5">
                    {step > 1 ? (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-white/40 hover:text-white px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all font-bold text-sm"
                        >
                            <ArrowLeft size={16} /> Quay lại
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all font-black uppercase text-xs tracking-widest"
                        >
                            Tiếp tục <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 bg-green-500 text-white px-8 py-3 rounded-xl hover:bg-green-600 shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase text-xs tracking-widest"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Tạo Project
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
