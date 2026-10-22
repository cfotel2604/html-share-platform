FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
# Git checkouts under umask 077 can leave new files root-only after COPY.
# Runtime helpers/migrations are application code, not writable user data.
RUN chmod -R a+rX /app/scripts /app/db
USER node
EXPOSE 3000
CMD ["node", "server.js"]
