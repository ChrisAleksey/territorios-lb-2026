# Plan: App Web Territorios LB 2026

## Visión general

Reemplazar el flujo manual (copiar/pegar mensajes de WhatsApp + imágenes de Drive) por una app web donde:

- **Tú (admin)** cargas el programa mensual y generas los mensajes automáticamente
- **Los capitanes** reciben un link que abre un mapa interactivo con solo sus territorios
- **En campo**, los capitanes marcan el avance directamente en el mapa
- **Google Sheets** sigue siendo la fuente de verdad, sincronizada en tiempo real

---

## Tipos de actividad y días

| Día | Tipo | Territorios |
|---|---|---|
| Lunes | Presencial | Verdes (grupos fijos) |
| Miércoles | Presencial | Verdes (grupos fijos) |
| Sábado | Presencial | Verdes (grupos fijos) |
| Domingo | Presencial | Verdes (grupos fijos) |
| Viernes | Carta Postal | Rojos + Naranja (cerradas) |
| Martes | Zoom | — (sin mapa de territorio) |
| Jueves | Zoom | — (sin mapa de territorio) |

---

## Polígonos en Google Earth (KML)

El archivo KML tiene tres colores:

| Color | Tipo | Comportamiento |
|---|---|---|
| Verde | Presencial | Trabajo normal puerta a puerta |
| Rojo | Carta Postal | Solo viernes, envío de cartas |
| Naranja | Condominio difícil acceso | Se intenta; capitán marca resultado |

---

## Autenticación: solo el link

Igual que Google Docs con "cualquiera con el link puede ver".

Cada capitán tiene un link único y permanente:
```
territorios-lb.app/c/8f3a9k2x1m4p
```

- No hay login, no hay usuario/contraseña
- Quien tenga el link, accede
- El link no cambia (es permanente por capitán)
- Si alguien pierde acceso, se genera un link nuevo

Los links se guardan en una tabla de capitanes en Google Sheets:

| Nombre | Teléfono | Token (link) |
|---|---|---|
| Fernando Frausto | 521XXXXXXXXXX | 8f3a9k2x1m4p |
| Abraam Maldonado | 521XXXXXXXXXX | 7d2b5n9q3r8w |
| ... | ... | ... |

---

## Fuentes de datos (ya existen)

```
Google Sheets
├── "Territorios por Lugares de Encuentro LB 2026"
│   ├── 11 hojas = 11 grupos fijos
│   └── Cada hoja = territorios presenciales del grupo
└── "Territorios LB Carta Postal"
    ├── Territorios con casas cerradas
    └── Registro de Cartas Enviadas

KML de Google Earth
└── Todos los polígonos del territorio con colores
```

---

## Arquitectura técnica

```
GitHub Pages (hosting gratuito)
│
├── /                → Home / login admin
├── /admin           → Panel de administración (solo tú)
├── /c/:token        → Vista del capitán (autenticado por link)
└── /mapa            → Mapa general (opcional, solo admin)

Apps Script Web App (backend)
├── doGet(?t=TOKEN)  → retorna asignaciones del capitán
└── doPost()         → recibe actualizaciones de estado de territorios

Google Sheets (base de datos)
├── Lugares de Encuentro (lectura + escritura)
├── Carta Postal (lectura + escritura)
└── Capitanes (tokens, teléfonos, nombres)
```

### Stack

| Componente | Tecnología | Por qué |
|---|---|---|
| Frontend | HTML + Vanilla JS | Sin build step, simple, rápido |
| Mapa | Leaflet.js 1.9 | Gratis, sin API key, 106 polígonos trivial |
| Tiles (fondo) | OpenStreetMap o Google Satellite | Gratuito |
| Polígonos | GeoJSON (convertido una vez desde KML) | Estático en el repo |
| Lectura Sheets | CSV export público | Sin OAuth |
| Escritura Sheets | Apps Script doPost | Ya existe la infraestructura |
| Hosting | GitHub Pages | Gratis, repo ya existe |

---

