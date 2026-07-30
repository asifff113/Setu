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
#
# Pinned by digest (not just the `20-slim` tag) so a rebuild months from now
# can't silently pick up a different base image; bump deliberately with
# `docker manifest inspect node:20-slim` when you want to move it forward.
FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS base
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
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=8787
EXPOSE 8787
# Starts as root (needed once, to chown a freshly-mounted DATA_DIR volume —
# see docker-entrypoint.sh) and immediately execs the relay as the image's
# built-in unprivileged `node` user; the container never runs the app as root.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--workspace=relay"]
