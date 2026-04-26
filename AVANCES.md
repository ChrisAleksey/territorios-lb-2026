# Avances y pendientes — Territorios LB 2026

Última actualización: 2026-04-26

## Reglas de trabajo

- Firebase es el backend activo único.
- No usar Google Apps Script ni Google Sheets para backend, auth o datos nuevos.
- No desplegar a Vercel producción sin confirmación explícita.
- No desplegar nuevas versiones de `firestore.rules` a producción sin pruebas locales y confirmación explícita.
- No tocar datos activos de producción sin confirmación explícita, especialmente `sesiones`, `historial` y `capitanes`.
- No ejecutar scripts contra Firebase producción (`cycles:seed`, `captains:import`, deploy de reglas) sin revisar impacto y confirmar primero.
- Usar ramas de prueba/actualización para subir avances a GitHub.

## Protección de sesiones activas

- Las sesiones activas están en `sesiones/{fecha_token}` y no deben modificarse durante hardening salvo acción explícita.
- `config/ciclos` es configuración nueva y separada; no debe reescribir sesiones activas.
- Importar capitanes a Firebase Auth toca Authentication, no la colección `sesiones`.
- Nuevos deploys de reglas pueden afectar acceso a sesiones aunque no cambien datos; por eso requieren pruebas locales y confirmación explícita.
- Antes de cualquier cambio en Firebase producción: revisar comando exacto, alcance, rollback y confirmar con Aleksey.

## Pendientes importantes agregados

- [x] Revisar y corregir bug: `ciclo_reset` no funciona bien.
- [x] Definir modelo Firebase para ciclos: territorios por lugar de encuentro, territorios asignados/liderados y criterio para saber cuándo un ciclo está completo.
- [~] Hacer revisión general de bugs funcionales en admin, mapa capitán, historial y sesiones: revisión estática avanzada; faltan pruebas manuales reales.
- [x] Unificar lenguaje: `parcial` y `en progreso` representan el mismo estado; en UI se muestra como “En progreso”.
- [~] Revisar que la UI sea constante en toda la app web: textos, botones, labels/foco y responsive estático alineados; falta revisión visual manual en navegador/dispositivo real.
- [~] Limpiar y organizar el proyecto: archivos temporales/locales ignorados, legacy marcado y mapa de archivos agregado; falta decidir si se eliminan archivos sueltos.
- [x] Corregir y actualizar toda la documentación para que refleje Firebase como backend activo único.
- [~] Revisar consistencia de datos: GeoJSON local validado (376 features, 106 territorios, sin faltantes); falta revisar capitanes/sesiones/historial reales.
- [x] Preparar checklist de pruebas antes de cada deploy o merge.
- [~] Revisar seguridad frontend: CSP y SRI de CDNs versionados ya están configurados; se redujo exposición local de tokens en frontend; App Check quedó preparado con Web App ID y pendiente solo de reCAPTCHA site key/monitor/enforcement en consola.
- [~] Revisar experiencia móvil completa, especialmente pantallas pequeñas con navegador real: servidor estático, checks headless y viewport 407px OK; falta validación manual en navegador/dispositivo real.
- [~] Mantener este archivo actualizado marcando avances conforme se completen: tracker actualizado al estado local; seguirá vivo hasta cerrar bloqueos con datos reales/producción.

## Estado general

