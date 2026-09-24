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
          50:  "#fff8eb",
          100: "#fdeecd",
          200: "#fbdb97",
          300: "#f8c25b",
          400: "#f5a525",
          500: "#f18805",
          600: "#d76702",
          700: "#ad4804",
          800: "#8c380b",
          900: "#732f0d",
          950: "#411503",
        },
        festive: {
          crimson:  "#d90429",
          ruby:     "#ef233c",
          gold:     "#ffb703",
          spark:    "#fb8500",
          night:    "#0d1117",
          deepNavy: "#0b132b",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        festive: "0 0 32px -4px rgba(241, 136, 5, 0.40), 0 4px 24px -4px rgba(0,0,0,0.5)",
        spark:   "0 0 20px 2px rgba(255, 183, 3, 0.35), 0 2px 12px rgba(0,0,0,0.4)",
        glow:    "0 0 40px 8px rgba(241, 136, 5, 0.25)",
      },
      backgroundImage: {
        "festive-radial": "radial-gradient(circle at 20% 20%, rgba(241,136,5,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(217,4,41,0.08) 0%, transparent 50%)",
        "hero-gradient":  "linear-gradient(135deg, #0d1117 0%, #1a0a00 40%, #0d1117 100%)",
        "card-glass":     "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
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
          "50%":      { transform: "translateY(-8px)" },
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
