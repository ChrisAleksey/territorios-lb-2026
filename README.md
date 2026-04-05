# 📬 Territorios LB Carta Postal 2026

Sistema de gestión de cartas postales por territorios para la congregación.

---

## 📋 Hojas del Libro

| Hoja | Descripción |
|------|-------------|
| **Territorios** | Catálogo base con No. de Territorio y link al mapa |
| **Cerradas** | Registro de privadas/cerradas por territorio |
| **Casas** | Lista de casas generadas automáticamente desde Cerradas |
| **Resumen** | Estadísticas por territorio (totales, accesibilidad, casas) |
| **Registro de Cartas** | Registro de cartas enviadas por casa |
| **Historial Cartas** | Archivo de todas las cartas procesadas |

---

## 🔄 Flujo de Trabajo

### 1. Registrar una Cerrada
1. Ve a la hoja **Cerradas**
2. Busca el territorio correspondiente (ya están pre-cargados del 1 al 106)
3. Llena los campos:
   - **Nombre de la Cerrada** (ej: "Privada de las Rosas")
   - **# Casas** (ej: 15)
   - **¿Se puede pasar?** → dropdown: ✅ Sí / ❌ No / ⚠️ A veces
   - **¿Cuenta con Buzón?** → dropdown: ✅ Sí / ❌ No
   - **Notas** → información adicional (opcional)
4. Marca el checkbox ☑️ en la columna **💾 Guardar**
5. Automáticamente:
   - Se generan las filas en **Casas** (una por cada casa)
   - Se actualiza el **Resumen** del territorio
   - El checkbox se desmarca solo

---

### 2. Registrar una Carta Enviada
Ve a la hoja **Registro de Cartas** y tienes dos opciones:

**Opción A — Por Territorio:**
1. Selecciona el **No. Territorio** en col A
2. Se auto-llena el **Mapa (Preview)** con el link
3. Se auto-llena la **Fecha de Registro**
4. Se filtra el dropdown de **Nombre Cerrada** (col C) con solo las cerradas de ese territorio
5. Selecciona la **Nombre Cerrada**
6. Se filtra el dropdown de **# Casa** (col D) con las casas de esa cerrada
7. Selecciona la **# Casa**

**Opción B — Por Nombre de Cerrada:**
1. Selecciona el **Nombre Cerrada** en col C directamente
2. Se auto-llena el **No. Territorio** y el **Mapa (Preview)**
3. Se auto-llena la **Fecha de Registro**
4. Se filtra el dropdown de **# Casa** automáticamente

**Campos adicionales:**
- **Carta Elaborada** → ✅ Sí / ❌ No
- **Carta Enviada** → ✅ Sí / ❌ No
- **Fecha Envío** → Selecciona con el calendario (doble clic)
- **Capitán** → Selecciona del dropdown
- **📁 Archivar** → Marca cuando la carta esté lista para archivar

---

### 3. Archivar una Carta
1. Cuando la carta ya fue procesada, marca el checkbox **📁 Archivar** (col J)
2. La fila se copia automáticamente a **Historial Cartas** con fecha y hora de archivado
3. El checkbox se desmarca solo

---

## 📊 Resumen
Se actualiza automáticamente cada vez que se guarda una cerrada. Muestra por territorio:
- **Total Cerradas** registradas
- **✅ Se puede pasar** — cantidad de cerradas accesibles
- **❌ No se puede pasar** — cantidad de cerradas inaccesibles
- **⚠️ A veces** — cantidad de cerradas con acceso variable
- **Total Casas en Cerradas** — suma de todas las casas registradas
- **TOTAL** — fila de totales globales en la fila 108

---

## 🛠️ Script Maestro

El archivo `script_cerradas_casas.gs` contiene el código de Apps Script vinculado al libro.

### Funciones automáticas (siempre activas):

| Función | Descripción |
|---------|-------------|
| `onOpen()` | Se ejecuta al abrir el libro. Restaura checkboxes en Cerradas |
| `onEdit(e)` | Se ejecuta al editar. Maneja todos los automatismos |
| `guardarCerradaFila(e, sheet, row)` | Genera las casas al marcar checkbox en Cerradas |
| `archivarCarta(ss, sheet, row)` | Copia una carta al Historial Cartas |
| `actualizarResumenFila(ss, noTerritorio)` | Actualiza el Resumen de un territorio específico |
| `cachearDatos(ss)` | Actualiza el cache de links y casas para los dropdowns |
| `obtenerCacheLinks()` | Obtiene el cache de links de territorios |
| `obtenerCacheCasas()` | Obtiene el cache de casas por cerrada |
| `agregarFilaRegistro(ss, fila)` | Agrega dropdowns dinámicamente en Registro de Cartas |

### Funciones de setup (ejecutar manualmente solo si es necesario):

| Función | Cuándo ejecutar |
|---------|----------------|
| `setupInicial()` | Una sola vez al iniciar el sistema, o si se resetea todo |
| `actualizarResumenCompleto()` | Si el Resumen está desactualizado o hay datos nuevos masivos |

---

## ⚠️ Notas Importantes

- **No convertir a Tabla** ninguna hoja — el formato Tabla de Google Sheets rompe el script
- Los checkboxes de **💾 Guardar** (Cerradas) y **📁 Archivar** (Registro de Cartas) se restauran automáticamente si se borran
- El cache de dropdowns dura **6 horas** — si los dropdowns en cascada no funcionan, ejecutar `cachearDatos()`
- La hoja **Territorios** es el catálogo base — no modificar el orden ni los números
- Al duplicar este libro, asegurarse de eliminar scripts heredados de otros proyectos que puedan interferir

---

## 🗂️ Estructura de Columnas

### Cerradas
| Col | Campo |
|-----|-------|
| A | No. Territorio |
| B | Mapa (Preview) |
| C | Nombre de la Cerrada |
| D | # Casas |
| E | ¿Se puede pasar? |
| F | ¿Cuenta con Buzón? |
| G | Notas |
| H | 💾 Guardar (checkbox) |

### Casas
| Col | Campo |
|-----|-------|
| A | No. Territorio |
| B | Link Territorio |
| C | Nombre Cerrada |
| D | # Casa |
| E | Descripción / Referencia |

### Registro de Cartas
| Col | Campo |
|-----|-------|
| A | No. Territorio |
| B | Mapa (Preview) |
| C | Nombre Cerrada |
| D | # Casa |
| E | Carta Elaborada |
| F | Carta Enviada |
| G | Fecha Envío |
| H | Capitán |
| I | Fecha de Registro |
| J | 📁 Archivar (checkbox) |

### Historial Cartas
| Col | Campo |
|-----|-------|
| A | No. Territorio |
| B | Nombre Cerrada |
| C | # Casa |
| D | Carta Elaborada |
| E | Carta Enviada |
| F | Fecha Envío |
| G | Capitán |
| H | Fecha de Registro |
| I | Fecha Archivado |
