FROM node:20-slim as base

WORKDIR /app

COPY package.json package-lock.json ./
COPY node_modules/ ./node_modules/
COPY packages/server/dist/ ./dist
RUN npm prune --omit=dev --workspace=./packages/server

ENV NODE_ENV=production

CMD [ "node", "dist" ]
