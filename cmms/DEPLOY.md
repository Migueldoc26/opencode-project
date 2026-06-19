# Despliegue CMMS con Docker y subdominio

## 1. Configurar DNS

Crea un registro `A` para el subdominio apuntando a la IP publica del servidor:

```txt
cmms.controlmc.click -> 187.77.46.162
```

El registro `A` ya debe existir y apuntar a `187.77.46.162`. Si usas Cloudflare, deja el proxy naranja desactivado al inicio para que Caddy pueda emitir el certificado TLS.

## 2. Configurar variables

```bash
cp .env.example .env
```

Edita `.env` y cambia al menos:

```env
CMMS_DOMAIN=cmms.controlmc.click
POSTGRES_PASSWORD=una_clave_larga
JWT_SECRET=otro_secreto_largo
MINIO_ROOT_PASSWORD=otra_clave_larga
EMQX_DASHBOARD_PASSWORD=otra_clave_larga
```

## 3. Levantar servicios

```bash
docker compose up -d --build
```

En el VPS de ControlMC, donde Traefik ya publica `80/443`, usa el compose especifico del servidor:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

Si ya estaba levantado con otro dominio o con `localhost`, recrea Caddy:

```bash
docker compose up -d --build --force-recreate caddy
docker logs --tail=100 cmms-caddy
```

## 4. Verificar

```bash
docker compose ps
curl http://cmms.controlmc.click/api/health
curl https://cmms.controlmc.click/api/health
curl https://cmms.controlmc.click/ai/health
```

## 5. Solucionar `NET::ERR_CERT_AUTHORITY_INVALID`

Ese error aparece cuando el navegador recibe un certificado autofirmado, de otro dominio o emitido por una autoridad no confiable. Revisa:

```bash
docker logs --tail=200 cmms-caddy
sudo ss -lntp | grep -E ':80|:443'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

Tambien confirma que ningun Nginx/Apache/Caddy del host este ocupando esos puertos:

```bash
sudo systemctl status nginx apache2 caddy
```

Si alguno esta usando `80` o `443`, detenlo o mueve este compose a otro proxy principal. Caddy necesita recibir trafico publico por `80` y `443` para emitir el certificado valido de Let's Encrypt.

## Notas

La funcionalidad actual incluye listas de chequeo por activo, ingreso manual, captura de evidencia con camara, analisis automatico por servicio IA, validacion manual, historial y reporte JSON. El motor IA expone el contrato para conectar YOLO/OpenCV; por ahora usa un evaluador placeholder para validar el flujo completo.
