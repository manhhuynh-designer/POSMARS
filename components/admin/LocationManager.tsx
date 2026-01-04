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
        // Use QR API
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-gray-700">Danh sách điểm bán ({locations.length})</h3>
                    <p className="text-xs text-gray-500">Quản lý các điểm bán và tạo link/QR code riêng cho từng điểm</p>
                </div>
                <div className="flex items-center gap-2">
                    {locations.filter(l => l.code).length > 1 && (
                        <button
                            onClick={downloadAllQR}
                            disabled={downloading}
                            className="flex items-center gap-1 text-sm bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
                        >
                            <Download size={16} /> {downloading ? 'Đang tải...' : 'Tải tất cả QR'}
                        </button>
                    )}
                    <button
                        onClick={addLocation}
                        className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                        <Plus size={16} /> Thêm điểm bán
                    </button>
                </div>
            </div>

            {locations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Link2 size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Chưa có điểm bán nào</p>
                    <button
                        onClick={addLocation}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                        + Thêm điểm bán đầu tiên
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {locations.map((loc, index) => {
                        const link = generateLink(loc)
                        const hasDuplicate = isDuplicateCode(loc.code, index)

                        return (
                            <div key={loc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                    {/* Code (POS ID) */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-gray-500 mb-1">Mã POS *</label>
                                        <input
                                            value={loc.code}
                                            onChange={e => updateLocation(index, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                                            placeholder="VD: HCM01"
                                            className={`w-full border rounded px-2 py-1.5 text-sm font-mono uppercase ${hasDuplicate ? 'border-red-400 bg-red-50' : ''}`}
                                        />
                                        {hasDuplicate && <p className="text-xs text-red-500 mt-1">Mã bị trùng!</p>}
                                    </div>

                                    {/* Name */}
                                    <div className="md:col-span-3">
                                        <label className="block text-xs text-gray-500 mb-1">Tên địa điểm</label>
                                        <input
                                            value={loc.name}
                                            onChange={e => updateLocation(index, { name: e.target.value })}
                                            placeholder="VD: AEON Mall Tân Phú"
                                            className="w-full border rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>

                                    {/* Note */}
                                    <div className="md:col-span-3">
                                        <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
                                        <input
                                            value={loc.note || ''}
                                            onChange={e => updateLocation(index, { note: e.target.value })}
                                            placeholder="Ghi chú nội bộ..."
                                            className="w-full border rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="md:col-span-4 flex items-end gap-2 flex-wrap">
                                        <button
                                            onClick={() => copyLink(loc)}
                                            disabled={!loc.code}
                                            className="flex items-center gap-1 text-xs bg-white border rounded px-2 py-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Copy link"
                                        >
                                            {copied === loc.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            {copied === loc.id ? 'Đã copy!' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={() => downloadQR(loc)}
                                            disabled={!loc.code}
                                            className="flex items-center gap-1 text-xs bg-white border rounded px-2 py-1.5 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Tải QR Code"
                                        >
                                            <QrCode size={14} /> QR
                                        </button>
                                        <a
                                            href={link}
                                            target="_blank"
                                            className={`flex items-center gap-1 text-xs bg-white border rounded px-2 py-1.5 hover:bg-gray-100 ${!loc.code ? 'opacity-50 pointer-events-none' : ''}`}
                                        >
                                            <ExternalLink size={14} /> Mở
                                        </a>
                                        <button
                                            onClick={() => removeLocation(index)}
                                            className="flex items-center gap-1 text-xs text-red-500 bg-white border border-red-200 rounded px-2 py-1.5 hover:bg-red-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Generated Link Preview */}
                                {loc.code && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs text-gray-400 mb-1">Link tracking:</p>
                                        <code className="text-xs bg-white px-2 py-1 rounded border block overflow-x-auto">
                                            {link}
                                        </code>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg">
                <strong>💡 Tip:</strong> Mỗi điểm bán sẽ có link riêng với tham số <code className="bg-blue-100 px-1 rounded">pos_id</code> và <code className="bg-blue-100 px-1 rounded">location</code>. Khi khách hàng truy cập từ link này, thông tin điểm bán sẽ tự động được ghi nhận vào lead.
            </div>
        </div>
    )
}
