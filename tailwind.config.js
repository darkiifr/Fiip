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
                'host': ['"Host Grotesk"', 'sans-serif'],
                'dexter': ['"Host Grotesk"', 'sans-serif'],
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
                // Radix UI animations
                'overlayShow': 'overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                'contentShow': 'contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                'slideDownAndFade': 'slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                'slideLeftAndFade': 'slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                'slideUpAndFade': 'slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                'slideRightAndFade': 'slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                // Radix UI keyframes
                overlayShow: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                contentShow: {
                    from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
                    to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
                },
                slideDownAndFade: {
                    from: { opacity: '0', transform: 'translateY(-2px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideLeftAndFade: {
                    from: { opacity: '0', transform: 'translateX(2px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideUpAndFade: {
                    from: { opacity: '0', transform: 'translateY(2px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideRightAndFade: {
                    from: { opacity: '0', transform: 'translateX(-2px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
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
