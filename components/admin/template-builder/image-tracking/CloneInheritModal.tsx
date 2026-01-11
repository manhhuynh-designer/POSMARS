import { Copy, Link, ChevronRight } from 'lucide-react'
import { TargetConfig, ImageTrackingConfig } from '../types'

interface CloneInheritModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'clone' | 'inherit'
    currentTargetIndex: number
    config: ImageTrackingConfig
    onExecute: (sourceTargetIndex: number) => void
}

export default function CloneInheritModal({ isOpen, onClose, mode, currentTargetIndex, config, onExecute }: CloneInheritModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-10 max-w-lg w-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-[2rem] flex items-center justify-center ${mode === 'clone' ? 'bg-orange-500/20 border border-orange-500/20' : 'bg-purple-500/20 border border-purple-500/20'}`}>
                        {mode === 'clone' ? (
                            <Copy size={32} className="text-orange-500" />
                        ) : (
                            <Link size={32} className="text-purple-400" />
                        )}
                    </div>
                    <h3 className="text-white font-black text-2xl uppercase tracking-tighter">
                        {mode === 'clone' ? 'Clone Assets' : 'Inherit Reality'}
                    </h3>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">
                        {mode === 'clone'
                            ? 'Create independent duplicates from source'
                            : 'Link content to follow source updates'}
                    </p>
                </div>

                {/* Target Selection List */}
                <div className="mb-8 p-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Select Source Target</p>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 p-1 -mx-1">
                        {config.targets?.map((target: TargetConfig) => (
                            target.targetIndex !== currentTargetIndex && (
                                <button
                                    key={target.targetIndex}
                                    onClick={() => onExecute(target.targetIndex)}
                                    className={`w-full flex items-center gap-5 p-5 rounded-[1.5rem] text-left transition-all border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] group active:scale-95 ${mode === 'clone' ? 'hover:border-orange-500/30' : 'hover:border-purple-500/30'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs border border-white/10 bg-black text-white group-hover:bg-orange-500 group-hover:border-orange-500 transition-all`}>
                                        {target.targetIndex}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-white uppercase tracking-tighter truncate">{target.name}</p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{target.assets?.length || 0} Assets Dynamic</p>
                                    </div>
                                    <ChevronRight size={18} className="text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                </button>
                            )
                        ))}
                    </div>
                </div>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    className="w-full py-4 text-white/20 hover:text-white/60 text-[11px] font-black uppercase tracking-[0.4em] transition-all"
                >
                    Discard Action
                </button>
            </div>
        </div>
    )
}
