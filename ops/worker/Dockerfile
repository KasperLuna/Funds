FROM node:24-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY ops/worker/package.json ops/worker/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile --filter @funds/worker...

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker

# @funds/core is consumed as TS source (exports ./src/index.ts); tsx runs it.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/ops/worker/node_modules ./ops/worker/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY ops/worker/src ops/worker/src
COPY ops/worker/tsconfig.json ops/worker/package.json ops/worker/
COPY packages/core/src packages/core/src
COPY packages/core/package.json packages/core/

# cavetail: WORKDIR must be ops/worker — `--import tsx` resolves from CWD.
WORKDIR /app/ops/worker
USER worker
CMD ["node", "--import", "tsx", "src/index.ts"]
