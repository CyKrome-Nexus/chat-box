# syntax=docker/dockerfile:1.7
# Build context: repository root (docker build -f apps/api/Dockerfile .)

FROM node:22-alpine AS build
WORKDIR /repo
ENV MONGOMS_DISABLE_POSTINSTALL=1
RUN npm install -g pnpm@12.4.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
# The workspace hoists for React Native; server images only need an isolated slice.
RUN sed -i 's/^nodeLinker: hoisted/nodeLinker: isolated/' pnpm-workspace.yaml \
  && pnpm install --frozen-lockfile --filter "@chatbox/api..."

COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @chatbox/api build \
  && node -e "const v=require('./apps/api/node_modules/@node-rs/argon2/package.json').version;require('fs').writeFileSync('apps/api/dist/package.json',JSON.stringify({type:'module',private:true,dependencies:{'@node-rs/argon2':v}}))"

FROM node:22-alpine AS runtime
ARG GIT_SHA=dev
ENV NODE_ENV=production \
  GIT_SHA=${GIT_SHA} \
  HOST=0.0.0.0 \
  PORT=4000 \
  UPLOAD_DIR=/data/uploads
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=build /repo/apps/api/dist/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /repo/apps/api/dist ./dist

RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
VOLUME ["/data/uploads"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