| Área | Estado | Notas |
|---|---|---|
| Firestore rules hardened | Completado en producción | Reglas desplegadas a Firestore producción y validadas post-deploy sin escrituras. |
| Tests de reglas | Completado | `npm test` pasa con Firestore Emulator: 15 pruebas OK. |
| CI de reglas | Completado | GitHub Actions ejecuta tests de reglas. |
| Firebase Auth admin | Completado | Login admin passcode-only conectado a Firebase Auth con custom claim `admin`. |
| Login admin local | Completado | Probado en `http://localhost:5173/` con admins internos y passcode incorrecto. |
| Firebase API key restrictions | Parcial / bloqueado por consola | Producción y localhost permitidos; cierre final depende de revisar restricciones en Firebase Console junto con App Check. |
| Firebase Auth capitán | Completado en producción | 28 capitanes activos importados a Firebase Auth; Auth real + claim `capitanToken`, lectura propia de `capitanes/{token}` y sesión real probados. |
| Revisión de bugs funcionales | Parcial | `ciclo_reset` corregido por lugar y tipo; admin ya no auto-escribe `config/ciclos`; capitán no registra resets; filtros admin carta/presencial corregidos. Faltan pruebas manuales reales. |
| Modelo de ciclos por lugar | Completado en producción | `config/ciclos` modela qué territorios lidera cada lugar y cómo calcular ciclo completo por tipo (`casaencasa`/`carta`); sembrado en producción con 11 lugares. |
| Consistencia UI/UX | Parcial | Lenguaje, controles, labels/foco, responsive estático y smoke Playwright post-reglas revisados; falta validación manual en dispositivo real. |
| Limpieza y organización | Parcial | Mapa de archivos agregado; `.gitignore` evita subir carpetas locales; `PLAN.md` marcado como legacy; archivos sueltos revisados y pendientes de decisión final. |
| Documentación correcta | Completado en Git | README, CLAUDE.md y AVANCES.md alineados con Firebase/Auth/ciclos/App Check y guardrails de producción. |
| App Check | Preparado en producción / pendiente consola | `app-check.js` ya tiene Web App ID y está desplegado; queda apagado sin reCAPTCHA v3 site key. Requiere consola Firebase: registrar App Check, configurar site key, primero monitor, revisar tráfico legítimo, después enforcement. |
| CSP/SRI/frontend hardening | Parcial | CSP configurada para CDNs actuales, Firebase SDK web y reCAPTCHA; SRI agregado; frontend ya no expone lista hardcodeada nombre→token ni guarda extras con token en `localStorage`; falta site key App Check, monitor/enforcement y revisión final con datos reales. |
| Deploy frontend producción | Completado | `master` actualizado y Vercel producción desplegado/aliasado a `https://territorios-lb-2026.vercel.app`; smoke Playwright OK. |
| Deploy reglas producción | Completado | `firestore.rules` desplegado con Firebase CLI; anónimo bloqueado y capitán real autenticado lee `capitanes`, `sesiones` y `config/ciclos`. |

## Implementaciones completadas

### 1. Firestore rules hardened

- Se endurecieron reglas para exigir `request.auth`.
- Admin usa custom claim `admin: true`.
- Capitán usará custom claim `capitanToken`.
- Se validan estructuras de:
  - `capitanes/{token}`
  - `sesiones/{YYYY-MM-DD_token}`
  - `historial/{entryId}`
  - `config/{docId}`
- Las reglas hardened ya fueron desplegadas a producción y validadas post-deploy.

### 2. Pruebas locales de reglas

- Se agregó suite local con Firestore Emulator.
- Cobertura principal:
  - anónimo bloqueado;
  - admin puede gestionar capitanes/sesiones/config;
  - capitán solo accede a su token;
  - capitán solo actualiza `estados` de su sesión;
  - historial limita acciones sensibles.

### 3. CI de reglas

- Se agregó workflow de GitHub Actions para correr `npm test`.
- Incluye Node, Java y Firebase Emulator.

### 4. Auth admin con Firebase

- Se habilitó Email/Password provider en Firebase Auth.
- Se crearon usuarios internos de admin con emails locales no visibles en la UI.
- La UI sigue siendo simple: solo pide contraseña/passcode.
- `auth.js` inicia sesión vía Firebase Auth REST.
- `firebase.js` ya puede mandar `Authorization: Bearer <idToken>`.

### 5. Prueba local del login admin

- Servidor local usado: `http://localhost:5173/`.
- Probado:
  - admin Aleksey entra a `admin.html`;
  - admin René entra a `admin.html`;
  - passcode incorrecto muestra error;
  - no hubo deploy a Vercel producción.

### 6. Modelo Firebase de ciclos

- Se agregó `territory-model.js` como fuente compartida de configuración de territorios por lugar.
- `config/ciclos` queda como fuente de verdad en Firestore.
- La app usa fallback local si `config/ciclos` aún no existe.
- El admin puede sembrar la configuración inicial con `npm run cycles:seed`.
- Las reglas permiten leer `config/ciclos` a usuarios autenticados y escribirlo solo a admin.

### 7. Corrección de `ciclo_reset`

