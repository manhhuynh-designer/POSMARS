import 'server-only'; // 1. SECURITY: Prevent client-side bundling

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 2. Initialize Supabase (Admin Context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Strict: Only Service Key for API routes often
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 3. Define Validation Schema (Strict)
const RequestSchema = z.object({
    name: z.string().min(1, "Name is required").max(100), // Max length for security
    email: z.string().email("Invalid email"),
    // Add other fields with strict validation
});

export async function POST(request: NextRequest) {
    try {
        // 4. SECURITY: Authentication / Authorization Check
        // Example: Inspecting a custom header or token
        const authHeader = request.headers.get('x-admin-secret');
        // Replace with your actual auth logic (e.g. Supabase getUser)
        if (authHeader !== process.env.ADMIN_SECRET_KEY && !process.env.IS_DEV) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing or invalid credentials' },
                { status: 401 }
            );
        }

        // 5. Parse & Validate Body
        const body = await request.json();
        const validation = RequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.format() },
                { status: 400 }
            );
        }

        const data = validation.data;

        // 6. Secure Database Operation
        const { data: result, error } = await supabase
            .from('your_table')
            .insert(data)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw new Error('Database operation failed'); // Generic error to client
        }

        // 7. Secure Response (No sensitive data leakage)
        return NextResponse.json(
            { success: true, id: result.id },
            { status: 200 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
