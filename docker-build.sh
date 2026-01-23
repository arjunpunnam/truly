#!/bin/bash
# =============================================================================
# Truly Rule Engine - Docker Build Script
# =============================================================================
# Build and optionally push the Docker image
#
# Usage:
#   ./docker-build.sh              # Build only
#   ./docker-build.sh --push       # Build and push to Docker Hub
#   ./docker-build.sh --tag v1.0.0 # Build with specific tag
# =============================================================================

set -e

# Configuration
IMAGE_NAME="truly/rule-engine"
VERSION="${TAG:-latest}"
PUSH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --tag)
            VERSION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            Truly Rule Engine - Docker Build                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Building: ${IMAGE_NAME}:${VERSION}"
echo ""

# Build the image
docker build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --tag "${IMAGE_NAME}:latest" \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VERSION="${VERSION}" \
    .

echo ""
echo "✅ Build complete: ${IMAGE_NAME}:${VERSION}"
echo ""

# Push if requested
if [ "$PUSH" = true ]; then
    echo "Pushing to Docker Hub..."
    docker push "${IMAGE_NAME}:${VERSION}"
    docker push "${IMAGE_NAME}:latest"
    echo "✅ Push complete"
fi

echo ""
echo "To run the container:"
echo "  docker run -p 3000:80 -v truly-data:/data ${IMAGE_NAME}:${VERSION}"
echo ""
