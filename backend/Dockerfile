# Use multi-stage build for smaller final image
# Using Debian-based image for better ARM64 support
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app
COPY pom.xml .
COPY src ./src

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /data

# Copy the built jar
COPY --from=builder /app/target/*.jar app.jar

# Expose port
EXPOSE 8092

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
