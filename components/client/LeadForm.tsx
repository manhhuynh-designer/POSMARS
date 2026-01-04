'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

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
}

interface LeadFormProps {
    projectId: string
    config: LeadFormConfig
    onComplete: (leadId: number) => void
}

export default function LeadForm({ projectId, config, onComplete }: LeadFormProps) {
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [consent, setConsent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const posId = searchParams.get('pos_id') || ''
    const locationName = searchParams.get('loc') || ''

    const handleChange = (fieldId: string, value: string) => {
        setFormData({ ...formData, [fieldId]: value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!consent) {
            setError('Vui lòng đồng ý với điều khoản sử dụng')
            return
        }

        for (const field of config.fields) {
            if (field.required && !formData[field.id]) {
                setError(`Vui lòng nhập ${field.label}`)
                return
            }
        }

        setLoading(true)
        setError('')

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
            onComplete(data)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Đăng ký tham gia</h2>
                    <p className="text-sm text-gray-500 mt-1">Điền thông tin để tiếp tục trải nghiệm</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

                {config.fields.map(field => (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' && field.options ? (
                            <select
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500"
                                value={formData[field.id] || ''}
                                onChange={e => handleChange(field.id, e.target.value)}
                            >
                                <option value="">Chọn...</option>
                                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input
                                type={field.type}
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500"
                                value={formData[field.id] || ''}
                                onChange={e => handleChange(field.id, e.target.value)}
                                placeholder={field.placeholder}
                            />
                        )}
                    </div>
                ))}

                <div className="flex items-start gap-3 pt-2">
                    <input type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 w-4 h-4" />
                    <label htmlFor="consent" className="text-sm text-gray-600">{config.consent_text}</label>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg">
                    {loading ? 'Đang gửi...' : config.submit_text}
                </button>
            </form>
        </div>
    )
}
