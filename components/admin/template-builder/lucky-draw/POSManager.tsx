'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { LocationStub, Prize, LuckyDrawConfig, POSConfig } from '../types'
import { Upload, Trash2, FileSpreadsheet, AlertCircle, CheckCircle, MapPin, Edit2, X, RefreshCw } from 'lucide-react'
import PrizeList from './PrizeList'

interface POSManagerProps {
    config: LuckyDrawConfig
    onUpdateConfig: (key: string, value: any) => void
    availableLocations?: LocationStub[]
    onUpload: (file: File, path: string) => Promise<string>
}

interface ImportedRow {
    pos_id: string
    pos_name: string
    [key: string]: any // For dynamic prize columns
}

function ManualEntry({ onAdd, availableLocations = [] }: { onAdd: (id: string, name: string) => void, availableLocations?: LocationStub[] }) {
    const [id, setId] = useState('')
    const [name, setName] = useState('')
    const [selectedLocationId, setSelectedLocationId] = useState('')

    // When selecting an existing location
    const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const locId = e.target.value
        setSelectedLocationId(locId)

        const loc = availableLocations.find(l => l.id === locId)
        if (loc) {
            setId(loc.code)
            setName(loc.name)
        } else {
            // Reset if "Other" is selected (empty string)
            setId('')
            setName('')
        }
    }

    const handleSubmit = () => {
        if (!id.trim()) return
        onAdd(id, name)
        setId('')
        setName('')
        setSelectedLocationId('')
    }

    return (
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Thêm thủ công / Từ hệ thống</h4>

            {/* Location Selector */}
            {availableLocations.length > 0 && (
                <div className="mb-3">
                    <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Chọn điểm bán có sẵn</label>
                    <div className="relative">
                        <select
                            value={selectedLocationId}
                            onChange={handleLocationSelect}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="">-- Nhập thủ công --</option>
                            {availableLocations.filter(l => l.code).map(loc => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} ({loc.code})
                                </option>
                            ))}
                        </select>
                        <MapPin size={14} className="absolute right-3 top-2.5 text-white/20 pointer-events-none" />
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Nhập POS ID (VD: STORE_1)"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-orange-500 focus:outline-none transition-colors"
                    readOnly={!!selectedLocationId} // Lock input if picking from list
                />
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tên điểm bán (Tùy chọn)"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-orange-500 focus:outline-none transition-colors"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!id.trim()}
                    className="px-4 py-2 bg-orange-500 text-white text-xs font-bold uppercase rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Thêm
                </button>
            </div>
        </div>
    )
}