- El cálculo de ciclo ya no depende solo de una tabla hardcodeada por archivo.
- El reset se calcula por lugar de encuentro usando `config/ciclos` + historial.
- El dashboard ahora muestra progreso de ciclos por lugar.
- Al enviar informe se reevalúan los ciclos completos; el registro `ciclo_reset` solo se escribe si el contexto tiene permisos admin.

### 8. Auth de capitanes

- Se agregó `CaptainAuth` sobre Firebase Auth REST.
- El link `?t=TOKEN` inicia sesión automática usando usuario interno `capitan:TOKEN`.
- El ID token debe incluir custom claim `capitanToken`.
- `firebase.js` recibe el token y manda `Authorization: Bearer <idToken>`.
- Se agregó script `npm run captains:import -- token [token...]` para importar/actualizar usuarios capitán.

### 9. Documentación y organización local

- `README.md` quedó alineado con Firebase como backend único, Auth admin/capitán, `config/ciclos`, comandos y guardrails de producción.
- `CLAUDE.md` quedó alineado con la arquitectura vigente para futuras sesiones.
- `PLAN.md` quedó marcado como documento histórico/legacy porque contradice la arquitectura Firebase actual.
- `.gitignore` ignora carpetas locales de Claude/Playwright para no subir basura al repo.

## Pendientes inmediatos

> Nota de estado: lo local/código está casi cerrado. Lo que sigue pendiente se divide entre validación manual en navegador y acciones bloqueadas por producción/datos reales. No ejecutar producción sin confirmación explícita.

### 1. Implementar Auth de capitanes

Objetivo:
- Mantener links simples con `?t=TOKEN`.
- Convertir el token del link en una sesión Firebase Auth válida.
- Cada capitán debe recibir ID token con custom claim `capitanToken`.

Tareas:
- [x] Definir mecanismo Spark-compatible para crear/autenticar usuarios capitán.
- [x] Crear script para importar/actualizar usuarios capitán en Firebase Auth.
- [x] Conectar `app.js`/`index.html` para iniciar sesión de capitán al abrir `?t=TOKEN`.
- [x] Configurar `firebase.js` para mandar ID token también en vista capitán.
- [x] Importar usuarios capitán reales en Firebase Auth: 28 capitanes activos creados/actualizados.
- [x] Probar capitán real localmente con una sesión existente: Auth real + claim + lectura propia de `capitanes/{token}` y `sesiones/{fecha_token}` OK.

### 2. Completar pruebas de Auth + reglas

Tareas:
- [x] Probar admin contra Firestore con ID token real.
- [x] Probar capitán contra Firestore con ID token real: lectura propia de `capitanes/{token}` y lectura de una sesión real OK.
- [x] Confirmar que anónimo queda bloqueado en pruebas de reglas.
- [x] Confirmar que capitán no puede leer/modificar datos de otro capitán en pruebas de reglas.

### 3. Deploy controlado de reglas Firestore

Completado tras probar Auth capitán real.

Tareas:
- [x] Re-ejecutar `npm test` localmente antes de cualquier deploy.
- [~] Confirmar manualmente flujo admin + capitán: Auth capitán real probado por API con sesión real; falta walkthrough visual en navegador.
- [x] Desplegar solo reglas Firestore con Firebase CLI.
- [x] Validar producción sin tocar Vercel prod: anónimo bloqueado; capitán real autenticado lee perfil, sesión propia y `config/ciclos`.

### 4. App Check

Tareas:
- [x] Preparar frontend para App Check opcional sin enforcement: `app-check.js` configura `X-Firebase-AppCheck` solo si existen `appId` y `siteKey`.
- [x] Ajustar CSP para Firebase SDK web y reCAPTCHA v3.
- [x] Obtener Web App ID existente con Firebase CLI y dejarlo en `app-check.js`.
- [ ] Registrar/proteger app web en App Check con reCAPTCHA v3. **Requiere consola Firebase.**
- [ ] Copiar reCAPTCHA v3 site key en `app-check.js`. **Después de registrar en consola.**
- [ ] Activar modo monitor primero. **No enforcement inicial.**
- [ ] Revisar tráfico legítimo. **Después de monitor.**
- [ ] Activar enforcement cuando esté estable. **No activar antes de revisar monitor.**

### 5. Revisión de bugs funcionales

