/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#07090C",
          900: "#0B0D10", // Primary page background
          850: "#0F1216",
          800: "#12161C", // Main surface
          750: "#151A21",
          700: "#181D25", // Elevated surface
          650: "#1D232C",
          600: "#222A35", // Subtle border
          500: "#2B3542", // Interactive border
          400: "#384556", // Active/Focus border
          300: "#596573",
          200: "#9AA5B1", // Secondary cool grey text
          100: "#CBD5E1",
          50:  "#E8EDF3", // Primary soft white text
        },
        brand: {
          teal: "#66D9C0", // Restrained mint-teal accent
          tealDark: "#0F3D33",
          tealMuted: "#1B5E4F",
          tealLight: "#95E6D4",
        },
        status: {
          error: "#EF4444",
          errorSurface: "#1F1214",
          errorBorder: "#4A1D24",
          warning: "#F59E0B",
          warningSurface: "#22190B",
          warningBorder: "#523B14",
          success: "#10B981",
          successSurface: "#0C2018",
          successBorder: "#1B4D3A",
          info: "#38BDF8",
          infoSurface: "#0C1F2B",
          infoBorder: "#1A445C",
        },
      },
      fontFamily: {
        sans: [
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },
      borderRadius: {
        xs: "3px",
        sm: "5px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
        elevated: "0 4px 12px 0 rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
