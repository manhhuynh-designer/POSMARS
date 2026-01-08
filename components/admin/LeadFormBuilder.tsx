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

    // Visual Customization
    title?: string
    description?: string
    logo_url?: string
    banner_url?: string
    primary_color?: string
    background_color?: string
    text_color?: string
}

interface LeadFormBuilderProps {
    initialConfig: LeadFormConfig
    onChange: (config: LeadFormConfig) => void
    onUpload?: (file: File, path: string) => Promise<string | null>
}

export default function LeadFormBuilder({ initialConfig, onChange, onUpload }: LeadFormBuilderProps) {
    const [config, setConfig] = useState<LeadFormConfig>({
        fields: [],
        submit_text: 'Tiếp tục',
        consent_text: 'Tôi đồng ý với điều khoản sử dụng',
        ...initialConfig
    })
    const [uploadingField, setUploadingField] = useState<string | null>(null)

    useEffect(() => {
        onChange(config)
    }, [config])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'banner_url') => {
        const file = e.target.files?.[0]
        if (!file || !onUpload) return

        try {
            setUploadingField(field)
            const url = await onUpload(file, `branding/${Date.now()}_${file.name}`)
            if (url) {
                setConfig({ ...config, [field]: url })
            }
            setUploadingField(null)
        } catch (error) {
            console.error('Upload failed:', error)
            setUploadingField(null)
            alert('Upload thất bại')
        }
    }

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
        <div className="space-y-10">
            {/* Brand Identity */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                    🎨 Nhận diện thương hiệu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Tiêu đề Form</label>
                        <input
                            value={config.title || ''}
                            onChange={e => setConfig({ ...config, title: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Đăng ký tham gia"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Mô tả</label>
                        <input
                            value={config.description || ''}
                            onChange={e => setConfig({ ...config, description: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Nhập thông tin để nhận quà..."
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Logo (Link hoặc Upload)</label>
                        <div className="flex gap-3">
                            <input
                                value={config.logo_url || ''}
                                onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all font-mono"
                                placeholder="https://..."
                            />
                            {onUpload && (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileUpload(e, 'logo_url')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={uploadingField === 'logo_url'}
                                    />
                                    <button className={`h-full px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest ${uploadingField === 'logo_url' ? 'animate-pulse' : ''}`}>
                                        {uploadingField === 'logo_url' ? '...' : 'Upload'}
                                    </button>
                                </div>
                            )}
                        </div>
                        {config.logo_url && (
                            <div className="w-24 h-24 bg-black/40 rounded-2xl border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                                <img src={config.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Banner (Link hoặc Upload)</label>
                        <div className="flex gap-3">
                            <input
                                value={config.banner_url || ''}
                                onChange={e => setConfig({ ...config, banner_url: e.target.value })}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all font-mono"
                                placeholder="https://..."
                            />
                            {onUpload && (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileUpload(e, 'banner_url')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={uploadingField === 'banner_url'}
                                    />
                                    <button className={`h-full px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest ${uploadingField === 'banner_url' ? 'animate-pulse' : ''}`}>
                                        {uploadingField === 'banner_url' ? '...' : 'Upload'}
                                    </button>
                                </div>
                            )}
                        </div>
                        {config.banner_url && (
                            <div className="w-full h-24 bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
                                <img src={config.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Màu chính (Primary)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={config.primary_color || '#f97316'}
                                onChange={e => setConfig({ ...config, primary_color: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                            />
                            <input
                                value={config.primary_color || '#f97316'}
                                onChange={e => setConfig({ ...config, primary_color: e.target.value })}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono focus:border-orange-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Màu nền (Background)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={config.background_color || '#ffffff'}
                                onChange={e => setConfig({ ...config, background_color: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                            />
                            <input
                                value={config.background_color || '#ffffff'}
                                onChange={e => setConfig({ ...config, background_color: e.target.value })}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono focus:border-orange-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Màu chữ (Text)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={config.text_color || '#1f2937'}
                                onChange={e => setConfig({ ...config, text_color: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                            />
                            <input
                                value={config.text_color || '#1f2937'}
                                onChange={e => setConfig({ ...config, text_color: e.target.value })}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono focus:border-orange-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                    <Settings size={14} className="text-orange-500" /> Cấu hình chung
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Nút Gửi (Submit Text)</label>
                        <input
                            value={config.submit_text}
                            onChange={e => setConfig({ ...config, submit_text: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Tiếp tục"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Điều khoản (Consent Text)</label>
                        <input
                            value={config.consent_text}
                            onChange={e => setConfig({ ...config, consent_text: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                            placeholder="Tôi đồng ý với điều khoản..."
                        />
                    </div>
                </div>
            </div>

            {/* Field List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="font-black text-white uppercase tracking-tighter">Danh sách trường dữ liệu</h3>
                    <button
                        onClick={addField}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 text-white/60 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-95"
                    >
                        <Plus size={14} /> Thêm trường mới
                    </button>
                </div>

                {config.fields.length === 0 && (
                    <div className="text-center py-16 bg-white/5 rounded-3xl text-white/10 border border-white/5 border-dashed italic text-sm">
                        Chưa có trường nào được thêm vào form.
                    </div>
                )}

                <div className="space-y-4">
                    {config.fields.map((field, index) => (
                        <div key={`field-${index}`} className="bg-[#121212] border border-white/5 rounded-2xl p-6 shadow-2xl hover:border-orange-500/30 transition-all duration-300 group">
                            <div className="flex items-start gap-4">
                                <div className="text-white/10 mt-2 cursor-grab active:cursor-grabbing group-hover:text-white/40 transition-colors">
                                    <GripVertical size={20} />
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Label */}
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Tên trường (Label)</label>
                                        <input
                                            value={field.label}
                                            onChange={e => updateField(index, { label: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/90 font-bold focus:border-orange-500 outline-none transition-all"
                                            placeholder="Họ và tên"
                                        />
                                    </div>

                                    {/* ID (Auto/Manual) & Required */}
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">ID (Key)</label>
                                        <input
                                            value={field.id}
                                            onChange={e => updateField(index, { id: e.target.value })}
                                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-mono text-white/30 focus:text-white transition-all outline-none"
                                        />
                                    </div>

                                    {/* Type */}
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Loại dữ liệu</label>
                                        <select
                                            value={field.type}
                                            onChange={e => updateField(index, { type: e.target.value as any })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-orange-500 transition-all appearance-none"
                                        >
                                            <option value="text">Văn bản (Text)</option>
                                            <option value="tel">Số điện thoại</option>
                                            <option value="email">Email</option>
                                            <option value="select">Danh sách chọn</option>
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="md:col-span-2 flex items-center justify-end gap-4 pt-6">
                                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none group/req">
                                            <div className={`w-8 h-4 rounded-full transition-all relative ${field.required ? 'bg-orange-500' : 'bg-white/10'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${field.required ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={e => updateField(index, { required: e.target.checked })}
                                                className="hidden"
                                            />
                                            <span className={`${field.required ? 'text-white' : 'text-white/40'} transition-colors`}>{field.required ? 'REQ' : 'OPT'}</span>
                                        </label>
                                        <button
                                            onClick={() => removeField(index)}
                                            className="text-white/10 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Extra Options for Select type */}
                                    {field.type === 'select' && (
                                        <div className="md:col-span-12 bg-black/40 p-5 rounded-2xl border border-white/5 mt-2">
                                            <label className="block text-[10px] font-extrabold text-white/40 uppercase tracking-[0.2em] mb-3 select-none">Các lựa chọn (phân cách bằng dấu phẩy)</label>
                                            <input
                                                value={field.options?.join(', ') || ''}
                                                onChange={e => handleOptionsChange(index, e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 focus:border-orange-500 outline-none placeholder:text-white/10"
                                                placeholder="Ví dụ: HCM, Hà Nội, Đà Nẵng"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
