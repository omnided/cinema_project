ARG NODE_VER=16.14.0
# Build
FROM node:${NODE_VER}-alpine AS build

WORKDIR /app

COPY ./package.json package-lock.json ./
RUN npm ci 
COPY . .
RUN npm run build

# Runtime
FROM node:${NODE_VER}-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodejs \
        && adduser -S -G nodejs nonroot

COPY --chown=nonroot:nodejs package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts && npm install dotenv --save-prod && npm cache clean --force

COPY --from=build --chown=nonroot:nodejs /app/dist ./dist

RUN mkdir -p /app/log /app/tmp/hls \
        && chown -R nonroot:nodejs /app/log /app/tmp

USER nonroot

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD wget -q --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]