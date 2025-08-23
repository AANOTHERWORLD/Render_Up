# ---- deps ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Use npm ci if you have a lockfile; otherwise this falls back to install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
# devDependencies (typescript) are present here from deps stage
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
# prune dev deps for a small, secure image
RUN npm prune --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8787
CMD ["node", "dist/index.js"]
