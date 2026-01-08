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

    // Check if lead form is enabled (not null and has fields)
    const hasLeadForm = project.lead_form_config &&
        project.lead_form_config.fields &&
        project.lead_form_config.fields.length > 0

    // State to track if lead is submitted
    // Skip form if lead form is disabled
    const [submitted, setSubmitted] = useState(!hasLeadForm)

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
                projectId={project.id}
                config={project.lead_form_config || {}}
                onComplete={() => setSubmitted(true)}
            />
        </div>
    )
}

