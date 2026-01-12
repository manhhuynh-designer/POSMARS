'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useParams, useSearchParams } from 'next/navigation'
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
    const searchParams = useSearchParams()
    const slug = params.slug as string

    // POS tracking from URL params
    const posId = searchParams.get('pos') || searchParams.get('pos_id') || ''
    const locationName = searchParams.get('loc') || ''

    const [loading, setLoading] = useState(true)
    const [project, setProject] = useState<any>(null)
    const [step, setStep] = useState<Step>('lead_form')
    const [leadId, setLeadId] = useState<number | null>(null)
    const [result, setResult] = useState<any>(null)
    const [userData, setUserData] = useState<Record<string, any>>({})
    const [currentPlays, setCurrentPlays] = useState(0)

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

            // Inject Google Analytics if ga_id is configured
            if (data.ga_id) {
                injectGoogleAnalytics(data.ga_id)
            }

            // Check if lead form is disabled - skip directly to interaction
            const hasLeadForm = data.lead_form_config &&
                data.lead_form_config.fields &&
                data.lead_form_config.fields.length > 0

            if (!hasLeadForm) {
                setStep('interaction')
            }
        }
        setLoading(false)
    }

    // Google Analytics injection with POS tracking
    const injectGoogleAnalytics = (gaId: string) => {
        // Check if already injected
        if (document.getElementById('ga-script')) return

        // Create gtag script
        const gtagScript = document.createElement('script')
        gtagScript.id = 'ga-script'
        gtagScript.async = true
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(gtagScript)

        // Initialize gtag with POS custom dimensions
        const initScript = document.createElement('script')
        initScript.id = 'ga-init'
        initScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
                page_path: window.location.pathname,
                send_page_view: true,
                custom_map: {
                    'dimension1': 'pos_id',
                    'dimension2': 'location_name'
                },
                pos_id: '${posId}',
                location_name: '${locationName}'
            });
        `
        document.head.appendChild(initScript)

            // Expose POS info for child components
            ; (window as any).getPOSInfo = () => ({ posId, locationName })

        console.log('📊 Google Analytics initialized:', gaId, 'POS:', posId, locationName)
    }

    // GA Event Tracking Helper - exposed globally for child components
    const trackEvent = (eventName: string, params?: Record<string, any>) => {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', eventName, {
                event_category: 'engagement',
                ...params
            })
            console.log('📊 GA Event:', eventName, params)
        }
    }

    // Expose to window for child components (share tracking, etc.)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).trackGAEvent = trackEvent
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).trackGAEvent
            }
        }
    }, [])

    // Track experience start time
    const [experienceStartTime, setExperienceStartTime] = useState<number | null>(null)

    const handleLeadComplete = (id: number, data: Record<string, any>) => {
        setLeadId(id)
        setUserData(data)
        setStep('interaction')
        setExperienceStartTime(Date.now()) // Start timing

        // Track lead form submission with POS info
        trackEvent('lead_form_submit', {
            project_slug: slug,
            lead_id: id,
            pos_id: posId,
            location_name: locationName
        })
    }

    const handleInteractionComplete = async (resultData?: any) => {
        // Increment play count locally
        const newPlayCount = currentPlays + 1
        setCurrentPlays(newPlayCount)

        // Calculate experience duration
        const duration = experienceStartTime
            ? Math.round((Date.now() - experienceStartTime) / 1000)
            : 0

        // Track completion with duration and POS info
        if (resultData?.imageUrl) {
            trackEvent('photo_capture', {
                project_slug: slug,
                duration_seconds: duration,
                pos_id: posId,
                location_name: locationName
            })
        } else if (resultData?.prize) {
            trackEvent('game_complete', {
                project_slug: slug,
                prize: resultData.prize?.name || 'unknown',
                duration_seconds: duration,
                pos_id: posId,
                location_name: locationName
            })
        }

        // Track experience duration with POS info
        trackEvent('experience_complete', {
            project_slug: slug,
            duration_seconds: duration,
            interaction_type: project?.interaction_type,
            template: project?.template,
            pos_id: posId,
            location_name: locationName
        })

        // Save result securely via RPC
        if (leadId) {
            // Update result
            if (resultData) {
                await supabase.rpc('update_lead_result', {
                    p_lead_id: leadId,
                    p_result: resultData
                })
            }

            // Update play count in user_data
            const updatedUserData = { ...userData, play_count: newPlayCount }
            setUserData(updatedUserData)

            await supabase.from('leads')
                .update({ user_data: updatedUserData })
                .eq('id', leadId)
        }
        setResult(resultData)
        setStep('result')
    }

    // Track share event (export for child components)
    const handleShare = (type: 'photo' | 'video') => {
        trackEvent('share', {
            project_slug: slug,
            share_type: type
        })
    }

    const handleRestart = () => {
        // Check play limit
        const maxPlays = project.template_config?.max_plays || 1

        if (currentPlays >= maxPlays) {
            // Limit reached: Return to Lead Form for new session
            setLeadId(null)
            setUserData({})
            setCurrentPlays(0)
            setStep('lead_form')
        } else {
            // Replay allowed: Return to interaction
            setStep('interaction')
        }

        setExperienceStartTime(null)
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

    // Check if lead form is enabled
    const hasLeadForm = lead_form_config &&
        lead_form_config.fields &&
        lead_form_config.fields.length > 0

    // P2/P3 templates show placeholder
    const placeholderTemplates = ['world_tracking', 'scratch_card', 'quiz', 'catcher']

    return (
        <Suspense fallback={<div>Loading...</div>}>
            {/* Step 1: Lead Form (only if enabled) */}
            {step === 'lead_form' && hasLeadForm && (
                <LeadForm
                    projectId={project.id}
                    config={lead_form_config}
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
                                    posId={posId}
                                    onComplete={(prize) => handleInteractionComplete({ prize })}
                                    maxPlays={template_config?.max_plays || 1}
                                    currentPlays={currentPlays}
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
                    gameConfig={template === 'lucky_draw' ? template_config : undefined}
                    userData={userData}
                    leadId={leadId}
                    onRestart={handleRestart}
                />
            )}
        </Suspense>
    )
}
