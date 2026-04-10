# Node 20 matches package.json engines; Prisma + FFmpeg for media
FROM node:20-alpine

WORKDIR /app

# curl: Docker HEALTHCHECK; libc6-compat/openssl: Prisma; ffmpeg: video optimization
RUN apk add --no-cache libc6-compat openssl ffmpeg curl

COPY package*.json ./

# Full install so `prisma` CLI exists for `prisma generate` and runtime `migrate deploy`
RUN npm ci && npm cache clean --force

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

RUN addgroup -g 1001 -S nodejs
RUN adduser -S vaastu -u 1001
RUN chown -R vaastu:nodejs /app
USER vaastu

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["npm", "start"]
