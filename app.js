'use strict';

/* ─── Constants ────────────────────────────────────────────────────────────── */
const BACKEND_URL = 'PLACEHOLDER_APPS_SCRIPT_URL';

const MAP_CENTER = [-99.092817, 19.611175]; // MapLibre: [lng, lat]
const MAP_ZOOM   = 14;

const MAP_STYLE = {
  version: 8,
  sources: {
    hybrid: {
      type: 'raster',
      // Google Hybrid: satélite + calles + nombres integrados
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '© Google'
    }
  },
  layers: [
    { id: 'hybrid', type: 'raster', source: 'hybrid' }
  ]
};

/* ─── HSL → Hex conversion ──────────────────────────────────────────────────── */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)]
    .map(x => Math.round(255 * x).toString(16).padStart(2, '0')).join('');
}

/* ─── Territory type detection ─────────────────────────────────────────────── */
// Fill colours stored in GeoJSON properties come from original KML
const TYPE_MAP = {
  '#388e3c': 'casaencasa', // Verde  = casaencasa
  '#d32f2f': 'carta',      // Rojo   = carta postal
  '#f57c00': 'carta'       // Naranja = carta postal (extraídas a este modo)
};

const TYPE_LABELS = {
  casaencasa: 'Casa en casa',
  carta:      'Carta Postal',
  dificil:    'Difícil'
};

/* ─── Mock data (no backend / fallback) ────────────────────────────────────── */
const MOCK_DATA = {
  capitan:     'Aleksey Cruz',
  grupo:       '2, 4',
  fecha:       'Sábado 12 de Abril 2026',
  hora:        '9:30 am',
  lugar:       'Fam. Hernández Mora',
  tipo:        'casaencasa',
  territorios: ['t40', 't41', 't42', 't47', 't48', 't49', 't50', 't54', 't56', 't57'],
  estados:     {
    't40': 'completo',
    't41': 'completo',
    't42': 'completo',
    't47': 'parcial',
    't48': 'parcial',
  }
};

