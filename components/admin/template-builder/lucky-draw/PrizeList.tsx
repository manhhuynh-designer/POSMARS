import { Plus } from 'lucide-react'
import PrizeItem from './PrizeItem'
import { Prize } from '../types'

interface PrizeListProps {
    prizes: Prize[]
    onUpdatePrize: (index: number, updates: Partial<Prize>) => void
    onRemovePrize: (index: number) => void
    onAddPrize: () => void
    onUpload: (file: File, path: string) => Promise<string>
}

export default function PrizeList({ prizes, onUpdatePrize, onRemovePrize, onAddPrize, onUpload }: PrizeListProps) {
    const totalProb = prizes.reduce((s: number, p: Prize) => s + (p.probability || 0), 0)

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Prize Management</h4>
                    <div className="flex items-center gap-3">
                        <div className={`text-[10px] font-black px-3 py-1 rounded-lg tracking-widest ${totalProb === 100 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            TOTAL POOL: {totalProb}%
                        </div>
                        {totalProb !== 100 && <span className="text-[9px] font-black text-red-400/60 uppercase tracking-widest italic animate-pulse">Pool must equal 100%</span>}
                    </div>
                </div>
                <button
                    onClick={onAddPrize}
                    className="px-8 py-4 bg-orange-500 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-orange-600 transition-all active:scale-95 shadow-[0_10px_30px_rgba(249,115,22,0.3)] flex items-center gap-3 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Add Prize Tier
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {prizes.length > 0 ? (
                    prizes.map((prize, idx) => (
                        <PrizeItem
                            key={prize.id || idx}
                            index={idx}
                            prize={prize}
                            onUpdate={onUpdatePrize}
                            onRemove={onRemovePrize}
                            onUpload={onUpload}
                        />
                    ))
                ) : (
                    <div className="bg-[#0c0c0c] border-[3px] border-dashed border-white/5 rounded-[3rem] p-20 text-center space-y-8">
                        <div className="w-24 h-24 bg-white/[0.02] rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto text-white/5 border border-white/5 animate-pulse">
                            <Plus size={48} />
                        </div>
                        <div className="max-w-xs mx-auto">
                            <p className="text-xl font-black text-white uppercase tracking-tighter">No prizes defined</p>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-4 leading-relaxed">Your campaign needs at least one prize tier to activate the wheel.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