Tareas:
- [x] Revisar y corregir bug: `ciclo_reset` no funciona correctamente.
- [x] Investigar si el problema real es falta de base de datos de ciclos/territorios por lugar de encuentro en Firebase.
- [x] Definir en Firestore qué lugar de encuentro lidera qué territorios.
- [x] Definir cómo se calcula un ciclo completo: por lugar, por tipo de territorio, por fecha y por historial.
- [x] Crear/ajustar colección de configuración para ciclos si hace falta.
- [ ] Probar flujo completo de reset de ciclo desde la UI admin con datos reales. **Bloqueado por datos reales/Auth real.**
- [ ] Confirmar que el historial registra correctamente resets, completos y en progreso con datos reales. **Bloqueado por datos reales.**
- [~] Revisar que las fechas usadas por sesiones/historial sean consistentes: revisión estática OK; falta validar con datos reales.
- [~] Revisar errores de consola en `index.html` y `admin.html`: Puppeteer headless sin errores inesperados con backend mock; falta prueba manual con Auth/datos reales.
- [~] Validar flujos principales en móvil y escritorio: servidor estático responde recursos principales; Puppeteer validó index general, admin con Auth mock y capitán móvil con backend mock; falta interacción manual con Auth/datos reales.
- [x] Agregar pruebas donde tenga sentido para evitar regresiones: suite de reglas ampliada a 15 pruebas, incluyendo `ciclo_reset` con tipo y bloqueo a capitán.

### 6. Consistencia UI/UX en toda la app

Tareas:
- [~] Unificar estilos entre mapa público/capitán y panel admin: revisión estática de lenguaje, controles y estados ya hecha; falta validación visual real antes de marcar completado.
- [~] Revisar botones, modales, inputs, estados vacíos, loading y mensajes de error: mensajes/labels/foco revisados; smoke Playwright post-reglas OK; falta walkthrough manual real.
- [~] Revisar responsive en pantallas pequeñas, medianas y escritorio: CSS/HTML, servidor local y Playwright headless OK; falta revisión manual en navegador/dispositivo real.
- [x] Confirmar que textos, acentos, mayúsculas y nombres de acciones sean consistentes para `parcial`/“En progreso” y pendientes/sin trabajar.
- [x] Revisar accesibilidad básica: foco visible, labels, `aria-label`, `aria-pressed`, `aria-current` y roles de diálogo agregados/revisados.
- [~] Evitar comportamientos distintos para acciones similares: toggles y navegación alineados con estados ARIA; falta prueba manual.

### 7. Limpieza, organización y deuda técnica

Tareas:
- [x] Revisar archivos legacy y decidir si se eliminan, se ignoran o se documentan como obsoletos.
- [x] Limpiar archivos temporales/locales que no deben entrar al repo.
- [x] Revisar `.gitignore` y `.vercelignore` para evitar subir basura o archivos sensibles.
- [x] Ordenar scripts en `package.json` y dejar solo comandos útiles.
- [x] Revisar nombres de funciones/archivos para que reflejen el flujo Firebase actual.
- [x] Agregar mapa rápido de archivos/carpetas para ubicar mejor frontend, Firebase, scripts, pruebas, datos y documentación.
- [~] Eliminar código muerto o rutas antiguas relacionadas con Apps Script/Sheets: backend legacy descartado y `PLAN.md` marcado legacy; no se borraron archivos sueltos sin confirmación.
- [x] Revisar que `territorios.geojson` no se edite manualmente y documentar regeneración.

#### Mapa rápido de archivos y carpetas

- **Entrada pública/capitán:** `index.html` + `app.js`.
- **Panel admin:** `admin.html`, `admin.js`, `admin.css`.
- **Auth y Firestore REST:** `auth.js`, `firebase.js`.
- **Modelo compartido de territorios/ciclos:** `territory-model.js`.
- **Datos del mapa:** `territorios.geojson` — generado desde KML; no editar manualmente.
- **Reglas y pruebas Firebase:** `firestore.rules`, `tests/firestore.rules.test.mjs`, `.github/workflows/rules-ci.yml`.
- **Scripts operativos:** `scripts/import-captain-users.mjs`, `scripts/seed-cycle-config.mjs`.
- **Configuración deploy/proyecto:** `package.json`, `firebase.json`, `vercel.json`, `.vercelignore`, `.gitignore`.
- **Documentación vigente:** `README.md`, `CLAUDE.md`, `AVANCES.md`.
- **Documentación legacy:** `PLAN.md` — histórico, no usar como arquitectura actual.
- **Archivos locales/sueltos por decidir:** `ui.html` es style guide; imágenes `extra-mode-zoom*.jpeg` y `t6-poligono-erroneo.png` son evidencia visual/debug; no borrar sin confirmación.

