# Versionamiento - Guía Completa

## Formato de Versión (Semantic Versioning)

Se usa el formato: **MAJOR.MINOR.PATCH**

| Parte | Cuándo cambiarla |
|---|---|
| **MAJOR** (X.0.0) | Breaking changes, rediseños grandes |
| **MINOR** (0.X.0) | Nuevas funcionalidades compatibles |
| **PATCH** (0.0.X) | Bug fixes, cambios menores internos |

---

## Comandos

Desde la **raíz del proyecto**:

```bash
npm run version:patch "Descripción del fix"
npm run version:minor "Descripción de la nueva feature"
npm run version:major "Descripción del cambio mayor"
```

Desde la carpeta `version-system/`:

```bash
node bump-version.js patch "Descripción"
node bump-version.js minor "Descripción"
node bump-version.js major "Descripción"
```

---

## Ejemplos de Uso

### PATCH — Bug fix o mejora menor
```bash
npm run version:patch "Corregido error de login en móviles"
# 1.1.0 → 1.1.1
```

### MINOR — Nueva funcionalidad
```bash
npm run version:minor "Agregado módulo de reportes PDF"
# 1.1.1 → 1.2.0
```

### MAJOR — Cambio grande o breaking
```bash
npm run version:major "Migración a nueva estructura de base de datos"
# 1.2.0 → 2.0.0
```

---

## Flujo de Trabajo Recomendado

```
1. Realiza tus cambios en el código
2. Ejecuta el comando de versión apropiado
3. Verifica que version.json fue actualizado
4. Haz commit incluyendo version.json:
   git add version.json
   git commit -m "v1.2.0: Descripción del cambio"
5. Push al repositorio
```

---

## Debug en el Navegador

El `version-checker.js` tiene logs de debug activados en localhost. Para verlos:

1. Abre DevTools (`F12`) → pestaña **Console**
2. Verás logs como:
   ```
   [VersionChecker] VersionChecker initialized
   [VersionChecker] Current client version: 1.1.0
   [VersionChecker] Iniciando verificador de versiones...
   [VersionChecker] Versión inicial detectada: 1.1.0
   ```
3. Cuando se detecta una actualización:
   ```
   [VersionChecker] Nueva versión detectada: 1.1.0 → 1.2.0
   ```

---

## Estructura de Archivos

```
GestorInventory-Frontend/
├── version.json              ← Versión actual (actualizado automáticamente)
├── package.json              ← Scripts npm para bump de versión
├── version-system/
│   ├── bump-version.js       ← Script que actualiza versión + Supabase
│   ├── server.js             ← API Express (GET /api/version/check, etc.)
│   ├── package.json          ← Dependencias del sistema
│   └── .env                  ← Credenciales Supabase (NO subir al repo)
├── js/
│   ├── core/version-manager.js   ← Módulo frontend para leer versión/historial
│   └── ui/version-checker.js     ← Auto-verificador con banner de notificación
└── sql/
    └── create_version_history_table.sql  ← Schema de la tabla en Supabase
```

---

## API Endpoints (servidor local)

Inicia con `npm run version:server` o `cd version-system && node server.js`:

| Endpoint | Descripción |
|---|---|
| `GET /api/version/check` | Versión actual desde `version.json` |
| `GET /api/version/history?limit=10` | Historial desde Supabase |
| `GET /api/version/latest` | Última versión registrada |
| `GET /health` | Healthcheck del servidor |

---

## Consultas Útiles en Supabase

```sql
-- Ver historial completo
SELECT * FROM version_history ORDER BY build_date DESC;

-- Ver solo la última versión
SELECT version, description, build_date
FROM version_history
ORDER BY build_date DESC
LIMIT 1;
```

---

## Errores Comunes

| Error | Solución |
|---|---|
| `supabaseUrl is required` | El archivo `.env` no existe o no se cargó. Recréalo en `version-system/.env` |
| `relation "version_history" does not exist` | Ejecuta `sql/create_version_history_table.sql` en Supabase |
| No aparece el banner de actualización | Verifica que `version.json` sea accesible públicamente |
| `fetch failed` en bump-version | Proyecto Supabase pausado. El `version.json` sí se actualiza igual |
