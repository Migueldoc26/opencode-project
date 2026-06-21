# CMMS Deployment

## Prerequisites

- Docker and Docker Compose v2 installed on the server
- Git to clone the repository
- A domain pointing to the server's public IP (e.g., `cmms.controlmc.click`)
- Traefik reverse proxy running externally on the host (port 80/443)

## Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and replace all secrets:

```env
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET=<strong-random-secret>
EMQX_DASHBOARD_PASSWORD=<strong-password>
MINIO_ROOT_USER=cmmsadmin
MINIO_ROOT_PASSWORD=<strong-password>
CMMS_DOMAIN=cmms.yourdomain.com
```

## Docker Compose

### Development (direct port access)

```bash
docker compose up -d --build
```

Services are exposed on:
- `http://localhost:3000` — Backend API
- `http://localhost:8000` — AI Service
- `mqtt://localhost:1883` — MQTT Broker
- `http://localhost:18083` — EMQX Dashboard

The frontend is not directly exposed (served via nginx inside its container). Add its port in `docker-compose.yml` or use the backend as proxy.

### Production (with Traefik)

```bash
docker compose -f docker-compose.server.yml up -d --build
```

## Traefik Configuration

Add a router and service in Traefik's dynamic config (e.g., `traefik/config.yml`):

```yaml
http:
  routers:
    cmms:
      rule: "Host(`cmms.yourdomain.com`)"
      service: cmms-frontend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    cmms-api:
      rule: "Host(`cmms.yourdomain.com`) && PathPrefix(`/api/`)"
      service: cmms-backend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    cmms-frontend:
      loadBalancer:
        servers:
          - url: "http://cmms-frontend:80"

    cmms-backend:
      loadBalancer:
        servers:
          - url: "http://cmms-backend:3000"
```

Ensure both Traefik and the CMMS stack share a Docker network (e.g., `controlmc_proxy`):

```bash
docker network create controlmc_proxy
```

Attach Traefik to `controlmc_proxy` and deploy CMMS with `docker-compose.server.yml`, which already includes the external network.

## SSL Certificates

Traefik automatically provisions and renews Let's Encrypt certificates via its `certResolver`. No manual certificate management is needed.

## Verify

```bash
docker compose ps
curl https://cmms.yourdomain.com/api/health
curl https://cmms.yourdomain.com/ai/health
```
