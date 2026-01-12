'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Settings, ImageIcon } from 'lucide-react'
import FileUploader from './template-builder/shared/FileUploader'

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

    // Validation
    check_duplicate_phone?: boolean

    // Privacy
    privacy_policy_content?: string

    // Visual Customization
    title?: string
    description?: string
    logo_url?: string
    banner_url?: string
    primary_color?: string
    text_color?: string

    // Background Customization
    bg_type?: 'image' | 'solid' | 'gradient'
    background_color?: string // Used for 'solid' type
    bg_url?: string
    bg_gradient_start?: string
    bg_gradient_end?: string
}

interface LeadFormBuilderProps {
    initialConfig: LeadFormConfig
    onChange: (config: LeadFormConfig) => void
    onUpload?: (file: File, path: string) => Promise<string | null>
}

const DECREE_13_POLICY_TEMPLATE = `CHÍNH SÁCH BẢO MẬT DỮ LIỆU CÁ NHÂN
(Tuân thủ Nghị định 13/2023/NĐ-CP)

1. MỤC ĐÍCH XỬ LÝ DỮ LIỆU
Chúng tôi thu thập và xử lý dữ liệu cá nhân của bạn (bao gồm: Họ tên, Số điện thoại, Email và hình ảnh tương tác) nhằm mục đích:
- Xác nhận tham gia chương trình và trao thưởng.
- Gửi thông báo về các chương trình khuyến mãi liên quan (nếu có sự đồng ý).
- Cải thiện trải nghiệm người dùng thông qua các nội dung AR/Game cá nhân hóa.

2. TỔ CHỨC ĐƯỢC PHÉP XỬ LÝ DỮ LIỆU
Dữ liệu của bạn được lưu trữ an toàn trên hệ thống của POSMARS và các đối tác cung cấp hạ tầng đám mây tuân thủ tiêu chuẩn an ninh thông tin. Chúng tôi cam kết không chia sẻ dữ liệu cho bên thứ ba không liên quan mà không có sự đồng ý của bạn.

3. QUYỀN CỦA NGƯỜI DÙNG
Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:
- Được biết và đồng ý về việc xử lý dữ liệu.
- Truy cập, chỉnh sửa hoặc yêu cầu xóa dữ liệu của mình.
- Rút lại sự đồng ý bất cứ lúc nào bằng cách liên hệ với chúng tôi.

4. THỜI GIAN LƯU TRỮ
Dữ liệu sẽ được lưu trữ trong thời gian diễn ra chương trình và tối đa 12 tháng sau khi chương trình kết thúc để phục vụ công tác đối soát, trừ khi pháp luật có quy định khác.

5. LIÊN HỆ
Mọi yêu cầu liên quan đến bảo mật dữ liệu, vui lòng liên hệ Ban Tổ Chức chương trình.`

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

    const handleFileUpload = async (file: File, field: 'logo_url' | 'banner_url' | 'bg_url') => {
        if (!onUpload) return null

        try {
            setUploadingField(field)
            const url = await onUpload(file, `branding/${Date.now()}_${file.name}`)
            if (url) {
                setConfig({ ...config, [field]: url })
            }
            return url
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload thất bại')
            return null
        } finally {
            setUploadingField(null)
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
                                <FileUploader
                                    onUpload={(f) => handleFileUpload(f, 'logo_url')}
                                    isUploading={uploadingField === 'logo_url'}
                                    className="h-12 w-24 shrink-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all overflow-hidden"
                                    label="Upload"
                                />
                            )}
                        </div>
                        {config.logo_url && (
                            <div className="w-24 h-24 bg-black/40 rounded-2xl border border-white/10 p-2 flex items-center justify-center overflow-hidden relative group/logo">
                                <img src={config.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => setConfig({ ...config, logo_url: '' })}
                                    className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
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
                                <FileUploader
                                    onUpload={(f) => handleFileUpload(f, 'banner_url')}
                                    isUploading={uploadingField === 'banner_url'}
                                    className="h-12 w-24 shrink-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all overflow-hidden"
                                    label="Upload"
                                />
                            )}
                        </div>
                        {config.banner_url && (
                            <div className="w-full h-24 bg-black/40 rounded-2xl border border-white/10 overflow-hidden relative group/banner">
                                <img src={config.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setConfig({ ...config, banner_url: '' })}
                                    className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs uppercase tracking-widest gap-2"
                                >
                                    <Trash2 size={16} /> Gỡ ảnh
                                </button>
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
                    <div className="md:col-span-2 space-y-4">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Nền Form (Background)</label>

                        {/* Type Selector */}
                        <div className="flex gap-2">
                            {(['image', 'solid', 'gradient'] as const).map((bgType) => (
                                <button
                                    key={bgType}
                                    onClick={() => setConfig({ ...config, bg_type: bgType })}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${(config.bg_type || 'solid') === bgType
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                                        }`}
                                >
                                    {bgType === 'image' ? 'Hình ảnh' : bgType === 'solid' ? 'Màu đơn' : 'Gradient'}
                                </button>
                            ))}
                        </div>

                        {/* Controls based on Type */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                            {(config.bg_type === 'image') && (
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <input
                                            value={config.bg_url || ''}
                                            onChange={e => setConfig({ ...config, bg_url: e.target.value })}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all font-mono"
                                            placeholder="https://..."
                                        />
                                        {onUpload && (
                                            <FileUploader
                                                onUpload={(f) => handleFileUpload(f, 'bg_url' as any)}
                                                isUploading={uploadingField === 'bg_url'}
                                                className="h-12 w-24 shrink-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all overflow-hidden"
                                                label="Upload"
                                            />
                                        )}
                                    </div>
                                    {config.bg_url ? (
                                        <div className="w-full h-32 bg-black/40 rounded-xl border border-white/10 overflow-hidden relative group/bg">
                                            <img src={config.bg_url} alt="Background Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setConfig({ ...config, bg_url: '' })}
                                                className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs uppercase tracking-widest gap-2"
                                            >
                                                <Trash2 size={16} /> Gỡ ảnh
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-white/20 text-xs italic border border-white/5 border-dashed rounded-xl">
                                            Chưa có ảnh nền
                                        </div>
                                    )}
                                </div>
                            )}

                            {(config.bg_type === 'solid' || !config.bg_type) && (
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
                            )}

                            {config.bg_type === 'gradient' && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Bắt đầu</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={config.bg_gradient_start || '#ffffff'}
                                                    onChange={e => setConfig({ ...config, bg_gradient_start: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                                                />
                                                <span className="text-[10px] text-white/40 font-mono">{config.bg_gradient_start || '#ffffff'}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Kết thúc</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={config.bg_gradient_end || '#f3f4f6'}
                                                    onChange={e => setConfig({ ...config, bg_gradient_end: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer"
                                                />
                                                <span className="text-[10px] text-white/40 font-mono">{config.bg_gradient_end || '#f3f4f6'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="w-full h-12 rounded-xl border border-white/10"
                                        style={{ background: `linear-gradient(to bottom, ${config.bg_gradient_start || '#ffffff'}, ${config.bg_gradient_end || '#f3f4f6'})` }}
                                    />
                                </div>
                            )}
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
                {/* Phone Duplicate Check Toggle */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <label className="flex items-center gap-4 cursor-pointer select-none group">
                        <div className={`w-12 h-6 rounded-full transition-all relative ${config.check_duplicate_phone ? 'bg-orange-500' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.check_duplicate_phone ? 'left-7' : 'left-1'}`} />
                        </div>
                        <input
                            type="checkbox"
                            checked={config.check_duplicate_phone || false}
                            onChange={e => setConfig({ ...config, check_duplicate_phone: e.target.checked })}
                            className="hidden"
                        />
                        <div>
                            <span className={`block text-sm font-bold ${config.check_duplicate_phone ? 'text-white' : 'text-white/60'} transition-colors`}>
                                Kiểm tra số điện thoại trùng
                            </span>
                            <span className="block text-[10px] text-white/40 mt-0.5">
                                Không cho phép cùng một số điện thoại đăng ký nhiều lần
                            </span>
                        </div>
                    </label>

                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                Nội dung chính sách bảo mật (Nghị định 13/2023/NĐ-CP)
                            </label>
                            <button
                                onClick={() => setConfig({ ...config, privacy_policy_content: DECREE_13_POLICY_TEMPLATE })}
                                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider"
                            >
                                + Sử dụng mẫu có sẵn
                            </button>
                        </div>
                        <textarea
                            value={config.privacy_policy_content || ''}
                            onChange={e => setConfig({ ...config, privacy_policy_content: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all min-h-[300px] leading-relaxed font-light"
                            placeholder="Nhập nội dung chính sách bảo mật..."
                        />
                        <p className="text-[10px] text-white/30 mt-2">
                            * Nội dung này sẽ hiển thị khi người dùng click vào dòng chữ "Điều khoản sử dụng".
                        </p>
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
