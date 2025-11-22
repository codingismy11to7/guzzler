# Project: Guzzler

## Project Overview

Guzzler is a full-stack TypeScript monorepo application built
with Effect. It consists of a React-based web UI, a Node.js
backend server, and a MongoDB database layer. The project is
structured as an npm workspace, with separate packages for the
domain logic, MongoDB integration, server, web UI, and utilities.

**Technologies:**

- **Frontend:** React, Vite, Material-UI, i18next
- **Backend:** Node.js, Effect
- **Database:** MongoDB
- **Build:** TypeScript, npm, Vite, tsx
- **Testing:** Vitest

**Architecture:**

The project follows a monorepo architecture, with the following
packages:

- `@guzzlerapp/webui`: The React-based web UI.
- `@guzzlerapp/server`: The Node.js backend server.
- `@guzzlerapp/mongodb`: The MongoDB database layer.
- `@guzzlerapp/domain`: The core business logic and types,
  shared between the server and web UI.
- `@guzzlerapp/utils`: Shared utility functions.

## Building and Running

**Installation:**

```sh
npm install
```

**Building:**

To build all packages in the monorepo:

```sh
npm run build
```

**Running the application:**

To run the backend server in development mode:

```sh
npm run runBackend
```

To run the frontend in development mode:

```sh
npm run runFrontend
```

**Testing:**

To test all packages in the monorepo:

```sh
npm run test
```

## Development Conventions

- **Code Style:** The project uses ESLint and Prettier for code
  formatting and style. Run `npm run lint:fix` to automatically
  fix linting issues.
- **Testing:** The project uses Vitest for testing. Test files are
  located in the `test` directory of each package.
- **Commits:** The project uses [Changesets]
  (<https://github.com/changesets/changesets>) to manage releases.
  When making changes that should be included in the next release,
  create a new changeset by running `npx changeset`. This will
  prompt you for the type of change (patch, minor, or major) and a
  description of the change.

## CI/CD

The project uses GitHub Actions for CI/CD.

- **`check.yml`:** This workflow runs on every push and pull
  request to the `main` branch. It performs the following checks:

  - **Linting:** Checks the code for style issues.
  - **Typechecking:** Checks the code for TypeScript errors.
  - **Docker Build:** Builds a Docker image to ensure the
    application can be containerized.

- **`release.yml`:** This workflow runs on every push to the `main`
  branch. It uses [Changesets]
  (<https://github.com/changesets/changesets>) to automatically
  create a release pull request. When the pull request is merged,
  Changesets will publish the new version of the packages to npm.

