/* ============================================================
   admin.js  —  Territorios LB Admin Panel
   Alpine.js x-data function
   ============================================================ */

const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Mapa normalizado → key original para lookup sin tildes
const _LOCATION_KEYS = {};  // se llena después de definir LOCATION_TERRITORIES

const CAPITANES = [
  { id: 'cap1',  nombre: 'Hno. Abraham Maldonado',        tel: '', token: 'abraham-mal001'    },
  { id: 'cap2',  nombre: 'Hno. Alejandro Vazquez Maciel', tel: '', token: 'alejandro-vaz002'  },
  { id: 'cap3',  nombre: 'Hno. Aleksey Cruz',             tel: '', token: 'aleksey-cru003'    },
  { id: 'cap4',  nombre: 'Hno. Amadiz Lozano',            tel: '', token: 'amadiz-loz004'     },
  { id: 'cap5',  nombre: 'Hno. Arturo Aparicio',          tel: '', token: 'arturo-apa005'     },
  { id: 'cap6',  nombre: 'Hno. Christian Cruz Grajales',   tel: '', token: 'christian-cru006'  },
  { id: 'cap7',  nombre: 'Hno. Emanuel Evangelista',      tel: '', token: 'emanuel-eva007'    },
  { id: 'cap8',  nombre: 'Hno. Fernando Frausto Trujillo',tel: '', token: 'fernando-fra008'   },
  { id: 'cap9',  nombre: 'Hno. Francisco Javier Garcia',  tel: '', token: 'francisco-gar009'  },
  { id: 'cap10', nombre: 'Hno. Ivan García',              tel: '', token: 'ivan-gar010'       },
  { id: 'cap11', nombre: 'Hno. Joel Espinosa Hernandez',  tel: '', token: 'joel-esp011'       },
  { id: 'cap12', nombre: 'Hno. Jorge Diez Frausto',       tel: '', token: 'jorge-fra012'      },
  { id: 'cap13', nombre: 'Hno. Jorge Diez Reyes',         tel: '', token: 'jorge-rey013'      },
  { id: 'cap14', nombre: 'Hno. Jose Alberto Davila',      tel: '', token: 'jose-dav014'       },
  { id: 'cap15', nombre: 'Hno. Jose Luis Najera',         tel: '', token: 'jose-naj015'       },
  { id: 'cap16', nombre: 'Hno. José Carlos Matadamas',    tel: '', token: 'jose-mat016'       },
  { id: 'cap17', nombre: 'Hno. Juan Carlos Valero',       tel: '', token: 'juan-val017'       },
  { id: 'cap18', nombre: 'Hno. Luis Fernando Ruiz',       tel: '', token: 'luis-rui018'       },
  { id: 'cap19', nombre: 'Hno. Luis Roberto Aparicio',    tel: '', token: 'luis-apa019'       },
  { id: 'cap20', nombre: 'Hno. Nestor Yedan Montoya',     tel: '', token: 'nestor-mon020'     },
  { id: 'cap21', nombre: 'Hno. Omar Vazquez Maciel',      tel: '', token: 'omar-vaz021'       },
  { id: 'cap22', nombre: 'Hno. Orlando Najera',           tel: '', token: 'orlando-naj022'    },
  { id: 'cap23', nombre: 'Hno. René Villegas Cano',       tel: '', token: 'rene-vil023'       },
  { id: 'cap24', nombre: 'Hno. Sergio Armando Hernandez', tel: '', token: 'sergio-her024'     },
];

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

