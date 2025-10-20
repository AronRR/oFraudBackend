# 📊 Insights API - Endpoints Públicos

La API de Insights proporciona endpoints públicos (sin autenticación) para consultar estadísticas y contenido educativo sobre fraudes. Estos endpoints están diseñados para ser consumidos por aplicaciones móviles y frontends públicos.

---

## 🔗 Endpoints Disponibles

### 1. Top Hosts Reportados

**GET** `/insights/top-hosts`

Obtiene los sitios web/dominios con más reportes en un período específico.

#### Query Parameters

| Parámetro | Tipo | Requerido | Valores | Default | Descripción |
|-----------|------|-----------|---------|---------|-------------|
| `period` | string | No | `weekly`, `monthly` | `weekly` | Período de tiempo |
| `limit` | number | No | 1-50 | `10` | Número de resultados |

#### Ejemplo de Request

```bash
curl "http://localhost:3000/insights/top-hosts?period=weekly&limit=5"
```

#### Ejemplo de Response

```json
[
  {
    "host": "fraude-tienda.com",
    "reportCount": 42,
    "averageRating": 3.5,
    "totalRatings": 28
  },
  {
    "host": "phishing-banco.mx",
    "reportCount": 38,
    "averageRating": 4.2,
    "totalRatings": 35
  }
]
```

---

### 2. Categorías Más Populares

**GET** `/insights/top-categories`

Lista las categorías con mayor actividad (reportes + búsquedas).

#### Query Parameters

| Parámetro | Tipo | Requerido | Valores | Default | Descripción |
|-----------|------|-----------|---------|---------|-------------|
| `limit` | number | No | 1-50 | `10` | Número de resultados |

#### Ejemplo de Request

```bash
curl "http://localhost:3000/insights/top-categories?limit=3"
```

#### Ejemplo de Response

```json
[
  {
    "id": 1,
    "name": "Phishing",
    "slug": "phishing",
    "reportsCount": 150,
    "searchCount": 89,
    "totalActivity": 239
  },
  {
    "id": 2,
    "name": "Tiendas en línea falsas",
    "slug": "tiendas-falsas",
    "reportsCount": 120,
    "searchCount": 67,
    "totalActivity": 187
  }
]
```

---

### 3. Estadísticas Generales de Fraude

**GET** `/insights/fraud-stats`

Devuelve métricas generales del sistema.

#### Ejemplo de Request

```bash
curl "http://localhost:3000/insights/fraud-stats"
```

#### Ejemplo de Response

```json
{
  "averageDetectionDays": 28,
  "totalReportsApproved": 1247,
  "reportsThisWeek": 89,
  "reportsThisMonth": 342,
  "totalActiveUsers": 567,
  "categoriesCount": 42
}
```

---

### 4. Listar Temas Educativos

**GET** `/insights/educational`

Lista todos los temas educativos disponibles.

#### Ejemplo de Request

```bash
curl "http://localhost:3000/insights/educational"
```

#### Ejemplo de Response

```json
[
  {
    "topic": "phishing",
    "title": "¿Qué es el phishing?"
  },
  {
    "topic": "what-to-do",
    "title": "¿Qué hacer si fui víctima de fraude?"
  },
  {
    "topic": "preventive-tips",
    "title": "Consejos preventivos y Recomendaciones"
  },
  {
    "topic": "identity-theft",
    "title": "Robo de Identidad"
  },
  {
    "topic": "detection-time",
    "title": "Tiempo promedio de detección de fraude en México"
  }
]
```

---

### 5. Obtener Contenido Educativo por Tema

**GET** `/insights/educational/:topic`

Devuelve información detallada sobre un tema específico.

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `topic` | string | ID del tema educativo |

**Temas disponibles:**
- `phishing` - ¿Qué es el phishing?
- `what-to-do` - ¿Qué hacer si fui víctima?
- `preventive-tips` - Consejos preventivos
- `identity-theft` - Robo de identidad
- `detection-time` - Tiempo de detección en México

#### Ejemplo de Request: Phishing

```bash
curl "http://localhost:3000/insights/educational/phishing"
```

#### Ejemplo de Response

```json
{
  "topic": "phishing",
  "title": "¿Qué es el phishing?",
  "description": "El phishing es un tipo de fraude en línea donde los estafadores se hacen pasar por bancos, tiendas o servicios conocidos para engañarte y obtener tu información personal, como contraseñas o datos bancarios.",
  "tips": [
    {
      "icon": "✅",
      "text": "Verifica siempre la dirección del sitio web (que sea oficial y segura: https://)."
    },
    {
      "icon": "✅",
      "text": "No abras enlaces sospechosos en correos o mensajes."
    }
  ]
}
```

#### Ejemplo de Request: Qué Hacer

```bash
curl "http://localhost:3000/insights/educational/what-to-do"
```

#### Ejemplo de Response

```json
{
  "topic": "what-to-do",
  "title": "¿Qué hacer si fui víctima de fraude?",
  "description": "Si crees que fuiste víctima de fraude, sigue estos pasos inmediatamente:",
  "steps": [
    {
      "title": "Bloquea tu tarjeta o cuenta",
      "description": "Contacta a tu banco de inmediato para bloquear cualquier acceso no autorizado."
    },
    {
      "title": "Cambia tus contraseñas",
      "description": "Actualiza tus contraseñas y activa la autenticación en dos pasos en todas tus cuentas."
    },
    {
      "title": "Guarda evidencia",
      "description": "Toma capturas de pantalla, guarda mensajes y correos electrónicos relacionados con el fraude."
    }
  ],
  "additionalInfo": "⚠️ Revisa tus cuentas regularmente y mantente alerta ante mensajes sospechosos."
}
```

