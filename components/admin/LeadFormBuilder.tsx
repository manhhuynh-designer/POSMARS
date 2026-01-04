'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Settings } from 'lucide-react'

export interface FormField {
    id: string
    type: 'text' | 'tel' | 'email' | 'select'
    label: string
    required: boolean
    placeholder?: string
    options?: string[]
}

export interface LeadFormConfig {
    fields: FormField[]
    submit_text: string
    consent_text: string
}

interface LeadFormBuilderProps {
    initialConfig: LeadFormConfig
    onChange: (config: LeadFormConfig) => void
}

export default function LeadFormBuilder({ initialConfig, onChange }: LeadFormBuilderProps) {
    const [config, setConfig] = useState<LeadFormConfig>(initialConfig)

    useEffect(() => {
        onChange(config)
    }, [config])

    const addField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: 'New Field',
            required: true,
            placeholder: ''
        }
        setConfig({
            ...config,
            fields: [...config.fields, newField]
        })
    }

    const removeField = (index: number) => {
        const newFields = [...config.fields]
        newFields.splice(index, 1)
        setConfig({ ...config, fields: newFields })
    }

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...config.fields]
        newFields[index] = { ...newFields[index], ...updates }
        setConfig({ ...config, fields: newFields })
    }

    const handleOptionsChange = (index: number, optionsString: string) => {
        const options = optionsString.split(',').map(s => s.trim()).filter(Boolean)
        updateField(index, { options })
    }

    return (
        <div className="space-y-6">
            {/* General Settings */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-gray-700">
                    <Settings size={16} /> Cấu hình chung
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nút Gửi (Submit Text)</label>
                        <input
                            value={config.submit_text}
                            onChange={e => setConfig({ ...config, submit_text: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm"
                            placeholder="Tiếp tục"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Điều khoản (Consent Text)</label>
                        <input
                            value={config.consent_text}
                            onChange={e => setConfig({ ...config, consent_text: e.target.value })}
                            className="w-full border rounded px-3 py-2 text-sm"
                            placeholder="Tôi đồng ý với điều khoản..."
                        />
                    </div>
                </div>
            </div>

            {/* Field List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-700">Danh sách trường</h3>
                    <button
                        onClick={addField}
                        className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                        <Plus size={16} /> Thêm trường
                    </button>
                </div>

                {config.fields.length === 0 && (
                    <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-400 border border-dashed">
                        Chưa có trường nào.
                    </div>
                )}

                {config.fields.map((field, index) => (
                    <div key={`field-${index}`} className="bg-white border rounded-lg p-4 shadow-sm hover:border-orange-300 transition-colors group">
                        <div className="flex items-start gap-3">
                            <div className="text-gray-300 mt-2 cursor-move">
                                <GripVertical size={20} />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Label */}
                                <div className="md:col-span-4">
                                    <label className="block text-xs text-gray-400 mb-1">Tên trường (Label)</label>
                                    <input
                                        value={field.label}
                                        onChange={e => updateField(index, { label: e.target.value })}
                                        className="w-full border rounded px-2 py-1.5 text-sm font-medium"
                                        placeholder="Họ và tên"
                                    />
                                </div>

                                {/* ID (Auto/Manual) & Required */}
                                <div className="md:col-span-3">
                                    <label className="block text-xs text-gray-400 mb-1">ID (Key)</label>
                                    <input
                                        value={field.id}
                                        onChange={e => updateField(index, { id: e.target.value })}
                                        className="w-full border rounded px-2 py-1.5 text-sm font-mono text-gray-600 bg-gray-50"
                                    />
                                </div>

                                {/* Type */}
                                <div className="md:col-span-3">
                                    <label className="block text-xs text-gray-400 mb-1">Loại</label>
                                    <select
                                        value={field.type}
                                        onChange={e => updateField(index, { type: e.target.value as any })}
                                        className="w-full border rounded px-2 py-1.5 text-sm"
                                    >
                                        <option value="text">Văn bản (Text)</option>
                                        <option value="tel">Số điện thoại</option>
                                        <option value="email">Email</option>
                                        <option value="select">Danh sách chọn</option>
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-5">
                                    <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={e => updateField(index, { required: e.target.checked })}
                                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                        />
                                        Bắt buộc
                                    </label>
                                    <button
                                        onClick={() => removeField(index)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                        title="Xóa"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Extra Options for Select type */}
                                {field.type === 'select' && (
                                    <div className="md:col-span-12 bg-gray-50 p-3 rounded text-sm">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Các lựa chọn (phân cách bằng dấu phẩy)</label>
                                        <input
                                            value={field.options?.join(', ') || ''}
                                            onChange={e => handleOptionsChange(index, e.target.value)}
                                            className="w-full border rounded px-2 py-1.5"
                                            placeholder="HCM, Hà Nội, Đà Nẵng"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