// Mock dashboard groups data
const MOCK_GRUPOS = [
  { num: 1,  pct: 100, status: 'done',     statusLabel: 'Completado',  color: '#10b981' },
  { num: 2,  pct: 75,  status: 'progress', statusLabel: 'En progreso', color: '#3b82f6' },
  { num: 3,  pct: 100, status: 'done',     statusLabel: 'Completado',  color: '#10b981' },
  { num: 4,  pct: 50,  status: 'progress', statusLabel: 'En progreso', color: '#3b82f6' },
  { num: 5,  pct: 0,   status: 'pending',  statusLabel: 'Pendiente',   color: '#ef4444' },
  { num: 6,  pct: 100, status: 'done',     statusLabel: 'Completado',  color: '#10b981' },
  { num: 7,  pct: 30,  status: 'progress', statusLabel: 'En progreso', color: '#3b82f6' },
  { num: 8,  pct: 0,   status: 'pending',  statusLabel: 'Pendiente',   color: '#ef4444' },
  { num: 9,  pct: 100, status: 'done',     statusLabel: 'Completado',  color: '#10b981' },
  { num: 10, pct: 60,  status: 'progress', statusLabel: 'En progreso', color: '#3b82f6' },
  { num: 11, pct: 0,   status: 'pending',  statusLabel: 'Pendiente',   color: '#ef4444' },
];

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
    asignaciones: [{ capitanId: '', grupos: [], lugar: '', error: false, errorGrupos: false, errorLugar: false }],
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
    historialFiltroCapitan: '',
    historialFiltroTerritorio: '',

    get historialFiltered() {
      return this.historialEntries.filter(e => {
        if (this.historialFiltroCapitan && !e.capitan.toLowerCase().includes(this.historialFiltroCapitan.toLowerCase())) return false;
        if (this.historialFiltroTerritorio && e.territorio !== `t${this.historialFiltroTerritorio}`) return false;
        return true;
      });
    },

    /* ── Capitanes section ── */
    capitanes: JSON.parse(JSON.stringify(CAPITANES)),
    showCapitanForm: false,
    editingCapitanId: null,
    capForm: { nombre: '', tel: '', token: '' },
    copiedId: null,
    territoriosPorCapitan: {},

    /* ── Dashboard ── */
    dashboard: {
      completados: 4,
      enProgreso: 4,
      pendientes: 3,
      grupos: MOCK_GRUPOS,
    },

    /* ════════════════════════════════════════════
       LIFECYCLE
    ════════════════════════════════════════════ */
    init() {
      this.sessionDate = FB.todayMX(); // Zona horaria México, igual que app.js

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
          const { capId, territories } = JSON.parse(result);
          this.territoriosPorCapitan = { ...this.territoriosPorCapitan, [capId]: territories };
          localStorage.removeItem('admin_territory_selection');
          localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan));

          // Sincronizar territorios a Firebase si ya existe sesión hoy para ese capitán
          const cap = CAPITANES.find(c => c.id === capId);
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
          if (p.sessionTipo)  this.sessionTipo  = p.sessionTipo;
          if (p.sessionDate)  this.sessionDate  = p.sessionDate;
          if (p.sessionTime)  this.sessionTime  = p.sessionTime;
          localStorage.removeItem('admin_programa_state');
        }
      } catch(e) {}

      // Restaurar asignaciones en $nextTick: el x-model del <select> necesita que
      // las <option> estén ya renderizadas para hacer match con capitanId guardado
      try {
        const savedAsg = localStorage.getItem('admin_asignaciones_state');
        if (savedAsg) {
          const asg = JSON.parse(savedAsg);
          localStorage.removeItem('admin_asignaciones_state');
          this.$nextTick(() => { this.asignaciones = asg; });
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
    },

    async loadHistorial() {
      this.historialLoading = true;
      try {
        const entries = await FB.listHistorial();
        entries.sort((a, b) => (b.fechaPredicacion || '').localeCompare(a.fechaPredicacion || ''));
        this.historialEntries = entries;
      } catch (err) {
        console.error('[Admin] Error cargando historial:', err.message);
      } finally {
        this.historialLoading = false;
      }
    },

    async deleteHistorialEntry(entry) {
      if (!entry._id) return;
      if (!confirm(`¿Eliminar ${entry.territorio?.toUpperCase()} — ${entry.fechaPredicacion}?`)) return;
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
      this.asignaciones.push({ capitanId: '', grupos: [], lugar: '', error: false, errorGrupos: false, errorLugar: false });
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
      // Verificar duplicado — un capitán solo puede aparecer una vez
      if (newCapId && this.asignaciones.some(a => a !== asg && a.capitanId === newCapId)) {
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
    async seedCapitanes() {
      if (!confirm(`¿Escribir ${CAPITANES.length} capitanes a Firebase? Esto sobreescribe los existentes.`)) return;
      try {
        await FB.seedCapitanes(CAPITANES.map(c => ({
          nombre: c.nombre,
          token:  c.token,
          tel:    c.tel || '',
          activo: true
        })));
        alert(`✅ ${CAPITANES.length} capitanes guardados en Firebase.`);
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    },

    async seedHistorial() {
      const ENTRIES = [
      {"territorio":"t63","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-04-11","fechaCompletado":"2026-04-11","fechaArchivado":"2026-04-11"},
      {"territorio":"t62","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-04-11","fechaCompletado":"2026-04-11","fechaArchivado":"2026-04-11"},
      {"territorio":"t78","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-04-10","fechaCompletado":"2026-04-10","fechaArchivado":"2026-04-11"},
      {"territorio":"t77","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-04-10","fechaCompletado":"2026-04-10","fechaArchivado":"2026-04-11"},
      {"territorio":"t61","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t56","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t55","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t54","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t53","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t52","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-04-05","fechaCompletado":"2026-04-05","fechaArchivado":"2026-04-06"},
      {"territorio":"t70","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-04-04","fechaCompletado":"2026-04-04","fechaArchivado":"2026-04-04"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-04-04","fechaCompletado":"2026-04-04","fechaArchivado":"2026-04-04"},
      {"territorio":"t60","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-04-01","fechaCompletado":"2026-04-01","fechaArchivado":"2026-04-05"},
      {"territorio":"t57","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-04-01","fechaCompletado":"2026-04-01","fechaArchivado":"2026-04-05"},
      {"territorio":"t50","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-04-01","fechaCompletado":"2026-04-01","fechaArchivado":"2026-04-05"},
      {"territorio":"t48","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-04-01","fechaCompletado":"2026-04-01","fechaArchivado":"2026-04-05"},
      {"territorio":"t22","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t21","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t20","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t19","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t18","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t17","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t16","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t15","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t14","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-29","fechaCompletado":"2026-03-29","fechaArchivado":"2026-03-29"},
      {"territorio":"t33","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Abraham Maldonado","capitanToken":"abraham-mal001","fechaPredicacion":"2026-03-28","fechaCompletado":"2026-03-28","fechaArchivado":"2026-03-29"},
      {"territorio":"t32","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Abraham Maldonado","capitanToken":"abraham-mal001","fechaPredicacion":"2026-03-28","fechaCompletado":"2026-03-28","fechaArchivado":"2026-03-29"},
      {"territorio":"t30","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Abraham Maldonado","capitanToken":"abraham-mal001","fechaPredicacion":"2026-03-28","fechaCompletado":"2026-03-28","fechaArchivado":"2026-03-29"},
      {"territorio":"t86","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Joel Espinosa Hernandez","capitanToken":"joel-esp011","fechaPredicacion":"2026-03-25","fechaCompletado":"2026-03-25","fechaArchivado":"2026-03-26"},
      {"territorio":"t85","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Joel Espinosa Hernandez","capitanToken":"joel-esp011","fechaPredicacion":"2026-03-25","fechaCompletado":"2026-03-25","fechaArchivado":"2026-03-26"},
      {"territorio":"t84","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Joel Espinosa Hernandez","capitanToken":"joel-esp011","fechaPredicacion":"2026-03-25","fechaCompletado":"2026-03-25","fechaArchivado":"2026-03-26"},
      {"territorio":"t82","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-23","fechaCompletado":"2026-03-23","fechaArchivado":"2026-03-26"},
      {"territorio":"t106","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-23","fechaCompletado":"2026-03-23","fechaArchivado":"2026-03-24"},
      {"territorio":"t76","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t75","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t74","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t73","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t72","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t71","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"2026-03-22","fechaArchivado":"2026-03-22"},
      {"territorio":"t70","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"","fechaArchivado":"2026-03-22"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-03-22","fechaCompletado":"","fechaArchivado":"2026-03-22"},
      {"territorio":"t25","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Fernando Reyes Piferrer","capitanToken":"","fechaPredicacion":"2026-03-21","fechaCompletado":"2026-03-21","fechaArchivado":"2026-03-21"},
      {"territorio":"t24","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Fernando Reyes Piferrer","capitanToken":"","fechaPredicacion":"2026-03-21","fechaCompletado":"2026-03-21","fechaArchivado":"2026-03-21"},
      {"territorio":"t23","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Fernando Reyes Piferrer","capitanToken":"","fechaPredicacion":"2026-03-21","fechaCompletado":"2026-03-21","fechaArchivado":"2026-03-21"},
      {"territorio":"t47","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-18","fechaCompletado":"2026-03-18","fechaArchivado":"2026-03-20"},
      {"territorio":"t46","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-18","fechaCompletado":"2026-03-18","fechaArchivado":"2026-03-20"},
      {"territorio":"t45","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-18","fechaCompletado":"2026-03-18","fechaArchivado":"2026-03-20"},
      {"territorio":"t44","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-18","fechaCompletado":"2026-03-18","fechaArchivado":"2026-03-20"},
      {"territorio":"t43","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-18","fechaCompletado":"2026-03-18","fechaArchivado":"2026-03-20"},
      {"territorio":"t49","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Se hizo la L","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-03-17","fechaCompletado":"","fechaArchivado":"2026-03-17"},
      {"territorio":"t10","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t11","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t8","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t9","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t7","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t6","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t5","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t4","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t3","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t2","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t1","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-03-15","fechaCompletado":"2026-03-15","fechaArchivado":"2026-03-27"},
      {"territorio":"t21","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t20","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t22","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t17","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t16","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t15","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t14","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-03-11","fechaCompletado":"2026-03-11","fechaArchivado":"2026-03-11"},
      {"territorio":"t81","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-03-09","fechaCompletado":"2026-03-09","fechaArchivado":"2026-03-11"},
      {"territorio":"t50","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-07"},
      {"territorio":"t49","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Pendiente","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-07","fechaCompletado":"","fechaArchivado":"2026-03-07"},
      {"territorio":"t48","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-07"},
      {"territorio":"t70","lugar":"Rivas Arredondo","estado":"parcial","notas":"Solo se tocó una parte","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-03-07","fechaCompletado":"","fechaArchivado":"2026-03-07"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-07"},
      {"territorio":"t70","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-17"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-17"},
      {"territorio":"t68","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-17"},
      {"territorio":"t67","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-07","fechaCompletado":"2026-03-07","fechaArchivado":"2026-03-17"},
      {"territorio":"t39","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-04","fechaCompletado":"2026-03-04","fechaArchivado":"2026-03-04"},
      {"territorio":"t38","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-03-04","fechaCompletado":"2026-03-04","fechaArchivado":"2026-03-04"},
      {"territorio":"t83","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-03-02","fechaCompletado":"2026-03-02","fechaArchivado":"2026-03-02"},
      {"territorio":"t31","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t30","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t29","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t28","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t27","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t26","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t25","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t24","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t23","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-03-01","fechaCompletado":"2026-03-01","fechaArchivado":"2026-03-02"},
      {"territorio":"t80","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Luis Fernando Ruiz","capitanToken":"luis-rui018","fechaPredicacion":"2026-02-28","fechaCompletado":"2026-02-28","fechaArchivado":"2026-03-06"},
      {"territorio":"t79","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Luis Fernando Ruiz","capitanToken":"luis-rui018","fechaPredicacion":"2026-02-28","fechaCompletado":"2026-02-28","fechaArchivado":"2026-03-06"},
      {"territorio":"t78","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Luis Fernando Ruiz","capitanToken":"luis-rui018","fechaPredicacion":"2026-02-28","fechaCompletado":"2026-02-28","fechaArchivado":"2026-03-06"},
      {"territorio":"t46","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-02-28","fechaCompletado":"2026-02-28","fechaArchivado":"2026-02-28"},
      {"territorio":"t66","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-27","fechaCompletado":"2026-02-27","fechaArchivado":"2026-02-28"},
      {"territorio":"t65","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-27","fechaCompletado":"2026-02-27","fechaArchivado":"2026-02-28"},
      {"territorio":"t64","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-27","fechaCompletado":"2026-02-27","fechaArchivado":"2026-02-28"},
      {"territorio":"t63","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Faltó cerrar cuadrante norte","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-27","fechaCompletado":"","fechaArchivado":"2026-02-28"},
      {"territorio":"t51","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-02-25","fechaCompletado":"2026-02-25","fechaArchivado":"2026-02-26"},
      {"territorio":"t46","lugar":"Lozano Gonzales","estado":"parcial","notas":"Pendiente","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"","fechaArchivado":"2026-02-21"},
      {"territorio":"t45","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t42","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t39","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t38","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t37","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t41","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t40","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t43","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t36","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-21","fechaCompletado":"2026-02-21","fechaArchivado":"2026-02-21"},
      {"territorio":"t49","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-20","fechaCompletado":"2026-02-20","fechaArchivado":"2026-02-21"},
      {"territorio":"t48","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-20","fechaCompletado":"2026-02-20","fechaArchivado":"2026-02-21"},
      {"territorio":"t63","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-19","fechaCompletado":"2026-02-19","fechaArchivado":"2026-02-21"},
      {"territorio":"t62","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-19","fechaCompletado":"2026-02-19","fechaArchivado":"2026-02-21"},
      {"territorio":"t60","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t59","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t58","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t57","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t56","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t55","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t54","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t53","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t52","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Fernando Espejel","capitanToken":"","fechaPredicacion":"2026-02-18","fechaCompletado":"2026-02-18","fechaArchivado":"2026-02-21"},
      {"territorio":"t62","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-16","fechaCompletado":"2026-02-16","fechaArchivado":"2026-02-26"},
      {"territorio":"t61","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-16","fechaCompletado":"2026-02-16","fechaArchivado":"2026-02-26"},
      {"territorio":"t76","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t75","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t74","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t73","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t72","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t71","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t70","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-02-15","fechaCompletado":"2026-02-15","fechaArchivado":"2026-03-06"},
      {"territorio":"t33","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t32","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t31","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t30","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t29","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t28","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-28"},
      {"territorio":"t42","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-21"},
      {"territorio":"t41","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-21"},
      {"territorio":"t40","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-21"},
      {"territorio":"t39","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-21"},
      {"territorio":"t38","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-02-14","fechaCompletado":"2026-02-14","fechaArchivado":"2026-02-21"},
      {"territorio":"t85","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-02-13","fechaCompletado":"2026-02-13","fechaArchivado":"2026-02-13"},
      {"territorio":"t84","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-02-13","fechaCompletado":"2026-02-13","fechaArchivado":"2026-02-13"},
      {"territorio":"t83","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-02-13","fechaCompletado":"2026-02-13","fechaArchivado":"2026-02-13"},
      {"territorio":"t66","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-02-11","fechaCompletado":"2026-02-11","fechaArchivado":"2026-02-11"},
      {"territorio":"t65","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-02-11","fechaCompletado":"2026-02-11","fechaArchivado":"2026-02-11"},
      {"territorio":"t64","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-02-11","fechaCompletado":"2026-02-11","fechaArchivado":"2026-02-11"},
      {"territorio":"t63","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-02-11","fechaCompletado":"2026-02-11","fechaArchivado":"2026-02-11"},
      {"territorio":"t61","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Esta pendiente la manzana de Enrique Resamen, privada de la barranca y chiapas","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-02-09","fechaCompletado":"","fechaArchivado":"2026-02-11"},
      {"territorio":"t11","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t10","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t9","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t7","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t6","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t5","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t4","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t3","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t2","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t1","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-08","fechaCompletado":"2026-02-08","fechaArchivado":"2026-02-08"},
      {"territorio":"t41","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-07","fechaCompletado":"2026-02-07","fechaArchivado":"2026-02-08"},
      {"territorio":"t40","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. Aleksey Cruz","capitanToken":"aleksey-cru003","fechaPredicacion":"2026-02-07","fechaCompletado":"2026-02-07","fechaArchivado":"2026-02-08"},
      {"territorio":"t77","lugar":"Diez Reyes","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Frausto","capitanToken":"jorge-fra012","fechaPredicacion":"2026-02-02","fechaCompletado":"2026-02-02","fechaArchivado":"2026-02-08"},
      {"territorio":"t89","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-01-30","fechaCompletado":"2026-01-30","fechaArchivado":"2026-02-08"},
      {"territorio":"t88","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-01-30","fechaCompletado":"2026-01-30","fechaArchivado":"2026-02-08"},
      {"territorio":"t86","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-01-30","fechaCompletado":"2026-01-30","fechaArchivado":"2026-02-08"},
      {"territorio":"t87","lugar":"Hernández Alanís","estado":"completo","notas":"","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-01-30","fechaCompletado":"2026-01-30","fechaArchivado":"2026-02-08"},
      {"territorio":"t22","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t21","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t20","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t17","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t16","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t15","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t14","lugar":"Espinosa Valencia","estado":"completo","notas":"","capitan":"Hno. Fernando Frausto Trujillo","capitanToken":"fernando-fra008","fechaPredicacion":"2026-01-28","fechaCompletado":"2026-01-28","fechaArchivado":"2026-01-29"},
      {"territorio":"t60","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-01-26","fechaCompletado":"2026-01-26","fechaArchivado":"2026-01-27"},
      {"territorio":"t59","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-01-26","fechaCompletado":"2026-01-26","fechaArchivado":"2026-01-27"},
      {"territorio":"t58","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-01-26","fechaCompletado":"2026-01-26","fechaArchivado":"2026-01-27"},
      {"territorio":"t57","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-01-26","fechaCompletado":"2026-01-26","fechaArchivado":"2026-01-27"},
      {"territorio":"t56","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t55","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t54","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t53","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t53","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t52","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t51","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Jorge Diez Reyes","capitanToken":"jorge-rey013","fechaPredicacion":"2026-01-25","fechaCompletado":"2026-01-25","fechaArchivado":"2026-01-26"},
      {"territorio":"t57","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Falta el lado de calle C del colegio Nobel","capitan":"Hno. Francisco Javier Garcia","capitanToken":"francisco-gar009","fechaPredicacion":"2026-01-25","fechaCompletado":"","fechaArchivado":"2026-01-26"},
      {"territorio":"t11","lugar":"Hernández Mora","estado":"completo","notas":"","capitan":"Hno. Abraham Maldonado","capitanToken":"abraham-mal001","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t27","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t26","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t25","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t24","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t23","lugar":"Nájera Galván","estado":"completo","notas":"","capitan":"Hno. Jose Luis Najera","capitanToken":"jose-naj015","fechaPredicacion":"2026-01-24","fechaCompletado":"2026-01-24","fechaArchivado":"2026-01-26"},
      {"territorio":"t47","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-23","fechaCompletado":"2026-01-23","fechaArchivado":"2026-01-23"},
      {"territorio":"t43","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-23","fechaCompletado":"2026-01-23","fechaArchivado":"2026-01-23"},
      {"territorio":"t44","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-23","fechaCompletado":"2026-01-23","fechaArchivado":"2026-01-23"},
      {"territorio":"t45","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-23","fechaCompletado":"2026-01-23","fechaArchivado":"2026-01-23"},
      {"territorio":"t46","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-23","fechaCompletado":"2026-01-23","fechaArchivado":"2026-01-23"},
      {"territorio":"t39","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-21","fechaCompletado":"2026-01-21","fechaArchivado":"2026-01-21"},
      {"territorio":"t38","lugar":"Maldonado Vilchis","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-21","fechaCompletado":"2026-01-21","fechaArchivado":"2026-01-21"},
      {"territorio":"t51","lugar":"Salón del Reino / Casa de Toño","estado":"parcial","notas":"Solo se hizo CB, falta la cerrada ce carranza y bahia","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-01-19","fechaCompletado":"","fechaArchivado":"2026-01-20"},
      {"territorio":"t98","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t97","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t96","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t95","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t94","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t93","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Arturo Aparicio","capitanToken":"arturo-apa005","fechaPredicacion":"2026-01-18","fechaCompletado":"2026-01-18","fechaArchivado":"2026-01-18"},
      {"territorio":"t37","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-17","fechaCompletado":"2026-01-17","fechaArchivado":"2026-01-17"},
      {"territorio":"t36","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-17","fechaCompletado":"2026-01-17","fechaArchivado":"2026-01-17"},
      {"territorio":"t35","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-17","fechaCompletado":"2026-01-17","fechaArchivado":"2026-01-17"},
      {"territorio":"t34","lugar":"Reyes Maldonado","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-17","fechaCompletado":"2026-01-17","fechaArchivado":"2026-01-17"},
      {"territorio":"t50","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-01-16","fechaCompletado":"2026-01-16","fechaArchivado":"2026-01-16"},
      {"territorio":"t69","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-16","fechaCompletado":"2026-01-16","fechaArchivado":"2026-01-16"},
      {"territorio":"t72","lugar":"Rivas Arredondo","estado":"parcial","notas":"Solo se trabajó la Calle de Baja California","capitan":"Hno. René Villegas Cano","capitanToken":"rene-vil023","fechaPredicacion":"2026-01-16","fechaCompletado":"","fechaArchivado":"2026-01-16"},
      {"territorio":"t49","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-01-15","fechaCompletado":"2026-01-15","fechaArchivado":"2026-01-16"},
      {"territorio":"t48","lugar":"Salón del Reino / Casa de Toño","estado":"completo","notas":"","capitan":"Hno. Amadiz Lozano","capitanToken":"amadiz-loz004","fechaPredicacion":"2026-01-14","fechaCompletado":"2026-01-14","fechaArchivado":"2026-01-16"},
      {"territorio":"t86","lugar":"Hernández Alanís","estado":"parcial","notas":"Solo se hizo el Edificio Azucena","capitan":"Hno. Sergio Armando Hernandez","capitanToken":"sergio-her024","fechaPredicacion":"2026-01-12","fechaCompletado":"","fechaArchivado":"2026-01-16"},
      {"territorio":"t100","lugar":"Aparicio López","estado":"completo","notas":"","capitan":"Hno. Juan Carlos Valero","capitanToken":"juan-val017","fechaPredicacion":"2026-01-11","fechaCompletado":"2026-01-11","fechaArchivado":"2026-01-16"},
      {"territorio":"t75","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-01-10","fechaCompletado":"2026-01-10","fechaArchivado":"2026-01-16"},
      {"territorio":"t76","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. Jose Alberto Davila","capitanToken":"jose-dav014","fechaPredicacion":"2026-01-10","fechaCompletado":"2026-01-10","fechaArchivado":"2026-01-16"},
      {"territorio":"t43","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-10","fechaCompletado":"2026-01-10","fechaArchivado":"2026-01-16"},
      {"territorio":"t47","lugar":"Lozano Gonzales","estado":"completo","notas":"","capitan":"Hno. Ivan García","capitanToken":"ivan-gar010","fechaPredicacion":"2026-01-10","fechaCompletado":"2026-01-10","fechaArchivado":"2026-01-16"},
      {"territorio":"t72","lugar":"Rivas Arredondo","estado":"completo","notas":"","capitan":"Hno. José Carlos Matadamas","capitanToken":"jose-mat016","fechaPredicacion":"2026-01-04","fechaCompletado":"2026-01-04","fechaArchivado":"2026-01-16"}
      ];
      if (!confirm(`¿Subir ${ENTRIES.length} registros de historial a Firebase? Esto puede tomar unos segundos.`)) return;
      try {
        // Subir en lotes de 20 para no saturar
        const BATCH = 20;
        for (let i = 0; i < ENTRIES.length; i += BATCH) {
          await FB.addHistorial(ENTRIES.slice(i, i + BATCH));
        }
        alert(`✅ ${ENTRIES.length} registros históricos subidos a Firebase.`);
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    },
    async _guardarSesionesFirebase(fecha, horaStr) {
      try {
        const rows = this.asignaciones
          .filter(asg => asg.capitanId && asg.grupos.length && asg.lugar.trim());
        if (!rows.length) return;

        const promises = rows.map(asg => {
            const cap = this.capitanes.find(c => c.id === asg.capitanId);
            if (!cap) return null;
            const territorios = this.territoriosPorCapitan[asg.capitanId] || [];
            console.log(`[Admin] Guardando sesión ${cap.nombre} | fecha=${fecha} | territorios=${JSON.stringify(territorios)}`);
            return FB.saveSesion(cap.token, fecha, {
              tipo:        this.sessionTipo,
              hora:        horaStr,
              lugar:       asg.lugar.trim(),
              grupos:      asg.grupos.join(', '),
              territorios,
              capitan:     cap.nombre,
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
      window.location.href = `index.html?admin_select=${cap.id}`;
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

    saveCapitan() {
      if (!this.capForm.nombre.trim() || !this.capForm.token.trim()) return;

      if (this.editingCapitanId) {
        const idx = this.capitanes.findIndex(c => c.id === this.editingCapitanId);
        if (idx !== -1) {
          this.capitanes[idx] = {
            ...this.capitanes[idx],
            nombre: this.capForm.nombre.trim(),
            tel:    this.capForm.tel.trim(),
            token:  this.capForm.token.trim(),
          };
        }
      } else {
        this.capitanes.push({
          id:     'cap' + Date.now(),
          nombre: this.capForm.nombre.trim(),
          tel:    this.capForm.tel.trim(),
          token:  this.capForm.token.trim(),
        });
      }

      this.showCapitanForm = false;
      this.editingCapitanId = null;
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
