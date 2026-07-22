/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bdgreen: "#0F3D2E",
        bdgreendark: "#0A2B20",
        bdgold: "#D4A73C",
        bdivory: "#F8F5EC",
        bdink: "#2A2A26",
        bdmuted: "#8A8778",
        bdborder: "#E5E0D3",
      },
    },
  },
  plugins: [],
};
