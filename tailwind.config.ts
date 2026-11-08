import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#0D2B22",
          50: "#F0F7F4",
          100: "#DCECE5",
          200: "#B8D9CB",
          300: "#8BBEAA",
          400: "#5C9E85",
          500: "#3B7F66",
          600: "#28634E",
          700: "#1B4B3A",
          800: "#133B2E",
          900: "#0D2B22",
          950: "#071813",
        },
        gold: {
          DEFAULT: "#C9A96E",
          50: "#FBF8F1",
          100: "#F5EFE0",
          200: "#EBDEC0",
          300: "#DFC89B",
          400: "#D4B87E",
          500: "#C9A96E",
          600: "#B38E4F",
          700: "#8F6E39",
          800: "#6E542B",
          900: "#523E20",
        },
        cream: {
          DEFAULT: "#F8F5EE",
          50: "#FDFCFA",
          100: "#F8F5EE",
          200: "#EFE9DB",
          300: "#E4DBC5",
          400: "#D5C8A8",
        },
        charcoal: {
          DEFAULT: "#1A1D1C",
          50: "#F4F5F5",
          100: "#E2E5E4",
          200: "#C5CBC9",
          300: "#9FA8A5",
          400: "#78837F",
          500: "#5B6561",
          600: "#464E4B",
          700: "#363D3A",
          800: "#262B29",
          900: "#1A1D1C",
          950: "#0E100F",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        luxury: "0 20px 50px -12px rgba(13, 43, 34, 0.14)",
        "gold-glow": "0 0 25px -5px rgba(201, 169, 110, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;

