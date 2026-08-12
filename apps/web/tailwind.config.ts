import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // بديل رمادي/أسود بسيط للأخضر السابق — نفس أسلوب البطاقات والتنقل
        // العائم بالتصميم المرجعي لكن بدرجات محايدة بدل الأحمر.
        brand: {
          50: "#f4f4f5",
          100: "#e4e4e7",
          500: "#52525b",
          600: "#27272a",
          700: "#18181b",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
