/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        washi: '#FDFBF7',
        indigo: '#2C3E50',
        sakura: '#FFB7C5',
        vermilion: '#E67E22',
        ink: '#374151',
        mist: '#F3EFE7',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mincho: ['"Sawarabi Mincho"', 'serif'],
      },
      boxShadow: {
        zen: '0 18px 45px rgba(44, 62, 80, 0.08)',
        soft: '0 8px 24px rgba(44, 62, 80, 0.06)',
      },
      backgroundImage: {
        paper:
          'radial-gradient(circle at top left, rgba(255, 183, 197, 0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(230, 126, 34, 0.12), transparent 28%)',
      },
    },
  },
  plugins: [],
};
