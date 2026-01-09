import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ContactFormData {
    name: string;
    email: string;
    company?: string;
    message: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ContactFormData = await request.json();

        console.log('Received contact form:', body);

        // Validate required fields
        if (!body.name || !body.email || !body.message) {
            return NextResponse.json(
                { error: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return NextResponse.json(
                { error: 'Email không hợp lệ' },
                { status: 400 }
            );
        }

        // Save to Supabase (optional - continue even if fails)
        try {
            const { error: dbError } = await supabase
                .from('contact_submissions')
                .insert({
                    name: body.name,
                    email: body.email,
                    company: body.company || null,
                    message: body.message,
                });

            if (dbError) {
                console.error('Supabase error:', dbError);
            } else {
                console.log('Saved to Supabase successfully');
            }
        } catch (dbErr) {
            console.error('Supabase connection error:', dbErr);
        }

        // Send email notification
        try {
            const smtpUser = process.env.SMTP_USER || 'manhhuynh.designer@gmail.com';
            const smtpPass = process.env.SMTP_PASS;

            console.log('SMTP Config:', { user: smtpUser, passSet: !!smtpPass });

            if (!smtpPass) {
                console.error('SMTP credentials not configured (PASS missing)');
                // Return success anyway since we saved to DB
                return NextResponse.json(
                    { success: true, message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.' },
                    { status: 200 }
                );
            }

            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });

            const mailOptions = {
                from: `"POSMARS Contact Form" <${smtpUser}>`,
                to: 'manhhuynh.designer@gmail.com',
                replyTo: body.email,
                subject: `[POSMARS] Liên hệ mới từ ${body.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #fa9440;">Liên hệ mới từ POSMARS</h2>
                        <hr style="border: 1px solid #eee;" />
                        <p><strong>Họ tên:</strong> ${body.name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${body.email}">${body.email}</a></p>
                        ${body.company ? `<p><strong>Công ty:</strong> ${body.company}</p>` : ''}
                        <p><strong>Nội dung:</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                            ${body.message.replace(/\n/g, '<br />')}
                        </div>
                        <hr style="border: 1px solid #eee; margin-top: 20px;" />
                        <p style="color: #888; font-size: 12px;">
                            Email này được gửi tự động từ form liên hệ trên website POSMARS.
                        </p>
                    </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');

        } catch (emailErr) {
            console.error('Email error:', emailErr);
            // Still return success since we might have saved to DB
        }

        return NextResponse.json(
            { success: true, message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
            { status: 500 }
        );
    }
}
