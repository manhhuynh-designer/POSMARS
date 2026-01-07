'use client'
import { useState, useRef, useCallback } from 'react'

interface VideoRecorderOptions {
    maxDuration?: number // in seconds, default 30
    fps?: number // frames per second, default 30
    videoBitsPerSecond?: number // default 5Mbps
}

interface VideoRecorderReturn {
    isRecording: boolean
    recordingTime: number
    recordedVideoUrl: string | null
    startRecording: (video: HTMLVideoElement, arCanvas: HTMLCanvasElement, mirror?: boolean) => void
    stopRecording: () => void
    clearRecording: () => void
    downloadRecording: (filename?: string) => void
}

/**
 * Hook for recording AR video (composite of camera + AR canvas)
 * Uses MediaRecorder API with canvas.captureStream()
 */
export function useVideoRecorder(options: VideoRecorderOptions = {}): VideoRecorderReturn {
    const {
        maxDuration = 30,
        fps = 30,
        videoBitsPerSecond = 5000000
    } = options

    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const animationFrameRef = useRef<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const isRecordingRef = useRef(false)

    // Get supported mimeType - prioritize MP4 for better compatibility
    const getSupportedMimeType = (): string => {
        const types = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 + AAC (best compatibility)
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
        ]
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('📹 Using codec:', type)
                return type
            }
        }
        return 'video/webm' // fallback
    }

    const startRecording = useCallback((video: HTMLVideoElement, arCanvas: HTMLCanvasElement, mirror: boolean = false) => {
        if (isRecording) return

        // Clear previous recording
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl)
            setRecordedVideoUrl(null)
        }
        chunksRef.current = []

        // CRITICAL: Use AR canvas resolution as base (this is what A-Frame renders at)
        // The AR canvas contains the correctly positioned AR elements
        const compositeCanvas = document.createElement('canvas')
        compositeCanvas.width = arCanvas.width || 1280
        compositeCanvas.height = arCanvas.height || 720
        const ctx = compositeCanvas.getContext('2d')!
        compositeCanvasRef.current = compositeCanvas

        console.log('📹 Recording: AR Canvas size:', arCanvas.width, 'x', arCanvas.height)
        console.log('📹 Recording: Video size:', video.videoWidth, 'x', video.videoHeight)
        console.log('📹 Recording: Composite size:', compositeCanvas.width, 'x', compositeCanvas.height)

        // Start compositing loop
        isRecordingRef.current = true
        const drawFrame = () => {
            if (!isRecordingRef.current) return

            // Clear canvas
            ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)

            // 1. Draw video background - scale to COVER the composite canvas
            // This ensures no black bars and video fills the frame
            const videoAspect = video.videoWidth / video.videoHeight
            const canvasAspect = compositeCanvas.width / compositeCanvas.height

            let drawWidth = compositeCanvas.width
            let drawHeight = compositeCanvas.height
            let drawX = 0
            let drawY = 0

            // Scale video to cover (crop if needed)
            if (videoAspect > canvasAspect) {
                // Video is wider - fit height, crop width
                drawHeight = compositeCanvas.height
                drawWidth = compositeCanvas.height * videoAspect
                drawX = (compositeCanvas.width - drawWidth) / 2
            } else {
                // Video is taller - fit width, crop height
                drawWidth = compositeCanvas.width
                drawHeight = compositeCanvas.width / videoAspect
                drawY = (compositeCanvas.height - drawHeight) / 2
            }

            ctx.save()
            if (mirror) {
                ctx.translate(compositeCanvas.width, 0)
                ctx.scale(-1, 1)
            }
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
            ctx.restore()

            // 2. Draw AR overlay at EXACTLY 1:1 - no scaling
            // This preserves the correct AR element positions
            ctx.drawImage(arCanvas, 0, 0)

            animationFrameRef.current = requestAnimationFrame(drawFrame)
        }
        drawFrame()

        // Get stream from composite canvas
        const stream = compositeCanvas.captureStream(fps)

        // Setup MediaRecorder
        const mimeType = getSupportedMimeType()
        console.log('Recording with mimeType:', mimeType)

        try {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond
            })

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType })
                const url = URL.createObjectURL(blob)
                setRecordedVideoUrl(url)
                console.log('Recording complete, size:', blob.size)
            }

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e)
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start(1000) // collect data every second

            setIsRecording(true)
            setRecordingTime(0)

            // Timer for recording duration
            let seconds = 0
            timerRef.current = setInterval(() => {
                seconds++
                setRecordingTime(seconds)

                // Auto-stop at max duration
                if (seconds >= maxDuration) {
                    stopRecording()
                }
            }, 1000)

        } catch (error) {
            console.error('Failed to start recording:', error)
            isRecordingRef.current = false
        }
    }, [isRecording, recordedVideoUrl, fps, videoBitsPerSecond, maxDuration])

    const stopRecording = useCallback(() => {
        isRecordingRef.current = false

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }

        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }

        setIsRecording(false)
    }, [])

    const clearRecording = useCallback(() => {
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl)
            setRecordedVideoUrl(null)
        }
        chunksRef.current = []
        setRecordingTime(0)
    }, [recordedVideoUrl])

    const downloadRecording = useCallback((filename?: string) => {
        if (!recordedVideoUrl) return

        const a = document.createElement('a')
        a.href = recordedVideoUrl
        a.download = filename || `ar-video-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }, [recordedVideoUrl])

    return {
        isRecording,
        recordingTime,
        recordedVideoUrl,
        startRecording,
        stopRecording,
        clearRecording,
        downloadRecording
    }
}
