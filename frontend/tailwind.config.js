/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                sky: {
                    DEFAULT: '#00BFFF',
                    dark: '#009FD4',
                    darker: '#007FAA',
                    light: '#E0F8FF',
                    lighter: '#F0FCFF',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0,0,0,.05)',
                'card': '0 0 0 1px rgba(0,191,255,.10), 0 2px 8px rgba(0,191,255,.08)',
                'card-hover': '0 0 0 1.5px rgba(0,191,255,.30), 0 6px 20px rgba(0,191,255,.15)',
                'btn': '0 4px 14px rgba(0,191,255,.35)',
                'logo': '0 6px 20px rgba(0,191,255,.30)',
            },
            animation: {
                'fade-up': 'fadeUp 0.5s ease both',
                'fade-in': 'fadeIn 0.4s ease both',
                'slide-in': 'slideIn 0.35s cubic-bezier(.16,1,.3,1) both',
                'scale-in': 'scaleIn 0.3s cubic-bezier(.16,1,.3,1) both',
                'pulse-dot': 'pulseDot 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
                'stagger-1': 'fadeUp 0.5s .1s ease both',
                'stagger-2': 'fadeUp 0.5s .2s ease both',
                'stagger-3': 'fadeUp 0.5s .3s ease both',
                'stagger-4': 'fadeUp 0.5s .4s ease both',
            },
            keyframes: {
                fadeUp: { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'none' } },
                fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
                slideIn: { from: { opacity: 0, transform: 'translateX(-16px)' }, to: { opacity: 1, transform: 'none' } },
                scaleIn: { from: { opacity: 0, transform: 'scale(.94)' }, to: { opacity: 1, transform: 'scale(1)' } },
                pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } },
                float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(.16,1,.3,1)',
                'smooth': 'cubic-bezier(.4,0,.2,1)',
            },
        },
    },
    plugins: [],
};
