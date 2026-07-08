# ---- Stage 1: Build ----
FROM mcr.microsoft.com/playwright:v1.48.0-noble AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---- Stage 2: Run ----
FROM mcr.microsoft.com/playwright:v1.48.0-noble AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# No CMD here — decided per-service in docker-compose.yml
# this one image serves both the API and the worker role