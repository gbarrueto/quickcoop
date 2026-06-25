import nextVitals from "eslint-config-next/core-web-vitals"

const baseConfig = Array.isArray(nextVitals) ? nextVitals : [nextVitals]
const eslintConfig = [
	...baseConfig,
	{
		rules: {
			"react-hooks/refs": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/purity": "off",
			"react/no-unescaped-entities": "off",
		},
	},
]

export default eslintConfig