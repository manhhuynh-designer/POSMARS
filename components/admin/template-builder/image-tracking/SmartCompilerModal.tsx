import { useRef, useState } from 'react'
import { Sparkles, Check, Plus, RefreshCcw } from 'lucide-react'

interface SmartCompilerModalProps {
    isOpen: boolean
    onClose: () => void
    files: File[]
    onCompile: (useSmartMode: boolean, isAppend: boolean) => void
}

export default function SmartCompilerModal({ isOpen, onClose, files, onCompile }: SmartCompilerModalProps) {
    const [isAppend, setIsAppend] = useState(false)
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] p-10 max-w-xl w-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-[2rem] bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center">
                        <Sparkles size={40} className="text-orange-500" />
                    </div>
                    <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Cấu hình Compile AR</h3>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">{files.length} Assets Source Detected</p>
                </div>

                {/* Compilation Mode Selection */}
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-8">
                    <button
                        onClick={() => setIsAppend(false)}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAppend ? 'bg-white/10 text-white shadow-xl' : 'text-white/20 hover:text-white/40'}`}
                    >
                        <RefreshCcw size={14} /> Ghi đè (Replace)
                    </button>
                    <button
                        onClick={() => setIsAppend(true)}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAppend ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/20 hover:text-white/40'}`}
                    >
                        <Plus size={14} /> Thêm tiếp (Append)
                    </button>
                </div>

                {/* Mode Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Quick Mode */}
                    <button
                        onClick={() => onCompile(false, isAppend)}
                        className="group relative p-6 bg-white/[0.02] hover:bg-orange-500/5 border border-white/5 hover:border-orange-500/30 rounded-[2rem] text-left transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <Sparkles size={20} className="" />
                            </div>
                            <span className="font-black text-white uppercase tracking-tighter text-sm">Quick Mode</span>
                        </div>
                        <ul className="space-y-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            <li className="flex items-center gap-2">
                                <Check size={12} className="text-orange-500" /> 1 target / file
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={12} className="text-orange-500" /> ~30s processing
                            </li>
                        </ul>
                        <div className="absolute top-4 right-4 px-2 py-0.5 bg-white/5 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-widest">
                            Basic
                        </div>
                    </button>

                    {/* Smart Mode */}
                    <button
                        onClick={() => onCompile(true, isAppend)}
                        className="group relative p-6 bg-gradient-to-br from-orange-500/10 to-[#e7313d1a] hover:from-orange-500/20 hover:to-[#e7313d33] border border-orange-500/20 hover:border-orange-500/50 rounded-[2rem] text-left transition-all active:scale-95"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-900/40">
                                <Sparkles size={20} className="animate-spin-slow" />
                            </div>
                            <span className="font-black text-white uppercase tracking-tighter text-sm">Smart AI</span>
                        </div>
                        <ul className="space-y-3 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                            <li className="flex items-center gap-2">
                                <Check size={12} className="text-orange-500" /> 5 targets / file
                            </li>
                            <li className="flex items-center gap-2">
                                <Check size={12} className="text-orange-500" /> 3D Orientation
                            </li>
                        </ul>
                        <div className="absolute top-4 right-4 px-2 py-0.5 bg-orange-500 text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1 shadow-lg">
                            <Sparkles size={8} className="fill-current" /> Recommended
                        </div>
                    </button>
                </div>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    className="w-full py-4 text-white/20 hover:text-orange-500 text-[11px] font-black uppercase tracking-[0.4em] transition-all"
                >
                    Dismiss & Close
                </button>
            </div>
        </div>
    )
}
