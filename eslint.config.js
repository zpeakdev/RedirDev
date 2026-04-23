import { defineConfig } from "eslint/config";
import js from "@eslint/js"; // ESLint 官方提供的 JavaScript 基础规则集
import tseslint from "typescript-eslint"; // ypeScript 官方维护的 一体化 ESLint 支持包
import reactHooks from "eslint-plugin-react-hooks"; // React 官方团队亲自维护 的 Hooks 专属规则集。
import globals from "globals"; // 提供各运行环境的 全局变量字典（如 window, document, process, __dirname 等）
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * ESLint Flat Config 配置文件
 * @see https://eslint.org/docs/latest/use/configure/configuration-files#flat-configs
 * @type {import("eslint").ESLint.ConfigData[]}
 */
export default defineConfig([
  { ignores: ["**/node_modules/**", "**/dist/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 注入 React Hooks 规则
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn", // Hook 依赖项检查（警告即可，避免过度拦截）
    },
  },

  {
    settings: {
      react: { version: "detect" }, // 自动读取 package.json 中的 React 版本
    },
    languageOptions: {
      globals: {
        ...globals.browser, // 浏览器环境全局变量，如 window、document 等
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error", // 强制使用 type-only imports，保持类型导入和代码导入的清晰分离

      "@typescript-eslint/no-explicit-any": "error", // 禁止使用 any 类型，强制使用更具体的类型定义

      "@typescript-eslint/no-unused-vars": "warn", // TS 未使用变量警告

      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true, // 允许短路表达式（如 condition && doSomething()）
          allowTernary: false, // 允许三元表达式（如 condition ? doSomething() : null）
        },
      ], // 允许未使用的表达式（如短路运算符），避免过度限制代码风格
    },
  },

  // 关闭与 Prettier 冲突的 ESLint 规则，确保代码格式由 Prettier 统一管理
  eslintConfigPrettier,
]);
