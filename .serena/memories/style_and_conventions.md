# Code Style & Conventions

## Formatting (Prettier)
- Double quotes (`"`)
- Arrow parens: avoid (single param without parens)
- Print width: 80
- Trailing commas: all

## TypeScript
- Strict mode enabled, strictNullChecks
- ES2022 target, NodeNext module system
- ESM-first (`"type": "module"` in package.json)
- `.js` extensions in imports (e.g., `./AppConfig.js`)

## Naming
- camelCase for variables and functions
- PascalCase for types, interfaces, classes, and Effect services/layers
- Files: PascalCase for modules exporting services/types (e.g., `AppConfig.ts`), camelCase for internal utilities

## Code Style
- **Arrow functions preferred** (`prefer-arrow/prefer-arrow-functions` enforced)
- `const` preferred over `let`
- Object shorthand enforced
- No `var`
- `===` (smart eqeqeq)
- No bitwise operators
- No console.log (warning)
- Import order: alphabetized, grouped (builtin/external, parent, sibling, index)

## Effect Patterns
- Services defined using Effect's `Context.Tag` / service pattern
- Layers for dependency injection (`*Live` naming convention)
- `pipe()` for composition
- Effect Schema for data modeling
- Functional composition over class hierarchies

## React (webui)
- React 19 with JSX runtime (no `import React` needed)
- Self-closing components and HTML tags
- No unnecessary curly braces in JSX
- React hooks rules enforced
- MUI components for UI
- Zustand for state management
- i18next for internationalization (import from local i18n.ts, not react-i18next directly)
