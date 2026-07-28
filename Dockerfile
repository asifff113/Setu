# Builds the PWA (app/) and serves it as static files from the relay
# (relay/) in a single container — "deploy relay+app" as one unit.
#
# The relay itself runs straight from TypeScript via `tsx` (see
# relay/package.json "start"), so there is no separate relay compile step;
# `npm run build -w relay` only type-checks (tsc with noEmit).
#
# better-sqlite3 is a native addon (used by the relay in a later phase); the
# base stage carries a C++ toolchain so `npm ci` can fall back to a source
# build if no prebuilt binary matches the target platform.

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

# ---- deps: full install (incl. devDependencies) for building the app ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY relay/package.json ./relay/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci

# ---- build: compile the React app to static assets ----
FROM deps AS build
COPY . .
RUN npm run build -w app

# ---- runtime: relay (via tsx) + prebuilt app, production deps only ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY relay/package.json ./relay/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci --omit=dev
COPY shared/src ./shared/src
COPY relay/src ./relay/src
COPY relay/tsconfig.json ./relay/tsconfig.json
COPY --from=build /repo/app/dist ./app/dist

ENV PORT=8787
EXPOSE 8787
CMD ["npm", "run", "start", "--workspace=relay"]
