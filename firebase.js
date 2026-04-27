'use strict';

/* ══════════════════════════════════════════════════════════════════════════════
   firebase.js — Firestore REST helper
   Sin SDK. Usa la API REST de Cloud Firestore directamente con fetch.
══════════════════════════════════════════════════════════════════════════════ */

const FB = {
  API_KEY: 'AIzaSyBsdDG-k1zgHuYwjo05Ba5rcqlkxmIG4FA',
  PROJECT: 'territorios-lb-2026-27d76',
  BASE:    'https://firestore.googleapis.com/v1/projects/territorios-lb-2026-27d76/databases/(default)/documents',

  _authTokenProvider:     null,
  _appCheckTokenProvider: null,

  configureSecurity({ authTokenProvider, appCheckTokenProvider } = {}) {
    if (authTokenProvider !== undefined) this._authTokenProvider = authTokenProvider;
    if (appCheckTokenProvider !== undefined) this._appCheckTokenProvider = appCheckTokenProvider;
  },

  async _resolveToken(provider) {
    if (!provider) return null;
    const value = typeof provider === 'function' ? await provider() : provider;
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.token === 'string') return value.token;
    return null;
  },

  async _headers(extra = {}) {
    const headers = { ...extra };
    const authToken = await this._resolveToken(this._authTokenProvider);
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const appCheckToken = await this._resolveToken(this._appCheckTokenProvider);
    if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;
    return headers;
  },

  async _fetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: await this._headers(options.headers || {})
    });
  },

  /* ── Conversión JS ↔ Firestore ─────────────────────────────────────────── */
  _toFS(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string')  return { stringValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number')  return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (Array.isArray(val))       return { arrayValue: { values: val.map(v => this._toFS(v)) } };
    if (val instanceof Date)      return { timestampValue: val.toISOString() };
    if (typeof val === 'object')  return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, this._toFS(v)])) } };
    return { stringValue: String(val) };
  },

  _fromFS(fv) {
    if (!fv) return null;
    if ('nullValue'      in fv) return null;
    if ('stringValue'    in fv) return fv.stringValue;
    if ('booleanValue'   in fv) return fv.booleanValue;
    if ('integerValue'   in fv) return parseInt(fv.integerValue, 10);
    if ('doubleValue'    in fv) return fv.doubleValue;
    if ('timestampValue' in fv) return fv.timestampValue;
    if ('arrayValue'     in fv) return (fv.arrayValue.values || []).map(v => this._fromFS(v));
    if ('mapValue'       in fv) return Object.fromEntries(Object.entries(fv.mapValue.fields || {}).map(([k, v]) => [k, this._fromFS(v)]));
    return null;
  },

  _docToObj(doc) {
    if (!doc || !doc.fields) return null;
    return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, this._fromFS(v)]));
  },

  _objToFields(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, this._toFS(v)]));
  },

  /* ── HTTP helpers ──────────────────────────────────────────────────────── */
  async _get(path) {
    const res = await this._fetch(`${this.BASE}/${path}?key=${this.API_KEY}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore GET ${path} → ${res.status}`);
    return res.json();
  },

  async _patch(path, fields, updateMask) {
    let url = `${this.BASE}/${path}?key=${this.API_KEY}`;
    if (updateMask) updateMask.forEach(f => { url += `&updateMask.fieldPaths=${encodeURIComponent(f)}`; });
    const res = await this._fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields })
    });
    if (!res.ok) throw new Error(`Firestore PATCH ${path} → ${res.status}`);
    return res.json();
  },

  async _post(collectionPath, fields) {
    const res = await this._fetch(`${this.BASE}/${collectionPath}?key=${this.API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields })
    });
    if (!res.ok) throw new Error(`Firestore POST ${collectionPath} → ${res.status}`);
    return res.json();
  },

  /* ── Fecha helpers ─────────────────────────────────────────────────────── */
  todayMX() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
  },

  formatFechaLarga(isoDate) {
    try {
      const [year, month, day] = isoDate.substring(0, 10).split('-').map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return isoDate; }
  },

  /* ── Capitanes ─────────────────────────────────────────────────────────── */
  async getCapitan(token) {
    const doc = await this._get(`capitanes/${token}`);
    return doc ? this._docToObj(doc) : null;
  },

  async seedCapitanes(capitanes) {
    // capitanes: [{ nombre, token, tel, activo }]
    const promises = capitanes.map(c =>
      this._patch(`capitanes/${c.token}`, this._objToFields(c))
    );
    return Promise.all(promises);
  },

  async saveCapitan(cap) {
    // Crea o sobreescribe el documento del capitán (keyed by token)
    return this._patch(`capitanes/${cap.token}`, this._objToFields(cap));
  },

  async deleteCapitan(token) {
    const res = await this._fetch(`${this.BASE}/capitanes/${token}?key=${this.API_KEY}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Firestore DELETE capitanes/${token} → ${res.status}`);
  },

  async listCapitanes() {
    let all = [], pageToken = null;
    do {
      let url = `${this.BASE}/capitanes?key=${this.API_KEY}&pageSize=300`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      const res = await this._fetch(url);
      if (!res.ok) throw new Error(`Firestore GET capitanes → ${res.status}`);
      const data = await res.json();
      (data.documents || []).forEach(doc => {
        const obj = this._docToObj(doc);
        if (obj) {
          // Garantizar que token esté siempre presente aunque no sea campo del doc
          if (!obj.token && doc.name) obj.token = doc.name.split('/').pop();
          all.push(obj);
        }
      });
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return all;
  },

  /* ── Sesiones ──────────────────────────────────────────────────────────── */
  _sesionId(token, fecha) {
    return `${fecha}_${token}`;
  },

  async getSesion(token, fecha) {
    const doc = await this._get(`sesiones/${this._sesionId(token, fecha)}`);
    return doc ? this._docToObj(doc) : null;
  },

  async listSesiones(token) {
    const res = await this._fetch(`${this.BASE}:runQuery?key=${this.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'sesiones' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'capitanToken' },
              op: 'EQUAL',
              value: this._toFS(token)
            }
          },
          limit: 50
        }
      })
    });
    if (!res.ok) throw new Error(`Firestore RUNQUERY sesiones → ${res.status}`);
    const rows = await res.json();
    return rows
      .map(row => row.document)
      .filter(Boolean)
      .map(doc => {
        const obj = this._docToObj(doc);
        if (obj && doc.name) obj._id = doc.name.split('/').pop();
        return obj;
      })
      .filter(Boolean)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  },

  async saveSesion(token, fecha, data) {
    // Crea o sobreescribe la sesión del día para este capitán
    const id     = this._sesionId(token, fecha);
    const fields = this._objToFields({ ...data, capitanToken: token, fecha });
    return this._patch(`sesiones/${id}`, fields);
  },

  async updateSesionTerritories(token, fecha, territories) {
    const id     = this._sesionId(token, fecha);
    const fields = { territorios: this._toFS(territories) };
    return this._patch(`sesiones/${id}`, fields, ['territorios']);
  },

  async updateEstado(token, fecha, territorio, estado, notas) {
    // Actualiza solo el campo estados.{territorio} sin tocar el resto
    const id        = this._sesionId(token, fecha);
    const fieldPath = `estados.${territorio}`;
    const fields = {
      estados: {
        mapValue: {
          fields: {
            [territorio]: this._toFS({ estado, notas })
          }
        }
      }
    };
    return this._patch(`sesiones/${id}`, fields, [fieldPath]);
  },

  async deleteSesion(token, fecha) {
    const id = this._sesionId(token, fecha);
    const res = await this._fetch(`${this.BASE}/sesiones/${id}?key=${this.API_KEY}`, { method: 'DELETE' });
    if (res.status === 404) return;
    if (!res.ok) throw new Error(`Firestore DELETE sesiones/${id} → ${res.status}`);
  },

  /* ── Historial ─────────────────────────────────────────────────────────── */
  async addHistorial(entries) {
    // entries: [{ territorio, lugar, estado, notas, capitan, capitanToken, fechaPredicacion, fechaCompletado, fechaArchivado }]
    const promises = entries.map(e => this._post('historial', this._objToFields(e)));
    return Promise.all(promises);
  },

  async listHistorial() {
    let all = [], pageToken = null;
    do {
      let url = `${this.BASE}/historial?key=${this.API_KEY}&pageSize=300`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      const res = await this._fetch(url);
      if (!res.ok) throw new Error(`Firestore GET historial → ${res.status}`);
      const data = await res.json();
      (data.documents || []).forEach(doc => {
        const obj = this._docToObj(doc);
        // Extraer ID del path: .../documents/historial/{id}
        if (obj && doc.name) obj._id = doc.name.split('/').pop();
        all.push(obj);
      });
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return all;
  },

  async deleteHistorial(id) {
    const res = await this._fetch(`${this.BASE}/historial/${id}?key=${this.API_KEY}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Firestore DELETE historial/${id} → ${res.status}`);
  },

  async updateHistorial(id, fieldsObj) {
    const fields     = this._objToFields(fieldsObj);
    const updateMask = Object.keys(fieldsObj);
    return this._patch(`historial/${id}`, fields, updateMask);
  },

  /* ── Auth admin ─────────────────────────────────────────────────────────── */
  async checkAdminAuth(input) {
    try {
      const doc = await this._get('config/admin');
      if (!doc) return false;
      const cfg  = this._docToObj(doc);
      const q    = (input || '').trim().toLowerCase();
      // Array de palabras permitidas (contiene alguna)
      if (Array.isArray(cfg.allowed)) return cfg.allowed.some(w => q.includes(w.toLowerCase()));
      // Contraseña exacta
      if (cfg.password) return cfg.password === input.trim();
      return false;
    } catch { return false; }
  },

  async setAdminPassword(password) {
    return this._patch('config/admin', this._objToFields({ password }), ['password']);
  },

  async setAdminAllowed(words) {
    return this._patch('config/admin', this._objToFields({ allowed: words }), ['allowed']);
  },

  async getCycleConfig() {
    const doc = await this._get('config/ciclos');
    return doc ? this._docToObj(doc) : null;
  },

  async saveCycleConfig(config) {
    return this._patch('config/ciclos', this._objToFields(config));
  },

  async addCicloReset(lugar, fecha, tipo = 'casaencasa') {
    return this._post('historial', this._objToFields({
      territorio:       lugar,
      lugar:            lugar,
      estado:           'ciclo_reset',
      notas:            'Ciclo completo — auto-reset',
      capitan:          'Sistema',
      capitanToken:     '',
      tipo,
      fechaPredicacion: fecha,
      fechaCompletado:  fecha,
      fechaArchivado:   fecha
    }));
  }
};

window.FB = FB;
