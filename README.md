# Territorios LB 2026

Sistema web para asignar, trabajar y archivar territorios de predicación.

## Estado actual

El backend activo único es **Firebase Firestore**. Google Apps Script y Google Sheets ya no forman parte del flujo principal del proyecto.

La app ya tiene código para Firebase Auth con custom claims:

- Admin: login simple con passcode, usando usuarios internos de Firebase Auth con claim `admin: true`.
- Capitán: link `?t=TOKEN`, usando usuario interno de Firebase Auth con claim `capitanToken`.
- App Check: frontend preparado; pendiente registrar reCAPTCHA v3 site key en consola, primero monitor y después enforcement.

No se deben tocar datos activos ni desplegar reglas a producción sin confirmación explícita.

## Stack

- Mapa: MapLibre GL JS
- UI: Alpine.js + GSAP
- Backend: Firebase Firestore REST (`firebase.js`)
- Auth: Firebase Auth Email/Password + custom claims
- Hosting: Vercel, con deploy automático restringido a `master`
- Pruebas: Firebase Emulator + `node:test`

## Estructura principal

- `index.html` — mapa para capitanes y vista general
- `app.js` — lógica principal del mapa y flujo de capitán
- `admin.html` / `admin.js` / `admin.css` — panel administrativo
- `auth.js` — Auth admin/capitán sobre Firebase Auth REST
- `firebase.js` — helper REST para Firestore con headers Auth/App Check
- `app-check.js` — inicialización opcional de App Check para web; permanece apagado si no hay `appId` y `siteKey`
- `territory-model.js` — modelo local/fallback de ciclos por lugar de encuentro
- `territorios.geojson` — datos geográficos generados desde KML; no editar manualmente
- `firestore.rules` — reglas de seguridad Firestore endurecidas
- `tests/firestore.rules.test.mjs` — pruebas de reglas con Firestore Emulator
- `scripts/create-admin-user.mjs` — crea/actualiza admins internos
- `scripts/import-captain-users.mjs` — importa/actualiza usuarios capitán en Firebase Auth
- `scripts/seed-cycle-config.mjs` — siembra `config/ciclos` en Firestore
- `AVANCES.md` — estado vivo de avances, pendientes y bloqueadores
- `PLAN.md` — documento histórico/legacy; no usar como arquitectura vigente

## Modelo Firestore

### `capitanes/{token}`

Datos administrativos del capitán.

```json
{
  "nombre": "Hno. Aleksey Cruz",
  "token": "aleksey-cru003",
  "tel": "",
  "activo": true
}
```

### `sesiones/{YYYY-MM-DD_token}`

Sesión diaria asignada a un capitán.

```json
{
  "fecha": "2026-04-12",
  "tipo": "casaencasa",
  "hora": "9:30 AM",
  "lugar": "Fam. Hernández Mora",
  "capitanToken": "aleksey-cru003",
  "grupos": "1, 2",
  "territorios": ["t40", "t41"],
  "capitan": "Hno. Aleksey Cruz",
  "estados": {
    "t40": { "estado": "completo", "notas": "" }
  }
}
```

### `historial/{entryId}`

Registro archivado de territorios trabajados y resets de ciclo.

```json
{
  "territorio": "t40",
  "lugar": "Fam. Hernández Mora",
  "estado": "completo",
  "notas": "",
  "capitan": "Hno. Aleksey Cruz",
  "capitanToken": "aleksey-cru003",
  "tipo": "casaencasa",
  "fechaPredicacion": "2026-04-12",
  "fechaCompletado": "2026-04-12",
  "fechaArchivado": "2026-04-12"
}
```

El valor interno `parcial` se conserva por compatibilidad, pero en la UI se muestra como “En progreso”.

### `config/ciclos`

Fuente de verdad para saber qué territorios lidera cada lugar de encuentro y cuándo un ciclo está completo.

```json
{
  "version": 1,
  "lugares": {
    "Fam. Hernández Mora": {
      "nombre": "Fam. Hernández Mora",
      "territorios": ["t1", "t2", "t3"],
      "tipos": ["casaencasa"],
      "activo": true
    }
  }
}
```

