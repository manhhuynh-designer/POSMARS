'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
    Focus,
    UserSquare2,
    Dices,
    Camera,
    CheckCircle2,
    Mail,
    ChevronRight,
    Languages,
    Smartphone,
    LayoutDashboard,
    BarChart3,
    ArrowRight
} from 'lucide-react'

// Translations
const translations = {
    vi: {
        nav: {
            services: 'Dịch vụ',
            features: 'Tính năng',
            contact: 'Liên hệ',
        },
        hero: {
            title: 'Thiết kế 3D & WebAR',
            titleHighlight: 'cho POSM',
            subtitle: 'Dịch vụ Creative Tech chuyên thiết kế asset 3D và vận hành ứng dụng WebAR, Gamification - tối ưu hóa chuyển đổi tại điểm bán.',
            cta: 'Liên hệ tư vấn',
            learnMore: 'Tìm hiểu thêm',
        },
        services: {
            title: 'Giải pháp của chúng tôi',
            subtitle: 'Giải pháp công nghệ sáng tạo giúp thương hiệu của bạn nổi bật tại điểm bán.',
            items: [
                {
                    title: 'WebAR Image Tracking',
                    desc: 'Biến bao bì, poster thành không gian 3D sống động ngay trên trình duyệt.',
                    icon: Focus
                },
                {
                    title: 'Lucky Draw Gamification',
                    desc: 'Vòng quay may mắn và game tương tác tạo Dopamine Loop cho khách hàng.',
                    icon: Dices
                },
                {
                    title: 'AR Check-in',
                    desc: 'Chụp ảnh cùng Mascot hoặc sản phẩm 3D với khung ảnh KV thương hiệu.',
                    icon: Camera
                },
                {
                    title: 'Trải nghiệm Tùy chỉnh',
                    desc: 'Thiết kế trải nghiệm tương tác WebAR/Gamification theo yêu cầu riêng.',
                    icon: LayoutDashboard
                }
            ]
        },
        features: {
            title: 'Tại sao chọn POSMARS?',
            items: [
                { title: 'Mobile-only', desc: 'Tối ưu 100% cho màn hình di động, tập trung vào KV và Branding.', icon: Smartphone },
                { title: 'Browser Detection', desc: 'Tự động Fallback giữa iOS (Quick Look) và Android (Scene Viewer).', icon: CheckCircle2 },
                { title: 'Data Isolation', desc: 'Bảo mật tuyệt đối với Row Level Security cho từng khách hàng.', icon: LayoutDashboard },
                { title: 'Báo cáo Chuyên nghiệp', desc: 'Xuất Excel và PDF báo cáo hiệu quả điểm bán trực tiếp.', icon: BarChart3 },
            ]
        },
        cta: {
            title: 'Liên hệ với chúng tôi',
            subtitle: 'Bạn đang ấp ủ một dự án? Hãy chia sẻ thông tin, chúng tôi sẽ phản hồi trong vòng 24h.',
            button: 'Gửi liên hệ',
            form: {
                name: 'Họ và tên',
                email: 'Email của bạn',
                company: 'Tên công ty (nếu có)',
                message: 'Nội dung tin nhắn',
                sending: 'Đang gửi...',
                success: 'Cảm ơn bạn! Chúng tôi sẽ phản hồi sớm nhất.',
                error: 'Có lỗi xảy ra. Vui lòng thử lại.',
            }
        },
        footer: {
            rights: '© 2026 POSMARS. Powered by manhhuynh.work',
        }
    },
    en: {
        nav: {
            services: 'Services',
            features: 'Features',
            contact: 'Contact',
        },
        hero: {
            title: '3D Design & WebAR',
            titleHighlight: 'for POSM',
            subtitle: 'Creative Tech service specializing in 3D asset design and WebAR, Gamification applications - optimizing conversion at point of sale.',
            cta: 'Get Consultation',
            learnMore: 'Learn More',
        },
        services: {
            title: 'Our Solutions',
            subtitle: 'Innovative tech solutions to make your brand stand out at the point of sale.',
            items: [
                {
                    title: 'WebAR Image Tracking',
                    desc: 'Transform packaging, posters into vivid 3D spaces directly in browser.',
                    icon: Focus
                },
                {
                    title: 'Lucky Draw Gamification',
                    desc: 'Lucky wheels and interactive games creating Dopamine Loop for customers.',
                    icon: Dices
                },
                {
                    title: 'AR Check-in',
                    desc: 'Photo with Mascot or 3D products with branded KV frames.',
                    icon: Camera
                },
                {
                    title: 'Custom Experience',
                    desc: 'Custom WebAR/Gamification interactive experience design on demand.',
                    icon: LayoutDashboard
                }
            ]
        },
        features: {
            title: 'Why POSMARS?',
            items: [
                { title: 'Mobile-only', desc: '100% optimized for mobile screens, focused on KV and Branding.', icon: Smartphone },
                { title: 'Browser Detection', desc: 'Auto Fallback between iOS (Quick Look) and Android (Scene Viewer).', icon: CheckCircle2 },
                { title: 'Data Isolation', desc: 'Absolute security with Row Level Security per client.', icon: LayoutDashboard },
                { title: 'Pro Reporting', desc: 'Export Excel and PDF reports on POS performance directly.', icon: BarChart3 },
            ]
        },
        cta: {
            title: 'Get in Touch',
            subtitle: 'Have a project in mind? Send us your details, we\'ll respond within 24h.',
            button: 'Send Message',
            form: {
                name: 'Your Name',
                email: 'Your Email',
                company: 'Company Name (optional)',
                message: 'Your Message',
                sending: 'Sending...',
                success: 'Thank you! We\'ll respond as soon as possible.',
                error: 'Something went wrong. Please try again.',
            }
        },
        footer: {
            rights: '© 2026 POSMARS. Powered by manhhuynh.work',
        }
    }
}


