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
        },
    },
    plugins: [
        require("tailwindcss-animate")
    ],
}
export default config
