import js from "@eslint/js";
import codegen from "eslint-plugin-codegen";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import preferArrow from "eslint-plugin-prefer-arrow";
import prettier from "eslint-plugin-prettier";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config([
  {
    ignores: ["**/dist", "**/build", "**/docs", "**/*.md"]
  },
  {
    settings: {react: {version: "19.0"}},

    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],

    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: ["scripts/*.mts"],
      }
    },

    linterOptions: {
      reportUnusedDisableDirectives: "error"
    },

    plugins: {
      "@stylistic": stylistic,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
      "import": importPlugin,
      "prefer-arrow": preferArrow,
      prettier,
      codegen,
    },

    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {allowConstantExport: true},
      ],
      "@stylistic/quotes": [
        "warn",
        "double",
        {
          "avoidEscape": true
        }
      ],
      "@stylistic/type-annotation-spacing": "warn",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/array-type": [
        "warn",
        {
          "default": "array-simple"
        }
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/dot-notation": "error",
      "@typescript-eslint/explicit-member-accessibility": [
        "off",
        {
          "accessibility": "explicit"
        }
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/indent": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/member-delimiter-style": "off",
      "@typescript-eslint/member-ordering": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-parameter-properties": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/semi": "off",
      "@typescript-eslint/triple-slash-reference": [
        "error",
        {
          "path": "always",
          "types": "prefer-import",
          "lib": "always"
        }
      ],
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/unified-signatures": "error",
      "arrow-body-style": "warn",
      "arrow-parens": "off",
      "brace-style": "off",
      "camelcase": "off",
      "codegen/codegen": "error",
      "comma-dangle": "off",
      "complexity": "off",
      "constructor-super": "error",
      "curly": "off",
      "eol-last": "off",
      "eqeqeq": [
        "error",
        "smart"
      ],
      "guard-for-in": "error",
      "id-blacklist": "off",
      "id-match": "off",
      "import/no-useless-path-segments": "warn",
      "import/order": [
        "warn",
        {
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          },
          "groups": [["builtin", "external"], "parent", "sibling", "index"]
        }
      ],
      "max-classes-per-file": "off",
      "max-len": "off",
      "new-parens": "off",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-cond-assign": "error",
      "no-console": "warn",
      "no-debugger": "error",
      "no-empty": "warn",
      "no-eval": "error",
      "no-fallthrough": "warn",
      "no-invalid-this": "off",
      "no-multiple-empty-lines": "off",
      "no-new-wrappers": "error",
      "no-shadow": [
        "off",
        {
          "hoist": "all"
        }
      ],
      "no-throw-literal": "error",
      "no-trailing-spaces": "off",
      "no-undef-init": "error",
      "no-underscore-dangle": "off",
      "no-unsafe-finally": "error",
      "no-unused-labels": "error",
      "no-var": "error",
      "object-shorthand": "warn",
      "one-var": [
        "error",
        "never"
      ],
      "prefer-arrow/prefer-arrow-functions": [
        "error",
        {
          "allowStandaloneDeclarations": true
        }
      ],
      "prefer-const": "error",
      "prettier/prettier": "warn",
      "quote-props": "off",
      "radix": "error",
      "react/jsx-curly-brace-presence": [
        "warn",
        "never"
      ],
      "react/self-closing-comp": [
        "warn",
        {
          "component": true,
          "html": true
        }
      ],
      "react-hooks/exhaustive-deps": [
        "warn",
        {
          "enableDangerousAutofixThisMayCauseInfiniteLoops": true
        }
      ],
      "space-before-function-paren": "off",
      "spaced-comment": "off",
      "use-isnan": "error",
      "valid-typeof": "warn",
    },
  }
])
