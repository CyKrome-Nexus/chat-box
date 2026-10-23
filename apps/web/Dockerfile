# syntax=docker/dockerfile:1.7
# Build context: repository root (docker build -f apps/web/Dockerfile .)
# Set API_URL at runtime; VITE_API_URL only provides a build-time fallback.

FROM node:22-alpine AS build
WORKDIR /repo
ENV MONGOMS_DISABLE_POSTINSTALL=1
RUN npm install -g pnpm@12.4.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN sed -i 's/^nodeLinker: hoisted/nodeLinker: isolated/' pnpm-workspace.yaml \
  && pnpm install --frozen-lockfile --filter "@chatbox/web..."

COPY packages ./packages
COPY apps/web ./apps/web
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @chatbox/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY --chmod=755 apps/web/runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