---

## 💡 Casos de Uso

### Aplicación Móvil - Pantalla de Insights

```typescript
// Obtener datos para dashboard de insights
async function loadInsightsData() {
  const [topHosts, topCategories, stats] = await Promise.all([
    fetch('/insights/top-hosts?period=weekly&limit=3'),
    fetch('/insights/top-categories?limit=3'),
    fetch('/insights/fraud-stats')
  ]);

  return {
    topHosts: await topHosts.json(),
    topCategories: await topCategories.json(),
    stats: await stats.json()
  };
}
```

### Aplicación Móvil - Sección Educativa

```typescript
// Cargar lista de temas
const topics = await fetch('/insights/educational').then(r => r.json());

// Cargar detalle de un tema específico
const phishingInfo = await fetch('/insights/educational/phishing')
  .then(r => r.json());
```

### Frontend Web - Página de Estadísticas

```javascript
// React/Vue/Angular example
useEffect(() => {
  async function fetchStats() {
    const response = await fetch('http://localhost:3000/insights/fraud-stats');
    const data = await response.json();
    setStats(data);
  }

  fetchStats();
}, []);
```

---

## 📊 Estructura de Datos

### TopHostDto

```typescript
interface TopHostDto {
  host: string;              // Dominio reportado
  reportCount: number;       // Cantidad de reportes
  averageRating: number;     // Rating promedio (1-5)
  totalRatings: number;      // Cantidad de calificaciones
}
```

### TopCategoryDto

```typescript
interface TopCategoryDto {
  id: number;                // ID de la categoría
  name: string;              // Nombre de la categoría
  slug: string;              // Slug para URLs
  reportsCount: number;      // Cantidad de reportes
  searchCount: number;       // Cantidad de búsquedas
  totalActivity: number;     // reportes + búsquedas
}
```

### FraudStatsDto

```typescript
interface FraudStatsDto {
  averageDetectionDays: number;    // Días promedio de detección
  totalReportsApproved: number;    // Total de reportes aprobados
  reportsThisWeek: number;         // Reportes esta semana
  reportsThisMonth: number;        // Reportes este mes
  totalActiveUsers: number;        // Usuarios activos
  categoriesCount: number;         // Cantidad de categorías
}
```

### EducationalContentDto

```typescript
interface EducationalContentDto {
  topic: string;                    // ID del tema
  title: string;                    // Título
  description: string;              // Descripción principal
  tips?: Array<{                    // Consejos (opcional)
    icon: string;
    text: string;
  }>;
  steps?: Array<{                   // Pasos (opcional)
    title: string;
    description: string;
  }>;
  additionalInfo?: string;          // Información adicional (opcional)
}
```

---

## 🔒 Seguridad y Limitaciones

### Rate Limiting

Todos los endpoints públicos están limitados a:
- **60 requests por minuto** por IP

Si excedes el límite, recibirás un error `429 Too Many Requests`.

### Caché Recomendado

Los datos de insights cambian con poca frecuencia. Recomendaciones de caché:

| Endpoint | Tiempo de Caché Recomendado |
|----------|----------------------------|
| `/insights/top-hosts` | 1 hora |
| `/insights/top-categories` | 1 hora |
| `/insights/fraud-stats` | 30 minutos |
| `/insights/educational` | 24 horas |
| `/insights/educational/:topic` | 24 horas |

---

## 🛠️ Personalización

### Agregar Nuevo Tema Educativo

1. Edita el archivo de contenido:
   ```
   src/insights/content/educational-content.json
   ```

2. Agrega una nueva entrada:
   ```json
   {
     "nuevo-tema": {
       "topic": "nuevo-tema",
       "title": "Título del Nuevo Tema",
       "description": "Descripción detallada...",
       "tips": [
         {
           "icon": "💡",
           "text": "Consejo útil aquí"
         }
       ]
     }
   }
   ```

3. Actualiza el enum en el controller:
   ```typescript
   // src/insights/insights.controller.ts
   @ApiParam({
     name: 'topic',
     enum: ['phishing', 'what-to-do', 'preventive-tips', 'identity-theft', 'detection-time', 'nuevo-tema'],
   })
   ```

---

## 📝 Notas Técnicas

- **No requiere autenticación**: Todos los endpoints son públicos
- **Límite de resultados**: Máximo 50 items por request en endpoints con paginación
- **Formato**: Todas las responses son JSON
- **Charset**: UTF-8
- **CORS**: Configurado para permitir requests desde cualquier origen

---

## 🐛 Manejo de Errores

### Error 404 - Not Found

```json
{
  "statusCode": 404,
  "message": "Topic not found",
  "error": "Not Found"
}
```

**Causa**: El topic educativo solicitado no existe.

### Error 429 - Too Many Requests

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Causa**: Excediste el rate limit de 60 requests/minuto.

**Solución**: Espera 1 minuto antes de hacer más requests.

### Error 400 - Bad Request

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50"],
  "error": "Bad Request"
}
```

**Causa**: Los query parameters son inválidos.

**Solución**: Verifica que los parámetros cumplan con las restricciones.

---

## 📚 Recursos Adicionales

- **Documentación Swagger**: `http://localhost:3000/docs`
- **Modelo de Datos**: Ver [database-model.md](./database-model.md)
- **Guía de Instalación**: Ver [README.md](./README.md)
