import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        laptop: "1500px",
        tab: "1124px",
        tabsmall: "800px",
        mobile: "700px",
      },

      /* ✅ COLORS — unchanged */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground":
            "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground":
            "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* ✅ ADD THESE KEYFRAMES */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        /* 🔥 Google thinking animations */
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        diagonalMove: {
          "0%": {
            transform: "translateX(-20px) translateY(-20px)",
          },
          "33%": {
            transform: "translateX(calc(100% + 20px)) translateY(-20px)",
          },
          "66%": {
            transform: "translateX(calc(100% + 20px)) translateY(calc(100% + 20px))",
          },
          "100%": {
            transform: "translateX(-20px) translateY(-20px)",
          },
        },
        diagonalMovesc: {
          "0%": {
            transform: "translateX(-20px) translateY(-20px)",
          },
          "33%": {
            transform: "translateX(calc(300% + 20px)) translateY(-20px)",
          },
          "66%": {
            transform: "translateX(calc(300% + 20px)) translateY(calc(400% + 20px))",
          },
          "100%": {
            transform: "translateX(-20px) translateY(-20px)",
          },
        },
        blob: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        shine: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },

      /* ✅ ADD THESE ANIMATIONS */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        /* 🔥 Google-like thinking */
        orbitSlow: "orbit 10s linear infinite",
        blobSlow: "blob 2s ease-in-out infinite",
        diagonal: "diagonalMove 3s linear infinite",
        diagonalsc: "diagonalMovesc 3s linear infinite",
        shine: "shine 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
