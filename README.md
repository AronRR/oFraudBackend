# oFraud API - Sistema de Reportes de Fraude

API backend para la plataforma oFraud, un sistema de gestión y moderación de reportes de fraude en línea con interacción comunitaria.

## 🚀 Características Principales

- **Sistema de Reportes con Versionado**: Los usuarios pueden reportar fraudes con evidencia multimedia
- **Moderación Administrativa**: Panel completo para aprobar/rechazar reportes con trazabilidad
- **Interacción Comunitaria**: Calificaciones, comentarios y sistema de alertas
- **Autenticación JWT**: Sistema seguro con refresh tokens y auditoría
- **API Pública de Insights**: Estadísticas y contenido educativo sobre fraudes
- **Gestión de Usuarios**: Control de acceso, bloqueos y auditoría de seguridad

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js**: v18.x o superior ([Descargar](https://nodejs.org/))
- **MySQL**: v8.0 o superior ([Descargar](https://dev.mysql.com/downloads/mysql/))
- **npm**: v9.x o superior (incluido con Node.js)

Para verificar las versiones instaladas:

```bash
node --version
npm --version
mysql --version
```

---

## 🛠️ Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd oFraudClean
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias especificadas en `package.json`.

### 3. Configurar Base de Datos

#### a) Crear la Base de Datos MySQL

Conéctate a MySQL:

```bash
mysql -u root -p
```

Crea la base de datos:

```sql
CREATE DATABASE ofraud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### b) Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de MySQL:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=ofraud

# JWT Configuration
JWT_SECRET=tu_secret_key_super_seguro_aqui_cambiar_en_produccion
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro_aqui
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
```

**⚠️ IMPORTANTE**:
- Cambia `JWT_SECRET` y `JWT_REFRESH_SECRET` por valores únicos y seguros en producción
- Nunca compartas estos valores ni los subas a repositorios públicos

#### c) Ejecutar Migraciones

Las migraciones crean todas las tablas y estructuras necesarias en la base de datos.

```bash
# Migración 1: Crear schema inicial (tablas base)
npx ts-node migrations/202412010000_init_schema.ts up

# Migración 2: Actualizar a bcrypt para passwords
npx ts-node migrations/202412050000_rehash_passwords_with_bcrypt.ts

# Migración 3: Crear tablas de auditoría
npx ts-node migrations/202412060001_create_user_audit_tables.ts
```

**Verificar que las tablas se crearon correctamente:**

```bash
mysql -u root -p ofraud -e "SHOW TABLES;"
```

Deberías ver 16 tablas listadas.

---

## ▶️ Ejecutar la Aplicación

### Modo Desarrollo (con hot-reload)

```bash
npm run start:dev
```

La API estará disponible en: `http://localhost:3000`

### Modo Producción

```bash
# Compilar el proyecto
npm run build

# Ejecutar en producción
npm run start:prod
```

### Modo Debug

```bash
npm run start:debug
```

---

## 📚 Documentación de la API

Una vez que la aplicación esté ejecutándose, puedes acceder a la documentación interactiva:

### Swagger UI (Recomendado)
```
http://localhost:3000/docs
```

Interfaz completa con ejemplos de requests/responses, autenticación y pruebas en vivo.

### Scalar API Reference (Moderna)
```
http://localhost:3000/reference
```

Documentación moderna con mejor experiencia de usuario.

### JSON Schema
```
http://localhost:3000/docs-json
```

Esquema OpenAPI en formato JSON para herramientas de terceros.

---

## 🧪 Ejecutar Tests

### Tests Unitarios

```bash
npm run test
```

### Tests con Modo Watch (desarrollo)

```bash
npm run test:watch
```

### Cobertura de Tests

```bash
npm run test:cov
```

Los reportes de cobertura se generarán en la carpeta `coverage/`.

### Tests End-to-End

```bash
npm run test:e2e
```

---

## 🔐 Primeros Pasos - Crear Usuario Administrador

Para poder usar el sistema, necesitas crear un usuario administrador:

### Opción 1: Vía MySQL Directamente

```sql
USE ofraud;

INSERT INTO users (
  email,
  username,
  first_name,
  last_name,
  password_hash,
  password_salt,
  role,
  created_at,
  updated_at
) VALUES (
  'admin@ofraud.com',
  'admin',
  'Admin',
  'Sistema',
  '$2b$10$YourHashedPasswordHere',  -- Ver instrucción abajo
  'salt_placeholder',
  'admin',
  NOW(),
  NOW()
);
```

**Para generar el password hash**, usa este script Node.js:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('tu_password', 10).then(hash => console.log(hash));"
```

### Opción 2: Vía API (Recomendado para producción)

1. Crea un usuario normal primero:
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ofraud.com",
    "username": "admin",
    "firstName": "Admin",
    "lastName": "Sistema",
    "password": "tu_password_seguro",
    "phoneNumber": "+52123456789"
  }'
```

2. Actualiza el rol a admin en MySQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@ofraud.com';
```

---

## 🔑 Autenticación

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ofraud.com",
    "password": "tu_password"
  }'
```

Respuesta:
```json
{
  "message": "Inicio de sesión exitoso",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "long_random_string..."
}
```

### Usar el Access Token

En todas las peticiones protegidas, incluye el header:

```
Authorization: Bearer <accessToken>
```

### Renovar Access Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "tu_refresh_token"
  }'
```

---

## 📡 Endpoints Principales

### Públicos (Sin autenticación)

- `GET /insights/top-hosts` - Sitios más reportados
- `GET /insights/top-categories` - Categorías más activas
- `GET /insights/fraud-stats` - Estadísticas generales
- `GET /insights/educational` - Lista de temas educativos
- `GET /insights/educational/:topic` - Contenido educativo específico
- `GET /reports` - Feed de reportes aprobados
- `GET /reports/:id` - Detalle de reporte específico
- `GET /categories` - Lista de categorías

### Autenticados (Requieren login)

- `POST /reports` - Crear nuevo reporte
- `PUT /reports/:id` - Editar reporte propio
- `DELETE /reports/:id` - Eliminar reporte propio
- `POST /reports/:id/ratings` - Calificar reporte
- `POST /reports/:id/comments` - Comentar en reporte
- `POST /reports/:id/flags` - Alertar reporte problemático
- `GET /users/me` - Obtener perfil propio
- `PUT /users/me` - Actualizar perfil
- `PUT /users/me/password` - Cambiar contraseña

### Administrativos (Requieren rol admin)

- `GET /admin/reports` - Cola de moderación
- `GET /admin/reports/:id` - Detalle para moderación
- `POST /reports/:id/moderate` - Aprobar/Rechazar reporte
- `DELETE /admin/reports/:id` - Remover reporte
- `GET /admin/report-flags` - Alertas de comunidad
- `PUT /admin/report-flags/:id` - Resolver alerta
- `GET /admin/users` - Gestión de usuarios
- `POST /admin/users/:id/block` - Bloquear usuario
- `POST /admin/users/:id/unblock` - Desbloquear usuario
- `GET /admin/categories` - CRUD de categorías
- `GET /admin/metrics/overview` - Métricas del sistema
- `GET /admin/metrics/top-categories` - Top categorías
- `GET /admin/metrics/top-hosts` - Top hosts reportados

Ver documentación completa en `/docs`.

---

## 📁 Estructura del Proyecto

```
oFraudClean/
├── src/
│   ├── admin/              # Módulo administrativo
│   ├── auth/               # Autenticación y tokens
│   ├── categories/         # Gestión de categorías
│   ├── common/             # Guards, interfaces, utilidades
│   ├── config/             # Configuración de la app
│   ├── db/                 # Servicio de base de datos
│   ├── files/              # Gestión de archivos
│   ├── insights/           # Endpoints públicos de stats
│   ├── reports/            # Core: reportes, ratings, comments
│   ├── users/              # Gestión de usuarios
│   ├── util/               # Utilidades (crypto, URLs)
│   ├── app.module.ts       # Módulo principal
│   └── main.ts             # Punto de entrada
├── migrations/             # Migraciones de base de datos
├── test/                   # Tests end-to-end
├── public/                 # Archivos estáticos
├── .env                    # Variables de entorno (NO COMMITEAR)
├── .env.example            # Ejemplo de configuración
├── package.json            # Dependencias
├── tsconfig.json           # Configuración TypeScript
├── nest-cli.json           # Configuración NestJS
├── database-model.md       # Documentación del modelo de datos
├── INSIGHTS_API.md         # Documentación de endpoints públicos
├── DEPLOYMENT.md           # Guía de deployment
└── README.md               # Este archivo
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run start           # Iniciar en modo normal
npm run start:dev       # Iniciar con hot-reload
npm run start:debug     # Iniciar en modo debug

# Producción
npm run build           # Compilar para producción
npm run start:prod      # Ejecutar build de producción

# Testing
npm run test            # Ejecutar tests unitarios
npm run test:watch      # Tests en modo watch
npm run test:cov        # Tests con cobertura
npm run test:e2e        # Tests end-to-end

# Calidad de código
npm run lint            # Ejecutar ESLint
npm run format          # Formatear código con Prettier
```

---

## 🚀 Despliegue en Producción

Para instrucciones detalladas de deployment en diferentes entornos, consulta [DEPLOYMENT.md](./DEPLOYMENT.md).

### Checklist Pre-Deployment

- [ ] Configurar variables de entorno en servidor
- [ ] Cambiar `JWT_SECRET` y `JWT_REFRESH_SECRET` por valores únicos
- [ ] Configurar MySQL en servidor de producción
- [ ] Ejecutar migraciones en base de datos de producción
- [ ] Configurar CORS para tu dominio de frontend
- [ ] Configurar HTTPS/SSL
- [ ] Establecer límites de rate limiting según tu infraestructura
- [ ] Configurar backups automáticos de base de datos
- [ ] Configurar logs y monitoreo

---

## 📖 Documentación Adicional

- **[database-model.md](./database-model.md)**: Modelo completo de base de datos con diagramas
- **[INSIGHTS_API.md](./INSIGHTS_API.md)**: Documentación detallada de endpoints públicos
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Guía de deployment en producción
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Arquitectura y decisiones de diseño

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to MySQL"

**Causa**: Credenciales incorrectas o MySQL no está ejecutándose.

**Solución**:
1. Verifica que MySQL esté corriendo: `mysql -u root -p`
2. Verifica las credenciales en `.env`
3. Asegúrate de que la base de datos `ofraud` exista

### Error: "Table doesn't exist"

**Causa**: Migraciones no se han ejecutado.

**Solución**:
```bash
npx ts-node migrations/202412010000_init_schema.ts up
npx ts-node migrations/202412050000_rehash_passwords_with_bcrypt.ts
npx ts-node migrations/202412060001_create_user_audit_tables.ts
```

### Error: "JWT must be provided"

**Causa**: Falta el token de autorización en la petición.

**Solución**: Incluye el header `Authorization: Bearer <tu_access_token>` en tus requests.

### Error: "Port 3000 already in use"

**Causa**: El puerto ya está ocupado por otra aplicación.

**Solución**:
```bash
# Cambiar puerto en .env
PORT=3001

# O matar el proceso en el puerto 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Errores en Tests

**Si falla el test de AuthController**:
```bash
# Ejecutar solo ese test para ver el error completo
npm test -- auth.controller.spec.ts
```

---

## 🤝 Soporte

Para dudas o problemas:

1. Consulta la documentación en `/docs` cuando la app esté corriendo
2. Revisa los archivos de documentación en este repositorio
3. Verifica los logs de la aplicación para mensajes de error detallados

---

## 📄 Licencia

Este proyecto es privado y confidencial. Todos los derechos reservados.

---

## 🔄 Changelog

### Version 1.0.0 (Actual)
- ✅ Sistema completo de reportes con versionado
- ✅ Panel administrativo con moderación
- ✅ Sistema de calificaciones y comentarios
- ✅ Alertas comunitarias (flags)
- ✅ Autenticación JWT con refresh tokens
- ✅ API pública de insights y contenido educativo
- ✅ Auditoría completa de usuarios y reportes
- ✅ Rate limiting configurado
- ✅ Documentación Swagger/OpenAPI

---

**¡Listo para usar!** 🎉

Para comenzar:
1. Verifica que MySQL esté corriendo
2. Ejecuta `npm install`
3. Configura `.env`
4. Ejecuta las migraciones
5. Ejecuta `npm run start:dev`
6. Visita `http://localhost:3000/docs`
