import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        festive: {
          obsidian: "#07090e",
          night:    "#0c1017",
          surface:  "#131926",
          cardDark: "#161d2d",
          crimson:  "#e11d48",
          ruby:     "#f43f5e",
          gold:     "#f59e0b",
          goldLight:"#fef08a",
          amber:    "#f97316",
          spark:    "#ffb703",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-heading)", "Georgia", "serif"],
      },
      boxShadow: {
        festive: "0 0 40px -4px rgba(245, 158, 11, 0.35), 0 10px 30px -10px rgba(0,0,0,0.5)",
        spark:   "0 0 25px 2px rgba(245, 158, 11, 0.3), 0 4px 16px rgba(0,0,0,0.3)",
        glow:    "0 0 50px 10px rgba(245, 158, 11, 0.2)",
        goldGlow:"0 0 20px 2px rgba(253, 230, 138, 0.4)",
      },
      backgroundImage: {
        "festive-radial": "radial-gradient(circle at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 60%), radial-gradient(circle at 100% 100%, rgba(225,29,72,0.1) 0%, transparent 50%)",
        "hero-gradient":  "linear-gradient(180deg, #07090e 0%, #0f1420 50%, #07090e 100%)",
        "card-glass":     "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "gold-gradient":  "linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1",    transform: "scale(1)" },
          "50%":      { opacity: "0.85", transform: "scale(1.02)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition:  "1000px 0" },
        },
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-glow":  "pulseGlow 3s ease-in-out infinite",
        "shimmer":     "shimmer 2s infinite linear",
        "fade-in-up":  "fadeInUp 0.5s ease-out both",
        "scale-in":    "scaleIn 0.3s ease-out both",
        "float":       "float 4s ease-in-out infinite",
      },
      scale: {
        "108": "1.08",
      },
    },
  },
  plugins: [],
};
export default config;
