# 📊 API de Insights Públicos - Ofraud

Este módulo proporciona endpoints públicos para consultar estadísticas y contenido educativo sobre fraudes.

---

## 🔗 Endpoints Disponibles

### 1. Top Hosts Reportados

**GET** `/insights/top-hosts`

Obtiene los sitios web/dominios con más reportes en un período específico.

#### Query Parameters:
- `period` (opcional): `weekly` | `monthly` (default: `weekly`)
- `limit` (opcional): Número de resultados (default: `10`, máx: `50`)

#### Ejemplo de Request:
```http
GET /insights/top-hosts?period=weekly&limit=5
```

#### Ejemplo de Response:
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

#### Query Parameters:
- `limit` (opcional): Número de resultados (default: `10`, máx: `50`)

#### Ejemplo de Request:
```http
GET /insights/top-categories?limit=3
```

#### Ejemplo de Response:
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

#### Ejemplo de Request:
```http
GET /insights/fraud-stats
```

#### Ejemplo de Response:
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

#### Ejemplo de Request:
```http
GET /insights/educational
```

#### Ejemplo de Response:
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

#### Path Parameters:
- `topic`: Uno de los siguientes valores:
  - `phishing`
  - `what-to-do`
  - `preventive-tips`
  - `identity-theft`
  - `detection-time`

#### Ejemplo de Request:
```http
GET /insights/educational/phishing
```

#### Ejemplo de Response:
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

---

### Ejemplo de Request completo con "what-to-do":

```http
GET /insights/educational/what-to-do
```

#### Response:
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

## 🎯 Casos de Uso en la App Móvil

### Pantalla de Insights (Página 7 del Mockup)

```typescript
// Obtener top hosts semanales
const topHosts = await fetch('/insights/top-hosts?period=weekly&limit=3');

// Obtener top categorías
const topCategories = await fetch('/insights/top-categories?limit=3');

// Mostrar estadística de detección
const stats = await fetch('/insights/fraud-stats');
console.log(`Tiempo promedio: ${stats.averageDetectionDays} días`);
```

### Pantalla de Categorías (Página 9 del Mockup)

```typescript
// Obtener categorías más buscadas y reportadas
const categories = await fetch('/insights/top-categories?limit=6');
```

### Pantalla Educativa (Páginas 11-13 del Mockup)

```typescript
// Obtener contenido de phishing
const phishingInfo = await fetch('/insights/educational/phishing');

// Obtener qué hacer si fui víctima
const fraudVictimInfo = await fetch('/insights/educational/what-to-do');

// Obtener consejos preventivos
const preventiveTips = await fetch('/insights/educational/preventive-tips');
```

---

## 📝 Notas Importantes

1. **Todos los endpoints son públicos** - No requieren autenticación
2. **Límites de resultados** - Máximo 50 items por request
3. **Caché recomendado** - Los datos cambian periódicamente, se puede cachear por 1 hora
4. **Contenido educativo estático** - Definido en `src/insights/content/educational-content.json`

---

## 🔄 Agregar Nuevo Contenido Educativo

Para agregar un nuevo tema educativo, edita el archivo:
```
src/insights/content/educational-content.json
```

Ejemplo de nueva entrada:
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

No olvides actualizar el enum en el controller:
```typescript
@ApiParam({
  name: 'topic',
  enum: ['phishing', 'what-to-do', 'preventive-tips', 'identity-theft', 'detection-time', 'nuevo-tema'],
})
```
