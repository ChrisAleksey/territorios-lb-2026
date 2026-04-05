/* ============================================================
   admin.js  —  Territorios LB Admin Panel
   Alpine.js x-data function
   ============================================================ */

const CAPITANES = [
  { id: 'cap1',  nombre: 'Abraam Maldonado',       tel: '525512345001', token: 'abraam-abc123'   },
  { id: 'cap2',  nombre: 'Fernando Frausto',        tel: '525512345002', token: 'fernando-def456' },
  { id: 'cap3',  nombre: 'Jorge Diez Reyes',        tel: '525512345003', token: 'jorge-ghi789'    },
  { id: 'cap4',  nombre: 'Ivan García',             tel: '525512345004', token: 'ivan-jkl012'     },
  { id: 'cap5',  nombre: 'Roberto Aparicio',        tel: '525512345005', token: 'roberto-mno345'  },
  { id: 'cap6',  nombre: 'Javier Garcia',           tel: '525512345006', token: 'javier-pqr678'   },
  { id: 'cap7',  nombre: 'Alfredo Montiel',         tel: '525512345007', token: 'alfredo-stu901'  },
  { id: 'cap8',  nombre: 'Jose Luis Najera',        tel: '525512345008', token: 'jose-vwx234'     },
  { id: 'cap9',  nombre: 'Fernando Reyes Piferrer', tel: '525512345009', token: 'freyes-yz0567'   },
  { id: 'cap10', nombre: 'Aleksey Cruz',            tel: '525512345010', token: 'aleksey-abc890'  },
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
    sessionTipo: 'presencial',
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
      // Validate
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
    },

    saveCapitan() {
      if (!this.capForm.nombre.trim() || !this.capForm.tel.trim() || !this.capForm.token.trim()) return;

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
