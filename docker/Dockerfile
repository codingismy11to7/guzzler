FROM node:20-slim AS base

WORKDIR /app

FROM base AS build

COPY ../.prettierrc.json eslint.* package.json package-lock.json setupTests.ts tsconfig.* vitest.* ./
COPY ../packages ./packages/
COPY ../patches ./patches/
COPY ../scripts ./scripts/
RUN npm i
RUN npm run build
RUN NODE_OPTIONS=--max_old_space_size=8192 npm run test

RUN npm prune --omit=dev --workspace=./packages/server

FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/server/dist /app/dist
COPY --from=build /app/packages/server/package.json /app
COPY --from=build /app/packages/server/node_modules /app/dist/node_modules
COPY --from=build /app/packages/domain/dist /app/packages/domain
COPY --from=build /app/packages/domain/node_modules /app/packages/domain/node_modules
COPY --from=build /app/packages/mongodb/dist /app/packages/mongodb
COPY --from=build /app/packages/webui/dist /app/webui

ENV NODE_ENV=production
ENV PORT=8080
ENV WEBUI_DIR=/app/webui
ENV LOG_LEVEL=Info

ENV MONGO_URL=mongodb://localhost:27017
ENV MONGO_DATABASE=guzzler

EXPOSE 8080

CMD [ "node", "--experimental-default-type=module", "dist/dist/esm/server.js" ]
