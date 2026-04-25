# Territorios LB 2026 — Project Context for Claude

## Stack
- **Map**: MapLibre GL JS, tiles Google Hybrid (`lyrs=y`) — satélite + calles
- **UI**: Alpine.js v3.14.1, GSAP 3.13, dark theme inline CSS
- **Backend activo**: Firebase Firestore REST (`firebase.js`)
- **Auth objetivo**: Firebase Auth + custom claims (`admin`, `capitanToken`) + App Check
- **Data**: `territorios.geojson` (377 features, 106 territorios únicos t1–t106)

## Backend policy
- Firebase es el backend único activo.
- NO proponer Google Apps Script ni Google Sheets para backend/auth/datos.
- Archivos `.gs` y documentación vieja son legacy/obsoletos salvo que Aleksey pida revisarlos.
- No desplegar reglas nuevas a producción hasta que Firebase Auth esté conectado en la app.

## Architecture
- `index.html` — mapa capitán (token en URL `?t=TOKEN`)
- `app.js` — `TerritorialApp`, lógica principal del mapa
- `admin.html` / `admin.js` / `admin.css` — panel admin Alpine.js
- `firebase.js` — helper REST para Firestore, preparado para headers Auth/App Check
- `firestore.rules` — reglas Firestore endurecidas para Auth/custom claims
- `tests/firestore.rules.test.mjs` — pruebas locales de reglas con Firestore Emulator
- `.github/workflows/rules-ci.yml` — CI de reglas sin deploy
- `territorios.geojson` — generado desde KML, NO editar manualmente

## Branch / DevOps
- Rama de hardening: `chore/firestore-rules-hardening`
- Vercel Git deployments quedan habilitados solo para `master` en `vercel.json`.
- No subir a Vercel prod desde ramas de prueba.
- `npm test` ejecuta Firestore Emulator contra project demo local.

## Firestore model
- `capitanes/{token}` — datos del capitán
- `sesiones/{YYYY-MM-DD_token}` — sesión diaria por capitán
- `historial/{entryId}` — registros archivados de territorios completo/parcial y resets de ciclo
- `config/{docId}` — configuración admin, solo admin

## Security direction
- Admin: Firebase Auth con custom claim `admin: true`
- Capitán: Firebase Auth/custom token con custom claim `capitanToken`
- App Check: activar primero en monitor, luego enforcement
- API key web no es secreta; seguridad real = rules + Auth + App Check + restricciones de key

## Territory Types (fill colors from KML)
- `#388e3c` → presencial (verde)
- `#d32f2f` → carta postal (rojo, borde punteado)
- `#f57c00` → carta postal (naranja → se renderiza como rojo, borde punteado)

## Territorios con polígonos mixtos
`t6`, `t15`, `t20`, `t25`, `t35`, `t59`, `t60`, `t61`, `t63`, `t66`, `t69`, `t70`, `t72`, `t73`, `t95`, `t99`, `t101`, `t105`, `t106`, `t41`.

El filtro opera por polígono individual via `map.setFilter()`, NO por territorio.

## MapLibre Quirks Críticos
- `promoteId: 'name'` — feature state se comparte entre todos los polígonos del mismo nombre
- `line-dasharray` — NO soporta expresiones data-driven; usar capas separadas con `filter`
- `zoom` en `line-width` — DEBE ser la expresión raíz (`interpolate`/`step` top-level)
- Colores en `case` — usar hex strings (`#rrggbb`), no `rgba()` si causa type mismatch
- `['get', 'territoryColor']` funciona en `fill-color` pero puede fallar en `line-color`; usar `['to-color', ...]` si hay problemas

## KML → GeoJSON
Para regenerar el GeoJSON desde un KML nuevo, convertir el archivo completo a GeoJSON. No parchear features individuales.
