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
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    'sans-serif',
                ],
            },
            colors: {
                // Couleurs plus opaques et contrastées
                'sidebar': '#F5F5F7', // Gris très clair apple "opaque"
                'sidebar-dark': '#1C1C1E', // Gris sombre/noir apple
            }
        },
    },
    plugins: [],
}
