FROM node:20-slim as base

WORKDIR /app

FROM base as build

COPY package.json package-lock.json tsconfig.* ./
COPY packages/ ./packages/
COPY patches/ ./patches/
COPY scripts/ ./scripts/
RUN npm i
RUN npm run build
RUN npm prune --omit=dev --workspace=./packages/server

FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/server/dist /app/dist
COPY --from=build /app/packages/domain/dist /app/packages/domain

ENV NODE_ENV=production

CMD [ "node", "dist" ]
