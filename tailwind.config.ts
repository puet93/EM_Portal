import type { Config } from 'tailwindcss';

export default {
	content: ['./app/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {},
	},
	darkMode: 'class',
	plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
} satisfies Config;
