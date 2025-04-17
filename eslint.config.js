// eslint.config.js
const typescriptEslintPlugin = require("@typescript-eslint/eslint-plugin")
const prettierPlugin = require("eslint-plugin-prettier")
const typescriptEslintParser = require("@typescript-eslint/parser")

module.exports = [
	{
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module"
			}
		},
		plugins: {
			"@typescript-eslint": typescriptEslintPlugin,
			"prettier": prettierPlugin
		},
		rules: {
			// ESLint recommended rules
			"no-console": "warn",
			"no-debugger": "warn",
			"eqeqeq": "error",
			"curly": ["error", "all"],

			// TypeScript-specific rules
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/explicit-function-return-type": "off",

			// Prettier integration
			"prettier/prettier": "error"
		}
	}
]
