'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Link2, Copy, QrCode, Check, ExternalLink, Download } from 'lucide-react'

interface Location {
    id: string
    code: string // POS ID
    name: string // Location Name
    note?: string
}

interface LocationManagerProps {
    clientSlug: string
    locations: Location[]
    onChange: (locations: Location[]) => void
}

export default function LocationManager({ clientSlug, locations, onChange }: LocationManagerProps) {
    const [copied, setCopied] = useState<string | null>(null)
    const [showQR, setShowQR] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    const baseUrl = typeof window !== 'undefined'
        ? `https://${clientSlug}.posmars.vn`
        : `https://${clientSlug}.posmars.vn`

    const addLocation = () => {
        const newLocation: Location = {
            id: Date.now().toString(),
            code: '',
            name: '',
            note: ''
        }
        onChange([...locations, newLocation])
    }

    const updateLocation = (index: number, updates: Partial<Location>) => {
        const newLocations = [...locations]
        newLocations[index] = { ...newLocations[index], ...updates }
        onChange(newLocations)
    }

    const removeLocation = (index: number) => {
        const newLocations = [...locations]
        newLocations.splice(index, 1)
        onChange(newLocations)
    }

    const generateLink = (loc: Location) => {
        if (!loc.code) return baseUrl
        const params = new URLSearchParams()
        params.set('pos_id', loc.code)
        if (loc.name) params.set('location', loc.name)
        return `${baseUrl}?${params.toString()}`
    }

    const copyLink = async (loc: Location) => {
        const link = generateLink(loc)
        await navigator.clipboard.writeText(link)
        setCopied(loc.id)
        setTimeout(() => setCopied(null), 2000)
    }

    const downloadQR = async (loc: Location) => {
        const link = generateLink(loc)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`

        const response = await fetch(qrUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `QR_${clientSlug}_${loc.code || 'default'}.png`
        a.click()
        URL.revokeObjectURL(url)
    }

    const isDuplicateCode = (code: string, currentIndex: number) => {
        return locations.some((loc, i) => i !== currentIndex && loc.code === code && code !== '')
    }

    const downloadAllQR = async () => {
        const validLocations = locations.filter(l => l.code)
        if (validLocations.length === 0) {
            alert('Chưa có điểm bán nào có mã POS để tạo QR!')
            return
        }

        setDownloading(true)
        try {
            const JSZip = (await import('jszip')).default
            const zip = new JSZip()

            for (const loc of validLocations) {
                const link = generateLink(loc)
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(link)}`
                const response = await fetch(qrUrl)
                const blob = await response.blob()
                zip.file(`QR_${loc.code}_${loc.name || 'unknown'}.png`, blob)
            }

            const content = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(content)
            const a = document.createElement('a')
            a.href = url
            a.download = `QR_All_${clientSlug}_${new Date().toISOString().split('T')[0]}.zip`
            a.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            alert('Có lỗi khi tải QR codes')
        }
        setDownloading(false)
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div>
                    <h3 className="font-black text-white uppercase tracking-tighter text-xl">Điểm bán ({locations.length})</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Multi-location Tracking System</p>
                </div>
                <div className="flex items-center gap-3">
                    {locations.filter(l => l.code).length > 1 && (
                        <button
                            onClick={downloadAllQR}
                            disabled={downloading}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 px-5 py-2.5 rounded-xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
                        >
                            <Download size={14} /> {downloading ? 'Processing...' : 'Export All QR'}
                        </button>
                    )}
                    <button
                        onClick={addLocation}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    >
                        <Plus size={14} /> Thêm POS
                    </button>
                </div>
            </div>

            {locations.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/5 group">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/10 group-hover:text-orange-500 transition-colors">
                        <Link2 size={32} />
                    </div>
                    <p className="text-white/40 text-sm font-medium italic">Chưa có điểm bán nào được thiết lập.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {locations.map((loc, index) => {
                        const link = generateLink(loc)
                        const hasDuplicate = isDuplicateCode(loc.code, index)

                        return (
                            <div key={loc.id} className="bg-[#121212] rounded-[2rem] p-8 border border-white/5 shadow-2xl group hover:border-white/20 transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                    {/* Code (POS ID) */}
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Mã POS *</label>
                                        <input
                                            value={loc.code}
                                            onChange={e => updateLocation(index, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                                            placeholder="HCM01"
                                            className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm font-mono uppercase transition-all outline-none ${hasDuplicate ? 'border-red-500 text-red-400 bg-red-500/5' : 'border-white/10 text-white focus:border-orange-500'}`}
                                        />
                                        {hasDuplicate && <p className="text-[9px] font-black text-red-500 mt-2 uppercase tracking-widest animate-pulse">Lỗi: Trùng mã!</p>}
                                    </div>

                                    {/* Name */}
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Tên địa điểm</label>
                                        <input
                                            value={loc.name}
                                            onChange={e => updateLocation(index, { name: e.target.value })}
                                            placeholder="AEON Mall..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Note */}
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Ghi chú</label>
                                        <input
                                            value={loc.note || ''}
                                            onChange={e => updateLocation(index, { note: e.target.value })}
                                            placeholder="..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60 focus:text-white outline-none transition-all placeholder:text-white/5"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="md:col-span-4 flex items-end justify-end gap-3 flex-wrap pt-6">
                                        <button
                                            onClick={() => copyLink(loc)}
                                            disabled={!loc.code}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                            title="Copy link tracking"
                                        >
                                            {copied === loc.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                            {copied === loc.id ? 'Copied' : 'Link'}
                                        </button>
                                        <button
                                            onClick={() => downloadQR(loc)}
                                            disabled={!loc.code}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                            title="Download QR"
                                        >
                                            <QrCode size={12} /> QR
                                        </button>
                                        <a
                                            href={link}
                                            target="_blank"
                                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 transition-all ${!loc.code ? 'opacity-20 pointer-events-none' : ''}`}
                                        >
                                            <ExternalLink size={12} /> Live
                                        </a>
                                        <button
                                            onClick={() => removeLocation(index)}
                                            className="flex items-center justify-center bg-red-500/5 border border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl w-11 h-11 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Generated Link Preview */}
                                {loc.code && (
                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1 h-1 bg-orange-500 rounded-full" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Generated tracking endpoint:</p>
                                        </div>
                                        <code className="text-[10px] font-mono bg-black/40 px-4 py-3 rounded-xl border border-white/5 block overflow-x-auto text-blue-400/80 whitespace-nowrap">
                                            {link}
                                        </code>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="bg-blue-500/5 border border-blue-500/10 text-blue-400 p-6 rounded-3xl flex gap-4">
                <div className="mt-1"><Link2 size={18} className="text-blue-500" /></div>
                <div>
                    <strong className="text-[10px] font-black uppercase tracking-widest block mb-1">Architecture Tip:</strong>
                    <p className="text-xs leading-relaxed opacity-60">Mỗi điểm bán sẽ có link tracking duy nhất với tham số <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300">pos_id</code>. Hệ thống sẽ tự động gán dữ liệu khách hàng vào điểm bán tương ứng khi họ tham gia tương tác.</p>
                </div>
            </div>
        </div>
    )
}
