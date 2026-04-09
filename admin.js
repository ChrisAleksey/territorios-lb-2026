/* ============================================================
   admin.js  —  Territorios LB Admin Panel
   Alpine.js x-data function
   ============================================================ */

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

const KNOWN_LOCATIONS = [
  'Fam. Hernández Mora',
  'Fam. Rivas Arredondo',
  'Fam. Najera Galvan',
  'Fam. Espinosa Valencia',
  'Fam. Diez Reyes',
  'Fam. Hernández Alanís',
  'Fam. Lozano Gonzales',
  'Fam. Maldonado Vilchis',
  'Fam. Reyes Maldonado',
  'Salón del Reino',
  'Casa de Toño',
  'Fam. Aparicio',
];

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
      return { programa: 'Programa del Día', capitanes: 'Capitanes', dashboard: 'Dashboard' }[this.activeSection];
    },

    /* ── Programa form ── */
    sessionTipo: 'casaencasa',
    sessionDate: '',
    sessionTime: '09:30',
    sessionLugar: '',
    asignaciones: [{ capitanId: '', grupos: '', error: false, errorGrupos: false }],

    /* ── Autocomplete ── */
    showSuggestions: false,
    suggestions: [],

    /* ── Generation state ── */
    generating: false,
    showGenerated: false,
    generatedCards: [],
    errors: { date: false, time: false, lugar: false },

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
      this.sessionDate = new Date().toISOString().split('T')[0];

      // Cargar territorios guardados por capitán
      try {
        const stored = localStorage.getItem('admin_capitan_territories');
        if (stored) this.territoriosPorCapitan = JSON.parse(stored);
      } catch(e) {}

      // Recoger selección pendiente del mapa
      try {
        const result = localStorage.getItem('admin_territory_selection');
        if (result) {
          const { capId, territories } = JSON.parse(result);
          this.territoriosPorCapitan = { ...this.territoriosPorCapitan, [capId]: territories };
          localStorage.removeItem('admin_territory_selection');
          localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan));
        }
      } catch(e) {}

      // Restaurar asignaciones guardadas antes de ir al mapa
      try {
        const savedAsg = localStorage.getItem('admin_asignaciones_state');
        if (savedAsg) {
          this.asignaciones = JSON.parse(savedAsg);
          localStorage.removeItem('admin_asignaciones_state');
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
          if (p.sessionLugar) this.sessionLugar = p.sessionLugar;
          localStorage.removeItem('admin_programa_state');
        }
      } catch(e) {}
    },

    /* ════════════════════════════════════════════
       NAVIGATION
    ════════════════════════════════════════════ */
    navigate(section) {
      this.activeSection = section;
      this.sidebarOpen = false;
    },

    /* ════════════════════════════════════════════
       AUTOCOMPLETE
    ════════════════════════════════════════════ */
    filterSuggestions() {
      const q = this.sessionLugar.toLowerCase().trim();
      if (!q) {
        this.suggestions = KNOWN_LOCATIONS.slice();
      } else {
        this.suggestions = KNOWN_LOCATIONS.filter(l => l.toLowerCase().includes(q));
      }
      this.showSuggestions = true;
    },

    selectSuggestion(s) {
      this.sessionLugar = s;
      this.showSuggestions = false;
      this.errors.lugar = false;
    },

    /* ════════════════════════════════════════════
       ASIGNACIONES
    ════════════════════════════════════════════ */
    addAsignacion() {
      this.asignaciones.push({ capitanId: '', grupos: '', error: false, errorGrupos: false });
    },

    removeAsignacion(i) {
      if (this.asignaciones.length > 1) {
        this.asignaciones.splice(i, 1);
      }
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
      if (!this.sessionLugar.trim()) { this.errors.lugar = true; valid = false; }

      let atLeastOne = false;
      this.asignaciones.forEach(asg => {
        if (!asg.capitanId) { asg.error = true; valid = false; }
        if (!asg.grupos.trim()) { asg.errorGrupos = true; valid = false; }
        if (asg.capitanId && asg.grupos.trim()) atLeastOne = true;
      });

      if (!valid || !atLeastOne) return;

      this.generating = true;
      this.showGenerated = false;

      setTimeout(() => {
        const baseUrl = this._getBaseUrl();
        const fechaStr   = this.formatDate(this.sessionDate);
        const horaStr    = this.formatTime(this.sessionTime);
        const lugarStr   = this.sessionLugar.trim();

        this.generatedCards = this.asignaciones
          .filter(asg => asg.capitanId && asg.grupos.trim())
          .map(asg => {
            const cap = this.capitanes.find(c => c.id === asg.capitanId);
            if (!cap) return null;

            const mapLink = `${baseUrl}/?t=${cap.token}`;
            const message =
`🗓️ *Fecha:* ${fechaStr}
⏰ *Hora:* ${horaStr}
📍 *Punto de encuentro:* ${lugarStr}
👥 *Grupos:* ${asg.grupos.trim()}

🗺️ *Tu mapa de territorios:*
${mapLink}

_(Toca el link para ver tus territorios asignados)_`;

            return {
              capitanId: cap.id,
              nombre:    cap.nombre,
              tel:       cap.tel,
              token:     cap.token,
              grupos:    asg.grupos.trim(),
              message,
            };
          })
          .filter(Boolean);

        this.generating = false;
        this.showGenerated = true;

        // Scroll to results
        this.$nextTick(() => {
          const el = document.querySelector('.wa-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }, 320);
    },

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

    cancelCapitanForm() {
      this.showCapitanForm = false;
      this.editingCapitanId = null;
      this.capForm = { nombre: '', tel: '', token: '' };
    },

    openTerritorySelector(cap) {
      try {
        localStorage.setItem('admin_select_info', JSON.stringify({ id: cap.id, nombre: cap.nombre }));
        localStorage.setItem('admin_capitan_territories', JSON.stringify(this.territoriosPorCapitan));
        // Guardar estado completo del programa para restaurar al volver
        localStorage.setItem('admin_asignaciones_state', JSON.stringify(this.asignaciones));
        localStorage.setItem('admin_programa_state', JSON.stringify({
          sessionTipo:  this.sessionTipo,
          sessionDate:  this.sessionDate,
          sessionTime:  this.sessionTime,
          sessionLugar: this.sessionLugar,
        }));
      } catch(e) {}
      window.location.href = `index.html?admin_select=${cap.id}`;
    },

    getCapitanTerritoryCount(capId) {
      const t = this.territoriosPorCapitan[capId];
      return t ? t.length : 0;
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
