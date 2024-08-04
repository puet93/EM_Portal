import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
	content: ['./app/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter var', ...defaultTheme.fontFamily.sans],
			},
		},
	},
	darkMode: 'class',
	plugins: [
		require('@tailwindcss/typography'),
		require('@tailwindcss/forms'),
	],
} satisfies Config;
