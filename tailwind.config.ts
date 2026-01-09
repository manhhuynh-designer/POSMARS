/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Mars Theme
                'mars-orange': '#FF6B35',
                'mars-red': '#C62828',
                'mars-slate': '#1E293B',
            },
            keyframes: {
                starWarp: {
                    '0%': { transform: 'translate3d(0, 0, 0)', opacity: '0' },
                    '5%': { opacity: '1' },
                    '90%': { opacity: '1' },
                    '100%': { transform: 'translate3d(var(--endX), var(--endY), 0)', opacity: '0' },
                },
                orbit: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                scan: {
                    '0%': { top: '-50%' },
                    '100%': { top: '150%' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                reveal: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                gradient: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
            },
            animation: {
                'orbit-slow': 'orbit 20s linear infinite',
                'orbit-slow-reverse': 'orbit 25s linear infinite reverse',
                'scan-slow': 'scan 8s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float-slow': 'float 6s ease-in-out infinite',
                'reveal-up': 'reveal 0.8s ease-out forwards',
                'gradient-x': 'gradient 8s ease infinite',
            },
        },
    },
    plugins: [
        require("tailwindcss-animate")
    ],
}
export default config