/* ══════════════════════════════════════════════════════════════════════════════
   TerritorialApp
══════════════════════════════════════════════════════════════════════════════ */
const TerritorialApp = {

  /* state */
  map:                 null,
  token:               null,
  capitan:             null,
  assignedTerritories: [],   // ['t1', 't2', …]
  territoryStatus:     {},   // { 't1': 'completo', … }
  territoryNotes:      {},   // { 't1': 'note text', … }
  addingExtraMode:     false, // modo "agregar territorio extra"
  _glowInterval:       null,
  _toastTimer:         null,
  territoryBounds:     {},   // { 't1': LngLatBounds }
  territoryTypes:      {},   // { 't1': 'casaencasa'|'carta'|'dificil' }
  allTerritoryNames:   [],   // unique names from GeoJSON
  currentType:         'casaencasa', // 'casaencasa' | 'carta'
  selectedTerritory:        null,
  pendingStatus:            null, // status selected but not yet saved
  sessionInfo:              {},
  adminSelectCapId:         null,
  adminSelectedTerritories: new Set(),
  extraTerritories:         [],   // territorios extra que el capitán eligió

  /* ── Entry point ─────────────────────────────────────────────────────────── */
  async init() {
    const params = new URLSearchParams(window.location.search);
    this.token            = params.get('t')            || null;
    this.adminSelectCapId = params.get('admin_select') || null;

    if (this.token) {
      await this.loadFromBackend();
    } else {
      // No token → modo vista completa (admin/preview): mostrar todos los territorios
      this.sessionInfo = { capitan: 'Vista General', grupo: 'Todos', fecha: '', hora: '', lugar: '' };
    }
    this.initMap();
    await this.loadGeoJSON();

    // After map + data ready, hide loader
    this._hideLoader();
    // Top card y search solo en modo capitán (con token en URL)
    if (this.token) {
      this._showTopCard();
    } else if (this.adminSelectCapId) {
      // Modo selección admin: ocultar UI de sesión, mostrar barra de selección
      document.getElementById('top-card')?.setAttribute('style', 'display:none');
      document.getElementById('admin-login-btn')?.setAttribute('style', 'display:none');
      this._initAdminSelectMode();
    } else {
      // Modo vista general: ocultar elementos de sesión
      const topCard  = document.getElementById('top-card');
      if (topCard) topCard.style.display = 'none';
    }
  },

  /* ── Backend / mock ──────────────────────────────────────────────────────── */
  async loadFromBackend() {
    if (BACKEND_URL === 'PLACEHOLDER_APPS_SCRIPT_URL') {
      this._applySessionData(MOCK_DATA);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}?token=${encodeURIComponent(this.token)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this._applySessionData(data);
    } catch (err) {
      console.warn('[TerritorialApp] Backend unavailable, using mock data.', err.message);
      this._applySessionData(MOCK_DATA);
    }
  },

  _applySessionData(data) {
    this.sessionInfo         = {
      capitan: data.capitan,
      grupo:   data.grupo,
      fecha:   data.fecha,
      hora:    data.hora,
      lugar:   data.lugar
    };
    this.assignedTerritories = (data.territorios || []).map(t => t.toLowerCase());

    // Cargar extras guardados localmente para este token
    try {
      const savedExtras = localStorage.getItem(`extras_${this.token}`);
      if (savedExtras) {
        const extras = JSON.parse(savedExtras);
        extras.forEach(t => {
          if (!this.assignedTerritories.includes(t)) this.assignedTerritories.push(t);
        });
        this.extraTerritories = extras;
      }
    } catch(e) {}

    this.territoryStatus     = Object.fromEntries(
      Object.entries(data.estados || {}).map(([k, v]) => [k.toLowerCase(), v])
    );

    // Sync Alpine store
    this._syncAlpineStore();
  },

  _syncAlpineStore() {
    // Alpine store may not be ready on first call; guard with timeout
    const sync = () => {
      if (window.Alpine && Alpine.store) {
        Alpine.store('app').sessionInfo = { ...this.sessionInfo };
      }
    };
    if (document.readyState === 'complete') {
      // Try immediately, then retry once Alpine initialises
      sync();
      requestAnimationFrame(sync);
    } else {
      document.addEventListener('alpine:initialized', sync, { once: true });
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(sync), { once: true });
    }
  },

  /* ── Map init ────────────────────────────────────────────────────────────── */
  initMap() {
    this.map = new maplibregl.Map({
      container:        'map',
      style:            MAP_STYLE,
      center:           MAP_CENTER,
      zoom:             MAP_ZOOM,
      fadeDuration:     300,
      minTileCacheSize: 50,
      attributionControl: false
    });

    // Recalcular canvas en resize (orientación, etc.)
    const resizeMap = () => requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
      document.documentElement.style.setProperty('--screen-height', screen.height + 'px');
      if (this.map) this.map.resize();
    });
    this.map.on('load', resizeMap);
    window.addEventListener('resize', resizeMap, { passive: true });

    // Click con tolerancia táctil: bbox ±20px alrededor del toque
    this.map.on('click', (e) => {
      const pad = 20;
      const bbox = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad]
      ];
      const allFeatures = this.map.queryRenderedFeatures(bbox, { layers: ['territory-fill'] });
      if (!allFeatures.length) { this.closeSheet(); return; }

      // Con token: solo asignados son tocables, salvo en modo agregar extra
      const features = (this.token && !this.addingExtraMode)
        ? allFeatures.filter(f => this.assignedTerritories.includes(f.properties.name?.toLowerCase()))
        : allFeatures;

      if (!features.length) { this.closeSheet(); return; }
      const name = features[0].properties.name;
      if (name) this.onTerritoryClick(name.toLowerCase());
    });
  },

  /* ── Load GeoJSON ────────────────────────────────────────────────────────── */
  async loadGeoJSON() {
    return new Promise((resolve, reject) => {
      this.map.on('load', async () => {
        try {
          const res  = await fetch('./territorios.geojson');
          const data = await res.json();

          // Precompute per-territory data (bounds + type) before adding to map
          this._precomputeTerritoryMeta(data);

          // Add source
          this.map.addSource('territories', {
            type:      'geojson',
            data:      data,
            promoteId: 'name'   // CRITICAL: lets setFeatureState work per territory name
          });

          this.addTerritoryLayers();
          this._applyTypeFilter(); // Aplica filtro tipo + asignación
          this.updateProgress();

          // Fit to assigned territories
          this._fitToAssigned();

          resolve();
        } catch (err) {
          console.error('[TerritorialApp] Failed to load GeoJSON', err);
          this.showToast('Error cargando el mapa', 'error');
          reject(err);
        }
      });
    });
  },

  _precomputeTerritoryMeta(geojson) {
    const boundsMap = {};
    const typeMap   = {};
    const nameSet   = new Set();

    for (const feature of geojson.features) {
      const name = (feature.properties.name || '').toLowerCase();
      if (!name) continue;
      nameSet.add(name);

      // Territory types from KML fill colour — stored as Set (a territory can have mixed polygons)
      const fillColor = (feature.properties.fill || '').toLowerCase();
      if (!typeMap[name]) typeMap[name] = new Set();
      typeMap[name].add(TYPE_MAP[fillColor] || 'casaencasa');

      // Gradient color per territory — golden angle, pre-converted to hex for MapLibre
      if (!feature.properties.territoryColor) {
        const num = parseInt(name.replace('t', '')) || 0;
        const hue = (num * 137.508) % 360;
        feature.properties.territoryColor = hslToHex(hue, 92, 52);
      }

      // Bounds
      const coords = this._extractCoords(feature.geometry);
      if (!boundsMap[name]) {
        boundsMap[name] = new maplibregl.LngLatBounds();
      }
      for (const [lng, lat] of coords) {
        boundsMap[name].extend([lng, lat]);
      }
    }

    this.territoryBounds    = boundsMap;
    this.territoryTypes     = typeMap;
    this.allTerritoryNames  = Array.from(nameSet);
  },

  /* Convierte el Set de tipos de un territorio a un string display */
  _getPrimaryType(name) {
    const s = this.territoryTypes[name];
    if (!s) return 'casaencasa';
    return s.has('carta') ? 'carta' : 'casaencasa';
  },

  _extractCoords(geometry) {
    const coords = [];
    const collect = (arr) => {
      if (!Array.isArray(arr)) return;
      if (typeof arr[0] === 'number') { coords.push(arr); return; }
      arr.forEach(collect);
    };
    collect(geometry.coordinates);
    return coords;
  },

  /* ── Territory layers ───────────────────────────────────────────────────── */
  addTerritoryLayers() {

    /* ---- 0. Glow layer (search highlight, below everything) ---- */
    this.map.addLayer({
      id:     'territory-glow',
      type:   'line',
      source: 'territories',
      paint:  {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 22, 13, 16, 15, 10, 18, 6],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'searched'], false], 0.75,
          0
        ],
        'line-blur': 8
      }
    });

    /* ---- 1. Fill layer ---- */
    this.map.addLayer({
      id:     'territory-fill',
      type:   'fill',
      source: 'territories',
      paint:  {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'addable'], false],  '#2d3748',
          ['boolean', ['feature-state', 'dim'], false],      'rgba(0,0,0,0)',
          ['==', ['feature-state', 'status'], 'completo'],   '#10b981',
          ['==', ['feature-state', 'status'], 'parcial'],    '#f59e0b',
          ['boolean', ['feature-state', 'selected'], false], 'rgba(255,255,255,0.6)',
          ['==', ['get', 'fill'], '#d32f2f'], '#ff2d2d',
          ['==', ['get', 'fill'], '#f57c00'], '#ff2d2d',
          ['get', 'territoryColor']
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'addable'], false],  0.45,
          ['boolean', ['feature-state', 'dim'], false],      0.02,
          ['==', ['feature-state', 'status'], 'completo'],   0.55,
          ['==', ['feature-state', 'status'], 'parcial'],    0.50,
          ['boolean', ['feature-state', 'selected'], false], 0.35,
          0.25
        ]
      }
    });

    /* Shared line-width expression */
    const lineWidth = [
      'interpolate', ['linear'], ['zoom'],
      8,  60.0,
      10, 40.0,
      12, 22.0,
      14,  9.0,
      16,  3.5,
      18,  1.5
    ];
    const lineOpacity = [
      'case',
      ['boolean', ['feature-state', 'addable'], false], 0.55,
      ['boolean', ['feature-state', 'dim'], false],     0.08,
      1.0
    ];

    /* ---- 2a. Presencial — solid border ---- */
    this.map.addLayer({
      id:     'territory-line',
      type:   'line',
      source: 'territories',
      filter: ['==', ['get', 'fill'], '#388e3c'],
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'addable'], false],  '#4a5568',
          ['boolean', ['feature-state', 'dim'], false],      '#111111',
          ['==', ['feature-state', 'status'], 'completo'],   '#10b981',
          ['==', ['feature-state', 'status'], 'parcial'],    '#f59e0b',
          ['boolean', ['feature-state', 'selected'], false], '#ffffff',
          ['boolean', ['feature-state', 'searched'], false], '#ffffff',
          ['get', 'territoryColor']
        ],
        'line-width':   lineWidth,
        'line-opacity': lineOpacity
      }
    });

    /* ---- 2b. Carta postal — dashed border ---- */
    this.map.addLayer({
      id:     'territory-line-carta',
      type:   'line',
      source: 'territories',
      filter: ['==', ['get', 'fill'], '#d32f2f'],
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'dim'], false],      '#111111',
          ['==', ['feature-state', 'status'], 'completo'],   '#10b981',
          ['==', ['feature-state', 'status'], 'parcial'],    '#f59e0b',
          ['boolean', ['feature-state', 'selected'], false], '#ffffff',
          ['boolean', ['feature-state', 'searched'], false], '#ffffff',
          '#ff2d2d'
        ],
        'line-width':     lineWidth,
        'line-opacity':   lineOpacity,
        'line-dasharray': [4, 3]
      }
    });

    /* ---- 2c. Mixto (naranja) — dashed border ---- */
    this.map.addLayer({
      id:     'territory-line-mixto',
      type:   'line',
      source: 'territories',
      filter: ['==', ['get', 'fill'], '#f57c00'],
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'dim'], false],      '#111111',
          ['==', ['feature-state', 'status'], 'completo'],   '#10b981',
          ['==', ['feature-state', 'status'], 'parcial'],    '#f59e0b',
          ['boolean', ['feature-state', 'selected'], false], '#ffffff',
          ['boolean', ['feature-state', 'searched'], false], '#ffffff',
          '#ff2d2d'
        ],
        'line-width':     lineWidth,
        'line-opacity':   lineOpacity,
        'line-dasharray': [4, 3]
      }
    });

    /* ---- 3. Territory labels (symbol layer) ---- */
    this.map.addLayer({
      id:     'territory-labels',
      type:   'symbol',
      source: 'territories',
      layout: {
        'text-field':            ['upcase', ['get', 'name']],
        'text-font':             ['Arial Bold', 'Arial', 'sans-serif'],
        'text-size':             ['interpolate', ['linear'], ['zoom'], 12, 0, 13, 9, 15, 12, 17, 15],
        'text-allow-overlap':    false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color':       '#ffffff',
        'text-halo-color':  'rgba(0,0,0,0.85)',
        'text-halo-width':  2,
        'text-opacity': [
          'case',
          ['boolean', ['feature-state', 'dim'], false], 0,
          1
        ]
      }
    });

    /* ---- Click handler: gestionado en initMap con tolerancia táctil ---- */

    /* ---- Hover tooltip ---- */
    const tooltip = document.getElementById('map-tooltip');
    this.map.on('mousemove', 'territory-fill', (e) => {
      this.map.getCanvas().style.cursor = 'pointer';
      if (!tooltip || !e.features.length) return;
      const name = (e.features[0].properties.name || '').toUpperCase();
      const type = this._getPrimaryType(e.features[0].properties.name);
      const typeLabel = { casaencasa: '🟢', carta: '🔴', dificil: '🟠' }[type] || '';
      tooltip.textContent = `${typeLabel} ${name}`;
      tooltip.style.left = (e.point.x + 14) + 'px';
      tooltip.style.top  = (e.point.y - 32) + 'px';
      tooltip.classList.add('visible');
    });
    this.map.on('mouseleave', 'territory-fill', () => {
      this.map.getCanvas().style.cursor = '';
      if (tooltip) tooltip.classList.remove('visible');
    });
  },

  /* ── Highlight assigned territories ─────────────────────────────────────── */
  highlightAssigned() {
    const assigned = new Set(this.assignedTerritories);
    const showAll  = assigned.size === 0; // sin token → modo vista completa

    for (const name of this.allTerritoryNames) {
      const isDim = showAll ? false : !assigned.has(name);
      this.map.setFeatureState(
        { source: 'territories', id: name },
        { dim: isDim }
      );
    }

    // Restore persisted status for assigned territories
    for (const [name, status] of Object.entries(this.territoryStatus)) {
      if (assigned.has(name)) {
        this.map.setFeatureState(
          { source: 'territories', id: name },
          { status }
        );
      }
    }
  },

  /* ── Fit map to assigned territories ────────────────────────────────────── */
  _fitToAssigned() {
    const combined  = new maplibregl.LngLatBounds();
    let   hasBounds = false;

    // Sin token → fit a todos; con token → fit solo a asignados
    const names = this.assignedTerritories.length > 0
      ? this.assignedTerritories
      : this.allTerritoryNames;

    for (const name of names) {
      const b = this.territoryBounds[name];
      if (b && !b.isEmpty()) {
        combined.extend(b);
        hasBounds = true;
      }
    }

    if (hasBounds) {
      this.map.fitBounds(combined, {
        padding:   { top: 130, bottom: 100, left: 40, right: 40 },
        duration:  800,
        linear:    false,
        essential: true
      });
      // Limitar zoom out al nivel donde caben todos los polígonos
      this.map.once('moveend', () => {
        this.map.setMinZoom(this.map.getZoom());
      });
    }
  },

  /* ── Territory click ─────────────────────────────────────────────────────── */
  onTerritoryClick(name) {
    // Modo selección admin: toggle en vez de abrir sheet
    if (this.adminSelectCapId) {
      this.toggleAdminTerritory(name);
      return;
    }
    // Territorio no asignado en modo capitán → ofrecer agregarlo
    if (this.token && !this.assignedTerritories.includes(name)) {
      this._showExtraPanel(name);
      return;
    }

    // Deselect previous
    if (this.selectedTerritory && this.selectedTerritory !== name) {
      this.map.setFeatureState(
        { source: 'territories', id: this.selectedTerritory },
        { selected: false }
      );
    }

    this.selectedTerritory = name;
    this.pendingStatus     = this.territoryStatus[name] || 'pendiente';

    // Highlight on map
    this.map.setFeatureState(
      { source: 'territories', id: name },
      { selected: true }
    );

    // Zoom to territory
    const bounds = this.territoryBounds[name];
    if (bounds && !bounds.isEmpty()) {
      this.map.fitBounds(bounds, {
        padding:   { top: 120, bottom: 120, left: 40, right: 40 },
        duration:  800,
        linear:    false,
        essential: true
      });
    }

    // Populate bottom sheet
    this._populateSheet(name);
    this.openSheet();
  },

  _populateSheet(name) {
    const type   = this._getPrimaryType(name);
    const status = this.territoryStatus[name] || 'pendiente';
    const notes  = this.territoryNotes[name]  || '';

    // Name: capitalise "t1" → "T1"
    document.getElementById('sheet-name').textContent = name.toUpperCase();

    // Badge
    const badge = document.getElementById('sheet-badge');
    badge.textContent = TYPE_LABELS[type] || type;
    badge.className   = `sheet-badge ${type}`;

    // Status
    this._updateStatusIndicator(status);

    // Active state on buttons
    this._updateActiveButton(status);

    // Notes
    document.getElementById('sheet-notes').value = notes;

    // Re-enable save button
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Guardar';
  },

  _updateStatusIndicator(status) {
    const dot   = document.getElementById('sheet-status-dot');
    const label = document.getElementById('sheet-status-label');
    if (dot)   dot.className = `status-dot ${status}`;
    const labels = { pendiente: 'Pendiente', parcial: 'En progreso', completo: 'Completo' };
    if (label) label.textContent = labels[status] || 'Pendiente';
  },

  _updateActiveButton(status) {
    ['completo', 'parcial', 'pendiente'].forEach((s) => {
      const btn = document.getElementById(`btn-${s}`);
      if (btn) btn.classList.toggle('active-state', s === status);
    });
  },

  /* ── Status selection (before save) ─────────────────────────────────────── */
  selectStatus(status, event) {
    this.pendingStatus = status;
    this._updateActiveButton(status);
    this._updateStatusIndicator(status);

    // Ripple effect
    if (event && event.currentTarget) {
      this._ripple(event.currentTarget, event);
    }
  },

  _ripple(el, event) {
    const rect   = el.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = (event.clientX - rect.left) - size / 2;
    const y      = (event.clientY - rect.top)  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  },

  /* ── Save status ─────────────────────────────────────────────────────────── */
  async saveStatus() {
    if (!this.selectedTerritory) return;

    const name   = this.selectedTerritory;
    const status = this.pendingStatus || 'pendiente';
    const notes  = document.getElementById('sheet-notes').value.trim();

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Guardando…';

    // Optimistic update
    this.territoryStatus[name] = status;
    this.territoryNotes[name]  = notes;

    this.map.setFeatureState(
      { source: 'territories', id: name },
      { status, selected: false }
    );

    this.updateProgress();

    // POST to backend
    if (BACKEND_URL !== 'PLACEHOLDER_APPS_SCRIPT_URL') {
      try {
        const body = JSON.stringify({
          token:     this.token,
          territorio: name,
          estado:    status,
          notas:     notes
        });
        const res = await fetch(BACKEND_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error('[TerritorialApp] Error saving status', err);
        this.showToast('Error al guardar', 'error');
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Reintentar';
        return;
      }
    }

    const statusLabels = { completo: 'Completo ✅', parcial: 'En progreso 🟡', pendiente: 'Marcado pendiente ↩️' };
    this.showToast(statusLabels[status] || 'Guardado', 'success');

    this.closeSheet();
    this.selectedTerritory = null;
    this.pendingStatus     = null;
  },

  /* ── Extra territory (capitán elige un territorio extra) ────────────────── */
  _showExtraPanel(name) {
    // Deselect any previous
    if (this.selectedTerritory) {
      this.map.setFeatureState({ source: 'territories', id: this.selectedTerritory }, { selected: false });
    }
    this.selectedTerritory = name;
    this.map.setFeatureState({ source: 'territories', id: name }, { selected: true });

    // Zoom to territory
    const bounds = this.territoryBounds[name];
    if (bounds && !bounds.isEmpty()) {
      this.map.fitBounds(bounds, {
        padding: { top: 120, bottom: 380, left: 40, right: 40 },
        duration: 700, linear: false, essential: true
      });
    }

    // Fill header
    document.getElementById('sheet-name').textContent = name.toUpperCase();
    const type  = this._getPrimaryType(name);
    const badge = document.getElementById('sheet-badge');
    badge.textContent = ({ casaencasa: 'Casa en casa', carta: 'Carta Postal', dificil: 'Difícil' }[type] || type);
    badge.className   = `sheet-badge ${type}`;

    // Show extra panel, hide normal
    document.getElementById('extra-panel').classList.add('show');
    document.getElementById('normal-panel').style.display = 'none';

    this.openSheet();
  },

  confirmExtraTerritory() {
    const name = this.selectedTerritory;
    if (!name) return;

    // Añadir a asignados
    this.assignedTerritories.push(name);
    this.extraTerritories.push(name);

    // Persistir extras localmente
    try {
      localStorage.setItem(`extras_${this.token}`, JSON.stringify(this.extraTerritories));
    } catch(e) {}

    // Quitar dim y actualizar mapa
    this.map.setFeatureState({ source: 'territories', id: name }, { dim: false, selected: true });
    this.updateProgress();

    // Cerrar panel extra y abrir el normal para ese territorio
    document.getElementById('extra-panel').classList.remove('show');
    document.getElementById('normal-panel').style.display = '';

    this._populateSheet(name);
    this.showToast(`${name.toUpperCase()} agregado a tus territorios`, 'success');
    this._exitAddExtraMode();
  },

  /* ── Modo agregar territorio extra ───────────────────────────────────────── */
  startAddExtraMode() {
    this.addingExtraMode = true;
    for (const name of this.allTerritoryNames) {
      if (this.assignedTerritories.includes(name)) {
        // Mis territorios → gris (ya los tengo)
        this.map.setFeatureState({ source: 'territories', id: name }, { addable: true });
      } else {
        // Disponibles → colores normales
        this.map.setFeatureState({ source: 'territories', id: name }, { dim: false });
      }
    }
    document.getElementById('add-extra-banner')?.classList.add('show');
    document.getElementById('top-card')?.classList.remove('visible');
  },

  cancelAddExtraMode() {
    this._exitAddExtraMode();
    this.closeSheet();
  },

  _exitAddExtraMode() {
    if (!this.addingExtraMode) return;
    this.addingExtraMode = false;
    for (const name of this.allTerritoryNames) {
      if (this.assignedTerritories.includes(name)) {
        this.map.setFeatureState({ source: 'territories', id: name }, { addable: false });
      } else {
        this.map.setFeatureState({ source: 'territories', id: name }, { dim: true });
      }
    }
    document.getElementById('add-extra-banner')?.classList.remove('show');
    document.getElementById('top-card')?.classList.add('visible');
  },

  /* ── Open / close bottom sheet ───────────────────────────────────────────── */
  openSheet() {
    document.getElementById('bottom-sheet')?.classList.add('open');
    document.getElementById('sheet-backdrop')?.classList.add('active');
  },

  closeSheet() {
    document.getElementById('bottom-sheet')?.classList.remove('open');
    document.getElementById('sheet-backdrop')?.classList.remove('active');
    document.getElementById('extra-panel')?.classList.remove('show');
    if (document.getElementById('normal-panel')) document.getElementById('normal-panel').style.display = '';

    if (this.selectedTerritory) {
      this.map.setFeatureState(
        { source: 'territories', id: this.selectedTerritory },
        { selected: false }
      );
      this.selectedTerritory = null;
      this.pendingStatus     = null;
    }
  },

  /* ── Progress ────────────────────────────────────────────────────────────── */
  updateProgress() {
    const total     = this.assignedTerritories.length;
    const completed = this.assignedTerritories.filter(
      (n) => this.territoryStatus[n] === 'completo'
    ).length;

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Circumference of r=15.9 → 2π×15.9 ≈ 99.9 ≈ 100
    const circumference = 100;
    const offset        = circumference - (pct / 100) * circumference;

    const ring = document.getElementById('progress-ring-fill');
    if (ring) ring.style.strokeDashoffset = offset;

    const pctEl = document.getElementById('progress-ring-pct');
    if (pctEl) pctEl.textContent = `${pct}%`;

    const countEl = document.getElementById('progress-count');
    if (countEl) countEl.textContent = `${completed} / ${total}`;

    const barFill = document.getElementById('global-progress-fill');
    if (barFill) barFill.style.width = `${pct}%`;
  },

  /* ── Meeting point ───────────────────────────────────────────────────────── */
  showMeetingPoint() {
    const { lugar, hora, fecha } = this.sessionInfo;
    const msg = lugar
      ? `${lugar} — ${hora || ''}`
      : 'Punto de reunión no definido';
    this.showToast(`📍 ${msg}`, 'info');
  },

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  /* ── Type switch (Presencial ↔ Carta Postal) ────────────────────────────── */
  switchType(type) {
    if (type === this.currentType) return;
    this.currentType = type;

    // Update button styles
    const btnP = document.getElementById('btn-casaencasa');
    const btnC = document.getElementById('btn-carta');
    if (btnP && btnC) {
      btnP.className = 'type-btn' + (type === 'casaencasa' ? ' active casaencasa-active' : '');
      btnC.className = 'type-btn' + (type === 'carta'      ? ' active carta-active'      : '');
    }

    // Close any open sheet
    this.closeSheet();

    // Update legend
    const lp = document.getElementById('legend-casaencasa-section');
    const lc = document.getElementById('legend-carta-section');
    if (lp && lc) {
      lp.style.display = type === 'casaencasa' ? '' : 'none';
      lc.style.display = type === 'carta'      ? '' : 'none';
    }

    // Re-apply visibility: dim territories of the OTHER type
    this._applyTypeFilter();

    // Fit to visible territories of this type
    const combined  = new maplibregl.LngLatBounds();
    let   hasBounds = false;
    for (const name of this.allTerritoryNames) {
      const types = this.territoryTypes[name]; // Set
      if (types && types.has(type) && this.territoryBounds[name]) {
        combined.extend(this.territoryBounds[name]);
        hasBounds = true;
      }
    }
    if (hasBounds) {
      this.map.fitBounds(combined, {
        padding: { top: 80, bottom: 80, left: 40, right: 40 },
        duration: 800, linear: false, essential: true, maxZoom: 16
      });
    }
  },

  _applyTypeFilter() {
    const assigned = new Set(this.assignedTerritories);
    const showAll  = assigned.size === 0;

    // dim = only based on assignment (type filter is handled per-polygon via layer filters)
    for (const name of this.allTerritoryNames) {
      const isAssigned = showAll || assigned.has(name);
      this.map.setFeatureState(
        { source: 'territories', id: name },
        { dim: !isAssigned }
      );
    }

    // Re-apply status states for assigned territories
    for (const [name, status] of Object.entries(this.territoryStatus)) {
      if (assigned.has(name) || showAll) {
        this.map.setFeatureState(
          { source: 'territories', id: name },
          { status }
        );
      }
    }

    // Apply per-polygon type filter
    this._setTypeFilter(this.currentType);
  },

  _setTypeFilter(type) {
    // En modo selección admin: mostrar todos los polígonos sin filtrar por tipo
    if (this.adminSelectCapId) {
      ['territory-fill', 'territory-glow', 'territory-labels'].forEach(id => {
        if (this.map.getLayer(id)) this.map.setFilter(id, null);
      });
      ['territory-line', 'territory-line-carta', 'territory-line-mixto'].forEach(id => {
        if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', 'visible');
      });
      return;
    }

    const casaencasaFill = '#388e3c';
    const cartaFills     = ['#d32f2f', '#f57c00'];

    const fillFilter = type === 'casaencasa'
      ? ['==', ['get', 'fill'], casaencasaFill]
      : ['in', ['get', 'fill'], ['literal', cartaFills]];

    ['territory-fill', 'territory-glow', 'territory-labels'].forEach(id => {
      if (this.map.getLayer(id)) this.map.setFilter(id, fillFilter);
    });

    // Line layers: toggle visibility by type
    const vis = v => v ? 'visible' : 'none';
    if (this.map.getLayer('territory-line'))       this.map.setLayoutProperty('territory-line',       'visibility', vis(type === 'casaencasa'));
    if (this.map.getLayer('territory-line-carta'))  this.map.setLayoutProperty('territory-line-carta',  'visibility', vis(type === 'carta'));
    if (this.map.getLayer('territory-line-mixto'))  this.map.setLayoutProperty('territory-line-mixto',  'visibility', vis(type === 'carta'));
  },

  /* ── Search filter ──────────────────────────────────────────────────────── */
  filterBySearch(query) {
    const q = query.trim().toLowerCase();
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    if (!this.map || !this.map.getLayer('territory-fill')) return;

    // Clear previous searched state + stop pulse
    this._clearSearchedState();

    if (!q) {
      this._fitToAssigned();
      return;
    }

    // Find first match
    const match = this.allTerritoryNames.find(n => n.includes(q));

    // Set searched feature state on match
    if (match) {
      this.map.setFeatureState(
        { source: 'territories', id: match },
        { searched: true }
      );

      // Pulsing glow animation
      let t = 0;
      this._glowInterval = setInterval(() => {
        t += 0.08;
        const opacity = 0.3 + 0.6 * Math.abs(Math.sin(t));
        if (this.map.getLayer('territory-glow')) {
          this.map.setPaintProperty('territory-glow', 'line-opacity', opacity);
        }
      }, 40);

      // Fly to territory
      if (this.territoryBounds[match]) {
        this.map.fitBounds(this.territoryBounds[match], {
          padding: { top: 160, bottom: 250, left: 60, right: 60 },
          duration: 800, linear: false, essential: true, maxZoom: 17
        });
      }
    }
  },

  _clearSearchedState() {
    // Stop pulse interval
    if (this._glowInterval) {
      clearInterval(this._glowInterval);
      this._glowInterval = null;
      // Reset glow opacity to base value
      if (this.map && this.map.getLayer('territory-glow')) {
        this.map.setPaintProperty('territory-glow', 'line-opacity', 0.75);
      }
    }
    // Clear searched state on all territories
    for (const name of this.allTerritoryNames) {
      this.map.setFeatureState(
        { source: 'territories', id: name },
        { searched: false }
      );
    }
  },

  clearSearch() {
    const input = document.getElementById('search-input');
    if (input) { input.value = ''; this.filterBySearch(''); }
  },

  showToast(msg, type = 'info') {
    const toast   = document.getElementById('toast');
    const msgEl   = document.getElementById('toast-msg');
    const iconEl  = document.getElementById('toast-icon');

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    iconEl.textContent   = icons[type] || '';
    msgEl.textContent    = msg;
    toast.className      = `toast ${type}`;

    // Clear any pending dismiss
    if (this._toastTimer) clearTimeout(this._toastTimer);

    // Force reflow so re-triggering animation works
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');

    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  /* ── UI helpers ──────────────────────────────────────────────────────────── */
  _hideLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  /* ── Admin territory selection mode ─────────────────────────────────────── */
  _initAdminSelectMode() {
    // Cargar selección previa de este capitán desde localStorage
    try {
      const stored = localStorage.getItem('admin_capitan_territories');
      if (stored) {
        const all = JSON.parse(stored);
        const existing = (all[this.adminSelectCapId] || []).map(t => t.toLowerCase());
        this.adminSelectedTerritories = new Set(existing);
      }
    } catch(e) {}

    // Nombre del capitán
    let capNombre = this.adminSelectCapId;
    try {
      const info = localStorage.getItem('admin_select_info');
      if (info) capNombre = JSON.parse(info).nombre;
    } catch(e) {}

    // Ocultar controles que interfieren visualmente
    ['type-toggle', 'legend-card', 'search-bar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Mostrar barra
    const banner = document.getElementById('admin-select-banner');
    if (banner) {
      document.getElementById('admin-select-cap-name').textContent = capNombre;
      banner.style.display = 'flex';
    }

    // Aplicar highlights pre-seleccionados
    for (const name of this.adminSelectedTerritories) {
      this.map.setFeatureState({ source: 'territories', id: name }, { selected: true });
    }
    this._updateAdminSelectCount();
  },

  toggleAdminTerritory(name) {
    if (this.adminSelectedTerritories.has(name)) {
      this.adminSelectedTerritories.delete(name);
      this.map.setFeatureState({ source: 'territories', id: name }, { selected: false });
    } else {
      this.adminSelectedTerritories.add(name);
      this.map.setFeatureState({ source: 'territories', id: name }, { selected: true });
    }
    this._updateAdminSelectCount();
  },

  _updateAdminSelectCount() {
    const n  = this.adminSelectedTerritories.size;
    const el = document.getElementById('admin-select-count');
    if (el) el.textContent = n === 1 ? '1 territorio' : `${n} territorios`;

    // Actualizar chips
    const chips = document.getElementById('admin-select-chips');
    if (!chips) return;
    chips.innerHTML = '';

    if (n === 0) {
      chips.innerHTML = '<span class="admin-chips-empty">Toca un territorio en el mapa para seleccionarlo</span>';
      return;
    }

    // Ordenar: t1, t2, … t10, t11…
    const sorted = Array.from(this.adminSelectedTerritories).sort((a, b) => {
      const na = parseInt(a.replace('t', '')) || 0;
      const nb = parseInt(b.replace('t', '')) || 0;
      return na - nb;
    });

    for (const name of sorted) {
      const chip = document.createElement('span');
      chip.className = 'admin-chip';
      chip.textContent = name.toUpperCase();
      const x = document.createElement('span');
      x.className = 'admin-chip-x';
      x.textContent = '✕';
      chip.appendChild(x);
      chip.addEventListener('click', () => this.toggleAdminTerritory(name));
      chips.appendChild(chip);
    }
  },

  confirmAdminSelection() {
    try {
      localStorage.setItem('admin_territory_selection', JSON.stringify({
        capId:       this.adminSelectCapId,
        territories: Array.from(this.adminSelectedTerritories)
      }));
    } catch(e) {}
    window.location.href = 'admin.html';
  },

  cancelAdminSelection() {
    window.location.href = 'admin.html';
  },

  _showTopCard() {
    const card = document.getElementById('top-card');
    if (card) {
      // Trigger scale-in animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => card.classList.add('visible'));
      });
    }
    // Animate progress ring after card is visible
    setTimeout(() => this.updateProgress(), 400);
  }
};

/* ─── Boot ──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  TerritorialApp.init().catch((err) => {
    console.error('[TerritorialApp] Init failed', err);
    TerritorialApp._hideLoader();
    TerritorialApp.showToast('Error iniciando la aplicación', 'error');
  });
});
