import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-img-element": "warn",
      "react/display-name": "off",
      "react/no-children-prop": "warn",
      "@next/next/no-page-custom-font": "off",
      "prefer-const": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/ban-types": "warn",
      "no-empty-pattern": "warn",
      "no-undef": "error",
      "no-unused-expressions": "warn"
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  }
];

export default eslintConfig;