### 8. Documentación correcta del proyecto

Tareas:
- [x] Actualizar README para reflejar el estado real actual.
- [x] Actualizar instrucciones de desarrollo local.
- [x] Documentar flujo admin: creación de admins, login y claims.
- [x] Documentar flujo capitán cuando quede implementado.
- [x] Documentar proceso seguro para desplegar reglas Firestore.
- [x] Documentar qué cosas NO se deben desplegar a Vercel producción.
- [x] Quitar o marcar claramente documentación vieja que contradiga Firebase.

### 9. Calidad de datos y territorios

Tareas:
- [x] Crear fuente de verdad en Firebase para territorios por lugar de encuentro.
- [x] Registrar qué lugar lidera cada territorio y qué territorios cuentan para su ciclo.
- [x] Distinguir ciclos de presencial/carta postal si aplican reglas distintas: ciclos separados por tipo (`casaencasa`/`carta`) en modelo, historial, dashboard y selector admin.
- [x] Revisar territorios con polígonos mixtos.
- [~] Revisar casos visuales reportados como polígonos incorrectos: `t6` tiene 1 polígono verde en GeoJSON; requiere validar contra KML/origen, no parchear a mano.
- [x] Verificar que filtros por tipo de territorio funcionen por polígono individual.
- [~] Confirmar que datos de capitanes/sesiones no tengan tokens duplicados o campos inconsistentes: auditoría read-only OK para capitanes; hay 1 sesión histórica `sin-cap-*` sin capitán activo.
- [x] Preparar checklist para validar cambios cuando se regenere `territorios.geojson`.

### 10. Hardening frontend

Tareas:
- [x] Revisar CSP viable para CDN actuales.
- [x] Evaluar SRI para scripts/CDNs estáticos: agregado a MapLibre, Alpine y GSAP versionados; Google Fonts queda sin SRI por CSS dinámico.
- [~] Revisar exposición innecesaria de datos en frontend: API key web no es secreta; se quitó lista hardcodeada de tokens de capitán en `app.js`, se retiró el listado público de nombres del finish sheet, se dejaron de persistir territorios extra con token en `localStorage` y el tutorial ya no usa claves por token; reglas hardened ya están desplegadas; App Check quedó preparado localmente. Falta configurar site key, monitor/enforcement.
- [x] Limpiar documentación vieja que menciona Apps Script/Sheets como backend activo.

### 11. Observabilidad y operación

Tareas:
- [x] Definir checklist manual antes y después de cada deploy.
- [x] Revisar errores visibles para usuario vs errores técnicos de consola.
- [x] Agregar mensajes claros cuando Firebase/Auth/Firestore fallen.
- [x] Mantener un registro de cambios importantes en este archivo.
- [x] Confirmar que GitHub Actions siga pasando antes/después de fusionar a `master`: ejecuciones Firestore Rules CI `24965420892` y `24965359373` OK.

Checklist pre-deploy/merge:
1. Revisar `git status --short` y confirmar que no haya secretos, `.env`, logs ni archivos temporales.
2. Ejecutar validación local: `node --check app.js admin.js auth.js firebase.js territory-model.js` y `npm test`.
3. Confirmar que `AVANCES.md` refleje lo que sí se completó y lo bloqueado.
4. Si hay cambios de reglas, probar con emulador antes de pensar en producción.
5. No desplegar reglas Firestore hasta importar/probar capitán real con Auth.
6. No ejecutar `npm run captains:import -- token [...]` ni `npm run cycles:seed` contra producción sin confirmar comando, alcance y rollback con Aleksey.
7. No hacer deploy a Vercel producción sin confirmación explícita.
8. Validar UI en móvil pequeño, escritorio, admin y capitán antes de merge a `master`.
9. Si cambia `territorios.geojson`, verificar: conteo de features, 106 territorios únicos `t1`–`t106`, fills esperados (`#388e3c`, `#d32f2f`, `#f57c00`), territorios mixtos y casos reportados como `t6`.

