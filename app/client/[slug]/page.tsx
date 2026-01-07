'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import LeadForm from '@/components/client/LeadForm'
import ResultScreen from '@/components/client/ResultScreen'
import LuckyDraw from '@/components/client/LuckyDraw'
import ARCheckin from '@/components/client/ARCheckin'
import ImageTracking from '@/components/client/ImageTracking'
import FaceFilter from '@/components/client/FaceFilter'
import Placeholder from '@/components/client/Placeholder'
import CustomARRenderer from '@/components/client/CustomARRenderer'

type Step = 'lead_form' | 'interaction' | 'result'

export default function ClientPage() {
    const params = useParams()
    const slug = params.slug as string

    const [loading, setLoading] = useState(true)
    const [project, setProject] = useState<any>(null)
    const [step, setStep] = useState<Step>('lead_form')
    const [leadId, setLeadId] = useState<number | null>(null)
    const [result, setResult] = useState<any>(null)

    useEffect(() => {
        loadProject()
    }, [slug])

    const loadProject = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_slug', slug)
            .eq('is_active', true)
            .single()

        if (error || !data) {
            setProject(null)
        } else {
            setProject(data)
        }
        setLoading(false)
    }

    const handleLeadComplete = (id: number) => {
        setLeadId(id)
        setStep('interaction')
    }

    const handleInteractionComplete = async (resultData?: any) => {
        // Save result securely via RPC
        if (leadId && resultData) {
            await supabase.rpc('update_lead_result', {
                p_lead_id: leadId,
                p_result: resultData
            })
        }
        setResult(resultData)
        setStep('result')
    }

    const handleRestart = () => {
        setStep('lead_form')
        setResult(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Đang tải...</p>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
                    <p className="text-gray-600">Campaign không tồn tại hoặc đã kết thúc</p>
                </div>
            </div>
        )
    }

    const { interaction_type, template, lead_form_config, template_config, asset_url, marker_url, use_custom_code, custom_html, custom_script } = project

    // P2/P3 templates show placeholder
    const placeholderTemplates = ['world_tracking', 'scratch_card', 'quiz', 'catcher']

    return (
        <Suspense fallback={<div>Loading...</div>}>
            {/* Step 1: Lead Form */}
            {step === 'lead_form' && (
                <LeadForm
                    projectId={project.id}
                    config={lead_form_config || { fields: [], submit_text: 'Tiếp tục', consent_text: 'Tôi đồng ý' }}
                    onComplete={handleLeadComplete}
                />
            )}

            {/* Step 2: Interaction */}
            {step === 'interaction' && (
                <>
                    {/* Code Mode: Render Custom HTML/Script */}
                    {use_custom_code && custom_html && (
                        <CustomARRenderer
                            html={custom_html}
                            script={custom_script}
                            variables={{
                                marker_url,
                                asset_url,
                                ...template_config
                            }}
                        />
                    )}

                    {/* Template Mode: Standard Templates (only if not using custom code) */}
                    {!use_custom_code && (
                        <>
                            {/* Placeholder for P2/P3 templates */}
                            {placeholderTemplates.includes(template) && (
                                <Placeholder template={template} expectedDate="Q2 2024" />
                            )}

                            {/* AR: Image Tracking */}
                            {template === 'image_tracking' && (
                                <>
                                    {console.log('🔍 ClientPage: Passing template_config to ImageTracking:', template_config)}
                                    <ImageTracking
                                        markerUrl={marker_url || template_config?.marker_url || ''}
                                        modelUrl={asset_url || ''}
                                        config={template_config || {}}
                                        onComplete={() => handleInteractionComplete()}
                                        onCapture={(imageUrl) => handleInteractionComplete({ imageUrl })}
                                    />
                                </>
                            )}

                            {/* AR: Check-in */}
                            {template === 'ar_checkin' && (
                                <ARCheckin
                                    config={template_config || { frame_url: marker_url || '' }}
                                    onCapture={(imageUrl) => handleInteractionComplete({ imageUrl })}
                                />
                            )}

                            {/* Game: Lucky Draw */}
                            {template === 'lucky_draw' && (
                                <LuckyDraw
                                    config={template_config || { prizes: [] }}
                                    onComplete={(prize) => handleInteractionComplete({ prize })}
                                />
                            )}

                            {template === 'face_filter' && (
                                <FaceFilter
                                    config={template_config || {}}
                                    onCapture={(imageData) => handleInteractionComplete({ imageUrl: imageData })}
                                    onComplete={() => handleInteractionComplete()}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            {/* Step 3: Result */}
            {step === 'result' && (
                <ResultScreen
                    type={interaction_type}
                    template={template}
                    result={result}
                    config={template_config?.result_config}
                    onRestart={handleRestart}
                />
            )}
        </Suspense>
    )
}
