/* ============================================================
   admin.js  —  Territorios LB Admin Panel
   Alpine.js x-data function
   ============================================================ */

const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Mapa normalizado → key original para lookup sin tildes
const _LOCATION_KEYS = {};  // se llena después de definir LOCATION_TERRITORIES


const KNOWN_GRUPOS = ['1','2','3','4','5','6','7','8','9','10','11','Congregación'];

const KNOWN_LOCATIONS = [
  'Fam. Hernández Mora',
  'Fam. Espinosa Valencia',
  'Fam. Nájera Galván',
  'Fam. Reyes Maldonado',
  'Fam. Maldonado Vilchis',
  'Fam. Lozano Gonzales',
  'Salón del Reino / Casa de Toñito',
  'Fam. Rivas Arredondo',
  'Fam. Diez Reyes',
  'Fam. Hernández Alanís',
  'Fam. Aparicio López',
];

function _tRange(from, to) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(`t${i}`);
  return arr;
}

const LOCATION_TERRITORIES = {
  'Fam. Hernández Mora':             _tRange(1,   11),
  'Fam. Espinosa Valencia':          _tRange(12,  22),
  'Fam. Nájera Galván':              _tRange(23,  33),
  'Fam. Reyes Maldonado':            _tRange(34,  37),
  'Fam. Maldonado Vilchis':          _tRange(38,  42),
  'Fam. Lozano Gonzales':            _tRange(43,  47),
  'Salón del Reino / Casa de Toñito':_tRange(48,  68),
  'Fam. Rivas Arredondo':            _tRange(69,  76),
  'Fam. Diez Reyes':                 _tRange(77,  82),
  'Fam. Hernández Alanís':           _tRange(83,  89),
  'Fam. Aparicio López':             _tRange(90, 106),
};

// Índice normalizado para lookup sin tildes
Object.keys(LOCATION_TERRITORIES).forEach(k => { _LOCATION_KEYS[_norm(k)] = k; });

// Territorios con polígono carta postal (rojo/naranja en el KML)
// 7 solo-carta + 18 mixtos = 25 territorios relevantes para carta postal
// 81 solo-casa  + 18 mixtos = 99 territorios relevantes para casa en casa
const TOTAL_CASA  = 99;
const TOTAL_CARTA = 25;


