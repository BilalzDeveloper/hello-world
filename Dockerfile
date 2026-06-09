FROM node:20-slim

# sharp prerequisites (libvips) + CA certs for TLS to Neon/Telegram/Shopify
RUN apt-get update \
  && apt-get install -y --no-install-recommends libvips42 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
