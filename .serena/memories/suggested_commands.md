# Suggested Commands

## Development
- `npm run runBackend` - Start backend dev server (nodemon + tsx)
- `npm run runFrontend` - Start frontend dev server (Vite)
- `npm run dev -w @guzzlerapp/server` - Start backend directly
- `npm run dev -w @guzzlerapp/webui` - Start frontend directly

## Building
- `npm run build` - Build all packages (tsc + workspace builds)
- `npm run check` - TypeScript type checking (no emit)
- `npm run check:watch` - TypeScript type checking in watch mode
- `npm run codegen` - Run codegen across all workspaces (generates exports/index for Effect packages)

## Testing
- `npm test` - Run all tests (vitest --run)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run coverage` - Run tests with coverage
- `npm test -w @guzzlerapp/server` - Run tests for a specific package

## Linting & Formatting
- `npm run lint` - Run ESLint (zero warnings allowed)
- `npm run lint:fix` - Run codegen then ESLint with auto-fix

## Cleanup
- `npm run clean` - Clean build artifacts
- `npm run clean:modules` - Clean build artifacts and node_modules

## Release
- `npm run changeset-version` - Version packages with changesets
- `npm run changeset-publish` - Build, test, and publish with changesets

## System utilities
- `git` - version control
- `tsx` - run TypeScript files directly
- `nix develop` - enter the Nix dev shell (auto via direnv)