Checklist post-deploy autorizado:
1. Validar login admin.
2. Validar link de capitán real con sesión existente.
3. Confirmar lectura/escritura solo del capitán correcto.
4. Revisar consola del navegador en `index.html` y `admin.html`.
5. Revisar que `sesiones`, `historial` y `capitanes` no tengan cambios inesperados.
6. Registrar resultado y cualquier rollback en este archivo.

## Bloqueadores / decisiones pendientes

### Bloqueado por consola / validación manual

- Registrar App Check en consola, copiar reCAPTCHA v3 `siteKey` a `app-check.js`, activar primero monitor, revisar tráfico y solo después enforcement.
- Revisar/cerrar restricciones de Firebase API key en consola.
- Hacer walkthrough manual con login admin real y link capitán real en dispositivo/navegador de uso final.

### Bloqueado por datos reales

- Decidir si se conserva, archiva o corrige la sesión histórica `2026-04-18_sin-cap-*` sin capitán activo.
- Validar en un ciclo real nuevo que historial registre `ciclo_reset` por lugar+tipo; actualmente historial real tiene `completo` y `parcial`, pero 0 `ciclo_reset`.

### Decisiones locales pendientes

- Decidir si se eliminan o se conservan archivos sueltos: `extra-mode-zoom*.jpeg`, `t6-poligono-erroneo.png`, `ui.html`.
- Decidir si se modulariza `app.js` en archivos más pequeños antes de seguir creciendo el frontend.
- Cloud Functions + Secret Manager quedan descartados por ahora porque requieren plan Blaze.
- La limpieza de documentación se hizo sin borrar contexto útil: `PLAN.md` queda como histórico/legacy y README/CLAUDE.md como fuentes vigentes.

## Comandos útiles

```bash
npm test
npm run admin:create -- nombre passcode [nombre passcode...]
npm run captains:import -- token [token...]
npm run captains:import -- --from-firestore [--dry-run]
npm run cycles:seed
python3 -m http.server 5173 --directory "/Users/aleksey/Proyectos/territorios-lb-2026"
```

## Historial de avance

### 2026-04-25

- Firebase se confirmó como backend único activo.
- Se descartó Apps Script/Sheets para backend/auth/datos nuevos.
- Se habilitó Firebase Auth Email/Password.
- Se implementó login admin passcode-only sobre Firebase Auth.
- Se probaron admins internos localmente.
- Se agregaron referrers locales a la API key para pruebas en `localhost:5173`.
- Se confirmó que no se desplegó a Vercel producción.
- Se creó `AVANCES.md` como archivo vivo de seguimiento.
- Se agregaron pendientes de bugs, UI/UX, limpieza, documentación, calidad de datos y operación.
- Se implementó modelo compartido de ciclos por lugar con `territory-model.js` y `config/ciclos`.
- Se corrigió la lógica de `ciclo_reset` para calcular ciclos por lugar de encuentro.
- Se agregó dashboard de ciclos por lugar en admin.
- Se implementó Auth de capitanes con usuarios internos Firebase Auth y custom claim `capitanToken`.
- Se agregó script para importar capitanes a Firebase Auth.
- `npm test` pasa con 14 pruebas de reglas.
- Se actualizó documentación local para reflejar Firebase/Auth/ciclos como arquitectura vigente.
- Se marcó `PLAN.md` como legacy y se ajustó `.gitignore` para carpetas locales.
- Se re-ejecutó `npm test` después de la documentación/organización, correcciones funcionales y hardening estático: 14 pruebas OK.
- Validación final local: `node --check` en JS principal y JSON de `package.json`/`vercel.json` OK.
- Se corrigió un bug de seguridad/flujo: admin ya no crea `config/ciclos` automáticamente al cargar; debe sembrarse de forma controlada.
- Se corrigió un bug funcional: la vista capitán detecta ciclo completo pero no intenta escribir `ciclo_reset`, porque las reglas lo reservan para admin.
- Se alinearon textos visibles de UI: `parcial` se muestra como “En progreso” y pendientes de dashboard como “Sin trabajar”.
- Se revisó hardening frontend estático: CSP existe en `vercel.json`; SRI y App Check quedaban pendientes.
- Se validó `territorios.geojson`: 376 features, 106 territorios únicos, sin faltantes ni nombres inválidos; 19 territorios mixtos por color.
- Se corrigió el filtro de modo selección admin para que carta postal use solo líneas punteadas de polígonos rojos/naranjas y no una línea sólida duplicada.
- Se revisó el caso visual `t6`: en GeoJSON local hay 1 polígono verde; cualquier corrección debe venir de regenerar desde KML/origen.
- Se mejoraron mensajes visibles de error en capitán/admin para conexión, permisos, sesión, guardado e informe, dejando detalles técnicos solo en consola.
- Se validó que el servidor estático local sirva `index.html`, `admin.html` y `admin.css`; no hay Playwright instalado, por lo que queda pendiente revisión visual automatizada/real.
- Se agregaron mejoras básicas de accesibilidad: labels ocultos, foco visible, roles de diálogo, `aria-hidden`, `aria-current`, `aria-pressed` y `aria-label` en controles de icono.
- Se re-ejecutó validación local después de responsive/accesibilidad: `node --check` OK y `npm test` pasó con 14 pruebas.