Si `config/ciclos` todavía no existe, la app usa el fallback local de `territory-model.js`.

## Ciclos por lugar de encuentro

El reset de ciclo no es global. Se calcula por `lugar`:

1. `territory-model.js` define la relación lugar → territorios.
2. `config/ciclos` puede guardar esa misma relación en Firestore.
3. Al enviar informe, la app revisa los territorios `completo` después del último `ciclo_reset` de ese lugar.
4. Si todos los territorios del lugar están completos, se registra un historial con `estado: "ciclo_reset"`.
5. El dashboard admin muestra progreso de ciclos por lugar.

## Auth

### Admin

- La UI pide solo passcode.
- `auth.js` prueba usuarios internos permitidos y obtiene un ID token de Firebase Auth.
- El ID token debe tener custom claim `admin: true`.
- Las reglas Firestore permiten operaciones sensibles solo a admin autenticado.

Comando para crear/actualizar admins:

```bash
npm run admin:create -- nombre passcode [nombre passcode...]
```

### Capitán

- El link público sigue siendo `index.html?t=TOKEN`.
- `auth.js` normaliza el token e inicia sesión con el usuario interno `${TOKEN}@capitan.territorios-lb.local`.
- El ID token debe tener custom claim `capitanToken: TOKEN`.
- Las reglas Firestore limitan al capitán a sus propios documentos/sesiones.

Comando para importar/actualizar usuarios capitán:

```bash
npm run captains:import -- token [token...]
```

Este comando toca Firebase Auth del proyecto configurado; no ejecutarlo contra producción sin revisar alcance y confirmar.

## App Check

El frontend ya carga `app-check.js` y tiene configurado el Web App ID. App Check queda apagado mientras `FirebaseAppCheck.CONFIG.siteKey` esté vacío.

Pasos seguros:

1. En Firebase Console, registrar/proteger la app web en App Check con reCAPTCHA v3.
2. Copiar la reCAPTCHA v3 site key en `app-check.js`.
3. Mantener App Check en modo monitor al inicio; no activar enforcement todavía.
4. Desplegar frontend autorizado y revisar que las peticiones legítimas a Firestore lleguen con App Check.
5. Después de revisar tráfico real, activar enforcement para Firestore si no hay bloqueos legítimos.

La CSP de `vercel.json` ya permite los dominios necesarios para cargar SDK web de Firebase y reCAPTCHA v3.

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Ejecutar pruebas de reglas Firestore:

```bash
npm test
```

Las pruebas usan Firebase Emulator con un project demo local y no tocan producción.

Servidor local simple:

```bash
python3 -m http.server 5173 --directory "/Users/aleksey/Proyectos/territorios-lb-2026"
```

## Operaciones bloqueadas sin confirmación

No ejecutar sin confirmación explícita de Aleksey:

- Deploy a Vercel producción.
- Nuevos deploys de `firestore.rules` a producción.
- Scripts contra Firebase producción, especialmente:
  - `npm run captains:import -- token [token...]`
  - `npm run cycles:seed`
  - scripts que modifiquen `sesiones`, `historial` o `capitanes`.
- Cambios manuales sobre datos activos de producción.

Antes de tocar producción, revisar comando exacto, alcance, rollback y validación posterior.

## DevOps

- GitHub Actions ejecuta pruebas de reglas en push/PR.
- `vercel.json` restringe deploys automáticos de Git a `master`.
- Las reglas endurecidas ya fueron desplegadas a producción y validadas; cualquier nuevo cambio de reglas requiere pruebas locales y confirmación explícita.
- `npm run cycles:seed` escribe solo `config/ciclos`, pero aun así requiere confirmación si apunta a producción.

## Legacy

- Google Apps Script y Google Sheets son legacy para este proyecto.
- Archivos `.gs` o documentos antiguos no deben guiar nuevas decisiones de arquitectura.
- `PLAN.md` conserva contexto histórico, pero contradice la arquitectura actual y está marcado como legacy.
