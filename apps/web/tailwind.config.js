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
        // Space Black × Obsidian × Dark Titanium System
        space: {
          950: "#050607", // Main background: near-black space
          900: "#090B0E", // Secondary background: deep graphite
          850: "#0D1014", // Panel surface: obsidian
          800: "#12161C", // Raised surface: dark titanium
          750: "#151A21", // Elevated surface
          700: "#191E25", // Hover surface
          650: "#1D232C",
          600: "#202630", // Subtle metallic border
          500: "#28323F", // Interactive border
          400: "#364354", // Active/Focus border
          300: "#626C79", // Muted metadata
          200: "#929AA6", // Secondary text
          100: "#CBD5E1", // Cool silver text
          50:  "#E8EAF0", // Primary soft silver-white text
        },
        // Backward-compatible graphite alias mapped to the space-black tokens
        graphite: {
          950: "#050607", // near-black space
          900: "#090B0E", // deep graphite
          850: "#0D1014", // obsidian
          800: "#12161C", // dark titanium
          750: "#151A21",
          700: "#191E25", // hover
          650: "#1D232C",
          600: "#202630", // subtle border
          500: "#28323F", // interactive border
          400: "#364354", // active border
          300: "#626C79", // muted metadata
          200: "#929AA6", // secondary text
          100: "#CBD5E1", // cool silver
          50:  "#E8EAF0", // soft silver-white
        },
        brand: {
          teal: "#4E9F8E",       // Extremely restrained desaturated teal
          tealDark: "#0E2922",   // Deep muted obsidian-teal
          tealMuted: "#174338",  // Restrained container
          tealLight: "#76C7B7",  // Highlight
          silver: "#E8EAF0",     // Primary silver
          platinum: "#D1D5DB",   // Primary accent
        },
        status: {
          error: "#FB7185",
          errorSurface: "#190B0E",
          errorBorder: "#38141B",
          warning: "#FBBF24",
          warningSurface: "#191408",
          warningBorder: "#38290E",
          success: "#34D399",
          successSurface: "#0A1912",
          successBorder: "#173B2B",
          info: "#38BDF8",
          infoSurface: "#0A1622",
          infoBorder: "#153046",
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
        xs: "2px",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.6)",
        panel: "0 4px 20px -2px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        elevated: "0 8px 30px -4px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        floating: "0 16px 40px -8px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        insetControl: "inset 0 1px 2px 0 rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};
