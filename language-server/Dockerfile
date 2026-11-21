FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends clangd g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs framing.mjs ./
ENV PORT=6061 HOST=0.0.0.0
USER node
EXPOSE 6061
CMD ["node", "server.mjs"]
