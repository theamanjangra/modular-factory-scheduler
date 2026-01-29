# Use official Node.js 20 image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies (Prisma needs openssl)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy app source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build backend
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start command with proper signal handling
CMD ["node", "dist/server.js"]