function adminApp() {
  return {
    /* ── Navigation ── */
    activeSection: 'programa',
    sidebarOpen: false,

    get sectionTitle() {
      return { programa: 'Programa del Día', capitanes: 'Capitanes', dashboard: 'Dashboard', historial: 'Historial' }[this.activeSection];
    },

    /* ── Programa form ── */
    sessionTipo: 'casaencasa',
    sessionDate: '',
    sessionTime: '09:30',
    asignaciones: [{ capitanId: 'sin-capitan', grupos: [], lugar: '', error: false, errorGrupos: false, errorLugar: false }],
    allGrupos: KNOWN_GRUPOS,

    /* ── Autocomplete ── */
    showSuggestions: false,
    suggestions: [],
    activeSuggestionAsg: null,

    /* ── Generation state ── */
    generating: false,
    showGenerated: false,
    generatedCards: [],
    errors: { date: false, time: false },

    /* ── Historial ── */
    historialEntries: [],
    historialLoading: false,
    historialSearch: '',

    get historialFiltered() {
      const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const q = norm(this.historialSearch);
      if (!q) return this.historialEntries;
      return this.historialEntries.filter(e =>
           norm(e.territorio).includes(q)
        || norm(e.capitan).includes(q)
        || norm(e.lugar).includes(q)
        || norm(e.estado).includes(q)
        || norm(e.notas).includes(q)
        || this.formatDateShort(e.fechaPredicacion || '').includes(q)
        || this.formatDateShort(e.fechaArchivado   || '').includes(q)
      );
    },

    /* ── Capitanes section ── */
    capitanes: [],
    capitanesLoading: false,
    showCapitanForm: false,
    editingCapitanId: null,
    capForm: { nombre: '', tel: '', token: '' },
    copiedId: null,
    territoriosPorCapitan: {},

    /* ── Dashboard ── */
    dashboard: {
      loading: false,
      completados: 0,
      parciales: 0,
      pendientes: 0,
      progreso: 0,
      totalTerr: 106,
      recientes: [],
      lastReset: null,
      casa:  { completados: 0, parciales: 0, total: TOTAL_CASA,  progreso: 0 },
      carta: { completados: 0, parciales: 0, total: TOTAL_CARTA, progreso: 0 },
    },

    /* ════════════════════════════════════════════
       LIFECYCLE
    ════════════════════════════════════════════ */
    async init() {
      this.sessionDate = FB.todayMX(); // Zona horaria México, igual que app.js

      // Cargar capitanes desde Firestore
      this.capitanesLoading = true;
      try {
        const docs = await FB.listCapitanes();
        this.capitanes = docs.map(c => ({ ...c, id: c.token }));
      } catch (err) {
        console.error('[Admin] Error cargando capitanes:', err.message);
      } finally {
        this.capitanesLoading = false;
      }

      // Cargar territorios asignados (siempre, no solo al volver del selector)
      try {
        const stored = localStorage.getItem('admin_capitan_territories');
        if (stored) {
          const raw = JSON.parse(stored);
          // Sanear: solo conservar entradas con valores formato t+número
          const clean = {};
          for (const [k, v] of Object.entries(raw)) {
            if (Array.isArray(v)) {
              const valid = v.filter(x => /^t\d+$/i.test(x));
              if (valid.length) clean[k] = valid;
            }
          }
          this.territoriosPorCapitan = clean;
        }
      } catch(e) {}

      // Recoger selección pendiente del mapa
      try {
        const result = localStorage.getItem('admin_territory_selection');
        if (result) {
          const parsed = JSON.parse(result);
          const capId = typeof parsed.capId === 'string' ? parsed.capId.slice(0, 64) : null;
          const territories = Array.isArray(parsed.territories)
            ? parsed.territories.filter(t => typeof t === 'string' && /^t\d{1,3}[a-z]?$/i.test(t))
            : [];
          if (!capId) throw new Error('capId inválido');
          this.territoriosPorCapitan = { ...this.territoriosPorCapitan, [capId]: territories };
          localStorage.removeItem('admin_territory_selection');
          localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan));

          // Sincronizar territorios a Firebase si ya existe sesión hoy para ese capitán
          const cap = this.capitanes.find(c => c.id === capId);
          if (cap) {
            const fecha = FB.todayMX();
            FB.getSesion(cap.token, fecha).then(sesion => {
              if (sesion) FB.updateSesionTerritories(cap.token, fecha, territories);
            }).catch(() => {});
          }
        }
      } catch(e) {}

      // Restaurar campos del programa (lugar, fecha, hora, tipo)
      try {
        const savedProg = localStorage.getItem('admin_programa_state');
        if (savedProg) {
          const p = JSON.parse(savedProg);
          // Validar cada campo antes de aplicar
          if (['casaencasa', 'carta'].includes(p.sessionTipo)) this.sessionTipo = p.sessionTipo;
          if (typeof p.sessionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.sessionDate)) this.sessionDate = p.sessionDate;
          if (typeof p.sessionTime === 'string' && /^\d{2}:\d{2}$/.test(p.sessionTime)) this.sessionTime = p.sessionTime;
          localStorage.removeItem('admin_programa_state');
        }
      } catch(e) {}

      // Restaurar asignaciones en $nextTick: el x-model del <select> necesita que
      // las <option> estén ya renderizadas para hacer match con capitanId guardado
      try {
        const savedAsg = localStorage.getItem('admin_asignaciones_state');
        if (savedAsg) {
          const raw = JSON.parse(savedAsg);
          localStorage.removeItem('admin_asignaciones_state');
          if (Array.isArray(raw)) {
            // Sanear cada asignación
            const asg = raw.slice(0, 20).map(a => ({
              capitanId:   typeof a.capitanId === 'string' ? a.capitanId.slice(0, 64) : 'sin-capitan',
              // grupos son números de grupo ('1'–'11', 'Congregación'), no nombres de territorio
              grupos:      Array.isArray(a.grupos)
                ? a.grupos.filter(t => typeof t === 'string' && t.length > 0 && t.length <= 30)
                : [],
              lugar:       typeof a.lugar === 'string' ? a.lugar.slice(0, 200) : '',
              error:       false,
              errorGrupos: false,
              errorLugar:  false,
            }));
            this.$nextTick(() => { this.asignaciones = asg; });
          }
        }
      } catch(e) {}
    },

    /* ════════════════════════════════════════════
       NAVIGATION
    ════════════════════════════════════════════ */
    navigate(section) {
      this.activeSection = section;
      this.sidebarOpen = false;
      if (section === 'historial' && !this.historialEntries.length) this.loadHistorial();
      if (section === 'dashboard' && !this.dashboard.completados && !this.dashboard.loading) this.loadDashboard();
    },

    async loadDashboard() {
      this.dashboard.loading = true;
      try {
        const entries = await FB.listHistorial();

        // Ordenar por fecha desc
        entries.sort((a, b) =>
          (b.fechaPredicacion || b.fechaArchivado || '').localeCompare(
          (a.fechaPredicacion || a.fechaArchivado || ''))
        );

        // Última fecha de ciclo_reset
        const resets = entries
          .filter(e => e.estado === 'ciclo_reset')
          .map(e => e.fechaPredicacion || e.fechaArchivado || '')
          .filter(Boolean)
          .sort()
          .reverse();
        const lastReset = resets[0] || '0000-00-00';

        // Entradas del ciclo actual (después del último reset)
        const ciclo = entries.filter(e =>
          e.estado !== 'ciclo_reset' &&
          (e.fechaPredicacion || e.fechaArchivado || '') > lastReset
        );

        // Territorios únicos completados
        const completadosSet = new Set(
          ciclo.filter(e => e.estado === 'completo').map(e => (e.territorio || '').toLowerCase())
        );

        // Territorios únicos parciales (visitados pero no completados)
        const parcialesSet = new Set(
          ciclo
            .filter(e => e.estado === 'parcial')
            .map(e => (e.territorio || '').toLowerCase())
            .filter(t => t && !completadosSet.has(t))
        );

        const completados = completadosSet.size;
        const parciales   = parcialesSet.size;
        const totalTerr   = 106;
        const pendientes  = Math.max(0, totalTerr - completados - parciales);
        const progreso    = Math.round((completados / totalTerr) * 100);

        // Stats por tipo: Casa en casa (99 territorios con polígono verde)
        const casaComp = new Set(
          ciclo.filter(e => e.estado === 'completo' && e.tipo !== 'carta')
               .map(e => (e.territorio || '').toLowerCase())
        );
        const casaParc = new Set(
          ciclo.filter(e => e.estado === 'parcial' && e.tipo !== 'carta')
               .map(e => (e.territorio || '').toLowerCase())
               .filter(t => t && !casaComp.has(t))
        );

        // Stats por tipo: Carta postal (25 territorios con polígono rojo/naranja)
        const cartaComp = new Set(
          ciclo.filter(e => e.estado === 'completo' && e.tipo === 'carta')
               .map(e => (e.territorio || '').toLowerCase())
        );
        const cartaParc = new Set(
          ciclo.filter(e => e.estado === 'parcial' && e.tipo === 'carta')
               .map(e => (e.territorio || '').toLowerCase())
               .filter(t => t && !cartaComp.has(t))
        );

        // Últimas 8 actividades (excluyendo resets)
        const recientes = entries.filter(e => e.estado !== 'ciclo_reset').slice(0, 8);

        this.dashboard = {
          loading: false,
          completados, parciales, pendientes, progreso,
          totalTerr, recientes, lastReset,
          casa: {
            completados: casaComp.size,
            parciales:   casaParc.size,
            total:       TOTAL_CASA,
            progreso:    Math.round((casaComp.size / TOTAL_CASA) * 100),
          },
          carta: {
            completados: cartaComp.size,
            parciales:   cartaParc.size,
            total:       TOTAL_CARTA,
            progreso:    Math.round((cartaComp.size / TOTAL_CARTA) * 100),
          },
        };
      } catch (err) {
        console.error('[Admin] Error cargando dashboard:', err.message);
        this.dashboard.loading = false;
      }
    },

    async loadHistorial() {
      this.historialLoading = true;
      try {
        const entries = await FB.listHistorial();
        entries.sort((a, b) => {
          const da = b.fechaPredicacion || b.fechaArchivado || '';
          const db = a.fechaPredicacion || a.fechaArchivado || '';
          return da.localeCompare(db);
        });
        this.historialEntries = entries;
      } catch (err) {
        console.error('[Admin] Error cargando historial:', err.message);
      } finally {
        this.historialLoading = false;
      }
    },

    async deleteHistorialEntry(entry) {
      if (!entry._id) return;
      if (!confirm(`¿Eliminar ${entry.territorio?.toUpperCase()} — ${this.formatDate(entry.fechaPredicacion)}?`)) return;
      try {
        await FB.deleteHistorial(entry._id);
        this.historialEntries = this.historialEntries.filter(e => e._id !== entry._id);
      } catch (err) {
        alert('❌ Error al eliminar: ' + err.message);
      }
    },

    /* ════════════════════════════════════════════
       AUTOCOMPLETE
    ════════════════════════════════════════════ */
    filterSuggestionsForAsg(asg) {
      this.activeSuggestionAsg = asg;
      const q = _norm(asg.lugar.trim());
      if (!q) {
        this.suggestions = KNOWN_LOCATIONS.slice();
      } else {
        this.suggestions = KNOWN_LOCATIONS.filter(l => _norm(l).includes(q));
      }
      this.showSuggestions = true;
    },

    selectSuggestion(s) {
      if (this.activeSuggestionAsg) this.activeSuggestionAsg.lugar = s;
      this.showSuggestions = false;
      this.activeSuggestionAsg = null;
      this.errors.lugar = false;
    },

    /* ════════════════════════════════════════════
       ASIGNACIONES
    ════════════════════════════════════════════ */
    addAsignacion() {
      this.asignaciones.push({ capitanId: 'sin-capitan', grupos: [], lugar: '', error: false, errorGrupos: false, errorLugar: false });
    },

    toggleGrupo(asg, g) {
      const idx = asg.grupos.indexOf(g);
      if (idx === -1) asg.grupos.push(g);
      else asg.grupos.splice(idx, 1);
      asg.errorGrupos = false;
    },

    removeAsignacion(i) {
      if (this.asignaciones.length > 1) {
        const capId = this.asignaciones[i].capitanId;
        // Limpiar territorios del capitán al quitar la fila
        if (capId) {
          delete this.territoriosPorCapitan[capId];
          try { localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan)); } catch(e) {}
        }
        this.asignaciones.splice(i, 1);
      }
    },

    onCapitanChange(asg, newCapId, event) {
      // Verificar duplicado — un capitán solo puede aparecer una vez (excepto sin-capitan)
      if (newCapId && newCapId !== 'sin-capitan' && this.asignaciones.some(a => a !== asg && a.capitanId === newCapId)) {
        asg.error = true;
        event.target.value = asg.capitanId; // revertir select visualmente
        setTimeout(() => { asg.error = false; }, 700);
        return;
      }
      // Limpiar territorios del capitán anterior al cambiar
      if (asg.capitanId && asg.capitanId !== newCapId) {
        delete this.territoriosPorCapitan[asg.capitanId];
        try { localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan)); } catch(e) {}
      }
      asg.capitanId = newCapId;
      asg.error = false;
    },

    /* ════════════════════════════════════════════
       MESSAGE GENERATION
    ════════════════════════════════════════════ */
    generateMessages() {
      // Reset errores previos
      this.errors = { date: false, time: false, lugar: false };
      this.asignaciones.forEach(asg => { asg.error = false; asg.errorGrupos = false; });

      let valid = true;

      if (!this.sessionDate) { this.errors.date = true; valid = false; }
      if (!this.sessionTime) { this.errors.time = true; valid = false; }

      let atLeastOne = false;
      this.asignaciones.forEach(asg => {
        if (!asg.capitanId) { asg.error = true; valid = false; }
        if (!asg.grupos.length) { asg.errorGrupos = true; valid = false; }
        if (!asg.lugar.trim()) { asg.errorLugar = true; valid = false; }
        if (asg.capitanId && asg.grupos.length && asg.lugar.trim()) atLeastOne = true;
      });

      if (!valid || !atLeastOne) return;

      this.generating = true;
      this.showGenerated = false;

      setTimeout(() => {
        const baseUrl = this._getBaseUrl();
        const fechaStr   = this.formatDate(this.sessionDate);
        const horaStr    = this.formatTime(this.sessionTime);

        this.generatedCards = this.asignaciones
          .filter(asg => asg.capitanId && asg.grupos.length && asg.lugar.trim())
          .map(asg => {
            // Sin capitán — generar token y link para que ellos seleccionen su nombre
            if (asg.capitanId === 'sin-capitan') {
              const sinToken = 'sin-cap-' + [...asg.grupos].sort().join('-');
              const mapLink  = `${baseUrl}/?t=${sinToken}`;
              const message  =
`🗓️ *Fecha:* ${fechaStr}
⏰ *Hora:* ${horaStr}
📍 *Punto de encuentro:* ${asg.lugar.trim()}
👥 *Grupos:* ${asg.grupos.join(', ')}

🗺️ *Tu mapa de territorios:*
${mapLink}

_(Al enviar el informe, selecciona tu nombre de capitán)_`;
              return {
                capitanId:  sinToken,
                nombre:     'Sin capitán asignado',
                tel:        null,
                token:      sinToken,
                grupos:     asg.grupos.join(', '),
                message,
                sinCapitan: true,
              };
            }

            const cap = this.capitanes.find(c => c.id === asg.capitanId);
            if (!cap) return null;

            const mapLink = `${baseUrl}/?t=${cap.token}`;
            const message =
`🗓️ *Fecha:* ${fechaStr}
⏰ *Hora:* ${horaStr}
📍 *Punto de encuentro:* ${asg.lugar.trim()}
👥 *Grupos:* ${asg.grupos.join(', ')}

🗺️ *Tu mapa de territorios:*
${mapLink}

_(Toca el link para ver tus territorios asignados)_`;

            return {
              capitanId: cap.id,
              nombre:    cap.nombre,
              tel:       cap.tel,
              token:     cap.token,
              grupos:    asg.grupos.join(', '),
              message,
              sinCapitan: false,
            };
          })
          .filter(Boolean);

        this.generating = false;
        this.showGenerated = true;

        // Guardar sesiones en Firebase
        this._guardarSesionesFirebase(this.sessionDate, horaStr);

        // Scroll to results
        this.$nextTick(() => {
          const el = document.querySelector('.wa-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }, 320);
    },

    /* ════════════════════════════════════════════
       FIREBASE
    ════════════════════════════════════════════ */
    async _guardarSesionesFirebase(fecha, horaStr) {
      try {
        const rows = this.asignaciones
          .filter(asg => asg.capitanId && asg.grupos.length && asg.lugar.trim());
        if (!rows.length) return;

        const promises = rows.map(asg => {
            let token, nombre;
            if (asg.capitanId === 'sin-capitan') {
              token  = 'sin-cap-' + [...asg.grupos].sort().join('-');
              nombre = '';
            } else {
              const cap = this.capitanes.find(c => c.id === asg.capitanId);
              if (!cap) return null;
              token  = cap.token;
              nombre = cap.nombre;
            }
            const capKey     = asg.capitanId === 'sin-capitan' ? token : asg.capitanId;
            const territorios = this.territoriosPorCapitan[capKey] || [];
            console.log(`[Admin] Guardando sesión ${nombre || token} | fecha=${fecha} | territorios=${JSON.stringify(territorios)}`);
            return FB.saveSesion(token, fecha, {
              tipo:        this.sessionTipo,
              hora:        horaStr,
              lugar:       asg.lugar.trim(),
              grupos:      asg.grupos.join(', '),
              territorios,
              capitan:     nombre,
              estados:     {}
            });
          })
          .filter(Boolean);
        await Promise.all(promises);
        console.log(`[Admin] ✅ ${promises.length} sesiones guardadas en Firebase para ${fecha}`);
        this._toast(`✅ ${promises.length} sesión(es) guardada(s) en Firebase`, 'success');
      } catch (err) {
        console.error('[Admin] Error guardando sesiones en Firebase:', err);
        this._toast(`❌ Error al guardar sesiones: ${err.message}`, 'error');
      }
    },

    _toast(msg, type = 'info') {
      // Toast simple usando alert como fallback si no hay sistema de notificaciones
      const el = document.getElementById('admin-toast');
      if (el) {
        el.textContent = msg;
        el.className = `admin-toast admin-toast--${type} admin-toast--show`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { el.classList.remove('admin-toast--show'); }, 3500);
      } else {
        console.log('[Toast]', msg);
      }
    },
    _toastTimer: null,

    /* ════════════════════════════════════════════
       WHATSAPP
    ════════════════════════════════════════════ */
    getWhatsAppUrl(card) {
      return `https://wa.me/${card.tel}?text=${encodeURIComponent(card.message)}`;
    },

    /* ════════════════════════════════════════════
       CAPITANES CRUD
    ════════════════════════════════════════════ */
    getCapitanLink(token) {
      return `${this._getBaseUrl()}/?t=${token}`;
    },

    copyLink(token, id) {
      const link = this.getCapitanLink(token);
      navigator.clipboard.writeText(link).then(() => {
        this.copiedId = id;
        setTimeout(() => { this.copiedId = null; }, 2000);
      });
    },

    startAddCapitan() {
      this.editingCapitanId = null;
      this.capForm = { nombre: '', tel: '', token: this.generateToken() };
      this.showCapitanForm = true;
    },

    startEditCapitan(cap) {
      this.editingCapitanId = cap.id;
      this.capForm = { nombre: cap.nombre, tel: cap.tel, token: cap.token };
      this.showCapitanForm = true;
      this.$nextTick(() => {
        const el = document.querySelector('.form-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    resetPrograma() {
      this.sessionDate  = new Date().toISOString().split('T')[0];
      this.sessionTime  = '09:30 AM';
      this.sessionTipo  = 'casaencasa';
      this.asignaciones = [{ capitanId: '', grupos: [], lugar: '', error: false, errorGrupos: false, errorLugar: false }];
      this.territoriosPorCapitan = {};
      this.showGenerated = false;
      this.generatedCards = [];
      localStorage.removeItem('admin_capitan_territories');
    },

    cancelCapitanForm() {
      this.showCapitanForm = false;
      this.editingCapitanId = null;
      this.capForm = { nombre: '', tel: '', token: '' };
    },

    openTerritorySelector(cap, lugar) {
      try {
        localStorage.setItem('admin_select_info', JSON.stringify({ id: cap.id, nombre: cap.nombre }));
        localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan));
        // Tipo de sesión para filtrar por presencial/carta
        localStorage.setItem('admin_session_tipo', this.sessionTipo);
        // Territorios permitidos según el lugar de encuentro
        const _lugarKey = _LOCATION_KEYS[_norm(lugar)] || lugar;
        const allowed = LOCATION_TERRITORIES[_lugarKey] || null;
        if (allowed) localStorage.setItem('admin_allowed_territories', JSON.stringify(allowed));
        else localStorage.removeItem('admin_allowed_territories');
        // Guardar estado completo del programa para restaurar al volver
        localStorage.setItem('admin_asignaciones_state', JSON.stringify(this.asignaciones));
        localStorage.setItem('admin_programa_state', JSON.stringify({
          sessionTipo:  this.sessionTipo,
          sessionDate:  this.sessionDate,
          sessionTime:  this.sessionTime,
        }));
      } catch(e) {}
      if (!cap?.id) return;   // guard: capitanes aún no cargados o no encontrado
      window.location.href = `./?admin_select=${cap.id}`;
    },

    // Devuelve la clave real para buscar territorios (sin-cap usa token derivado de grupos)
    getCapKey(asg) {
      if (asg.capitanId === 'sin-capitan') {
        return 'sin-cap-' + [...asg.grupos].sort().join('-');
      }
      return asg.capitanId;
    },

    getCapitanTerritoryCount(capId) {
      const t = this.territoriosPorCapitan[capId];
      if (!t) return 0;
      return t.filter(x => /^t\d+$/i.test(x)).length;
    },

    getCapitanTerritoryList(capId) {
      const t = this.territoriosPorCapitan[capId];
      if (!t || !t.length) return '';
      const valid = t.filter(x => /^t\d+$/i.test(x));
      if (!valid.length) return '';
      return valid.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).join(', ');
    },

    async saveCapitan() {
      if (!this.capForm.nombre.trim() || !this.capForm.token.trim()) return;

      const cap = {
        nombre: this.capForm.nombre.trim(),
        token:  this.capForm.token.trim(),
        tel:    this.capForm.tel.trim(),
        activo: true,
      };

      try {
        await FB.saveCapitan(cap);
      } catch (err) {
        alert('❌ Error guardando capitán: ' + err.message);
        return;
      }

      if (this.editingCapitanId) {
        const idx = this.capitanes.findIndex(c => c.id === this.editingCapitanId);
        if (idx !== -1) this.capitanes[idx] = { ...cap, id: cap.token };
      } else {
        this.capitanes.push({ ...cap, id: cap.token });
      }

      this.showCapitanForm = false;
      this.editingCapitanId = null;
    },

    async deleteCapitan(cap) {
      if (!confirm(`¿Eliminar a ${cap.nombre}? Esta acción no se puede deshacer.`)) return;
      try {
        await FB.deleteCapitan(cap.token);
        this.capitanes = this.capitanes.filter(c => c.id !== cap.id);
      } catch (err) {
        alert('❌ Error eliminando capitán: ' + err.message);
      }
    },

    generateToken() {
      const a = crypto.randomUUID().split('-')[0];
      const b = crypto.randomUUID().split('-')[0];
      return `${a}-${b}`;
    },

    /* ════════════════════════════════════════════
       FORMATTERS
    ════════════════════════════════════════════ */
    formatDate(dateStr) {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dias   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `${dias[date.getDay()]} ${d} de ${meses[m - 1]} ${y}`;
    },

    formatDateShort(dateStr) {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-').map(Number);
      return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
    },

    formatDateDisplay() {
      return this.formatDate(this.sessionDate);
    },

    formatTime(timeStr) {
      if (!timeStr) return '';
      const [h, min] = timeStr.split(':').map(Number);
      const ampm  = h >= 12 ? 'pm' : 'am';
      const hours = h % 12 || 12;
      return `${hours}:${String(min).padStart(2, '0')} ${ampm}`;
    },

    /* ════════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════════ */
    _getBaseUrl() {
      return window.location.origin +
             window.location.pathname.replace(/admin\.html$/, '').replace(/\/$/, '');
    },
  };
}
