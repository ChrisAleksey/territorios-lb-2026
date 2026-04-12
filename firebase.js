'use strict';

/* ══════════════════════════════════════════════════════════════════════════════
   firebase.js — Firestore REST helper
   Sin SDK. Usa la API REST de Cloud Firestore directamente con fetch.
══════════════════════════════════════════════════════════════════════════════ */

const FB = {
  API_KEY: 'AIzaSyBsdDG-k1zgHuYwjo05Ba5rcqlkxmIG4FA',
  PROJECT: 'territorios-lb-2026-27d76',
  BASE:    'https://firestore.googleapis.com/v1/projects/territorios-lb-2026-27d76/databases/(default)/documents',

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
    const res = await fetch(`${this.BASE}/${path}?key=${this.API_KEY}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore GET ${path} → ${res.status}`);
    return res.json();
  },

  async _patch(path, fields, updateMask) {
    let url = `${this.BASE}/${path}?key=${this.API_KEY}`;
    if (updateMask) updateMask.forEach(f => { url += `&updateMask.fieldPaths=${encodeURIComponent(f)}`; });
    const res = await fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields })
    });
    if (!res.ok) throw new Error(`Firestore PATCH ${path} → ${res.status}`);
    return res.json();
  },

  async _post(collectionPath, fields) {
    const res = await fetch(`${this.BASE}/${collectionPath}?key=${this.API_KEY}`, {
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

  /* ── Sesiones ──────────────────────────────────────────────────────────── */
  _sesionId(token, fecha) {
    return `${fecha}_${token}`;
  },

  async getSesion(token, fecha) {
    const doc = await this._get(`sesiones/${this._sesionId(token, fecha)}`);
    return doc ? this._docToObj(doc) : null;
  },

  async saveSesion(token, fecha, data) {
    // Crea o sobreescribe la sesión del día para este capitán
    const id     = this._sesionId(token, fecha);
    const fields = this._objToFields({ ...data, capitanToken: token, fecha });
    return this._patch(`sesiones/${id}`, fields);
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

  /* ── Historial ─────────────────────────────────────────────────────────── */
  async addHistorial(entries) {
    // entries: [{ territorio, lugar, estado, notas, capitan, capitanToken, fechaPredicacion, fechaCompletado, fechaArchivado }]
    const promises = entries.map(e => this._post('historial', this._objToFields(e)));
    return Promise.all(promises);
  }
};
