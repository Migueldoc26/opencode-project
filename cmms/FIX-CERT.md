# Reparar acceso a cmms.controlmc.click

## Diagnostico actual

El DNS apunta correctamente:

```txt
cmms.controlmc.click -> 187.77.46.162
```

Pero desde fuera no responden los puertos `80`, `443` ni `22`. Mientras eso ocurra, el sitio no puede funcionar con Caddy directo ni emitir certificado valido.

## Opcion A: abrir puertos y usar Caddy directo

En el servidor:

```bash
cd cmms
grep -E 'CMMS_DOMAIN|CADDY_SITE_ADDRESS' .env
```

Debe decir:

```env
CMMS_DOMAIN=cmms.controlmc.click
CADDY_SITE_ADDRESS=cmms.controlmc.click
```

Luego:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw reload
sudo ss -lntp | grep -E ':80|:443'
docker compose up -d --build --force-recreate
docker logs -f cmms-caddy
```

Si hay otro servicio ocupando `80` o `443`:

```bash
sudo systemctl stop nginx apache2 caddy
sudo systemctl disable nginx apache2 caddy
docker compose up -d --force-recreate caddy
```

## Opcion B: Cloudflare Tunnel si 80/443 estan bloqueados

Usa esta opcion si no puedes abrir puertos en router/proveedor/firewall.

1. En Cloudflare Zero Trust crea un tunnel para `cmms.controlmc.click`.
2. Copia el token del tunnel.
3. En `.env` configura:

```env
CMMS_DOMAIN=cmms.controlmc.click
CADDY_SITE_ADDRESS=:80
CLOUDFLARED_TOKEN=PEGA_AQUI_EL_TOKEN
```

4. Cambia Caddy al modo HTTP interno:

```bash
cp docker/caddy/Caddyfile.tunnel docker/caddy/Caddyfile
```

5. Levanta con el perfil tunnel:

```bash
docker compose --profile tunnel up -d --build
docker logs -f cmms-cloudflared
```

En Cloudflare, el Public Hostname debe apuntar a:

```txt
http://caddy:80
```

Con esta opcion, Cloudflare entrega el HTTPS publico valido y el servidor solo necesita salida a Internet.
