'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Check, Loader2, AlertCircle, Box, FileBox, Images, Camera } from 'lucide-react'
import { loadWebARRocksTraining } from '@/lib/ar-loaders/webAR-rocks-loader'

interface ObjectTrainingWizardProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (modelUrl: string) => void
}

export default function ObjectTrainingWizard({ isOpen, onClose, onComplete }: ObjectTrainingWizardProps) {
    const [trainingMode, setTrainingMode] = useState<'model' | 'dataset'>('model')
    const [step, setStep] = useState<'intro' | 'upload' | 'training' | 'success'>('intro')
    const [modelFile, setModelFile] = useState<File | null>(null)
    const [progress, setProgress] = useState(0)
    const [trainingError, setTrainingError] = useState<string | null>(null)
    const [modelUrl, setModelUrl] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)

    // Cleanup ephemeral dataset on unmount
    useEffect(() => {
        return () => {
            if (jobId) {
                navigator.sendBeacon(`/api/admin/training/dataset?jobId=${jobId}`, '') // Beacon is better for cleanup
            }
        }
    }, [jobId])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setModelFile(file)
            setStep('upload')
        }
    }

    const startTraining = async () => {
        if (!modelFile) return

        setStep('training')
        setProgress(0)
        setTrainingError(null)

        try {
            await loadWebARRocksTraining()
            const trainingEngine = (window as any).WEBARROCKS?.TRAINING

            if (!trainingEngine) throw new Error('Training Engine not available')

            // Use the file to start training
            // Note: The real API might need different args, this handles the Mock and future adaptation
            let url = ''

            if (trainingMode === 'dataset') {
                // 1. Upload Dataset
                const formData = new FormData()
                formData.append('file', modelFile)
                const res = await fetch('/api/admin/training/dataset', { method: 'POST', body: formData })
                if (!res.ok) throw new Error('Dataset upload failed')

                const data = await res.json()
                setJobId(data.jobId) // Track for cleanup

                // 2. Train from Dataset URL
                url = await trainingEngine.trainFromDataset(data.baseUrl, (p: number) => setProgress(p))
            } else {
                // Default: Synthetic 3D Model
                url = await trainingEngine.uploadAndTrain(modelFile, (p: number) => setProgress(p))
            }

            setModelUrl(url)
            setStep('success')

            // Cleanup dataset immediately if successful (optional, or wait for close)
            if (trainingMode === 'dataset' && jobId) {
                fetch(`/api/admin/training/dataset?jobId=${jobId}`, { method: 'DELETE' })
                setJobId(null)
            }

        } catch (err: any) {
            console.error('Training Error:', err)
            setTrainingError(err.message || 'Training failed')
            setStep('upload')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1a1a1b] w-full max-w-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Train Object Model</h3>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Synthetic Data Generation</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-white/60" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 relative min-h-[400px]">

                    {step === 'intro' && (
                        <div className="space-y-6 text-center py-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-900/40">
                                <Box className="text-white w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold text-white">Choose Training Source</h4>
                                <p className="text-white/40 text-sm max-w-md mx-auto">
                                    Select how you want to train your object tracker.
                                </p>
                            </div>

                            {/* Mode Selection */}
                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                                <button
                                    onClick={() => setTrainingMode('model')}
                                    className={`p-4 rounded-2xl border transition-all text-left space-y-3 ${trainingMode === 'model' ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trainingMode === 'model' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        <Box size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-white text-sm">3D Model</h5>
                                        <p className="text-xs text-white/40 mt-1">Upload GLB/OBJ. Engine generates synthetic views.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTrainingMode('dataset')}
                                    className={`p-4 rounded-2xl border transition-all text-left space-y-3 ${trainingMode === 'dataset' ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trainingMode === 'dataset' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        <Images size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-white text-sm">Image Dataset</h5>
                                        <p className="text-xs text-white/40 mt-1">Upload ZIP of 50+ photos. Higher accuracy.</p>
                                    </div>
                                </button>
                            </div>

                            <div className="max-w-md mx-auto mt-4">
                                <label className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 hover:border-blue-500/50 transition-all group cursor-pointer">
                                    <input
                                        type="file"
                                        accept={trainingMode === 'model' ? ".glb,.gltf,.obj" : ".zip"}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-lg ${trainingMode === 'model' ? 'bg-blue-500/20 group-hover:bg-blue-500 text-blue-500' : 'bg-purple-500/20 group-hover:bg-purple-500 text-purple-500'} group-hover:text-white`}>
                                        <Upload size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="font-bold text-white block">
                                            {trainingMode === 'model' ? 'Upload 3D File' : 'Upload Images ZIP'}
                                        </span>
                                        <span className="text-xs text-white/40 block">
                                            {trainingMode === 'model' ? 'Supports GLB, OBJ (max 20MB)' : 'Contains sequence: img_0.png, img_1.png...'}
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'upload' && modelFile && (
                        <div className="space-y-6 py-8">
                            <div className="w-full h-48 bg-black/40 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4">
                                <FileBox size={48} className="text-blue-500" />
                                <div className="text-center">
                                    <p className="text-white font-bold">{modelFile.name}</p>
                                    <p className="text-white/40 text-xs">{(modelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>

                            {trainingError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                                    <AlertCircle size={16} />
                                    {trainingError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('intro')}
                                    className="flex-1 py-4 rounded-xl font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                                >
                                    Change File
                                </button>
                                <button
                                    onClick={startTraining}
                                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <Loader2 className="animate-spin hidden" />
                                    Start Synthetic Training
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'training' && (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-8">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        className="text-blue-500 transition-all duration-500 ease-out"
                                        strokeDasharray={2 * Math.PI * 60}
                                        strokeDashoffset={((100 - progress) / 100) * 2 * Math.PI * 60}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black text-white">{progress}%</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xl font-bold text-white animate-pulse">Training Function...</h4>
                                <div className="space-y-1">
                                    <p className="text-white/40 text-sm">Generating synthetic views...</p>
                                    <div className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
                                        <div className="h-full bg-blue-500/50 w-full animate-progress-indeterminate"></div>
                                    </div>
                                    <p className="text-white/30 text-xs mt-2">GPU Intensive Task</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8 space-y-6 animate-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-green-900/40">
                                <Check className="text-white w-10 h-10" />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-2xl font-black text-white">Training Complete!</h4>
                                <p className="text-white/60 text-sm">Your Object Tracking model is ready.</p>
                            </div>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-2">Model URL</p>
                                <code className="block bg-black/40 p-3 rounded-lg text-green-400 text-xs break-all font-mono">
                                    {modelUrl}
                                </code>
                            </div>

                            <button
                                onClick={() => {
                                    if (modelUrl) onComplete(modelUrl)
                                    onClose()
                                }}
                                className="w-full bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 hover:bg-green-600 transition-all"
                            >
                                Use This Model
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
