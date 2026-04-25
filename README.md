# Territorios LB 2026

Sistema web para asignar, trabajar y archivar territorios de predicación.

## Estado actual

El backend activo es **Firebase Firestore**. Google Apps Script y Google Sheets ya no forman parte del flujo principal del proyecto.

## Stack

- Mapa: MapLibre GL JS
- UI: Alpine.js + GSAP
- Backend: Firebase Firestore
- Seguridad objetivo: Firebase Auth + custom claims + App Check
- Hosting: Vercel, con deploy automático restringido a `master`

## Estructura principal

- `index.html` — mapa para capitanes y vista general
- `app.js` — lógica principal del mapa y flujo de capitán
- `admin.html` / `admin.js` / `admin.css` — panel administrativo
- `firebase.js` — helper REST para Firestore
- `firestore.rules` — reglas de seguridad Firestore
- `tests/firestore.rules.test.mjs` — pruebas de reglas con Firestore Emulator
- `territorios.geojson` — datos geográficos generados desde KML

## Modelo Firestore

### `capitanes/{token}`

```json
{
  "nombre": "Hno. Aleksey Cruz",
  "token": "aleksey-cru003",
  "tel": "",
  "activo": true
}
```

### `sesiones/{YYYY-MM-DD_token}`

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

## DevOps

- La rama de hardening actual es `chore/firestore-rules-hardening`.
- GitHub Actions ejecuta pruebas de reglas en cada push/PR.
- `vercel.json` restringe deploys automáticos de Git a `master`.
- No desplegar `firestore.rules` nuevas a producción hasta conectar Firebase Auth en la app.

## Legacy

Los archivos `.gs`, si existen en el historial o en copias locales, son legacy y no deben guiar nuevas decisiones de arquitectura.
