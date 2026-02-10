FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock* bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/
RUN bun run --filter @claude-share/web build

FROM oven/bun:1.2-slim
WORKDIR /app
COPY --from=build /app/packages/web/dist ./dist
VOLUME /app/data
ENV DATABASE_PATH=/app/data/sessions.db
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "./dist/server/index.js"]
