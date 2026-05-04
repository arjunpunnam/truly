#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap for an Ubuntu Lightsail instance.
# Run as root: sudo bash install-on-instance.sh

apt-get update
apt-get install -y openjdk-17-jre-headless curl ca-certificates

id -u truly >/dev/null 2>&1 || useradd --system --home /opt/truly --shell /usr/sbin/nologin truly

mkdir -p /opt/truly/backend /opt/truly/data /etc/truly /var/log/truly
chown -R truly:truly /opt/truly /var/log/truly

install -m 0644 systemd/truly-backend.service /etc/systemd/system/truly-backend.service

if [[ ! -f /etc/truly/backend.env ]]; then
  install -m 0640 env/backend.env.example /etc/truly/backend.env
  chown root:truly /etc/truly/backend.env
fi

systemctl daemon-reload
systemctl enable truly-backend

echo "Bootstrap complete."
echo "Next steps:"
echo "1) Edit /etc/truly/backend.env"
echo "2) Copy app jar to /opt/truly/backend/app.jar"
echo "3) sudo systemctl restart truly-backend"
