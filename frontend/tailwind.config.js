/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          sidebar: '#0b1329',
          sidebarHover: '#131e3d',
          sidebarActive: '#162347',
          sidebarActiveBorder: '#2563eb',
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          borderLight: '#f1f5f9',
          primary: '#2563eb',
          primaryHover: '#1d4ed8',
          success: '#10b981',
          successHover: '#059669',
          danger: '#ef4444',
          dangerHover: '#dc2626',
          warning: '#f59e0b',
          muted: '#64748b',
          text: '#0f172a',
        },
        pastel: {
          blue: '#eef6ff',
          blueBorder: '#dbeafe',
          blueText: '#1d4ed8',
          green: '#ecfdf5',
          greenBorder: '#d1fae5',
          greenText: '#047857',
          orange: '#fff7ed',
          orangeBorder: '#ffedd5',
          orangeText: '#c2410c',
          purple: '#f5f3ff',
          purpleBorder: '#ede9fe',
          purpleText: '#6d28d9',
          red: '#fff1f2',
          redBorder: '#ffe4e6',
          redText: '#be123c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
