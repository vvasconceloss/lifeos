FROM node:22-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps apps
COPY packages packages

RUN pnpm install --frozen-lockfile

# The Prisma config reads DATABASE_URL via env(); a placeholder is enough to generate the client.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN pnpm --filter @lifeos/api exec prisma generate
RUN pnpm --filter @lifeos/api build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @lifeos/api exec prisma migrate deploy && pnpm --filter @lifeos/api start"]
