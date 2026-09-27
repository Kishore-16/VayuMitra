/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "#0c1321",
        "surface-container-lowest": "#070e1c",
        "surface-container-low": "#151b2a",
        "surface-container": "#19202e",
        "surface-container-high": "#232a39",
        "surface-container-highest": "#2e3544",
        "primary": "#adc6ff",
        "primary-container": "#004395",
        "secondary": "#5de6ff",
        "tertiary": "#9bd84a",
        "on-surface": "#dce2f6",
        "on-surface-variant": "#c2c6d6",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        "text-tertiary": "#64748B",
        "aqi-good": "#2E9B4F",
        "aqi-satisfactory": "#8FCB3E",
        "aqi-moderate": "#F4C430",
        "aqi-poor": "#F08C1D",
        "aqi-very-poor": "#E13B3B",
        "aqi-severe": "#8C1D2B",
        "aqi-emergency": "#581845"
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Geist', 'Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
