# Use official Node.js 20 image (matching app.yaml)
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies (Prisma needs openssl)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install latest npm for reliability
RUN npm install -g npm@latest

# Copy dependency files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies using clean install (ci) for reproducibility
RUN npm ci --legacy-peer-deps
RUN cd client && npm ci --legacy-peer-deps

# Copy app source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build everything
RUN npm run build
RUN cd client && npm run build

# Expose port
EXPOSE 8080

# Start command
CMD [ "node", "dist/server.js" ]
