FROM node:22-alpine AS dependencies

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.source="https://github.com/SufiyanAasim/queueless"
LABEL org.opencontainers.image.title="QueueLess"
LABEL org.opencontainers.image.description="QueueLess backend API"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=dependencies --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend ./backend

USER node
EXPOSE 4000
WORKDIR /app/backend

CMD ["node", "src/server.js"]
