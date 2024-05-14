module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Libre Baskerville"', "serif"],
        display: ['"Cinzel"', "serif"],
      },
      colors: {
        gold: "#d4af37",
        navy: "#000080",
      },
    },
    container: {
      center: true,
      padding: "2rem",
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
