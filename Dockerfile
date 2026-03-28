# Stage 1: Build Vue client
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
ARG VITE_JWT_TOKEN
ENV VITE_JWT_TOKEN=$VITE_JWT_TOKEN
RUN cd client && npm run build

# Stage 2: Build NestJS API
FROM node:22-alpine AS api-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
COPY --from=client-builder /app/public ./public
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=api-builder /app/dist ./dist
COPY --from=api-builder /app/public ./public
EXPOSE 3000
CMD ["node", "dist/main"]
