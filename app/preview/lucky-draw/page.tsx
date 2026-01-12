'use client'
import { useEffect, useState } from 'react'
import LuckyDraw from '@/components/client/LuckyDraw'
import { LuckyDrawConfig } from '@/components/admin/template-builder/types'

export default function LuckyDrawPreviewPage() {
    const [config, setConfig] = useState<LuckyDrawConfig | null>(null)

    useEffect(() => {
        // Handle incoming messages from Admin
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'UPDATE_CONFIG') {
                setConfig(event.data.payload)
            }
        }

        window.addEventListener('message', handleMessage)

        // Notify parent that we are ready
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*')

        return () => window.removeEventListener('message', handleMessage)
    }, [])

    if (!config) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1e293b] text-white/50 text-sm font-mono">
                Waiting for config...
            </div>
        )
    }

    return (
        <LuckyDraw
            config={config}
            onComplete={() => { }}
            isPreview={true}
        />
    )
}
