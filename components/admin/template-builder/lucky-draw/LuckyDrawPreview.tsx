'use client'
import { useEffect, useRef, useState } from 'react'
import { LuckyDrawConfig } from '../types'
import PreviewPhone from '../shared/PreviewPhone'

interface LuckyDrawPreviewProps {
    config: LuckyDrawConfig
}

export default function LuckyDrawPreview({ config }: LuckyDrawPreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [isReady, setIsReady] = useState(false)

    // Handle handshake with iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PREVIEW_READY') {
                setIsReady(true)
                // Send initial config immediately upon ready
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'UPDATE_CONFIG',
                        payload: config
                    }, '*')
                }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [config]) // Re-bind if config object ref changes, though mainly handled below

    // Sync config changes to iframe
    useEffect(() => {
        if (isReady && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_CONFIG',
                payload: config
            }, '*')
        }
    }, [config, isReady])

    return (
        <PreviewPhone className="p-0 bg-transparent shadow-none border-none ring-0">
            <div className="absolute inset-0 overflow-hidden rounded-[2.2rem] bg-black">
                <iframe
                    ref={iframeRef}
                    src="/preview/lucky-draw"
                    className="w-full h-full border-0"
                    title="Lucky Draw Preview"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </PreviewPhone>
    )
}