### 2026-04-26

- Se separaron los ciclos por tipo de territorio (`casaencasa` y `carta`) usando `TerritoryModel.TERRITORY_TYPES` y listas filtradas por tipo.
- `ciclo_reset` ahora se registra y lee por clave lugar+tipo; los resets antiguos sin `tipo` aplican a ambos tipos para no mezclar ciclos históricos.
- El dashboard admin muestra filas separadas por lugar y tipo, con progreso independiente para Casa en casa y Carta Postal.
- El selector admin filtra territorios permitidos por lugar y tipo de sesión, incluyendo territorios mixtos cuando corresponden al tipo activo.
- Se agregó prueba de reglas para permitir `ciclo_reset` admin con `tipo` y confirmar que sigue bloqueado para capitanes.
- Validación local final: `node --check` OK en JS principal/scripts/tests y `npm test` pasó con 15 pruebas.
- Se agregó SRI (`integrity` + `crossorigin`) a MapLibre CSS/JS, Alpine y GSAP; hashes verificados contra los CDNs versionados.
- Google Fonts queda sin SRI porque el CSS servido por Google es dinámico; se mantiene bajo CSP.
- Validación post-SRI: hashes OK, servidor estático local OK, `node --check` OK y `npm test` pasó con 15 pruebas.
- Revisión estática de exposición frontend: la API key web se mantiene como configuración pública, pero se retiraron de la vista capitán la lista hardcodeada nombre→token y el listado público de nombres de capitanes.
- El flujo de capitán ya no permite cambiar a otro capitán con token hardcodeado; para sesiones normales el informe usa el token autenticado del link.
- Se redujo persistencia local ligada al token: el tutorial usa una clave genérica y los territorios extra dejan de guardarse en `localStorage` por token+fecha.
- Riesgos aceptados por diseño hasta App Check: el token sigue en el link `?t=TOKEN`, `sessionStorage` mantiene tokens Firebase durante la pestaña y el admin autenticado puede ver/copiar tokens de capitán.
- Validación post-revisión de exposición frontend: `node --check` OK en JS principal y `npm test` pasó con 15 pruebas.
- Validación UI local: servidor estático en `localhost:5173` sirvió `index.html`, `admin.html`, CSS/JS locales y `territorios.geojson` con HTTP 200.
- Validación headless con Puppeteer: `index.html` general, `admin.html` con Auth/Firestore mock y vista capitán móvil `?t=smoke-token` cargaron sin errores JS inesperados.
- Smoke responsive: viewport móvil 407px validado en vista capitán mock; el finish sheet usa `input` para capitán y ya no expone lista pública de nombres.
- Validación local completa tras UI smoke: `node --check` OK en JS principal y `npm test` pasó con 15 pruebas; no se tocó Firebase producción.
- Terminaron las sesiones activas y se autorizó comenzar actualizaciones controladas en Firebase producción.
- Se corrigió el flujo operativo para no depender de `GOOGLE_CLOUD_PROJECT` del entorno; los scripts usan explícitamente `FIREBASE_PROJECT_ID` o `territorios-lb-2026-27d76`.
- Dry-run de capitanes desde Firestore: 28 capitanes activos listos para Auth, sin cambios.
- Se importaron/actualizaron 28 capitanes activos en Firebase Auth con usuario interno, password igual al token y custom claim `capitanToken`.
- Se sembró `config/ciclos` en Firestore producción con 11 lugares.
- Se probó un capitán real por API: login Firebase Auth OK, claim `capitanToken` OK y lectura propia de `capitanes/{token}` OK.
- Se probó lectura de una sesión propia real con ID token de capitán; no se modificaron datos.
- Validación post-actualización: `node --check` OK en JS principal/scripts y `npm test` pasó con 15 pruebas.
- Se re-ejecutó `npm test` antes del deploy de reglas: 15 pruebas OK.
- Se desplegó `firestore.rules` a producción con `firebase deploy --only firestore:rules --project territorios-lb-2026-27d76`.
- Validación post-deploy sin escrituras: anónimo bloqueado; capitán real autenticado puede leer `capitanes/{token}`, `sesiones/{fecha_token}` y `config/ciclos`.
- Se corrigió la vista pública para no intentar leer `config/ciclos` ni `historial` sin sesión autenticada tras reglas hardened.
- Se agregó cache-busting (`?v=20260426`) a JS/CSS locales y a la redirección desde admin para evitar cargar scripts viejos post-deploy.
- Smoke Playwright post-reglas: vista pública y redirección admin sin sesión cargan limpias, sin 403 inesperados; solo queda aviso benigno del password field fuera de `<form>`.
- Se revisaron archivos sueltos: `ui.html` es style guide, `extra-mode-zoom*.jpeg` y `t6-poligono-erroneo.png` son evidencia visual/debug; no se eliminaron.
- Auditoría read-only de datos reales: 28 capitanes activos sin duplicados; 13 sesiones; `config/ciclos` existe con 11 lugares; historial tiene 256 registros (`246 completo`, `10 parcial`, `0 ciclo_reset`).
- Se preparó App Check frontend sin enforcement: `app-check.js` ya tiene Web App ID, queda apagado si no hay reCAPTCHA v3 site key, y al configurarse enviará `X-Firebase-AppCheck` mediante `firebase.js`.
- Se incluyó `app-check.js` en `index.html` y `admin.html`, y se amplió CSP para Firebase SDK web/reCAPTCHA v3 sin activar App Check en producción.
- Validación post-App Check local: `node --check` OK, `npm test` pasó con 15 pruebas y smoke Playwright confirmó vista pública/redirección admin sin errores al quedar App Check apagado.
- Se verificó con Firebase CLI la app web existente: `1:41037652213:web:5402152c15385c4f5ee5bc`; Firebase CLI no expone comandos App Check para registrar reCAPTCHA v3 en este entorno, queda pendiente consola.
- Hallazgo de datos: existe 1 sesión histórica `2026-04-18_sin-cap-*` con capitán vacío y token sintético sin capitán activo; no se modificó.
- Validación post-reglas adicional: un capitán real no puede leer el perfil de otro capitán.
- Se preparó commit `3bd8025` con hardening Firebase/Auth/ciclos/App Check y commit `e5f2acd` corrigiendo globals frontend (`FB`, `AdminAuth`, `CaptainAuth`, `TerritorialApp`) para scripts clásicos/handlers inline.
- Se subió `master` a GitHub y GitHub Actions Firestore Rules CI pasó en las ejecuciones `24965359373` y `24965420892`.
- Se desplegó Vercel producción directo: deploy `dpl_HsKnqB6RpHuTUom5Qo6dhafHAAuT`, alias `https://territorios-lb-2026.vercel.app`.
- Smoke Playwright producción post-deploy: `index.html?v=20260426` carga mapa sin errores/warnings; `FB`, `AdminAuth`, `CaptainAuth`, `TerritorialApp` y `FirebaseAppCheck` están disponibles; App Check permanece apagado porque `siteKey` sigue vacío.
- Smoke Playwright producción admin sin sesión: `admin.html?v=20260426` redirige correctamente a `index.html?v=20260426` sin errores/warnings.
- Se respetó “solo app”: `ui.html`, `extra-mode-zoom*.jpeg` y `t6-poligono-erroneo.png` quedaron fuera de Git y excluidos del deploy directo por `.vercelignore`.