const ParticleSystem = ({ mouseRaw, mounted, isHeroHovered }: { mouseRaw: { x: number; y: number }; mounted: boolean; isHeroHovered: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<any[]>([]);
    const mouseRef = useRef({ x: 0, y: 0 });
    const isHoveredRef = useRef(false);

    // Keep refs updated without triggering re-renders
    useEffect(() => {
        mouseRef.current = mouseRaw;
    }, [mouseRaw]);

    useEffect(() => {
        isHoveredRef.current = isHeroHovered;
    }, [isHeroHovered]);

    useEffect(() => {
        if (!mounted) return;
        const canvas = document.getElementById('starfield-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let w = window.innerWidth;
        let h = window.innerHeight;
        let centerX = w / 2;
        let centerY = h / 2;

        const resize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            centerX = w / 2;
            centerY = h / 2;
            // No init() here to prevent full reset, just bounds update
        };

        const init = () => {
            particlesRef.current = [];
            // Create a dense starfield
            for (let i = 0; i < 400; i++) {
                particlesRef.current.push(createParticle(w, h, true));
            }
        };

        const createParticle = (width: number, height: number, randomZ = false) => {
            // True 3D coordinates
            // X and Y are in World Space, spread wide
            const spread = 5000;
            const x = (Math.random() - 0.5) * spread * 2;
            const y = (Math.random() - 0.5) * spread * 2;
            // Z is depth. If randomZ is true (init), spread from far to near.
            // If false (respawn), put at far back.
            const z = randomZ ? Math.random() * 500 : 500;

            return {
                x, y, z,
                vx: 0, vy: 0, // Velocity for spiral physics
                // Assign color/size category
                type: Math.random() > 0.8 ? 'bright' : Math.random() > 0.5 ? 'mid' : 'dim',
                baseOpacity: Math.random() * 0.5 + 0.5, // Increased opacity
                isDying: false
            };
        };

        const animate = () => {
            // Clear entire canvas for clean Transparent background
            ctx.clearRect(0, 0, w, h);

            // Get canvas position for scroll-aware mouse coordinates
            const canvasRect = canvas.getBoundingClientRect();
            const mouse = mouseRef.current;

            // Adjust mouse position relative to canvas (not viewport)
            const mouseCanvasX = mouse.x - canvasRect.left;
            const mouseCanvasY = mouse.y - canvasRect.top;

            // Mouse in "Screen Space" relative to center
            const mouseScreenX = mouseCanvasX - centerX;
            const mouseScreenY = mouseCanvasY - centerY;

            particlesRef.current.forEach(p => {
                // 1. Move Warp Speed (decrease Z)
                p.z -= 1.2; // Warp speed constant

                // Loop back if passed camera or dying complete
                if (p.z <= 0 || p.baseOpacity <= 0) {
                    Object.assign(p, createParticle(w, h));
                    return;
                }

                // 2. Perspective Projection
                // Simple perspective formula
                const fov = 100;
                const scale = fov / p.z;

                const screenX = centerX + p.x * scale;
                const screenY = centerY + p.y * scale;

                // 3. Magnetic Singularity Interaction
                // Calculate distance from Particle Screen Position to Mouse Screen Position (canvas-relative)
                const dx = mouseCanvasX - screenX;
                const dy = mouseCanvasY - screenY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const attractionRadius = 350;

                // Exclusion Zone (Behind Center Circle ~120px)
                const distToCenter = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);
                const isExcluded = distToCenter < 120;

                // Only apply attraction when hovering Hero section
                if (dist < attractionRadius && !p.isDying && !isExcluded && isHoveredRef.current) {
                    // Spiral Physics: Radial + Tangential Force
                    // Use squared force for smoother curve (less aggressive at edges)
                    const force = Math.pow((attractionRadius - dist) / attractionRadius, 1.5);

                    // Radial Pull (Inward towards mouse) - gentle
                    const pullX = (dx / scale) * force * 0.04;
                    const pullY = (dy / scale) * force * 0.04;

                    // Tangential Force (Perpendicular = Spin) - very subtle
                    const spinX = (-dy / scale) * force * 0.012;
                    const spinY = (dx / scale) * force * 0.012;

                    // Apply both forces to velocity
                    p.vx += pullX + spinX;
                    p.vy += pullY + spinY;

                    // Clamp max velocity for orderly movement
                    const maxVel = 15;
                    const velMag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (velMag > maxVel) {
                        p.vx = (p.vx / velMag) * maxVel;
                        p.vy = (p.vy / velMag) * maxVel;
                    }

                    // Close enough to be sucked in
                    if (dist < 30) {
                        p.isDying = true;
                        p.baseOpacity = 1.0;
                    }
                }

                // Apply velocity to position & friction (higher friction = smoother)
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.88;
                p.vy *= 0.88;

                if (p.isDying) {
                    p.baseOpacity -= 0.1;
                    p.x += p.vx;
                    p.y += p.vy;
                }

                // 4. Render
                if (p.baseOpacity > 0) {
                    // Responsive scale factor (base on 1440px desktop)
                    const responsiveScale = Math.min(w, h) / 1440;

                    // Determine Size and Color based on type + depth
                    let baseSize = 6; // Base size for dim
                    let color = '#ffffff';

                    if (p.type === 'bright') {
                        baseSize = 16;
                        color = '#e7313d'; // Red accent
                    } else if (p.type === 'mid') {
                        baseSize = 10;
                        color = '#fa9440'; // Orange accent
                    }

                    // Scale size by perspective AND responsive factor
                    const drawSize = Math.max(0.5, baseSize * scale * Math.max(0.5, responsiveScale));

                    ctx.beginPath();
                    ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.globalAlpha = p.baseOpacity * Math.min(1, scale * 3); // Fade in from distance

                    if (p.isDying || p.type === 'bright') {
                        ctx.shadowBlur = drawSize * 4;
                        ctx.shadowColor = color;
                    } else {
                        ctx.shadowBlur = 0;
                    }

                    ctx.fill();
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize(); // Set canvas size first!
        init(); // Initial population
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [mounted]); // Only run once on mount

    return null;
};


export default function Home() {
    const [lang, setLang] = useState<'vi' | 'en'>('vi')
    const [scrolled, setScrolled] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [mouseRaw, setMouseRaw] = useState({ x: 0, y: 0 })
    const [isHeroHovered, setIsHeroHovered] = useState(false)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' })
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
    const t = translations[lang]

    useEffect(() => {
        setMounted(true)
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        const handleMouseMove = (e: MouseEvent) => {
            setMouseRaw({ x: e.clientX, y: e.clientY })
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20
            })
        }
        window.addEventListener('scroll', handleScroll)
        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])

    const toggleLang = () => setLang(prev => prev === 'vi' ? 'en' : 'vi')

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-orange-500/30 overflow-x-hidden">
            {/* Header */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl py-3 border-b border-white/5' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer transition-transform hover:scale-105">
                        <img src="/logo-header.png" alt="POSMARS Logo" className="h-10 w-auto object-contain" />
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#services" className="text-xs font-black tracking-[0.15em] uppercase hover:text-[#fa9440] transition-all">{t.nav.services}</a>
                        <a href="#features" className="text-xs font-black tracking-[0.15em] uppercase hover:text-[#fa9440] transition-all">{t.nav.features}</a>
                        <a href="#contact" className="text-xs font-black tracking-[0.15em] uppercase hover:text-[#fa9440] transition-all">{t.nav.contact}</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLang}
                            className="p-2.5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-white/10"
                        >
                            <Languages size={18} className="text-[#fa9440]" />
                            <span className="text-sm font-bold uppercase tracking-widest">{lang === 'vi' ? 'EN' : 'VN'}</span>
                        </button>
                        <a
                            href="mailto:contact@manhhuynh.work"
                            className="hidden sm:block bg-gradient-to-r from-[#fa9440] to-[#e7313d] hover:from-[#e7313d] hover:to-[#fa9440] text-white px-7 py-2.5 rounded-full font-black text-sm transition-all hover:shadow-[0_0_20px_rgba(250,148,64,0.4)] hover:scale-105"
                        >
                            Get Started
                        </a>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section
                    className="relative min-h-[80vh] md:min-h-screen flex items-center justify-center pt-20 overflow-hidden"
                    onMouseEnter={() => setIsHeroHovered(true)}
                    onMouseLeave={() => setIsHeroHovered(false)}
                >
                    {/* Background Elements - Static */}
                    <div className="absolute inset-0 z-0">
                        {/* Static Glow Shapes */}
                        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] blur-[150px] rounded-full animate-pulse-slow bg-radial-gradient-orange opacity-40"
                            style={{ background: 'radial-gradient(circle, #fa9440 0%, transparent 70%)' }} />
                        <div className="absolute bottom-[20%] right-[20%] w-[50%] h-[50%] blur-[150px] rounded-full animate-pulse-slow bg-radial-gradient-red opacity-40"
                            style={{ background: 'radial-gradient(circle, #e7313d 0%, transparent 70%)', animationDelay: '2s' }} />
                        <div className="absolute inset-0 bg-[url('/transparent-grid.png')] bg-[length:50px_50px] opacity-[0.15] mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020202]/50 to-[#020202]" />
                    </div>

                    {/* Animated Logo Graphic (Central and Orbital) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
                        <div className="relative w-[350px] h-[350px] md:w-[700px] md:h-[700px] opacity-50">


                            {/* Outer Rings */}
                            <div className="absolute inset-0 border-[1px] border-white/5 rounded-full animate-orbit-slow-reverse" />
                            <svg className="absolute inset-0 w-full h-full animate-orbit-slow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#e7313d" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                                <circle cx="50" cy="50" r="49.5" stroke="url(#grad3)" strokeWidth="0.2" />
                            </svg>

                            {/* Scanning Ray */}
                            <div className="absolute inset-0 overflow-hidden rounded-full">
                                <div className="absolute top-0 left-0 w-full h-[150%] bg-gradient-to-b from-transparent via-[#fa9440]/30 to-transparent animate-scan-slow" />
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[#e7313d]/60" />
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-[#fa9440]/60" />
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-[#fa9440]/60" />
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[#e7313d]/60" />


                        </div>

                        {/* Canvas-based Starfield with Magnetic Attraction */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <canvas
                                id="starfield-canvas"
                                className="absolute inset-0 w-full h-full opacity-60"
                            />
                            <ParticleSystem mouseRaw={mouseRaw} mounted={mounted} isHeroHovered={isHeroHovered} />
                        </div>
                    </div>

                    <div className="container mx-auto px-6 relative z-10 text-center">
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/[0.05] transition-all cursor-default group">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] group-hover:text-white transition-colors">THE FUTURE OF POSM</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1] perspective-1000">
                            <span className="block animate-reveal-up overflow-hidden">
                                {t.hero.title}
                            </span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#fa9440] via-[#e7313d] to-[#fa9440] bg-[length:200%_auto] animate-gradient-x animate-reveal-up py-4" style={{ animationDelay: '0.2s' }}>
                                {t.hero.titleHighlight}
                            </span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-gray-400 text-base md:text-xl mb-12 leading-relaxed animate-reveal-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                            {t.hero.subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-reveal-up opacity-0 relative z-20" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                            <a href="#contact" className="w-full sm:w-auto bg-gradient-to-r from-[#fa9440] to-[#e7313d] text-white px-8 py-4 rounded-full font-black text-lg hover:from-[#e7313d] hover:to-[#fa9440] transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(250,148,64,0.3)] flex items-center justify-center gap-3 group">
                                {t.hero.cta}
                                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                            </a>
                            <a href="#services" className="w-full sm:w-auto border border-white/10 bg-white/5 backdrop-blur-md px-8 py-4 rounded-full font-black text-lg hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105">
                                {t.hero.learnMore}
                            </a>
                        </div>
                    </div>
                </section>

                {/* Trusted By */}
                <section className="py-20 border-y border-white/5 bg-black/30 backdrop-blur-sm relative overflow-hidden">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="flex justify-center">
                            <div className="flex flex-wrap justify-center gap-12 md:gap-20 items-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                <div className="text-3xl font-black tracking-tighter hover:text-[#fa9440] cursor-default transition-colors">PHARMA</div>
                                <div className="text-3xl font-black tracking-tighter hover:text-[#fa9440] cursor-default transition-colors">COSMETICS</div>
                                <div className="text-3xl font-black tracking-tighter hover:text-[#fa9440] cursor-default transition-colors">FMCG</div>
                                <div className="text-3xl font-black tracking-tighter hover:text-[#fa9440] cursor-default transition-colors">EVENTS</div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative side blast */}
                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />
                </section>

                {/* Services Section */}
                <section id="services" className="py-32 md:py-48 relative">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
                            <div className="max-w-2xl">
                                <div className="text-[#fa9440] font-black text-sm tracking-[0.3em] mb-4">OUR CAPABILITIES</div>
                                <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">{t.services.title}</h2>
                                <p className="text-xl text-gray-400 font-medium leading-relaxed">{t.services.subtitle}</p>
                            </div>
                            <div className="pb-2">
                                <a href="mailto:contact@manhhuynh.work" className="group flex items-center gap-3 text-[#fa9440] font-bold hover:gap-5 transition-all">
                                    Request a Demo <ArrowRight size={20} />
                                </a>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {t.services.items.map((item, idx) => (
                                <div key={idx} className="group relative p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-orange-500/30 hover:bg-white/[0.04] transition-all duration-700 overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/20 transition-all" />

                                    <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 mb-8 border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-black group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all duration-500">
                                        <item.icon size={36} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-6 leading-tight group-hover:text-orange-500 transition-colors">{item.title}</h3>
                                    <p className="text-gray-400 leading-relaxed font-medium">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Highlights */}
                <section id="features" className="py-32 md:py-48 bg-white/[0.01] border-y border-white/5 relative">
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-24 items-center">
                            <div>
                                <div className="text-[#fa9440] font-black text-sm tracking-[0.3em] mb-4">THE DIFFERENCE</div>
                                <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-16 leading-tight">{t.features.title}</h2>
                                <div className="grid sm:grid-cols-2 gap-12">
                                    {t.features.items.map((feature, idx) => (
                                        <div key={idx} className="group">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#fa9440] mb-6 group-hover:border-[#fa9440]/50 transition-all">
                                                <feature.icon size={24} />
                                            </div>
                                            <h4 className="text-xl font-black mb-4 group-hover:text-[#fa9440] transition-colors uppercase tracking-wide">{feature.title}</h4>
                                            <p className="text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 bg-black/50 p-1.5 transition-transform hover:scale-[1.02] duration-700 shadow-2xl">
                                    <div className="w-full h-full bg-black rounded-[2.8rem] flex items-center justify-center overflow-hidden relative">
                                        <img
                                            src="/features-illustration.png"
                                            alt="WebAR Experience"
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                    </div>
                                </div>
                                {/* Advanced floating shapes */}
                                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#fa9440]/20 blur-[80px] rounded-full group-hover:bg-[#fa9440]/40 transition-all duration-1000"></div>
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#e7313d]/20 blur-[80px] rounded-full group-hover:bg-[#e7313d]/40 transition-all duration-1000"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Form Section */}
                <section id="contact" className="py-32 md:py-48 relative overflow-hidden">
                    <div className="container mx-auto px-6">
                        <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-[#111] to-black border border-white/5 p-12 md:p-20">
                            {/* Animated bg */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('/transparent-grid.png')] bg-[length:30px_30px]" />
                            </div>
                            <div className="absolute -top-1/2 -right-1/4 w-[80%] h-[150%] bg-[#fa9440]/10 blur-[120px] rounded-full rotate-45 animate-pulse-slow" />
                            <div className="absolute -bottom-1/2 -left-1/4 w-[60%] h-[100%] bg-[#e7313d]/10 blur-[100px] rounded-full" />

                            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                                {/* Left: Text */}
                                <div>
                                    <div className="text-[#fa9440] font-black text-sm tracking-[0.3em] mb-4">CONTACT</div>
                                    <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
                                        {t.cta.title}
                                    </h2>
                                    <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-8">
                                        {t.cta.subtitle}
                                    </p>
                                    <div className="flex items-center gap-4 text-gray-500">
                                        <Mail size={20} className="text-[#fa9440]" />
                                        <span className="font-medium">contact@manhhuynh.work</span>
                                    </div>
                                </div>

                                {/* Right: Form */}
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setFormStatus('sending');
                                        try {
                                            const res = await fetch('/api/contact', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(formData),
                                            });
                                            if (res.ok) {
                                                setFormStatus('success');
                                                setFormData({ name: '', email: '', company: '', message: '' });
                                            } else {
                                                setFormStatus('error');
                                            }
                                        } catch {
                                            setFormStatus('error');
                                        }
                                    }}
                                    className="space-y-6"
                                >
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <input
                                            type="text"
                                            placeholder={t.cta.form.name}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#fa9440]/50 focus:ring-2 focus:ring-[#fa9440]/20 transition-all"
                                        />
                                        <input
                                            type="email"
                                            placeholder={t.cta.form.email}
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#fa9440]/50 focus:ring-2 focus:ring-[#fa9440]/20 transition-all"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t.cta.form.company}
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#fa9440]/50 focus:ring-2 focus:ring-[#fa9440]/20 transition-all"
                                    />
                                    <textarea
                                        placeholder={t.cta.form.message}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        required
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#fa9440]/50 focus:ring-2 focus:ring-[#fa9440]/20 transition-all resize-none"
                                    />

                                    {formStatus === 'success' && (
                                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-4 rounded-2xl text-center font-medium">
                                            {t.cta.form.success}
                                        </div>
                                    )}
                                    {formStatus === 'error' && (
                                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl text-center font-medium">
                                            {t.cta.form.error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={formStatus === 'sending'}
                                        className="w-full bg-gradient-to-r from-[#fa9440] to-[#e7313d] text-white px-8 py-5 rounded-2xl font-black text-lg hover:from-[#e7313d] hover:to-[#fa9440] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(250,148,64,0.3)]"
                                    >
                                        {formStatus === 'sending' ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {t.cta.form.sending}
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={20} />
                                                {t.cta.button}
                                                <ChevronRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-20 border-t border-white/5 relative z-10 bg-[#020202]">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex flex-col gap-6 items-center md:items-start">
                        <img src="/logo-long.png" alt="POSMARS Branding" className="h-8 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.3em]">
                            {t.footer.rights}
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-6">
                        <div className="flex gap-8">
                            <a href="mailto:contact@manhhuynh.work" className="text-gray-500 hover:text-white transition-all hover:scale-125"><Mail size={24} /></a>
                        </div>
                        <p className="text-[10px] text-gray-700 font-black tracking-[0.5em] uppercase">Creative Tech Service</p>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                html {
                    scroll-behavior: smooth;
                    background-color: #020202;
                }
                
                body {
                    font-family: 'Inter', sans-serif;
                }

                .perspective-1000 {
                    perspective: 1000px;
                }

                @keyframes reveal-up {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.1; }
                    50% { opacity: 0.3; }
                }

                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) rotate(12deg); }
                    50% { transform: translateY(-20px) rotate(15deg); }
                }

                @keyframes float-mid {
                    0%, 100% { transform: translateY(0) rotate(-6deg); }
                    50% { transform: translateY(-30px) rotate(-8deg); }
                }

                @keyframes float-fast {
                    0%, 100% { transform: translateY(0) translate(0, 0); }
                    50% { transform: translateY(-15px) translate(5px, 5px); }
                }

                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes ping-slow {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                @keyframes grow {
                    from { height: 0; }
                    to { height: 100%; }
                }

                @keyframes orbit-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes orbit-slow-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }

                @keyframes scan-slow {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }

                .animate-orbit-slow {
                    animation: orbit-slow 20s linear infinite;
                }

                .animate-orbit-slow-reverse {
                    animation: orbit-slow-reverse 30s linear infinite;
                }

                .animate-scan-slow {
                    animation: scan-slow 6s ease-in-out infinite;
                }

                @keyframes starWarp {
                    0% { 
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    80% {
                        opacity: 1;
                    }
                    100% { 
                        transform: translate(calc(-50% + var(--endX, 0)), calc(-50% + var(--endY, 0))) scale(2);
                        opacity: 0;
                    }
                }

                .animate-reveal-up {
                    animation: reveal-up 1.2s cubic-bezier(0.2, 1, 0.3, 1) forwards;
                }

                .animate-pulse-slow {
                    animation: pulse-slow 8s ease-in-out infinite;
                }

                .animate-float-slow {
                    animation: float-slow 10s ease-in-out infinite;
                }

                .animate-float-mid {
                    animation: float-mid 12s ease-in-out infinite;
                }

                .animate-float-fast {
                    animation: float-fast 6s ease-in-out infinite;
                }

                .animate-gradient-x {
                    animation: gradient-x 8s linear infinite;
                }

                .animate-ping-slow {
                    animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
                }

                .animate-grow {
                    animation: grow 1.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div >
    );
}
