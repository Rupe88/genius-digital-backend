# Deploying genius-lms-backend (DigitalOcean Droplet + api.geniusdigi.com)

Target: **Ubuntu 24.04** droplet, **Docker**, **Nginx**, **Let’s Encrypt**, **GitHub Actions** SSH deploy.

## Security first

- Never commit `.env` or paste production secrets in issues/chat. If secrets were exposed, **rotate** database password, JWT secrets, Resend key, Supabase service role key, and Google OAuth client secret in their respective dashboards.

## 1. DNS

In your DNS provider, add:

| Type | Name | Value           |
|------|------|-----------------|
| A    | api  | `64.227.182.187` |

Use `api.geniusdigi.com` (apex/subdomain as you prefer). Wait for DNS to propagate before Certbot.

## 2. One-time server setup

SSH in (replace with your user if not `root`):

```bash
ssh root@64.227.182.187
```

Optional: run the helper script from this repo (after you clone it), or install Docker + Nginx + Certbot manually:

```bash
bash deploy/setup-server-ubuntu.sh
```

Create app directory and clone **with a deploy key** (recommended for private repos):

```bash
mkdir -p /opt/genius-lms-backend
cd /opt/genius-lms-backend
git clone https://github.com/Digital-Pathshala/genius-lms-backend.git .
# Or use SSH URL after adding a deploy key to the repo (Settings → Deploy keys).
```

Copy production env (from `.env.production.example` on your machine):

```bash
nano /opt/genius-lms-backend/.env
chmod 600 /opt/genius-lms-backend/.env
```

Required adjustments for production:

- `NODE_ENV=production`
- `BACKEND_URL=https://api.geniusdigi.com` (no trailing slash)
- `FRONTEND_URL` and `CORS_ORIGINS` must list your real web origins
- Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `DATABASE_URL` / `DIRECT_URL` — if the DB password contains `@` or special characters, **URL-encode** them in the connection string

Google Cloud Console → OAuth client → **Authorized redirect URI**:

`https://api.geniusdigi.com/api/auth/google/callback`

## 3. Nginx + TLS

```bash
sudo cp deploy/nginx/api.geniusdigi.com.conf /etc/nginx/sites-available/api.geniusdigi.com
sudo ln -sf /etc/nginx/sites-available/api.geniusdigi.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.geniusdigi.com
```

Start the API (first deploy can be manual before CI exists):

```bash
cd /opt/genius-lms-backend
docker compose -f docker-compose.prod.yml up -d --build
```

Check: `curl -sS https://api.geniusdigi.com/health`

## 4. GitHub Actions (SSH deploy)

In the repo: **Settings → Secrets and variables → Actions**, add:

| Secret           | Example / notes                                      |
|------------------|------------------------------------------------------|
| `DEPLOY_HOST`    | `64.227.182.187`                                     |
| `DEPLOY_USER`    | `root` or your sudo user                             |
| `DEPLOY_SSH_KEY` | Private key (PEM) whose **public** key is in `~/.ssh/authorized_keys` on the droplet |
The workflow runs on **push to `main`** and executes:

- `git fetch` / `reset` to `origin/main` in `/opt/genius-lms-backend`
- `docker compose -f docker-compose.prod.yml up -d --build`

Ensure the droplet can `git fetch` from GitHub. For a **private** repo, clone with SSH and add a **read-only deploy key** to the repo:

```bash
git clone git@github.com:Digital-Pathshala/genius-lms-backend.git /opt/genius-lms-backend
```

(Generate a key on the server, add the public key under **Settings → Deploy keys** on the repo.)

## 5. Firewall

`setup-server-ubuntu.sh` enables UFW with SSH + `Nginx Full`. If you skipped it:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Troubleshooting

- **502 Bad Gateway**: API container down — `docker compose -f docker-compose.prod.yml ps` and `docker compose logs -f api`
- **Certbot fails**: DNS not pointing at the droplet yet, or port 80 blocked
- **Prisma migrate errors**: ensure `DIRECT_URL` is the non-pooler URL for migrations; check Supabase project is not paused

## Optional: DigitalOcean App Platform

The `.do/` spec targets **App Platform** (PaaS), not this droplet. Use either droplet + this doc **or** App Platform, not both for the same hostname unless you know what you’re doing.
