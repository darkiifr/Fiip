/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'Sora',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    'sans-serif',
                ],
                'sora': ['"Sora"', 'sans-serif'],
                'dexter': ['"Inter"', 'sans-serif'],
                'dexter-mono': ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                // Couleurs plus opaques et contrastées
                'sidebar': '#F5F5F7', // Gris très clair apple "opaque"
                'sidebar-dark': '#1C1C1E', // Gris sombre/noir apple
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'loading-bar': 'loading-bar 1.5s ease-in-out infinite',
            },
            keyframes: {
                'loading-bar': {
                    '0%': { left: '-40%' },
                    '50%': { left: '40%' },
                    '100%': { left: '100%' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                }
            }
        },
    },
    plugins: [],
}
