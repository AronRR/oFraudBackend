# 🚀 Guía de Deployment - oFraud API

Esta guía proporciona instrucciones detalladas para desplegar la API de oFraud en diferentes entornos de producción.

---

## 📋 Tabla de Contenidos

- [Pre-requisitos](#-pre-requisitos)
- [Checklist de Seguridad](#-checklist-de-seguridad)
- [Configuración de Producción](#️-configuración-de-producción)
- [Deployment en Linux (VPS/Cloud)](#-deployment-en-linux-vpscloud)
- [Deployment con PM2](#-deployment-con-pm2)
- [Deployment con Docker](#-deployment-con-docker)
- [Configuración de Nginx](#-configuración-de-nginx)
- [SSL/HTTPS con Let's Encrypt](#-sslhttps-con-lets-encrypt)
- [Backups de Base de Datos](#-backups-de-base-de-datos)
- [Monitoreo y Logs](#-monitoreo-y-logs)
- [Troubleshooting](#-troubleshooting)

---

## 🔧 Pre-requisitos

### Servidor de Producción
- **Sistema Operativo**: Ubuntu 20.04 LTS o superior (recomendado)
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **CPU**: Mínimo 2 cores
- **Disco**: Mínimo 20GB
- **Acceso**: SSH con usuario con privilegios sudo

### Software Necesario
- Node.js v18.x o superior
- MySQL 8.0 o superior
- Nginx (para reverse proxy)
- PM2 (para gestión de procesos)
- Certbot (para SSL gratuito)

---

## 🔒 Checklist de Seguridad

Antes de desplegar a producción, verifica:

- [ ] **JWT Secrets**: Cambiar `JWT_SECRET` y `JWT_REFRESH_SECRET` por valores únicos y seguros
- [ ] **Database Credentials**: Usar usuario MySQL específico (no root) con permisos limitados
- [ ] **Firewall**: Configurar firewall (UFW) para bloquear puertos innecesarios
- [ ] **SSH**: Desactivar login con password, usar solo keys
- [ ] **Backups**: Configurar backups automáticos de base de datos
- [ ] **HTTPS**: Configurar SSL/TLS con certificado válido
- [ ] **CORS**: Configurar CORS solo para dominios específicos de tu frontend
- [ ] **Rate Limiting**: Ajustar límites según capacidad del servidor
- [ ] **Updates**: Sistema operativo y dependencias actualizadas
- [ ] **.env**: Archivo `.env` con permisos restrictivos (600)

---

## ⚙️ Configuración de Producción

### 1. Generar Secrets Seguros

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Archivo `.env` de Producción

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=ofraud_user
DB_PASSWORD=tu_password_super_seguro_aqui
DB_NAME=ofraud_prod

# JWT Configuration
JWT_SECRET=tu_secret_generado_arriba
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu_refresh_secret_generado_arriba
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. Configurar Permisos del .env

```bash
chmod 600 .env
chown www-data:www-data .env  # Ajustar según tu usuario de aplicación
```

---

## 🐧 Deployment en Linux (VPS/Cloud)

### Paso 1: Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar MySQL
sudo apt install -y mysql-server

# Asegurar MySQL
sudo mysql_secure_installation

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### Paso 2: Configurar Usuario de Base de Datos

```bash
# Conectar a MySQL
sudo mysql

# Crear usuario y base de datos
CREATE DATABASE ofraud_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ofraud_user'@'localhost' IDENTIFIED BY 'password_super_seguro';
GRANT ALL PRIVILEGES ON ofraud_prod.* TO 'ofraud_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 3: Desplegar la Aplicación

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www/ofraud
sudo chown -R $USER:$USER /var/www/ofraud

# Clonar repositorio
cd /var/www/ofraud
git clone <tu-repositorio> .

# Instalar dependencias
npm ci --only=production

# Crear archivo .env
nano .env
# (Copiar configuración de producción)

# Compilar aplicación
npm run build

# Ejecutar migraciones
npx ts-node migrations/202412010000_init_schema.ts up
npx ts-node migrations/202412050000_rehash_passwords_with_bcrypt.ts
npx ts-node migrations/202412060001_create_user_audit_tables.ts
```

---

## 🔄 Deployment con PM2

PM2 mantiene tu aplicación corriendo, reinicia automáticamente en caso de fallos, y facilita el deployment.

### Configuración de PM2

Crear archivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ofraud-api',
    script: './dist/main.js',
    instances: 'max',  // Usa todos los cores disponibles
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/ofraud/error.log',
    out_file: '/var/log/ofraud/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
  }]
};
```

### Comandos de PM2

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs ofraud-api

# Reiniciar
pm2 restart ofraud-api

# Detener
pm2 stop ofraud-api

# Configurar autostart al reiniciar servidor
pm2 startup
pm2 save

# Monitoreo
pm2 monit
```

### Script de Deployment Automatizado

Crear `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Iniciando deployment de oFraud API..."

# Backup de la base de datos
echo "📦 Creando backup de base de datos..."
mysqldump -u ofraud_user -p ofraud_prod > /var/backups/ofraud/ofraud_$(date +%Y%m%d_%H%M%S).sql

# Pull latest changes
echo "📥 Obteniendo últimos cambios..."
git pull origin main

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --only=production

# Compilar
echo "🔨 Compilando aplicación..."
npm run build

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
npx ts-node migrations/202412010000_init_schema.ts up
npx ts-node migrations/202412050000_rehash_passwords_with_bcrypt.ts
npx ts-node migrations/202412060001_create_user_audit_tables.ts

# Reiniciar con PM2
echo "🔄 Reiniciando aplicación..."
pm2 reload ofraud-api --update-env

echo "✅ Deployment completado!"
```

Hacer ejecutable:

```bash
chmod +x deploy.sh
```

---

## 🐳 Deployment con Docker

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/src/insights/content ./src/insights/content

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=ofraud_user
      - DB_PASSWORD=secure_password
      - DB_NAME=ofraud_prod
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=ofraud_prod
      - MYSQL_USER=ofraud_user
      - MYSQL_PASSWORD=secure_password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### Comandos Docker

```bash
# Build
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Ejecutar migraciones
docker-compose exec app npx ts-node migrations/202412010000_init_schema.ts up

# Detener
docker-compose down

# Limpiar volúmenes (¡CUIDADO!)
docker-compose down -v
```

---

## 🌐 Configuración de Nginx

### Archivo de Configuración

Crear `/etc/nginx/sites-available/ofraud`:

```nginx
upstream ofraud_backend {
    least_conn;
    server 127.0.0.1:3000;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.tudominio.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.tudominio.com;

    # SSL Configuration (se actualizará con Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/ofraud_access.log;
    error_log /var/log/nginx/ofraud_error.log;

    # Proxy to Node.js
    location / {
        proxy_pass http://ofraud_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting para /auth/login
    location /auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        proxy_pass http://ofraud_backend;
        # ... (mismos headers que arriba)
    }

    # Static files con cache
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://ofraud_backend;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

### Activar Configuración

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/ofraud /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

# Habilitar autostart
sudo systemctl enable nginx
```

---

## 🔐 SSL/HTTPS con Let's Encrypt

### Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtener Certificado

```bash
# Obtener certificado (actualiza automáticamente Nginx)
sudo certbot --nginx -d api.tudominio.com

# Verificar renovación automática
sudo certbot renew --dry-run

# Ver certificados instalados
sudo certbot certificates
```

Los certificados se renovarán automáticamente cada 60 días.

---

## 💾 Backups de Base de Datos

### Script de Backup Automático

Crear `/usr/local/bin/backup-ofraud.sh`:

```bash
#!/bin/bash

# Configuración
DB_USER="ofraud_user"
DB_PASS="tu_password"
DB_NAME="ofraud_prod"
BACKUP_DIR="/var/backups/ofraud"
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Nombre del archivo
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ofraud_$TIMESTAMP.sql"

# Crear backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Eliminar backups antiguos
find $BACKUP_DIR -name "ofraud_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completado: $BACKUP_FILE.gz"
```

Hacer ejecutable:

```bash
sudo chmod +x /usr/local/bin/backup-ofraud.sh
```

### Cron Job para Backups Diarios

```bash
# Editar crontab
sudo crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /usr/local/bin/backup-ofraud.sh >> /var/log/ofraud-backup.log 2>&1
```

### Restaurar Backup

```bash
# Descomprimir
gunzip /var/backups/ofraud/ofraud_20250101_020000.sql.gz

# Restaurar
mysql -u ofraud_user -p ofraud_prod < /var/backups/ofraud/ofraud_20250101_020000.sql
```

---

## 📊 Monitoreo y Logs

### Configurar Logs

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/ofraud
sudo chown www-data:www-data /var/log/ofraud

# Rotar logs
sudo nano /etc/logrotate.d/ofraud
```

Contenido de `/etc/logrotate.d/ofraud`:

```
/var/log/ofraud/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload ofraud-api
    endscript
}
```

### Monitoreo con PM2 Plus (Opcional)

```bash
# Registrarse en https://pm2.io
# Instalar PM2 Plus
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7

# Conectar a PM2 Plus
pm2 link <secret_key> <public_key>
```

### Verificar Salud del Sistema

```bash
# CPU y RAM
htop

# Espacio en disco
df -h

# Status de servicios
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status

# Logs en tiempo real
pm2 logs --lines 100
tail -f /var/log/nginx/ofraud_error.log
```

---

## 🔥 Troubleshooting

### Error: Cannot connect to database

```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Verificar conexión
mysql -u ofraud_user -p ofraud_prod

# Revisar logs
sudo tail -f /var/log/mysql/error.log
```

### Error: Port already in use

```bash
# Ver qué proceso usa el puerto 3000
sudo lsof -i :3000

# Matar proceso
sudo kill -9 <PID>

# Reiniciar con PM2
pm2 restart ofraud-api
```

### Error 502 Bad Gateway (Nginx)

```bash
# Verificar que la app esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/ofraud_error.log

# Verificar configuración de Nginx
sudo nginx -t

# Reiniciar servicios
pm2 restart ofraud-api
sudo systemctl restart nginx
```

### Alto uso de memoria

```bash
# Ver uso de memoria
pm2 monit

# Reiniciar aplicación
pm2 reload ofraud-api

# Ajustar límite de memoria en ecosystem.config.js
# max_memory_restart: '500M'
```

### Migraciones fallidas

```bash
# Verificar estado de la base de datos
mysql -u ofraud_user -p ofraud_prod -e "SHOW TABLES;"

# Ejecutar migraciones manualmente
cd /var/www/ofraud
npx ts-node migrations/202412010000_init_schema.ts up

# Revisar logs de migración
```

---

## ✅ Checklist Post-Deployment

Después del deployment, verifica:

- [ ] La aplicación responde en `https://api.tudominio.com`
- [ ] Los endpoints públicos funcionan sin autenticación
- [ ] El login y refresh tokens funcionan correctamente
- [ ] Los endpoints administrativos requieren autenticación
- [ ] SSL/HTTPS está configurado correctamente (verificar en ssllabs.com)
- [ ] Los backups automáticos están configurados
- [ ] PM2 está configurado para reiniciar automáticamente
- [ ] Los logs se están generando correctamente
- [ ] El monitoreo está activo
- [ ] El firewall está configurado
- [ ] Las variables de entorno son las correctas
- [ ] La documentación Swagger está accesible en `/docs`

---

## 📚 Recursos Adicionales

- [NestJS Production Best Practices](https://docs.nestjs.com/security/best-practices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Optimization](https://www.nginx.com/blog/tuning-nginx/)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**¡Deployment exitoso!** 🎉

Para soporte adicional, consulta la [documentación principal](./README.md).
