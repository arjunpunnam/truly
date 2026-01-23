# =============================================================================
# Truly Rule Engine - All-in-One Docker Image
# =============================================================================
# Single image with frontend + backend, using SQLite for data storage.
#
# Usage:
#   docker build -t truly/rule-engine .
#   docker run -p 3000:80 -v truly-data:/data truly/rule-engine
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (using Bun for speed)
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY frontend/ ./
RUN bun run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend
# -----------------------------------------------------------------------------
FROM eclipse-temurin:17-jdk AS backend-builder

WORKDIR /app/backend

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy Maven files first (for layer caching)
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source and build
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM eclipse-temurin:17-jre

# Install nginx and supervisor
RUN apt-get update && \
    apt-get install -y nginx supervisor curl && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /var/www/html/*

WORKDIR /app

# Create data directory for SQLite with proper permissions
RUN mkdir -p /data && chmod 777 /data

# Copy backend JAR
COPY --from=backend-builder /app/backend/target/*.jar /app/backend.jar

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/truly.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80 (nginx serves both frontend and proxies API)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

# Environment variables - SQLite only
ENV SPRING_PROFILES_ACTIVE=sqlite \
    SQLITE_PATH=/data/ruleengine.db \
    JAVA_OPTS="-Xms256m -Xmx512m"

# Volume for persistent data
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
