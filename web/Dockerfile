# Debian-slim (not alpine) to avoid musl issues with Tailwind v4 oxide / Turbopack.
FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* must be present at build time (baked into the client bundle).
# In docker-compose the browser reaches the API via the host-mapped port.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
