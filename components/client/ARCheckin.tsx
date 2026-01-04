'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Download, Share2, RotateCcw } from 'lucide-react'

interface ARCheckinConfig {
    frame_url: string
    watermark_text?: string
    share_hashtag?: string
}

interface ARCheckinProps {
    config: ARCheckinConfig
    onCapture: (imageUrl: string) => void
}

export default function ARCheckin({ config, onCapture }: ARCheckinProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
    const [loading, setLoading] = useState(true)

    const startCamera = useCallback(async () => {
        setLoading(true)
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
                audio: false
            })

            setStream(newStream)
            if (videoRef.current) {
                videoRef.current.srcObject = newStream
            }
        } catch (err) {
            console.error('Camera error:', err)
            alert('Không thể truy cập camera. Vui lòng cấp quyền.')
        }
        setLoading(false)
    }, [facingMode, stream])

    useEffect(() => {
        startCamera()
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [facingMode])

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    }

    const capturePhoto = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw video frame
        ctx.drawImage(video, 0, 0)

        // Draw frame overlay
        if (config.frame_url) {
            const frameImg = new Image()
            frameImg.crossOrigin = 'anonymous'
            frameImg.onload = () => {
                ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)

                // Add watermark
                if (config.watermark_text) {
                    ctx.font = '24px Arial'
                    ctx.fillStyle = 'rgba(255,255,255,0.7)'
                    ctx.textAlign = 'center'
                    ctx.fillText(config.watermark_text, canvas.width / 2, canvas.height - 30)
                }

                const dataUrl = canvas.toDataURL('image/png')
                setCapturedImage(dataUrl)
                onCapture(dataUrl)
            }
            frameImg.src = config.frame_url
        } else {
            const dataUrl = canvas.toDataURL('image/png')
            setCapturedImage(dataUrl)
            onCapture(dataUrl)
        }
    }

    const retake = () => {
        setCapturedImage(null)
    }

    const downloadImage = () => {
        if (!capturedImage) return
        const link = document.createElement('a')
        link.href = capturedImage
        link.download = `checkin-${Date.now()}.png`
        link.click()
    }

    const shareImage = async () => {
        if (!capturedImage) return
        try {
            const blob = await (await fetch(capturedImage)).blob()
            const file = new File([blob], 'checkin.png', { type: 'image/png' })

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'AR Check-in',
                    text: config.share_hashtag || '#POSMARS'
                })
            } else {
                downloadImage()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <canvas ref={canvasRef} className="hidden" />

            {!capturedImage ? (
                <>
                    {/* Camera View */}
                    <div className="flex-1 relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Frame Overlay */}
                        {config.frame_url && (
                            <img
                                src={config.frame_url}
                                alt="Frame"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            />
                        )}

                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="text-white">Đang khởi động camera...</div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-black py-6 px-4 flex items-center justify-center gap-8">
                        <button
                            onClick={toggleCamera}
                            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white"
                        >
                            <RotateCcw size={24} />
                        </button>

                        <button
                            onClick={capturePhoto}
                            className="w-20 h-20 rounded-full bg-white border-4 border-orange-500 flex items-center justify-center"
                        >
                            <Camera size={32} className="text-orange-500" />
                        </button>

                        <div className="w-12 h-12" /> {/* Spacer */}
                    </div>
                </>
            ) : (
                <>
                    {/* Captured Image */}
                    <div className="flex-1 flex items-center justify-center p-4">
                        <img src={capturedImage} alt="Captured" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    </div>

                    {/* Actions */}
                    <div className="bg-black py-6 px-4 flex items-center justify-center gap-4">
                        <button
                            onClick={retake}
                            className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-full"
                        >
                            <RotateCcw size={20} /> Chụp lại
                        </button>
                        <button
                            onClick={downloadImage}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full"
                        >
                            <Download size={20} /> Tải về
                        </button>
                        <button
                            onClick={shareImage}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full"
                        >
                            <Share2 size={20} /> Chia sẻ
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
