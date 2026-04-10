#!/usr/bin/env bash
# One-time setup on Ubuntu 24.04 droplet (run as root).
# Usage: curl -fsSL ... | bash   OR  bash deploy/setup-server-ubuntu.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git nginx

# Docker Engine (official)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Certbot for Let's Encrypt
apt-get install -y certbot python3-certbot-nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable || true

echo "Done. Next:"
echo "  1) mkdir -p /opt/genius-digital-backend && clone repo + copy .env"
echo "  2) Copy deploy/nginx/api.geniusdigi.com.conf → /etc/nginx/sites-available/ and enable site"
echo "  3) certbot --nginx -d api.geniusdigi.com"
echo "  4) Add GitHub deploy key + DEPLOY_* secrets"
