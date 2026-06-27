import nextVitals from "eslint-config-next/core-web-vitals"
import unusedImports from "eslint-plugin-unused-imports"

const baseConfig = Array.isArray(nextVitals) ? nextVitals : [nextVitals]
const eslintConfig = [
	{
		// scripts/ is local-only Python prototyping (gitignored) — its vendored
		// venv packages aren't even valid JS/TS and shouldn't be linted at all.
		ignores: ["scripts/**"],
	},
	...baseConfig,
	{
		plugins: {
			"unused-imports": unusedImports,
		},
		rules: {
			"no-unused-vars": "off",
			"unused-imports/no-unused-imports": "error",
			"unused-imports/no-unused-vars": [
				"warn",
				{
					vars: "all",
					varsIgnorePattern: "^_",
					args: "after-used",
					argsIgnorePattern: "^_",
				},
			],
			"react-hooks/refs": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/purity": "off",
			"react/no-unescaped-entities": "off",
		},
	},
]

export default eslintConfig