'use client'

import { Settings } from 'lucide-react'
import LuckyDrawBuilder from './template-builder/lucky-draw/LuckyDrawBuilder'
import ImageTrackingBuilder from './template-builder/image-tracking/ImageTrackingBuilder'
import ARCheckinBuilder from './template-builder/ar-checkin/ARCheckinBuilder'
import FaceFilterBuilder from './template-builder/face-filter/FaceFilterBuilder'

interface TemplateConfigBuilderProps {
    template: string
    initialConfig: any
    onChange: (config: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function TemplateConfigBuilder({ template, initialConfig, onChange, onUpload }: TemplateConfigBuilderProps) {

    // Render based on template type
    switch (template) {
        case 'lucky_draw':
            return (
                <LuckyDrawBuilder
                    template={template}
                    initialConfig={initialConfig}
                    onChange={onChange}
                    onUpload={onUpload}
                />
            )

        case 'image_tracking':
            return (
                <ImageTrackingBuilder
                    template={template}
                    initialConfig={initialConfig}
                    onChange={onChange}
                    onUpload={onUpload}
                />
            )

        case 'ar_checkin':
            return (
                <ARCheckinBuilder
                    template={template}
                    initialConfig={initialConfig}
                    onChange={onChange}
                    onUpload={onUpload}
                />
            )

        case 'face_filter':
            return (
                <FaceFilterBuilder
                    template={template}
                    initialConfig={initialConfig}
                    onChange={onChange}
                    onUpload={onUpload}
                />
            )

        default:
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl">
                    <Settings size={48} className="text-white/10 mb-4 animate-spin-slow" />
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Template không xác định</h3>
                    <p className="text-white/60 text-[10px] mt-2 font-medium">Cấu hình visual cho template này đang được phát triển hoặc không tồn tại.</p>
                </div>
            )
    }
}
