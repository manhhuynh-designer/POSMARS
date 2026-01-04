'use client'
import { Construction } from 'lucide-react'

interface PlaceholderProps {
    template: string
    expectedDate?: string
}

export default function Placeholder({ template, expectedDate }: PlaceholderProps) {
    const templateNames: Record<string, string> = {
        world_tracking: 'World Tracking',
        face_filter: 'Face Filter',
        scratch_card: 'Scratch Card',
        quiz: 'Quiz',
        catcher: 'Catcher Game'
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center p-4">
            <div className="text-center">
                <Construction size={64} className="mx-auto text-orange-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang phát triển</h2>
                <p className="text-gray-600 mb-4">
                    Template: <span className="font-medium">{templateNames[template] || template}</span>
                </p>
                {expectedDate && (
                    <p className="text-sm text-gray-500">Dự kiến: {expectedDate}</p>
                )}
            </div>
        </div>
    )
}
