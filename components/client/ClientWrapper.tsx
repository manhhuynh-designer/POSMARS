'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import LeadForm from './LeadForm'
import dynamic from 'next/dynamic'

// Dynamically import ARView so it doesn't break SSR
const ARView = dynamic(() => import('./ARView'), { ssr: false })

export default function ClientWrapper({ project }: { project: any }) {
    const searchParams = useSearchParams()
    const pos_id = searchParams.get('pos_id') || ''

    // State to track if lead is submitted
    // In real app, might check localStorage or session to skip form if already submitted
    const [submitted, setSubmitted] = useState(false)

    if (submitted) {
        return <ARView project={project} />
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Background KV - Placeholder */}
            <div className="absolute inset-0 z-0 opacity-30">
                {/* Could be project.config.bg_image */}
                <div className="w-full h-full bg-gradient-to-br from-orange-900 to-black"></div>
            </div>

            <LeadForm
                project={project}
                pos_id={pos_id}
                onComplete={() => setSubmitted(true)}
            />
        </div>
    )
}
