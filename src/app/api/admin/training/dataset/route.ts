import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSZip from 'jszip'
import { existsSync } from 'fs'

const TEMP_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'temp')

// Helper: Ensure temp dir exists
function ensureTempDir() {
    const fs = require('fs')
    if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
        fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true })
    }
}

export async function POST(request: NextRequest) {
    try {
        ensureTempDir()

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // 1. Generate Job ID and Directory
        const jobId = uuidv4()
        const jobDir = join(TEMP_UPLOAD_DIR, jobId)
        await mkdir(jobDir, { recursive: true })

        // 2. Load ZIP
        const arrayBuffer = await file.arrayBuffer()
        const zip = await JSZip.loadAsync(arrayBuffer)

        // 3. Extract Files (Flatten structure)
        let fileCount = 0
        const extractions: Promise<void>[] = []

        zip.forEach((relativePath, zipEntry) => {
            // Skip directories and Mac system files
            if (!zipEntry.dir && !relativePath.startsWith('__MACOSX') && !relativePath.includes('.DS_Store')) {
                const fileName = relativePath.split('/').pop()

                // Only extract valid images
                if (fileName && /\.(jpg|jpeg|png)$/i.test(fileName)) {
                    const promise = zipEntry.async('nodebuffer').then(async (content) => {
                        await writeFile(join(jobDir, fileName), content)
                    })
                    extractions.push(promise)
                    fileCount++
                }
            }
        })

        await Promise.all(extractions)

        if (fileCount === 0) {
            // Cleanup if empty/invalid zip
            await rm(jobDir, { recursive: true, force: true })
            return NextResponse.json({ error: 'No valid images found in ZIP' }, { status: 400 })
        }

        console.log(`📂 Dataset extracted: ${jobId} (${fileCount} images)`)

        return NextResponse.json({
            success: true,
            jobId,
            baseUrl: `/uploads/temp/${jobId}`,
            fileCount
        })

    } catch (error) {
        console.error('Dataset Upload Error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const jobId = searchParams.get('jobId')

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
        }

        // Security check
        if (!/^[0-9a-fA-F-]{36}$/.test(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 })
        }

        const jobDir = join(TEMP_UPLOAD_DIR, jobId)

        if (existsSync(jobDir)) {
            await rm(jobDir, { recursive: true, force: true })
            console.log(`🗑️ Dataset cleaned: ${jobId}`)
        }

        return NextResponse.json({ success: true, message: 'Cleanup successful' })

    } catch (error) {
        console.error('Cleanup Error:', error)
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }
}
