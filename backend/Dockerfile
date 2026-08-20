# Use official Node.js LTS Alpine image (smaller footprint)
FROM node:18-alpine

# Add a non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (required for the build)
RUN npm ci && npm cache clean --force

COPY prisma ./prisma

# Copy the rest of the app
COPY . .

# Build TypeScript
RUN npm run build

RUN npm prune --production

# Hand ownership over to the non-root user
RUN chown -R backend:nodejs /app
USER backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').request('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()" || exit 1

CMD ["sh", "-c", "npx prisma generate && npm start"]
