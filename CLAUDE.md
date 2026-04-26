# Territorios LB 2026 — Project Context for Claude

## Stack
- **Map**: MapLibre GL JS, tiles Google Hybrid (`lyrs=y`) — satélite + calles
- **UI**: Alpine.js v3.14.1, GSAP 3.13, dark theme inline CSS
- **Backend activo**: Firebase Firestore REST (`firebase.js`)
- **Auth**: Firebase Auth Email/Password + custom claims (`admin`, `capitanToken`)
- **App Check**: pendiente; activar primero en monitor y después enforcement
- **Data**: `territorios.geojson` (376 features, 106 territorios únicos t1–t106)

## Backend policy
- Firebase es el backend único activo.
- NO proponer Google Apps Script ni Google Sheets para backend/auth/datos.
- Archivos `.gs` y documentación vieja son legacy/obsoletos salvo que Aleksey pida revisarlos.
- `PLAN.md` es histórico/legacy y contradice la arquitectura actual.
- No desplegar reglas nuevas a producción hasta probar Firebase Auth admin + capitán con datos reales.
- No tocar producción sin confirmación explícita, especialmente `sesiones`, `historial`, `capitanes`, import de capitanes, seed de ciclos o deploy de reglas.

## Architecture
- `index.html` — mapa capitán (token en URL `?t=TOKEN`) y vista general
- `app.js` — `TerritorialApp`, lógica principal del mapa, sesión capitán y ciclo reset
- `admin.html` / `admin.js` / `admin.css` — panel admin Alpine.js
- `auth.js` — Auth admin/capitán vía Firebase Auth REST
- `firebase.js` — helper REST para Firestore, preparado para headers Auth/App Check
- `app-check.js` — App Check web opcional; vacío hasta registrar app/site key en consola
- `territory-model.js` — modelo local/fallback de ciclos por lugar de encuentro
- `firestore.rules` — reglas Firestore endurecidas para Auth/custom claims
- `tests/firestore.rules.test.mjs` — pruebas locales de reglas con Firestore Emulator
- `.github/workflows/rules-ci.yml` — CI de reglas sin deploy
- `territorios.geojson` — generado desde KML, NO editar manualmente
- `AVANCES.md` — tracker vivo de avances, pendientes y bloqueadores

## Branch / DevOps
- Vercel Git deployments quedan habilitados solo para `master` en `vercel.json`.
- No subir a Vercel prod desde ramas de prueba.
- `npm test` ejecuta Firestore Emulator contra project demo local.
- No ejecutar scripts contra Firebase producción sin revisar comando, alcance y rollback con Aleksey.

## Firestore model
- `capitanes/{token}` — datos del capitán
- `sesiones/{YYYY-MM-DD_token}` — sesión diaria por capitán
- `historial/{entryId}` — registros archivados de territorios `completo`, `parcial` y `ciclo_reset`
- `config/ciclos` — territorios liderados por cada lugar de encuentro para cálculo de ciclos
- `config/{docId}` — otra configuración admin, solo admin

## Auth model
- Admin: UI passcode-only; internamente usa Firebase Auth Email/Password con custom claim `admin: true`.
- Capitán: link `?t=TOKEN`; internamente usa usuario `${TOKEN}@capitan.territorios-lb.local` con custom claim `capitanToken`.
- `npm run admin:create -- nombre passcode [nombre passcode...]` crea/actualiza admins.
- `npm run captains:import -- token [token...]` importa/actualiza usuarios capitán en Firebase Auth.
- Los usuarios capitán reales ya fueron importados y probados antes del deploy de reglas hardened.

## Cycle model
- `territory-model.js` define el fallback local de lugares de encuentro → territorios.
- `config/ciclos` es la fuente de verdad en Firestore cuando existe.
- `npm run cycles:seed` puede sembrar `config/ciclos`, pero no debe ejecutarse contra producción sin confirmación.
- `ciclo_reset` se calcula por lugar, usando historial posterior al último reset de ese lugar.
- El estado interno `parcial` se mantiene por compatibilidad; la UI lo muestra como “En progreso”.

## Security direction
- Seguridad real = Firestore rules + Auth + App Check + restricciones de API key.
- API key web no es secreta.
- App Check queda pendiente de consola: `app-check.js` ya está preparado, primero monitor, luego enforcement.
- No activar enforcement de App Check hasta validar tráfico real en monitor.

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