export default function POSManager({ config, onUpdateConfig, availableLocations, onUpload }: POSManagerProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [editingPOS, setEditingPOS] = useState<string | null>(null)

    const handleUpdatePosPrizes = (posId: string, newPrizes: Prize[]) => {
        const newConfigs = { ...config.pos_configs }
        if (newConfigs[posId]) {
            newConfigs[posId] = { ...newConfigs[posId], prizes: newPrizes }
            onUpdateConfig('pos_configs', newConfigs)
        }
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsProcessing(true)
        setError(null)
        setSuccessMsg(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportedRow[]

                if (jsonData.length === 0) {
                    throw new Error('File excel rỗng')
                }

                // Process Data
                const newPosConfigs: Record<string, POSConfig> = { ...(config.pos_configs || {}) }
                let count = 0

                jsonData.forEach(row => {
                    const posId = row['pos_id'] || row['POS ID'] || row['Pos ID']
                    const posName = row['pos_name'] || row['POS Name'] || row['Pos Name']

                    if (!posId) return // Skip invalid rows

                    // Parse Prizes from columns like "prize_1_name", "prize_1_qty" or just map standard prizes?
                    // Simplified approach V1: Use standard prizes but allow probability override if column exists?
                    // OR: Use the default prize list structure but create a copy for this POS.

                    // For now, let's just clone the default prizes to this POS config unless columns specify otherwise.
                    // Ideally, we import: POS ID | Prize 1 Qty | Prize 2 Qty ... but that requires dynamic columns mapping.

                    // Let's assume the Excel just defines WHICH POS exists for now, and maybe we can edit prizes later?
                    // OR simple parsing: Look for columns matching current prize names?

                    // Fallback: Just init the POS with default prizes
                    newPosConfigs[String(posId)] = {
                        pos_id: String(posId),
                        pos_name: String(posName || posId),
                        prizes: config.prizes.map(p => ({ ...p })) // Clone default prizes
                    }
                    count++
                })

                onUpdateConfig('pos_configs', newPosConfigs)
                setSuccessMsg(`Đã import thành công ${count} điểm bán!`)
            } catch (err: any) {
                console.error(err)
                setError(err.message || 'Lỗi khi đọc file Excel')
            } finally {
                setIsProcessing(false)
            }
        }
        reader.readAsArrayBuffer(file)
    }, [config.prizes, config.pos_configs, onUpdateConfig])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    const handleRemovePOS = (posId: string) => {
        const newConfigs = { ...config.pos_configs }
        delete newConfigs[posId]
        onUpdateConfig('pos_configs', newConfigs)
    }

    const handleSyncPOS = (posId: string) => {
        if (!confirm('Bạn có chắc muốn đồng bộ lại giải thưởng theo cấu hình gốc? Các tùy chỉnh riêng cho POS này sẽ bị mất.')) return

        const newConfigs = { ...config.pos_configs }
        if (newConfigs[posId]) {
            newConfigs[posId] = {
                ...newConfigs[posId],
                prizes: config.prizes.map(p => ({ ...p })) // Re-clone from main prizes
            }
            onUpdateConfig('pos_configs', newConfigs)
            setSuccessMsg(`Đã đồng bộ giải thưởng cho POS "${newConfigs[posId].pos_name}"`)
        }
    }

    const handleToggle = (checked: boolean) => {
        onUpdateConfig('enable_pos_config', checked)
    }

    const posList = Object.values(config.pos_configs || {}) as POSConfig[]

    const handleAddManualPOS = (posId: string, posName: string) => {
        if (!posId.trim()) return

        const newConfigs = { ...config.pos_configs }
        if (newConfigs[posId]) {
            setError(`POS ID "${posId}" đã tồn tại!`)
            return
        }

        newConfigs[posId] = {
            pos_id: posId,
            pos_name: posName || posId,
            prizes: config.prizes.map(p => ({ ...p }))
        }

        onUpdateConfig('pos_configs', newConfigs)
        setSuccessMsg(`Đã thêm điểm bán "${posName || posId}" thành công!`)
        setError(null)
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between p-6 bg-[#1a1a1a] border border-white/5 rounded-2xl">
                <div>
                    <h3 className="text-white font-bold text-lg mb-1">Cấu hình theo Điểm Bán (POS)</h3>
                    <p className="text-white/40 text-xs">Cho phép mỗi điểm bán có danh sách giải thưởng riêng.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.enable_pos_config || false}
                        onChange={e => handleToggle(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
            </div>

            {config.enable_pos_config && (
                <>
                    {/* Manual Entry */}
                    <ManualEntry onAdd={handleAddManualPOS} availableLocations={availableLocations} />

                    {/* Excel Upload Area */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragActive
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                                <FileSpreadsheet size={24} />
                            </div>
                            {isProcessing ? (
                                <p className="text-white font-medium animate-pulse">Đang xử lý file...</p>
                            ) : (
                                <>
                                    <p className="text-white font-medium">Kéo thả file Excel/CSV vào đây</p>
                                    <p className="text-white/40 text-xs">hoặc click để chọn file từ máy tính</p>
                                    <p className="text-white/20 text-[10px] mt-2 font-mono bg-white/5 px-2 py-1 rounded">
                                        Columns: pos_id, pos_name
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 text-sm">
                            <CheckCircle size={16} /> {successMsg}
                        </div>
                    )}

                    {/* Data Table */}
                    {posList.length > 0 && (
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                    Đã import {posList.length} điểm bán
                                </span>
                                <button
                                    onClick={() => onUpdateConfig('pos_configs', {})}
                                    className="text-red-400 text-xs hover:underline"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-sm text-white/80">
                                    <thead className="bg-white/5 sticky top-0 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-3 font-medium">POS ID</th>
                                            <th className="p-3 font-medium">Tên điểm bán</th>
                                            <th className="p-3 font-medium text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {posList.map((pos) => (
                                            <tr key={pos.pos_id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-mono text-orange-400">{pos.pos_id}</td>
                                                <td className="p-3">
                                                    <div>{pos.pos_name}</div>
                                                    <div className="text-[10px] text-white/40 mt-0.5">{pos.prizes?.length || 0} giải thưởng</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingPOS(pos.pos_id)}
                                                            className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded transition-colors flex items-center gap-2 bg-white/5 border border-white/5"
                                                            title="Cấu hình giải thưởng riêng"
                                                        >
                                                            <Edit2 size={14} /> <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleSyncPOS(pos.pos_id)}
                                                            className="p-1.5 hover:bg-blue-500/20 text-white/40 hover:text-blue-500 rounded transition-colors"
                                                            title="Đồng bộ lại theo cấu hình gốc"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemovePOS(pos.pos_id)}
                                                            className="p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-500 rounded transition-colors"
                                                            title="Xóa điểm bán"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Prize Editor Modal */}
            {editingPOS && config.pos_configs?.[editingPOS] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121212] w-full max-w-4xl max-h-[90vh] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Cấu hình giải thưởng</h3>
                                <p className="text-white/40 text-xs mt-1">
                                    Đang chỉnh sửa cho POS: <span className="text-orange-500 font-mono font-bold">{config.pos_configs[editingPOS].pos_id}</span> - {config.pos_configs[editingPOS].pos_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingPOS(null)}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <PrizeList
                                prizes={config.pos_configs[editingPOS].prizes || []}
                                onUpdatePrize={(idx, updates) => {
                                    const currentPrizes = [...(config.pos_configs?.[editingPOS]?.prizes || [])]
                                    currentPrizes[idx] = { ...currentPrizes[idx], ...updates }
                                    handleUpdatePosPrizes(editingPOS, currentPrizes)
                                }}
                                onRemovePrize={(idx) => {
                                    const currentPrizes = [...(config.pos_configs?.[editingPOS]?.prizes || [])]
                                    currentPrizes.splice(idx, 1)
                                    handleUpdatePosPrizes(editingPOS, currentPrizes)
                                }}
                                onAddPrize={() => {
                                    const currentPrizes = [...(config.pos_configs?.[editingPOS]?.prizes || [])]
                                    const newPrize: Prize = {
                                        id: Date.now().toString(),
                                        name: 'Giải thưởng mới',
                                        probability: 10,
                                        color: '#FF6B00'
                                    }
                                    handleUpdatePosPrizes(editingPOS, [...currentPrizes, newPrize])
                                }}
                                onUpload={onUpload}
                            />
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] rounded-b-[2rem] flex justify-end">
                            <button
                                onClick={() => setEditingPOS(null)}
                                className="px-8 py-3 bg-white text-black font-bold uppercase rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Hoàn tất
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
