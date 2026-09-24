import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8eb",
          100: "#fdeecd",
          200: "#fbdb97",
          300: "#f8c25b",
          400: "#f5a525",
          500: "#f18805", // Vibrant Festival Amber / Gold
          600: "#d76702",
          700: "#ad4804",
          800: "#8c380b",
          900: "#732f0d",
          950: "#411503",
        },
        festive: {
          crimson: "#d90429",
          ruby: "#ef233c",
          gold: "#ffb703",
          spark: "#fb8500",
          night: "#0d1117",
          deepNavy: "#0b132b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
      boxShadow: {
        festive: "0 0 25px -5px rgba(241, 136, 5, 0.3)",
        spark: "0 0 15px 2px rgba(255, 183, 3, 0.4)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
