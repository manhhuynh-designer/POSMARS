import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// In a real production app, this would use S3/Supabase Storage
// For this environment, we save to public/uploads
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'models')

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = `${uuidv4()}_${file.name}`
        const filepath = join(UPLOAD_DIR, filename)

        // Ensure directory exists
        // Note: In Node20 we can use recursive mkdir
        const fs = require('fs')
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true })
        }

        await writeFile(filepath, buffer)

        const publicUrl = `/uploads/models/${filename}`

        return NextResponse.json({
            success: true,
            url: publicUrl,
            message: 'File uploaded successfully'
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
