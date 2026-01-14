'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProjectForm({ project }: { project?: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        client_slug: project?.client_slug || '',
        is_active: project?.is_active ?? true,
        asset_url: project?.asset_url || '',
        marker_url: project?.marker_url || '', // Include marker_url in state
        ga_id: project?.ga_id || '',
        template: project?.template || 'image_tracking', // Default template
        config: JSON.stringify(project?.config || {}, null, 2)
    })



    // Validate slug format
    const validateSlug = (slug: string): boolean => {
        const slugRegex = /^[a-z0-9-]+$/
        return slugRegex.test(slug)
    }

    const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'asset_url' | 'marker_url') => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            // 1. Get Session for Auth Token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                alert("Session expired. Please login again.")
                return
            }

            // 2. Request Signed URL from API
            const path = `assets/${formData.client_slug || 'temp'}/${field === 'marker_url' ? 'marker_' : ''}${file.name}`
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    filename: path,
                    contentType: file.type
                })
            })

            if (!res.ok) throw new Error('Failed to get signed URL')
            const { url: signedUrl, publicUrl } = await res.json()

            // 3. Upload File using Signed URL (PUT)
            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type
                },
                body: file
            })

            if (!uploadRes.ok) throw new Error('Upload failed')

            // 4. Update State
            if (field === 'asset_url') {
                setFormData({ ...formData, asset_url: publicUrl })
            } else {
                setFormData({ ...formData, marker_url: publicUrl })
            }

        } catch (error) {
            console.error("Upload failed", error)
            alert("Upload failed! See console.")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Validate slug
        if (!validateSlug(formData.client_slug)) {
            alert("Slug must be lowercase letters, numbers, and hyphens only (e.g., 'samsung-vn')")
            setLoading(false)
            return
        }

        // Validate config JSON
        let parsedConfig = {}
        try {
            parsedConfig = JSON.parse(formData.config || '{}')
        } catch (e) {
            alert("Invalid Config JSON")
            setLoading(false)
            return
        }

        const payload = {
            ...formData,
            config: parsedConfig
        }

        let error
        if (project?.id) {
            const { error: err } = await supabase.from('projects').update(payload).eq('id', project.id)
            error = err
        } else {
            const { error: err } = await supabase.from('projects').insert(payload)
            error = err
        }

        setLoading(false)
        if (error) {
            alert(error.message)
        } else {
            router.push('/admin')
            router.refresh()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl bg-white p-6 rounded shadow">
            <div>
                <label className="block text-sm font-medium mb-1">Subdomain (slug)</label>
                <input
                    className="w-full border p-2 rounded"
                    value={formData.client_slug}
                    onChange={e => setFormData({ ...formData, client_slug: e.target.value.toLowerCase() })}
                    placeholder="samsung-vn"
                    required
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces. Ex: samsung → samsung.posmars.vn</p>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Template Type</label>
                <select
                    className="w-full border p-2 rounded bg-white"
                    value={formData.template}
                    onChange={e => setFormData({ ...formData, template: e.target.value })}
                >
                    <option value="image_tracking">Image Tracking (Poster)</option>
                    <option value="product_configurator">3D Product Configurator (New)</option>
                    <option value="lucky_draw">Lucky Draw (Game)</option>
                    <option value="ar_checkin">AR Check-in (Photo)</option>
                    <option value="face_filter">Face Filter</option>
                    <option value="architectural_tracking">Architectural Tracking</option>
                    <option value="watch_ring_tryon">Watch & Ring Try-on</option>
                    <option value="world_ar">World AR (Place Object)</option>
                    <option value="hand_gesture">Hand Gesture Control</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">3D Model (.glb)</label>
                <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={(e) => handleAssetUpload(e, 'asset_url')}
                    className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-orange-50 file:text-orange-700
              hover:file:bg-orange-100"
                />
                {formData.asset_url && <a href={formData.asset_url} target="_blank" className="text-xs text-blue-600 mt-1 block truncate">Model: {formData.asset_url}</a>}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">AR Marker (.mind)</label>
                <input
                    type="file"
                    accept=".mind"
                    onChange={(e) => handleAssetUpload(e, 'marker_url')}
                    className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                />
                {formData.marker_url && <a href={formData.marker_url} target="_blank" className="text-xs text-blue-600 mt-1 block truncate">Marker: {formData.marker_url}</a>}
                <p className="text-xs text-slate-400 mt-1">Files created with mind-ar-js-compiler</p>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Google Analytics ID</label>
                <input
                    className="w-full border p-2 rounded"
                    value={formData.ga_id}
                    onChange={e => setFormData({ ...formData, ga_id: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Config (JSON)</label>
                <textarea
                    className="w-full border p-2 rounded font-mono text-sm"
                    rows={5}
                    value={formData.config}
                    onChange={e => setFormData({ ...formData, config: e.target.value })}
                />
            </div>
            <button type="submit" disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Project'}
            </button>
        </form>
    )
}
