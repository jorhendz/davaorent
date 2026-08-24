import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf9",
          100: "#ccfbef",
          500: "#0d9488",
          600: "#0f766e",
          700: "#115e59",
          900: "#134e4a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
