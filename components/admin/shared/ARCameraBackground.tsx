'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOff } from 'lucide-react'

interface ARCameraBackgroundProps {
    facingMode?: 'user' | 'environment'
    className?: string
}

/**
 * A reusable component that provides a real camera feed as a background.
 * Primary used for AR simulations in the admin builder.
 */
export default function ARCameraBackground({
    facingMode = 'environment',
    className = ""
}: ARCameraBackgroundProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    useEffect(() => {
        let isMounted = true

        const startCamera = async () => {
            try {
                const constraints = {
                    video: {
                        facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                }

                const newStream = await navigator.mediaDevices.getUserMedia(constraints)

                if (isMounted) {
                    setStream(newStream)
                    if (videoRef.current) {
                        videoRef.current.srcObject = newStream
                    }
                } else {
                    // Stop stream if component unmounted while requesting
                    newStream.getTracks().forEach(track => track.stop())
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('ARCameraBackground: Failed to access camera', err)
                    setError(err.message || 'Camera access denied')
                }
            }
        }

        startCamera()

        return () => {
            isMounted = false
            if (stream) {
                stream.getTracks().forEach(track => {
                    track.stop()
                    track.enabled = false
                })
            }
        }
    }, [facingMode])

    if (error) {
        return (
            <div className={`absolute inset-0 bg-black flex flex-col items-center justify-center text-white/40 p-12 text-center gap-4 ${className}`}>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <CameraOff size={24} />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400/60">Camera Error</p>
                    <p className="text-[9px] font-medium leading-relaxed max-w-[180px]">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] ${className}`}
            style={{ filter: 'brightness(0.8) contrast(1.1)' }}
        />
    )
}
