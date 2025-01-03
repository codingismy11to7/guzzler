FROM node:20-slim as base

WORKDIR /app

COPY node_modules/ ./node_modules/
COPY packages/server/dist/ ./dist
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD [ "node", "dist" ]
