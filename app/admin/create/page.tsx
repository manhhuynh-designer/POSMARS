'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

type InteractionType = 'ar' | 'game'
type ARTemplate = 'image_tracking' | 'ar_checkin' | 'face_filter'
type GameTemplate = 'lucky_draw' | 'scratch_card' | 'quiz'
type Template = ARTemplate | GameTemplate

const TEMPLATES = {
    ar: [
        { id: 'image_tracking', name: 'Image Tracking', desc: 'Quét poster → Overlay 3D', priority: 'P1' },
        { id: 'ar_checkin', name: 'AR Check-in', desc: 'Chụp ảnh với frame branded', priority: 'P1' },
        { id: 'face_filter', name: 'Face Filter', desc: 'Filter khuôn mặt', priority: 'P1' },
    ],
    game: [
        { id: 'lucky_draw', name: 'Lucky Draw', desc: 'Vòng quay may mắn', priority: 'P1' },
        { id: 'scratch_card', name: 'Scratch Card', desc: 'Cào thẻ trúng thưởng', priority: 'P2' },
        { id: 'quiz', name: 'Quiz', desc: 'Trả lời câu hỏi', priority: 'P2' },
    ]
}

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
            lead_form_config: formData.lead_form_config,
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
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${s < step ? 'bg-green-500 text-white' :
                            s === step ? 'bg-orange-500 text-white' :
                                'bg-gray-200 text-gray-500'
                            }`}>
                            {s < step ? <Check size={16} /> : s}
                        </div>
                        {s < 4 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Thông tin cơ bản</h2>
                        <div>
                            <label className="block text-sm font-medium mb-1">Subdomain (slug) *</label>
                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 border p-2 rounded font-mono"
                                    value={formData.client_slug}
                                    onChange={e => setFormData({ ...formData, client_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    placeholder="samsung-tet-2024"
                                />
                                <span className="text-gray-500 text-sm">.posmars.vn</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên Campaign *</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Samsung Tết 2024"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Type & Template */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Loại hình & Template</h2>

                        {/* Type Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('ar')}
                                className={`p-4 border-2 rounded-lg text-left transition ${formData.interaction_type === 'ar'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-2">📱</div>
                                <div className="font-bold">AR</div>
                                <div className="text-sm text-gray-500">Thực tế tăng cường</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('game')}
                                className={`p-4 border-2 rounded-lg text-left transition ${formData.interaction_type === 'game'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🎮</div>
                                <div className="font-bold">Game</div>
                                <div className="text-sm text-gray-500">Gamification</div>
                            </button>
                        </div>

                        {/* Template Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Chọn Template</label>
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleTemplateChange(t.id as Template)}
                                        className={`w-full p-3 border-2 rounded-lg text-left transition flex justify-between items-center ${formData.template === t.id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium">{t.name}</div>
                                            <div className="text-sm text-gray-500">{t.desc}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs rounded ${t.priority === 'P1' ? 'bg-green-100 text-green-700' :
                                            t.priority === 'P2' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {t.priority === 'P1' ? 'Sẵn sàng' : 'Đang phát triển'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Lead Form Config */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Cấu hình Form Thu thập</h2>
                        <p className="text-sm text-gray-500">Form builder chi tiết sẽ có trong trang Edit sau khi tạo project.</p>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium mb-2">Form mặc định:</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Họ và tên (bắt buộc)</li>
                                <li>• Số điện thoại (bắt buộc)</li>
                                <li>• Checkbox đồng ý điều khoản</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Nút Gửi</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={formData.lead_form_config.submit_text}
                                onChange={e => setFormData({
                                    ...formData,
                                    lead_form_config: { ...formData.lead_form_config, submit_text: e.target.value }
                                })}
                            />
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Create */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Xác nhận & Tạo</h2>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subdomain:</span>
                                <span className="font-mono">{formData.client_slug}.posmars.vn</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tên:</span>
                                <span>{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Loại:</span>
                                <span>{formData.interaction_type === 'ar' ? 'AR' : 'Game'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Template:</span>
                                <span>{templates.find(t => t.id === formData.template)?.name}</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                            💡 Sau khi tạo, bạn sẽ được chuyển đến trang Edit để upload assets và cấu hình chi tiết.
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-4 border-t">
                    {step > 1 ? (
                        <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft size={16} /> Quay lại
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button onClick={handleNext} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                            Tiếp tục <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            {loading ? 'Đang tạo...' : 'Tạo Project'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
