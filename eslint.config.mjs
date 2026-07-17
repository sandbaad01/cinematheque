import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",

    // ---- Anti-bloat rules (warn, not error, so they don't block dev) ----
    // Flag files exceeding 1000 lines — consider splitting into modules.
    "max-lines": ["warn", {
      max: 1000,
      skipBlankLines: true,
      skipComments: true,
    }],
    // Flag functions exceeding 250 lines — extract sub-components/helpers.
    "max-lines-per-function": ["warn", {
      max: 250,
      skipBlankLines: true,
      skipComments: true,
      IIFEs: true,
    }],
    // Flag overly complex functions (cyclomatic complexity > 40).
    "complexity": ["warn", 40],
    // Flag functions with too many parameters (> 6).
    "max-params": ["warn", 6],
    // Flag deeply nested blocks (> 6 levels).
    "max-depth": ["warn", 6],
    // Flag too many statements in a function (> 100).
    "max-statements": ["warn", 100],
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "scripts/**", "src-tauri/**", "prisma/**"]
}];

export default eslintConfig;
