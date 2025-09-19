const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const jest = require("eslint-plugin-jest");

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "*.d.ts"],
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "jest": jest,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-console": "off",
      "quotes": ["error", "single"],
      "linebreak-style": ["error", "unix"],
      "semi": ["error", "never"],
      "max-len": ["warn", { "code": 120 }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "error",
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  {
    files: ["*.js"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];