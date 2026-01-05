'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface CustomARRendererProps {
    html: string
    script?: string
    variables: Record<string, any>
}

/**
 * Replaces template variables in HTML content
 * Supports: {{marker_url}}, {{asset_url}}, {{filter_url}}, {{filter_scale}}, etc.
 */
function replaceVariables(html: string, variables: Record<string, any>): string {
    let result = html

    // Replace all {{variable}} patterns
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        result = result.replace(regex, String(value ?? ''))
    })

    // Also handle nested config values like {{config.key}}
    if (variables.config && typeof variables.config === 'object') {
        Object.entries(variables.config).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{config\\.${key}\\}\\}`, 'g')
            result = result.replace(regex, String(value ?? ''))
        })
    }

    return result
}

export default function CustomARRenderer({ html, script, variables }: CustomARRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!containerRef.current || !html) {
            setLoading(false)
            return
        }

        try {
            setError(null)
            setLoading(true)

            // Replace variables in HTML
            const processedHtml = replaceVariables(html, variables)

            // Clear container
            containerRef.current.innerHTML = ''

            // Parse HTML and extract body content
            const parser = new DOMParser()
            const doc = parser.parseFromString(processedHtml, 'text/html')

            // Copy head scripts/styles
            const headElements = doc.head.querySelectorAll('script, style, link')
            headElements.forEach(el => {
                const clone = el.cloneNode(true) as HTMLElement
                if (clone.tagName === 'SCRIPT') {
                    // For scripts, we need to re-create them to execute
                    const newScript = document.createElement('script')
                    if ((clone as HTMLScriptElement).src) {
                        newScript.src = (clone as HTMLScriptElement).src
                    } else {
                        newScript.textContent = clone.textContent
                    }
                    document.head.appendChild(newScript)
                } else {
                    document.head.appendChild(clone)
                }
            })

            // Insert body content
            containerRef.current.innerHTML = doc.body.innerHTML

            // Execute custom script if provided
            if (script) {
                const processedScript = replaceVariables(script, variables)
                const scriptEl = document.createElement('script')
                scriptEl.textContent = processedScript
                containerRef.current.appendChild(scriptEl)
            }

            setLoading(false)
        } catch (e) {
            console.error('CustomARRenderer error:', e)
            setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi khi render custom code')
            setLoading(false)
        }

        // Cleanup on unmount
        return () => {
            // Remove a-scene if exists
            const scene = document.querySelector('a-scene')
            if (scene) scene.remove()

            // Note: We should ideally clean up head scripts too,
            // but that could affect page functionality
        }
    }, [html, script, variables])

    if (!html) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                    <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Không có nội dung</h2>
                    <p className="text-gray-600">Custom HTML chưa được cấu hình cho project này.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center p-8 max-w-md">
                    <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Lỗi render</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg mx-auto hover:bg-blue-600"
                    >
                        <RefreshCw size={16} /> Thử lại
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-blue-500 rounded-full mx-auto mb-4" />
                        <p>Đang tải AR experience...</p>
                    </div>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}