## Flujo completo: un sábado

```
Viernes noche (admin):
  1. Abres /admin
  2. Seleccionas el sábado del programa mensual
  3. Ves los datos auto-cargados: capitanes, grupos, hora, punto de encuentro
  4. Click "Generar mensajes WhatsApp"
  5. Se abren links wa.me por capitán con mensaje pre-llenado:

     "📅 Sábado 4 abril · 9:30 am
      📍 Fam. Hernández Mora
      👥 Grupos: 1, 3, 5, 7, 9
      🗺️ territorios-lb.app/c/8f3a9k2x"

  6. Click "Enviar" en WhatsApp → listo

Sábado (capitán en campo):
  7. Abre su link → mapa carga directo, sin login
  8. Ve sus polígonos verdes resaltados
  9. Toca un polígono → modal: Marcar como...
     [ Completo ✅ ]  [ Parcial 🟡 ]  [ Notas... ]
  10. Confirma → se guarda en Google Sheets vía Apps Script

Admin (en tiempo real):
  11. Dashboard muestra avance de todos los grupos
```

## Flujo completo: un viernes de cartas

```
  1. Admin genera link del capitán de cartas del viernes
  2. Capitán abre link → ve polígonos rojos y naranja
  3. Trabaja la zona, marca cada territorio
  4. El registro se guarda en "Territorios LB Carta Postal"
```

---

## Vista del capitán (móvil)

```
┌─────────────────────────────┐
│  📍 Sábado 4 abril · 9:30   │
│  Fam. Hernández Mora        │
│  Capitán: Abraam Maldonado  │
├─────────────────────────────┤
│                             │
│   [  MAPA INTERACTIVO  ]    │
│                             │
│   Polígonos resaltados:     │
│   Verde oscuro = asignado   │
│   Verde claro = sin tocar   │
│   Azul = completado         │
│   Amarillo = parcial        │
│                             │
├─────────────────────────────┤
│  T1 ✅  T2 ⬜  T3 🟡  T4 ⬜ │
└─────────────────────────────┘
```

Al tocar un polígono:
```
┌─────────────────────────────┐
│  Territorio 3               │
│  Grupo: Hernández Mora      │
│                             │
│  [ ✅ Completo ]            │
│  [ 🟡 Parcial  ]            │
│  [ ↩️ Sin trabajar ]        │
│                             │
│  Notas: ________________    │
└─────────────────────────────┘
```

---

## Panel Admin

- Cargar programa mensual (manual o importar desde imagen con IA en el futuro)
- Ver todos los capitanes y sus tokens/links
- Generar mensajes WhatsApp para cualquier fecha
- Dashboard de avance: todos los territorios, todos los grupos
- Historial mensual

---

## Fases de construcción

### Fase 1 — Mapa base
- [ ] Convertir KML → GeoJSON (una vez)
- [ ] Mapa Leaflet con los 3 colores de polígonos
- [ ] Popup al tocar: nombre y número del territorio
- [ ] Hospedado en GitHub Pages

### Fase 2 — Vista del capitán
- [ ] URL con token (`/c/:token`)
- [ ] Carga datos del capitán desde Apps Script
- [ ] Resalta solo los territorios asignados para hoy
- [ ] Marcar estado → POST a Apps Script → actualiza Sheets

### Fase 3 — Panel admin
- [ ] Tabla de capitanes (nombre, tel, token, link)
- [ ] Formulario para cargar sesión del programa mensual
- [ ] Generador de mensajes WhatsApp (wa.me links pre-llenados)

### Fase 4 — Dashboard y mejoras
- [ ] Vista de avance en tiempo real por grupo
- [ ] Historial por territorio y por mes
- [ ] Importar programa mensual desde foto (OCR con IA)

---

## Lo que se necesita para empezar

1. **Archivo KML/KMZ** de Google Earth con los polígonos
2. **Lista de capitanes** con nombres y teléfonos
3. **Definir la relación** grupos 1-11 → IDs de territorios (ya está en las hojas de Sheets)
