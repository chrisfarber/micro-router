import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";

export default defineConfig(
  { ignores: ["**/node_modules", "**/dist"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["packages/react/**/*.{js,jsx,ts,tsx}"],
    extends: [
      eslintPluginReact.configs.flat.recommended,
      eslintPluginReactHooks.configs.flat["recommended-latest"],
    ],
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    rules: {
      // Disable due to bug in @typescript-eslint/unified-signatures v8.46.2
      // causing "typeParameters.params is not iterable" error
      "@typescript-eslint/unified-signatures": "off",
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);
