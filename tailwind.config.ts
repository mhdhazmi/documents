import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
// If you want to use tw-animate-css:
// import twAnimateCss from 'tw-animate-css'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Add your custom colors here
      },
      fontFamily: {
        // Add your custom fonts here
      },
    },
  },
  plugins: [
    typography,
    // If you want to use tw-animate-css:
    // twAnimateCss,
  ],
}

export default config