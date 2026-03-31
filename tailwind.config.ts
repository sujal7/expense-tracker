import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        void: {
          950: "#03040A",
          900: "#05070F",
          800: "#080C18",
          700: "#0C1120",
          600: "#111828",
          500: "#171F32",
          400: "#1F2940",
        },
        amber: {
          DEFAULT: "#F0A500",
          50: "rgba(240,165,0,0.05)",
          100: "rgba(240,165,0,0.1)",
          200: "rgba(240,165,0,0.2)",
          300: "#D49000",
          400: "#E09800",
          500: "#F0A500",
          600: "#F5B020",
          700: "#FAC040",
        },
        slate: {
          750: "#3D4A60",
          850: "#1E2840",
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "count-up": "countUp 0.8s ease-out forwards",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        card: "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        "card-hover":
          "0 0 0 1px rgba(240,165,0,0.2), 0 8px 32px rgba(0,0,0,0.5)",
        amber: "0 0 20px rgba(240,165,0,0.15)",
        "amber-lg": "0 0 40px rgba(240,165,0,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
