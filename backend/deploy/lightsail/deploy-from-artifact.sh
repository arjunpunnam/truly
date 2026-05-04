#!/usr/bin/env bash
set -euo pipefail

# Deploy a built Spring Boot jar to Lightsail.
# Usage: sudo bash deploy-from-artifact.sh /tmp/rule-engine-backend.jar

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/backend.jar"
  exit 1
fi

ARTIFACT="$1"
if [[ ! -f "$ARTIFACT" ]]; then
  echo "Artifact not found: $ARTIFACT"
  exit 1
fi

install -d -m 0755 -o truly -g truly /opt/truly/backend
install -m 0644 -o truly -g truly "$ARTIFACT" /opt/truly/backend/app.jar

systemctl daemon-reload
systemctl restart truly-backend
systemctl --no-pager --full status truly-backend

echo
echo "Health check:"
curl --fail --silent http://127.0.0.1:8092/api/health | sed 's/.*/&/'
