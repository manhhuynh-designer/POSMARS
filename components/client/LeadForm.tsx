'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

interface FormField {
    id: string
    type: 'text' | 'tel' | 'email' | 'select'
    label: string
    required: boolean
    placeholder?: string
    options?: string[]
}

interface LeadFormConfig {
    fields: FormField[]
    submit_text: string
    consent_text: string

    // Validation
    check_duplicate_phone?: boolean

    // Visual Customization
    title?: string
    description?: string
    logo_url?: string
    banner_url?: string
    primary_color?: string
    text_color?: string

    // Background Customization
    bg_type?: 'image' | 'solid' | 'gradient'
    background_color?: string
    bg_url?: string
    bg_gradient_start?: string
    bg_gradient_end?: string

    // Privacy
    privacy_policy_content?: string
}

interface LeadFormProps {
    projectId: string
    config: LeadFormConfig
    onComplete: (leadId: number, userData: Record<string, any>) => void
}

export default function LeadForm({ projectId, config, onComplete }: LeadFormProps) {
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [consent, setConsent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPrivacy, setShowPrivacy] = useState(false)

    const posId = searchParams.get('pos_id') || ''
    const locationName = searchParams.get('loc') || ''

    const handleChange = (fieldId: string, value: string) => {
        setFormData({ ...formData, [fieldId]: value })
    }

    // Validate phone number format: 10 digits, starts with 0
    const validatePhoneFormat = (phone: string): boolean => {
        const phoneRegex = /^0\d{9}$/
        return phoneRegex.test(phone)
    }

    // Find phone field in config (type === 'tel')
    const getPhoneFieldId = (): string | null => {
        const phoneField = config.fields.find(f => f.type === 'tel')
        return phoneField?.id || null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!consent) {
            setError('Vui lòng đồng ý với điều khoản sử dụng')
            return
        }

        // Validate required fields
        for (const field of config.fields) {
            if (field.required && !formData[field.id]) {
                setError(`Vui lòng nhập ${field.label}`)
                return
            }
        }

        // Validate phone format if phone field exists
        const phoneFieldId = getPhoneFieldId()
        if (phoneFieldId && formData[phoneFieldId]) {
            const phone = formData[phoneFieldId]

            if (!validatePhoneFormat(phone)) {
                setError('Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số, bắt đầu bằng số 0')
                return
            }
        }

        setLoading(true)
        setError('')

        // Check for duplicate phone if enabled in config and phone field exists
        if (config.check_duplicate_phone && phoneFieldId && formData[phoneFieldId]) {
            const phone = formData[phoneFieldId]

            const { data: isDuplicate, error: checkErr } = await supabase.rpc('check_duplicate_phone', {
                p_project_id: projectId,
                p_phone: phone
            })

            if (checkErr) {
                console.error('Error checking duplicate phone:', checkErr)
                // Continue with submission if check fails (graceful degradation)
            } else if (isDuplicate) {
                setLoading(false)
                setError('Số điện thoại này đã được đăng ký. Vui lòng sử dụng số điện thoại khác.')
                return
            }
        }

        const { data, error: err } = await supabase.rpc('create_lead', {
            p_project_id: projectId,
            p_user_data: formData,
            p_pos_id: posId,
            p_location_name: locationName
        })

        setLoading(false)

        if (err) {
            setError('Có lỗi xảy ra, vui lòng thử lại')
        } else {
            onComplete(data, formData)
        }
    }

    // Dynamic styles from config
    const primaryColor = config.primary_color || '#f97316'
    const textColor = config.text_color || '#1f2937'

    const getBackgroundStyle = () => {
        const bgType = config.bg_type || 'solid'
        if (bgType === 'solid') {
            return { backgroundColor: config.background_color || '#ffffff' }
        } else if (bgType === 'gradient') {
            return { background: `linear-gradient(to bottom, ${config.bg_gradient_start || '#ffffff'}, ${config.bg_gradient_end || '#f3f4f6'})` }
        }
        return { backgroundColor: '#f8fafc' }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={getBackgroundStyle()}
        >
            {/* Background Image */}
            {config.bg_type === 'image' && config.bg_url && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${config.bg_url})` }}
                />
            )}

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 relative z-10 bg-white/95 backdrop-blur-sm"
                style={{ color: textColor }}
            >
                {/* Banner */}
                {config.banner_url && (
                    <img
                        src={config.banner_url}
                        alt="Banner"
                        className="w-full rounded-xl mb-4 object-cover max-h-40"
                    />
                )}

                {/* Logo & Header */}
                <div className="text-center mb-6">
                    {config.logo_url && (
                        <img
                            src={config.logo_url}
                            alt="Logo"
                            className="h-16 mx-auto mb-4 object-contain"
                        />
                    )}
                    <h2 className="text-xl font-bold" style={{ color: textColor }}>
                        {config.title || 'Đăng ký tham gia'}
                    </h2>
                    <p className="text-sm mt-1 opacity-70">
                        {config.description || 'Điền thông tin để tiếp tục trải nghiệm'}
                    </p>
                </div>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

                {config.fields.map(field => (
                    <div key={field.id}>
                        <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>
                            {field.label} {field.required && <span style={{ color: primaryColor }}>*</span>}
                        </label>
                        {field.type === 'select' && field.options ? (
                            <select
                                className="w-full border rounded-lg p-3"
                                style={{ borderColor: primaryColor + '40' }}
                                value={formData[field.id] || ''}
                                onChange={e => handleChange(field.id, e.target.value)}
                            >
                                <option value="">Chọn...</option>
                                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input
                                type={field.type}
                                className="w-full border rounded-lg p-3"
                                style={{ borderColor: primaryColor + '40' }}
                                value={formData[field.id] || ''}
                                onChange={e => handleChange(field.id, e.target.value)}
                                placeholder={field.placeholder}
                            />
                        )}
                    </div>
                ))}

                <div className="flex items-start gap-3 pt-2">
                    <input
                        type="checkbox"
                        id="consent"
                        checked={consent}
                        onChange={e => setConsent(e.target.checked)}
                        className="mt-1 w-4 h-4"
                        style={{ accentColor: primaryColor }}
                    />
                    <label
                        htmlFor="consent"
                        className="text-sm opacity-80 cursor-pointer hover:underline"
                        onClick={(e) => {
                            if (config.privacy_policy_content) {
                                e.preventDefault()
                                setShowPrivacy(true)
                            }
                        }}
                    >
                        {config.consent_text}
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                >
                    {loading ? 'Đang gửi...' : config.submit_text}
                </button>
            </form>

            {/* Privacy Policy Modal */}
            {showPrivacy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900">Điều khoản & Chính sách</h3>
                            <button
                                onClick={() => setShowPrivacy(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                                {config.privacy_policy_content || 'Chưa có nội dung điều khoản.'}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => {
                                    setConsent(true)
                                    setShowPrivacy(false)
                                }}
                                className="px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all hover:opacity-90"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Tôi đồng ý
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
