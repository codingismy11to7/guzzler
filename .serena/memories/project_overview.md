# Guzzler - Project Overview

## Purpose
Guzzler is a full-stack web application for tracking vehicles and fuel/gas usage (MPG tracking). It handles auto management, fuel fillups, backup/restore, and user preferences.

## Repository
- GitHub: `codingismy11to7/guzzler`
- Monorepo using npm workspaces

## Tech Stack
- **Language**: TypeScript (strict mode, ES2022 target, NodeNext modules)
- **Core Library**: [Effect](https://effect.website/) - used extensively for functional programming patterns (services, layers, effects, pipes)
- **Backend**: Node.js with `@effect/platform-node`, MongoDB, OAuth2 authentication
- **Frontend**: React 19, MUI (Material UI) 7, Vite, Zustand for state, i18next for i18n, type-route for routing
- **Database**: MongoDB (via `@guzzlerapp/mongodb` package)
- **Testing**: Vitest with `@effect/vitest`
- **Build**: TypeScript compiler + Babel (for CJS/ESM builds) + `@effect/build-utils`
- **Dev Environment**: Nix flake (Node.js 24, uv), direnv

## Package Structure
- `packages/domain` (`@guzzlerapp/domain`) - Shared domain models and API schemas (Effect Schema)
- `packages/mongodb` (`@guzzlerapp/mongodb`) - MongoDB integration layer
- `packages/server` (`@guzzlerapp/server`) - Backend server (HTTP API, OAuth2, sessions, importers)
- `packages/webui` (`@guzzlerapp/webui`) - React frontend SPA
- `packages/utils` (`@guzzlerapp/utils`) - Shared utilities

## Key Patterns
- Heavily uses Effect's service/layer pattern for dependency injection
- Effect Schema for data validation and serialization
- Functional style: arrow functions preferred, pipes, no classes (except Effect service patterns)
- ESM-first with CJS build output for published packages
