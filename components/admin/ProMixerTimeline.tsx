'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'

export interface VideoKeyframe {
    id: string
    time: number
    property: 'position' | 'rotation' | 'scale' | 'opacity'
    value: string
    easing: string
}

interface ProMixerTimelineProps {
    keyframes: VideoKeyframe[]
    duration: number
    onKeyframeUpdate: (id: string, updates: Partial<VideoKeyframe>) => void
    onKeyframeSelect: (ids: string[]) => void
    onAddKeyframe: (property: string, time: number) => void
    selectedIds: string[]
    zoom?: number
}

const TRACK_HEIGHT = 50
const HEADER_WIDTH = 140  // Increased to fit label + button
const RULER_HEIGHT = 30
const KEYFRAME_SIZE = 12

const TRACK_COLORS = {
    position: '#3b82f6',
    rotation: '#a855f7',
    scale: '#10b981',
    opacity: '#f59e0b'
}

export default function ProMixerTimeline({
    keyframes,
    duration,
    onKeyframeUpdate,
    onKeyframeSelect,
    onAddKeyframe,
    selectedIds,
    zoom = 100
}: ProMixerTimelineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    // Removed local zoom state, using prop
    const [draggingKf, setDraggingKf] = useState<string | null>(null)
    const [hoverTime, setHoverTime] = useState<number | null>(null)
    const [currentTime, setCurrentTime] = useState(0) // Playhead position

    const tracks = ['position', 'rotation', 'scale', 'opacity'] as const

    const handleAddKeyframe = (property: string) => {
        // Add keyframe at playhead position
        onAddKeyframe(property, currentTime)
    }

    const timeToX = useCallback((time: number) => {
        return HEADER_WIDTH + time * zoom
    }, [zoom])

    const xToTime = useCallback((x: number) => {
        return Math.max(0, Math.min(duration, (x - HEADER_WIDTH) / zoom))
    }, [zoom, duration])

    const drawTimeline = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height

        // Clear canvas
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, 0, width, height)

        // Draw time ruler
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, width, RULER_HEIGHT)

        ctx.strokeStyle = '#ffffff10'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, RULER_HEIGHT)
        ctx.lineTo(width, RULER_HEIGHT)
        ctx.stroke()

        // Draw time markers
        ctx.fillStyle = '#ffffff40'
        ctx.font = '10px Inter, sans-serif'
        ctx.textAlign = 'center'

        const step = zoom < 50 ? 1 : 0.5
        for (let t = 0; t <= duration; t += step) {
            const x = timeToX(t)
            if (x > width) break

            ctx.beginPath()
            ctx.moveTo(x, RULER_HEIGHT - 8)
            ctx.lineTo(x, RULER_HEIGHT)
            ctx.stroke()

            ctx.fillText(`${t.toFixed(1)}s`, x, RULER_HEIGHT - 12)
        }

        // Draw tracks
        tracks.forEach((track, trackIdx) => {
            const y = RULER_HEIGHT + trackIdx * TRACK_HEIGHT

            // Track background
            ctx.fillStyle = trackIdx % 2 === 0 ? '#0c0c0c' : '#0a0a0a'
            ctx.fillRect(0, y, width, TRACK_HEIGHT)

            // Track header
            ctx.fillStyle = '#121212'
            ctx.fillRect(0, y, HEADER_WIDTH, TRACK_HEIGHT)

            ctx.strokeStyle = '#ffffff10'
            ctx.beginPath()
            ctx.moveTo(0, y + TRACK_HEIGHT)
            ctx.lineTo(width, y + TRACK_HEIGHT)
            ctx.stroke()

            // Track label
            ctx.fillStyle = TRACK_COLORS[track]
            ctx.font = 'bold 11px Inter, sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText(track.toUpperCase(), 10, y + TRACK_HEIGHT / 2 + 4)

            // Draw keyframes for this track
            const trackKeyframes = keyframes.filter(kf => kf.property === track)

            trackKeyframes.forEach(kf => {
                const x = timeToX(kf.time)
                const ky = y + TRACK_HEIGHT / 2

                const isSelected = selectedIds.includes(kf.id)
                const isDragging = draggingKf === kf.id

                // Keyframe diamond
                ctx.save()
                ctx.translate(x, ky)
                ctx.rotate(Math.PI / 4)

                ctx.fillStyle = isSelected ? '#ffffff' : TRACK_COLORS[track]
                ctx.strokeStyle = isDragging ? '#f97316' : (isSelected ? '#f97316' : '#000000')
                ctx.lineWidth = 2

                const size = isDragging ? KEYFRAME_SIZE + 2 : KEYFRAME_SIZE
                ctx.fillRect(-size / 2, -size / 2, size, size)
                ctx.strokeRect(-size / 2, -size / 2, size, size)

                ctx.restore()
            })
        })

        // Draw playhead (current time indicator)
        const playheadX = timeToX(currentTime)
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 3
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(playheadX, 0)
        ctx.lineTo(playheadX, height)
        ctx.stroke()

        // Draw playhead handle at top
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.arc(playheadX, RULER_HEIGHT / 2, 6, 0, Math.PI * 2)
        ctx.fill()

        // Draw hover indicator (different from playhead)
        if (hoverTime !== null && Math.abs(hoverTime - currentTime) > 0.1) {
            const x = timeToX(hoverTime)
            ctx.strokeStyle = '#ffffff40'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(x, RULER_HEIGHT)
            ctx.lineTo(x, height)
            ctx.stroke()
            ctx.setLineDash([])
        }
    }, [keyframes, selectedIds, zoom, duration, tracks, timeToX, draggingKf, hoverTime, currentTime])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Set canvas size
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        }

        drawTimeline()
    }, [drawTimeline])

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Click on ruler sets playhead position
        if (y < RULER_HEIGHT) {
            const time = xToTime(x)
            setCurrentTime(Math.max(0, Math.min(duration, Math.round(time * 10) / 10)))
            return
        }

        // Find clicked keyframe
        let clickedKf: VideoKeyframe | null = null
        const trackIdx = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
        const track = tracks[trackIdx]

        if (track) {
            const trackKeyframes = keyframes.filter(kf => kf.property === track)
            for (const kf of trackKeyframes) {
                const kfX = timeToX(kf.time)
                const kfY = RULER_HEIGHT + trackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2

                if (Math.abs(x - kfX) < 15 && Math.abs(y - kfY) < 15) {
                    clickedKf = kf
                    break
                }
            }
        }

        if (clickedKf) {
            // Toggle selection
            if (e.shiftKey || e.metaKey) {
                const newSelection = selectedIds.includes(clickedKf.id)
                    ? selectedIds.filter(id => id !== clickedKf.id)
                    : [...selectedIds, clickedKf.id]
                onKeyframeSelect(newSelection)
            } else {
                onKeyframeSelect([clickedKf.id])
            }
        } else {
            // Deselect all
            onKeyframeSelect([])
        }
    }

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Find keyframe under cursor
        const trackIdx = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
        const track = tracks[trackIdx]

        if (track) {
            const trackKeyframes = keyframes.filter(kf => kf.property === track)
            for (const kf of trackKeyframes) {
                const kfX = timeToX(kf.time)
                const kfY = RULER_HEIGHT + trackIdx * TRACK_HEIGHT + TRACK_HEIGHT / 2

                if (Math.abs(x - kfX) < 15 && Math.abs(y - kfY) < 15) {
                    setDraggingKf(kf.id)
                    return
                }
            }
        }
    }

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left

        const time = xToTime(x)
        setHoverTime(time)

        if (draggingKf) {
            const snappedTime = Math.round(time * 10) / 10
            onKeyframeUpdate(draggingKf, { time: snappedTime })
        }
    }

    const handleCanvasMouseUp = () => {
        setDraggingKf(null)
    }

    const handleCanvasMouseLeave = () => {
        setHoverTime(null)
        setDraggingKf(null)
    }

    return (
        <div ref={containerRef} className="relative rounded-xl overflow-hidden bg-[#0c0c0c] h-[280px]">
            {/* Diamond Add Buttons - Positioned after track labels */}
            <div className="absolute z-20 flex flex-col" style={{ left: '105px', top: RULER_HEIGHT + 'px' }}>
                {tracks.map((track, idx) => (
                    <button
                        key={track}
                        onClick={() => handleAddKeyframe(track)}
                        className="group relative w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform"
                        style={{
                            height: TRACK_HEIGHT + 'px',
                            marginTop: idx === 0 ? '0' : '0'
                        }}
                        title={`Add ${track} keyframe at ${currentTime.toFixed(1)}s`}
                    >
                        <div
                            className="w-4 h-4 rotate-45 transition-all group-hover:shadow-lg"
                            style={{
                                backgroundColor: TRACK_COLORS[track],
                                boxShadow: `0 0 8px ${TRACK_COLORS[track]}40`
                            }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                            +
                        </span>
                    </button>
                ))}
            </div>



            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
            />
        </div>
    )
}
