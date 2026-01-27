
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                kcc: {
                    navy: '#003478',
                    blue: '#0056b3',
                    light: '#f0f4f8',
                    gold: '#c5a059',
                }
            }
        },
    },
    plugins: [],
}
