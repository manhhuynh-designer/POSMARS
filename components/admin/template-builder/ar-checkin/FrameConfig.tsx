import { ImageIcon } from 'lucide-react'
import { ARCheckinConfig } from '../types'
import FileUploader from '../shared/FileUploader'

interface FrameConfigProps {
    config: ARCheckinConfig
    onUpdateConfig: (key: string, value: any) => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function FrameConfig({ config, onUpdateConfig, onUpload }: FrameConfigProps) {
    const handleUpload = async (file: File, key: string, path: string) => {
        try {
            const url = await onUpload(file, path)
            onUpdateConfig(key, url)
            return url
        } catch (error) {
            console.error(error)
            return null
        }
    }

    return (
        <section className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
            <div className="flex items-center gap-2 border-b border-white/5 pb-6">
                <ImageIcon size={14} className="text-orange-500" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Photo Frame Configuration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">Foreground Frame (PNG)</label>
                    <div className="relative aspect-[9/16] rounded-3xl border-2 border-dashed border-white/10 bg-black/40 overflow-hidden group">
                        <FileUploader
                            currentUrl={config.frame_url}
                            onUpload={(f) => handleUpload(f, 'frame_url', `frames/${Date.now()}_${f.name}`)}
                            onClear={() => onUpdateConfig('frame_url', '')}
                            renderPreview={(url) => <img src={url} className="w-full h-full object-contain pointer-events-none" />}
                            label="Upload Frame (.png)"
                        />
                    </div>
                    <p className="text-[9px] text-white/30 text-center">Recommended: 1080x1920px Transparent PNG</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">User Instructions</label>
                        <textarea
                            value={config.instructions || ''}
                            onChange={e => onUpdateConfig('instructions', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-6 rounded-[2rem] text-sm text-white font-medium leading-relaxed outline-none focus:border-orange-500/50 transition-all shadow-inner h-[200px] resize-none"
                            placeholder="Ex: Đứng vào khung hình và mỉm cười..."
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
