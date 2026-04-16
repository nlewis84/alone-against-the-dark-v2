module.exports = {
  content: ['./*.html', './src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Libre Baskerville"', 'serif'],
        display: ['"Cinzel"', 'serif'],
      },
      colors: {
        gold: '#d4af37',
        navy: '#000080',
      },
    },
    container: {
      center: true,
      padding: '2rem',
    },
  },
  plugins: [],
}
