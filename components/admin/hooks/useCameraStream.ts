import { useState, useEffect, useRef, useCallback } from 'react'

interface UseCameraStreamConfig {
    facingMode?: 'user' | 'environment'
    width?: number
    height?: number
    autoPlay?: boolean
    muted?: boolean
}

interface UseCameraStreamResult {
    videoRef: React.RefObject<HTMLVideoElement>
    stream: MediaStream | null
    ready: boolean
    error: string | null
    stopCamera: () => void
    restartCamera: () => Promise<void>
}

export function useCameraStream({
    facingMode = 'user',
    width = 480,
    height = 640,
    autoPlay = true,
    muted = true
}: UseCameraStreamConfig = {}): UseCameraStreamResult {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop()
            })
            streamRef.current = null
            setStream(null)
            setReady(false)
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    const startCamera = useCallback(async () => {
        // Reset state
        stopCamera()
        setError(null)

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('Trình duyệt không hỗ trợ truy cập Camera')
            return
        }

        try {
            const constraints: MediaStreamConstraints = {
                audio: false,
                video: {
                    facingMode: facingMode,
                    width: { ideal: width },
                    height: { ideal: height }
                }
            }

            console.log('📷 Requesting camera stream...', constraints)
            const newStream = await navigator.mediaDevices.getUserMedia(constraints)

            streamRef.current = newStream
            setStream(newStream)

            if (videoRef.current) {
                videoRef.current.srcObject = newStream
                // Wait for video to be ready
                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current) {
                        videoRef.current.play().then(() => {
                            console.log('✅ Camera stream active and playing')
                            setReady(true)
                        }).catch(e => {
                            console.error('Failed to play video element:', e)
                            setError('Không thể phát video từ Camera')
                        })
                    }
                }
            }
        } catch (err: any) {
            console.error('Camera access error:', err)
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Vui lòng cấp quyền truy cập Camera để tiếp tục')
            } else if (err.name === 'NotFoundError') {
                setError('Không tìm thấy thiết bị Camera')
            } else {
                setError('Lỗi kết nối Camera: ' + (err.message || 'Unknown error'))
            }
        }
    }, [facingMode, width, height, stopCamera])

    useEffect(() => {
        if (videoRef.current) {
            // Apply static props to video element on mount
            videoRef.current.autoplay = autoPlay
            videoRef.current.muted = muted
            videoRef.current.playsInline = true
            // Mirror effect for user camera
            if (facingMode === 'user') {
                videoRef.current.style.transform = 'scaleX(-1)'
            } else {
                videoRef.current.style.transform = 'none'
            }
        }
    }, [autoPlay, muted, facingMode])

    useEffect(() => {
        startCamera()

        return () => {
            stopCamera()
        }
    }, [startCamera, stopCamera])

    return {
        videoRef,
        stream,
        ready,
        error,
        stopCamera,
        restartCamera: startCamera
    }
}
