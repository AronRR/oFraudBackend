# Gu�a de Integraci�n Frontend - oFraud Dashboard

Esta gu�a resume los cambios necesarios para que el dashboard React consuma correctamente las mejoras del backend oFraud (miniaturas, auditor�a y endpoints administrativos).

## Requisitos previos

- Backend `oFraudClean` en ejecuci�n (`npm run start:dev`)
- Dashboard en `my-app` o `Downloads/front` ejecut�ndose con `npm run dev`
- `.env` del frontend con `VITE_API_BASE_URL=http://localhost:3000`
- Cuenta con rol `admin` (reportes) y `superadmin` (auditor�a)

## Endpoints relevantes

| M�todo | Ruta | Descripci�n |
| --- | --- | --- |
| GET | `/admin/reports` | Lista de reportes (incluye `thumbnailUrl` y `thumbnailType`) |
| GET | `/admin/reports/:id` | Detalle con galer�a multimedia |
| POST | `/files/upload` | Subida de im�genes/videos (JWT requerido) |
| GET | `/admin/audit-logs` | Auditor�a (solo superadmin) |

## Actualizaci�n de tipos (`src/api/types.ts`)

Aseg�rate de que `AdminReport` tenga los campos de miniatura:

```ts
export type AdminReport = {
  reportId: number;
  title: string | null;
  status: ReportStatus;
  categoryId: number;
  categoryName: string | null;
  thumbnailUrl: string | null;
  thumbnailType: 'image' | 'video' | null;
  // ... resto de propiedades
};
```

Para la auditor�a, el tipo `AuditLogEntry` debe contemplar la estructura expuesta por el backend:

```ts
export type AuditLogEntry = {
  id: number;
  actionType: AdminActionType;
  targetType: AdminTargetType | null;
  targetId: number | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  admin: {
    id: number;
    email: string | null;
    fullName: string;
  };
};
```

## Tabla de reportes (`src/pages/ReportsPage.tsx`)

1. A�ade la columna �Imagen� en el `<thead>`.
2. Renderiza la celda de miniatura antes del identificador del reporte:

```tsx
<td>
  {report.thumbnailUrl ? (
    report.thumbnailType === 'image' ? (
      <img
        src={report.thumbnailUrl}
        alt="Vista previa"
        className="table__thumbnail"
        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
      />
    ) : (
      <div className="table__video-icon">Ver video</div>
    )
  ) : (
    <div className="table__no-image">Sin imagen</div>
  )}
</td>
```

3. Si usas estilos globales, a�ade una secci�n para `table__thumbnail`, `table__video-icon` y `table__no-image`.

## P�gina de auditor�a (`src/pages/AuditLogsPage.tsx`)

- El hook `useQuery` debe invocar `GET /admin/audit-logs` y construir la cadena de filtros a partir de `actionType`, `targetType`, `dateFrom`, `dateTo`.
- Presenta el bloque `details` usando `JSON.stringify(details, null, 2)` dentro de un `<details>` para facilitar la lectura.
- Oculta la p�gina cuando el usuario autenticado no sea superadministrador.

## Estilos sugeridos

```css
.table__thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.table__video-icon,
.table__no-image {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 0.75rem;
  color: #4b5563;
}
```


## Recursos adicionales

- **Backend README** (`README.md`): gu�a general y secci�n de auditor�a.
- **Documentaci�n Swagger** (`http://localhost:3000/docs`).
- **database-model.md**: referencia del esquema relacional.

Con estos cambios, el dashboard consume al 100?% las mejoras del backend y est� listo para revisi�n del cliente.
