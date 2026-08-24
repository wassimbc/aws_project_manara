# What this file does:
# This Dockerfile builds the Auth service container image.
# It uses a multi-stage build: Stage 1 installs and compiles everything,
# Stage 2 creates a small production image with only what is needed to run the app.
# The final image is much smaller than if we had done everything in one stage.

# =============================
# Stage 1: Builder
# This stage installs all dependencies and compiles TypeScript to JavaScript.
# It is thrown away after Stage 2 copies what it needs.
# =============================
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files first. Docker caches this layer, so if package.json has not changed,
# npm install is skipped on the next build. This makes rebuilds much faster.
COPY package*.json ./

# Install all dependencies (including dev deps needed for TypeScript compilation)
RUN npm install

# Copy all source files
COPY . .

# Compile TypeScript to JavaScript (output goes to dist/)
RUN npm run build

# =============================
# Stage 2: Production
# This stage creates the final image that runs in AWS ECS.
# It only contains what is needed to run the compiled app, keeping the image small.
# =============================
FROM node:20-alpine AS production

# dumb-init is a tiny process manager that handles signals correctly.
# Without it, Docker sends SIGTERM to PID 1 (node), but node does not always
# forward signals to child processes. dumb-init solves this.
# ECS sends SIGTERM when stopping a task for graceful shutdown.
RUN apk add --no-cache dumb-init

# Create a non-root user for security.
# Running containers as root is a security risk because if the app is compromised,
# the attacker has root access inside the container.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only the production dependencies (no dev tools like TypeScript compiler)
COPY package*.json ./
RUN npm install --only=production

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Switch to the non-root user
USER appuser

# Tell Docker this container listens on port 3001
EXPOSE 3001

# Health check: Docker will call this every 30 seconds to see if the container is healthy.
# If it fails 3 times, Docker marks the container as unhealthy.
# wget is available on Alpine and is lighter than curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# dumb-init is PID 1. It starts node and correctly forwards signals.
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the compiled application
CMD ["node", "dist/server.js"]
