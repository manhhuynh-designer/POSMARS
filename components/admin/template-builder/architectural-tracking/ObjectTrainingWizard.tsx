'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, Check, Loader2, Play, AlertCircle, RefreshCw } from 'lucide-react'
import { loadWebARRocksTraining } from '@/lib/ar-loaders/webAR-rocks-loader'

interface ObjectTrainingWizardProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (modelUrl: string) => void
}

export default function ObjectTrainingWizard({ isOpen, onClose, onComplete }: ObjectTrainingWizardProps) {
    const [step, setStep] = useState<'intro' | 'capture' | 'review' | 'training' | 'success'>('intro')
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
    const [progress, setProgress] = useState(0)
    const [trainingError, setTrainingError] = useState<string | null>(null)
    const [modelUrl, setModelUrl] = useState<string | null>(null)

    // Video Recording refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isOpen && step === 'capture') {
            startCamera()
        }
        return () => stopCamera()
    }, [isOpen, step])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err) {
            console.error('Camera Access Error:', err)
            alert('Cannot access camera. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            videoRef.current.srcObject = null
        }
    }

    const handleStartRecording = () => {
        if (!videoRef.current?.srcObject) return

        const stream = videoRef.current.srcObject as MediaStream
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' }) // Simple mimeText for browser support

        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        mediaRecorder.start()
        setIsRecording(true)
        setRecordingTime(0)

        timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1)
        }, 1000)
    }

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' })
                setVideoBlob(blob)
                setStep('review')
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setVideoBlob(file)
            setStep('review')
        }
    }

    const startTraining = async () => {
        if (!videoBlob) return

        setStep('training')
        setProgress(0)
        setTrainingError(null)

        try {
            await loadWebARRocksTraining()
            const trainingEngine = (window as any).WEBARROCKS?.TRAINING

            if (!trainingEngine) throw new Error('Training Engine not available')

            const url = await trainingEngine.uploadAndTrain(videoBlob, (p: number) => {
                setProgress(p)
            })

            setModelUrl(url)
            setStep('success')
        } catch (err: any) {
            console.error('Training Error:', err)
            setTrainingError(err.message || 'Training failed')
            setStep('review')
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
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Create WebAR.rocks Tracking Model</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-white/60" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 relative min-h-[400px]">

                    {step === 'intro' && (
                        <div className="space-y-6 text-center py-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-orange-900/40">
                                <Camera className="text-white w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold text-white">Capture Video of Object</h4>
                                <p className="text-white/40 text-sm max-w-md mx-auto">
                                    Record a 360° video of your object. Move slowly around the object ensuring good lighting and coverage of all angles.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
                                <button
                                    onClick={() => setStep('capture')}
                                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-orange-500/30 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                        <Camera className="text-orange-500 group-hover:text-white" size={24} />
                                    </div>
                                    <span className="font-bold text-white text-sm">Record Video</span>
                                </button>

                                <label className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all group cursor-pointer">
                                    <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                        <Upload className="text-blue-500 group-hover:text-white" size={24} />
                                    </div>
                                    <span className="font-bold text-white text-sm">Upload File</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'capture' && (
                        <div className="relative h-full flex flex-col items-center justify-center bg-black rounded-2xl overflow-hidden aspect-video">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                            <div className="absolute bottom-6 flex flex-col items-center gap-4 w-full">
                                {isRecording && (
                                    <div className="bg-red-500/80 px-3 py-1 rounded-full text-white text-xs font-mono animate-pulse">
                                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                    </div>
                                )}

                                <button
                                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                                    className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${isRecording
                                            ? 'border-white bg-red-500 scale-110'
                                            : 'border-white/80 hover:bg-white/20'
                                        }`}
                                >
                                    {isRecording ? (
                                        <div className="w-6 h-6 bg-white rounded-sm" />
                                    ) : (
                                        <div className="w-12 h-12 bg-red-500 rounded-full" />
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('intro')}
                                className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white/80 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    {step === 'review' && videoBlob && (
                        <div className="space-y-6">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
                                <video
                                    src={URL.createObjectURL(videoBlob)}
                                    controls
                                    className="w-full h-full object-contain"
                                />
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
                                    Discard & Retry
                                </button>
                                <button
                                    onClick={startTraining}
                                    className="flex-[2] bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <Loader2 className="animate-spin hidden" />
                                    Start Training Process
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
                                        className="text-orange-500 transition-all duration-500 ease-out"
                                        strokeDasharray={2 * Math.PI * 60}
                                        strokeDashoffset={((100 - progress) / 100) * 2 * Math.PI * 60}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black text-white">{progress}%</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xl font-bold text-white animate-pulse">Training Model...</h4>
                                <p className="text-white/40 text-sm">Uploading video and processing photogrammetry.</p>
                                <p className="text-white/30 text-xs">This may take a few minutes.</p>
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
