FROM node:20-slim as base

WORKDIR /app

FROM base as build

COPY package.json package-lock.json tsconfig.* ./
COPY packages/ ./packages/
COPY patches/ ./patches/
COPY scripts/ ./scripts/
RUN npm i
RUN npm run build
RUN NODE_OPTIONS=--max_old_space_size=8192 npm run test

RUN npm prune --omit=dev --workspace=./packages/server

FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/server/dist /app/dist
COPY --from=build /app/packages/domain/dist /app/packages/domain
COPY --from=build /app/packages/webui/dist /app/webui

ENV NODE_ENV=production
ENV WEBUI_DIR=/app/webui

CMD [ "node", "dist" ]
