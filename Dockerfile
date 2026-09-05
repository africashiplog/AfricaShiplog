# syntax=docker/dockerfile:1
#
# Debian-based (not Alpine): Prisma's query engine binary is generated for
# the build machine's platform (glibc) by default. Alpine's musl libc would
# require configuring `binaryTargets` in schema.prisma to add a
# linux-musl-openssl-3.0.x build — slim avoids that class of "works on my
# machine, fails in the container" bug entirely.

FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
# Also the image used by the one-off `migrate`/`seed` compose services below —
# they need the full `prisma` CLI (a devDependency), which the pruned
# standalone runtime image intentionally does not carry.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
