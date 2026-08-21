/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#D85A30",
          hover: "#C24F28",
          dark: "#993C1D",
          tint: "#FAECE7",
        },
        cream: "#F5F1E8",
        trust: {
          DEFAULT: "#185FA5",
          tint: "#E6F1FB",
          dark: "#0C447C",
        },
        sage: {
          DEFAULT: "#639922",
          tint: "#EAF3DE",
          dark: "#3B6D11",
        },
        amber: {
          DEFAULT: "#BA7517",
          tint: "#FAEEDA",
          dark: "#854F0B",
        },
        danger: {
          DEFAULT: "#A32D2D",
          tint: "#FCEBEB",
        },
        ink: {
          DEFAULT: "#2C2C2A",
          secondary: "#5F5E5A",
          muted: "#888780",
        },
        border: "#E3DECE",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "SUIT",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: {
        app: "28rem",
      },
      boxShadow: {
        card: "0 2px 10px rgba(44, 44, 42, 0.06)",
        sheet: "0 -4px 20px rgba(44, 44, 42, 0.10)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
