'use strict';

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
/* ─── Capitanes: nombre → token (para confirmación en informe) ─────────────── */
const CAPITAN_TOKENS = {
  'Hno. Abraham Maldonado':        'abraham-mal001',
  'Hno. Alejandro Vazquez Maciel': 'alejandro-vaz002',
  'Hno. Aleksey Cruz':             'aleksey-cru003',
  'Hno. Amadiz Lozano':            'amadiz-loz004',
  'Hno. Arturo Aparicio':          'arturo-apa005',
  'Hno. Christian Cruz Grajales':  'christian-cru006',
  'Hno. Emanuel Evangelista':      'emanuel-eva007',
  'Hno. Fernando Frausto Trujillo':'fernando-fra008',
  'Hno. Francisco Javier Garcia':  'francisco-gar009',
  'Hno. Ivan García':              'ivan-gar010',
  'Hno. Joel Espinosa Hernandez':  'joel-esp011',
  'Hno. Jorge Diez Frausto':       'jorge-fra012',
  'Hno. Jorge Diez Reyes':         'jorge-rey013',
  'Hno. Jose Alberto Davila':      'jose-dav014',
  'Hno. Jose Luis Najera':         'jose-naj015',
  'Hno. José Carlos Matadamas':    'jose-mat016',
  'Hno. Juan Carlos Valero':       'juan-val017',
  'Hno. Luis Fernando Ruiz':       'luis-rui018',
  'Hno. Luis Roberto Aparicio':    'luis-apa019',
  'Hno. Nestor Yedan Montoya':     'nestor-mon020',
  'Hno. Omar Vazquez Maciel':      'omar-vaz021',
  'Hno. Orlando Najera':           'orlando-naj022',
  'Hno. René Villegas Cano':       'rene-vil023',
  'Hno. Sergio Armando Hernandez': 'sergio-her024',
};

const MOCK_DATA = {
  capitan:     'Hno. Aleksey Cruz',
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

/* ─── Territorios por lugar de encuentro ───────────────────────────────────── */
function _tRange(from, to) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(`t${i}`);
  return arr;
}

const LOCATION_TERRITORIES = {
  'Fam. Hernández Mora':              _tRange(1,   11),
  'Fam. Espinosa Valencia':           _tRange(12,  22),
  'Fam. Nájera Galván':               _tRange(23,  33),
  'Fam. Reyes Maldonado':             _tRange(34,  37),
  'Fam. Maldonado Vilchis':           _tRange(38,  42),
  'Fam. Lozano Gonzales':             _tRange(43,  47),
  'Salón del Reino / Casa de Toñito': _tRange(48,  68),
  'Fam. Rivas Arredondo':             _tRange(69,  76),
  'Fam. Diez Reyes':                  _tRange(77,  82),
  'Fam. Hernández Alanís':            _tRange(83,  89),
  'Fam. Aparicio López':              _tRange(90, 106),
};

// Índice normalizado (sin acentos, minúsculas) → clave original
const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const _LOCATION_KEYS = {};
Object.keys(LOCATION_TERRITORIES).forEach(k => { _LOCATION_KEYS[_norm(k)] = k; });

// Mapa inverso: territorio → lugar de encuentro
const TERRITORY_LOCATION = {};
Object.entries(LOCATION_TERRITORIES).forEach(([lugar, territories]) => {
  territories.forEach(t => { TERRITORY_LOCATION[t] = lugar; });
});

// Lookup tolerante a diferencias de acentos/mayúsculas
function _getZoneList(lugar) {
  if (!lugar) return [];
  return LOCATION_TERRITORIES[lugar]
    || LOCATION_TERRITORIES[_LOCATION_KEYS[_norm(lugar)]]
    || [];
}

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
  _skipNextMapClick:   false, // evitar click fantasma en móvil al activar/cancelar modo extra
  submitted:           false, // informe enviado al backend
  submitTime:          null,  // hora del último envío
  _sessionFecha:       null,  // fecha ISO de la sesión activa (para Firebase)
  _useMock:            false, // true cuando no hay sesión en Firebase
  _isDebug:            false,
  _glowInterval:       null,
  _toastTimer:         null,
  _searchTimer:        null,
  // Bounding box del área de territorios (Coacalco)
  _AREA_BBOX: { minLon: -99.115, maxLon: -99.00, minLat: 19.57, maxLat: 19.71 },
  territoryBounds:     {},   // { 't1': LngLatBounds }
  territoryCentroids:      {},   // { 't1': [lng, lat] } — centroide real de todos los polígonos
  territoryTypes:          {},   // { 't1': Set<'casaencasa'|'carta'> }
  territoryPrimaryTypes:   {},   // { 't1': 'casaencasa'|'carta' } — tipo del polígono más grande
  allTerritoryNames:   [],   // unique names from GeoJSON
  territoryLastWorked: {},   // { 't1': '2026-03-15' } — fecha ISO último completo en ciclo actual
  _cicloResets:        {},   // { 'Fam. Hernández Mora': '2026-01-15' } — inicio del ciclo actual
  currentType:         'casaencasa', // 'casaencasa' | 'carta'
  selectedTerritory:        null,
  pendingStatus:            null, // status selected but not yet saved
  sessionInfo:              {},
  adminSelectCapId:         null,
  adminSelectedTerritories: new Set(),
  adminAllowedTerritories:  null,
  adminSessionTipo:         'casaencasa',
  informeUnlocked:          false,
  extraTerritories:         [],   // territorios extra que el capitán eligió

  /* ── Entry point ─────────────────────────────────────────────────────────── */
  async init() {
    const params = new URLSearchParams(window.location.search);
    this.token            = params.get('t')            || null;
    this.adminSelectCapId = params.get('admin_select') || null;
    this._isDebug         = params.has('debug');

    if (this.token) {
      await this.loadFromBackend();
    } else {
      // No token → modo vista completa (admin/preview): mostrar todos los territorios
      this.sessionInfo = { capitan: 'Vista General', grupo: 'Todos', fecha: '', hora: '', lugar: '' };
    }
    this.initMap();
    await this.loadGeoJSON();

    // Fire-and-forget: cargar resumen historial (último trabajo + ciclos auto-reset)
    this.loadHistorialResumen();

    // After map + data ready, hide loader
    this._hideLoader();
    // Ocultar candado admin en modo capitán
    if (this.token) {
      document.getElementById('admin-login-btn')?.setAttribute('style', 'display:none');
    }
    // Top card y search solo en modo capitán (con token en URL)
    if (this.token) {
      this._showTopCard();
    } else if (!this.adminSelectCapId) {
      // Vista general → mostrar barra de informe
      setTimeout(() => this._showInformeBar(), 400);
    }

    if (this.adminSelectCapId) {
      // Modo selección admin: ocultar UI de sesión, mostrar barra de selección
      document.getElementById('top-card')?.setAttribute('style', 'display:none');
      document.getElementById('admin-login-btn')?.setAttribute('style', 'display:none');
      this._initAdminSelectMode();
    } else if (!this.token) {
      // Modo vista general sin token: ocultar top-card (solo visible en modo capitán)
      const topCard  = document.getElementById('top-card');
      if (topCard) topCard.style.display = 'none';
    }
  },

  /* ── Backend / Firebase ──────────────────────────────────────────────────── */
  async loadFromBackend() {
    const fecha = FB.todayMX();
    this._sessionFecha = fecha;

    try {
      const sesion = await FB.getSesion(this.token, fecha);
      if (!sesion) {
        this.showToast('No hay sesión activa para hoy', 'error');
        console.warn('[TerritorialApp] Sin sesión en Firebase para hoy.');
        return;
      }

      // Aplanar estados: { t40: { estado, notas } } → { t40: 'completo' } + notas separadas
      const estados = {};
      const notas   = {};
      for (const [t, e] of Object.entries(sesion.estados || {})) {
        estados[t] = e.estado || 'pendiente';
        if (e.notas) notas[t] = e.notas;
      }

      this._applySessionData({
        capitan:     sesion.capitan     || '',
        grupo:       sesion.grupos      || '',
        fecha:       FB.formatFechaLarga(fecha),
        hora:        sesion.hora        || '',
        lugar:       sesion.lugar       || '',
        tipo:        sesion.tipo        || 'casaencasa',
        territorios: sesion.territorios || [],
        estados
      });

      // Restaurar notas
      this.territoryNotes = notas;

    } catch (err) {
      console.error('[TerritorialApp] Firebase error:', err.message);
      this.showToast('Error al cargar la sesión', 'error');
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

    // Cargar extras guardados localmente para este token+fecha (no persisten entre sesiones)
    try {
      const extrasKey = `extras_${this.token}_${this._sessionFecha}`;
      const savedExtras = localStorage.getItem(extrasKey);
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
    // Alpine (defer) ejecuta antes de DOMContentLoaded, así que ya está listo
    const sync = () => {
      if (window.Alpine && Alpine.store && Alpine.store('app')) {
        Alpine.store('app').sessionInfo = { ...this.sessionInfo };
      }
    };
    sync();
    requestAnimationFrame(sync);
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

    // Ubicación en tiempo real — puntito azul
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions:    { enableHighAccuracy: true },
      trackUserLocation:  true,
      showUserLocation:   true,
      showAccuracyCircle: false,
    });
    this.map.addControl(geolocate, 'top-right');

    // Al activar: quitar restricciones para permitir pan/zoom a la ubicación real
    geolocate.on('trackuserlocationstart', () => {
      this.map.setMaxBounds(null);
      this.map.setMinZoom(0);
    });
    // Al desactivar: restaurar restricciones
    geolocate.on('trackuserlocationend', () => {
      this._setMapBounds();
      this.map.setMinZoom(0);
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
      // Ignorar click fantasma que dispara al activar/cancelar modo extra en móvil
      if (this._skipNextMapClick) { this._skipNextMapClick = false; return; }

      const pad = 20;
      const bbox = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad]
      ];
      let allFeatures = this.map.queryRenderedFeatures(bbox, { layers: ['territory-fill'] });
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

          // Fit to assigned territories y bloquear paneo fuera del área
          this._fitToAssigned();
          this._setMapBounds();

          // Soporte para ?goto=t63 (desde admin)
          const gotoParam = new URLSearchParams(window.location.search).get('goto');
          if (gotoParam) this.filterBySearch(gotoParam.toLowerCase());

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
    const boundsMap    = {};
    const typeMap      = {};
    const nameSet      = new Set();
    const largestPoly  = {}; // { name: { area, centroid } } — polígono más grande por territorio

    for (const feature of geojson.features) {
      const name = (feature.properties.name || '').toLowerCase();
      if (!name) continue;
      nameSet.add(name);

      // Territory types from KML fill colour — stored as Set (a territory can have mixed polygons)
      const fillColor = (feature.properties.fill || '').toLowerCase();
      if (!typeMap[name]) typeMap[name] = new Set();
      typeMap[name].add(TYPE_MAP[fillColor] || 'casaencasa');

      // Color por territorio — ángulo dorado para máxima dispersión visual (colores vividos aleatorios)
      if (!feature.properties.territoryColor) {
        const num     = parseInt(name.replace('t', '')) || 0;
        const rawHue  = (num * 137.508) % 360;
        const isCarta = fillColor === '#d32f2f' || fillColor === '#f57c00';

        // Presenciales: excluir rojo/naranja-rojo (0°–50°, 330°–360°) reservados para carta postal
        const hue = isCarta ? rawHue : 50 + (rawHue / 360) * 280;

        feature.properties.territoryColor = hslToHex(hue, 92, 52);
      }

      // Bounds
      const coords = this._extractCoords(feature.geometry);
      if (!boundsMap[name]) boundsMap[name] = new maplibregl.LngLatBounds();
      for (const [lng, lat] of coords) boundsMap[name].extend([lng, lat]);

      // Centroide del polígono más grande (shoelace area) — evita el vacío entre polígonos mixtos
      const ring = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0]?.[0];
      if (ring?.length) {
        let area = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          area += ring[j][0] * ring[i][1];
          area -= ring[i][0] * ring[j][1];
        }
        area = Math.abs(area) / 2;
        if (!largestPoly[name] || area > largestPoly[name].area) {
          const sumLng = ring.reduce((s, c) => s + c[0], 0);
          const sumLat = ring.reduce((s, c) => s + c[1], 0);
          largestPoly[name] = { area, centroid: [sumLng / ring.length, sumLat / ring.length], type: TYPE_MAP[fillColor] || 'casaencasa' };
        }
      }
    }

    this.territoryBounds        = boundsMap;
    this.territoryTypes         = typeMap;
    this.allTerritoryNames      = Array.from(nameSet);
    this.territoryCentroids     = Object.fromEntries(
      Object.entries(largestPoly).map(([n, { centroid }]) => [n, centroid])
    );
    this.territoryPrimaryTypes  = Object.fromEntries(
      Object.entries(largestPoly).map(([n, { type }]) => [n, type])
    );
  },

  /* Convierte el Set de tipos de un territorio a un string display */
  _getPrimaryType(name) {
    return this.currentType || 'casaencasa';
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
        'text-size':             ['interpolate', ['linear'], ['zoom'], 12, 0, 13, 11, 15, 14, 17, 17],
        'text-allow-overlap':    false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color':       '#ffffff',
        'text-halo-color':  'rgba(0,0,0,0.9)',
        'text-halo-width':  2.5,
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
      const types = this.territoryTypes[e.features[0].properties.name];
      const realType = types?.has('carta') && !types?.has('casaencasa') ? 'carta' : 'casaencasa';
      const typeLabel = realType === 'carta' ? '🔴' : '🟢';
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

  /* ── Restringir paneo al área de territorios ────────────────────────────── */
  _setMapBounds() {
    // Usar TODOS los territorios para calcular el área máxima visible,
    // independientemente de si el capitán tiene solo algunos asignados
    const combined  = new maplibregl.LngLatBounds();
    let   hasBounds = false;

    for (const name of this.allTerritoryNames) {
      const b = this.territoryBounds[name];
      if (b && !b.isEmpty()) {
        combined.extend(b);
        hasBounds = true;
      }
    }

    if (!hasBounds) return;

    const sw = combined.getSouthWest();
    const ne = combined.getNorthEast();

    // Padding del 80% del extent — suficiente para panear a los bordes sin salir de la zona
    const padLng = (ne.lng - sw.lng) * 0.80;
    const padLat = (ne.lat - sw.lat) * 0.80;

    this.map.setMaxBounds([
      [sw.lng - padLng, sw.lat - padLat],  // SW
      [ne.lng + padLng, ne.lat + padLat],  // NE
    ]);
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
      // En móvil se suma padding extra al bottom para que los territorios queden
      // un poco más arriba en pantalla (vista ligeramente más abajo)
      const isMobile  = window.innerWidth < 768;
      const bottomPad = isMobile ? 180 : 130;

      const padding = this.token
        ? { top: 210, bottom: bottomPad, left: 50, right: 50 }
        : { top: 80,  bottom: bottomPad, left: 50, right: 50 };

      this.map.fitBounds(combined, {
        padding,
        duration:  900,
        linear:    false,
        essential: true
      });
      // Bloquear zoom out al nivel que muestra todos los polígonos
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
    // Territorio no asignado en modo capitán → ofrecer agregarlo si está en la zona
    if (this.token && !this.assignedTerritories.includes(name)) {
      const lugar = this.sessionInfo.lugar || '';
      const zoneList = _getZoneList(lugar);
      if (zoneList.length && !zoneList.includes(name)) {
        this.showToast('Territorio fuera de tu zona', 'error');
        return;
      }
      this._showExtraPanel(name);
      return;
    }
    // Vista general sin sesión de informe: zoom + sheet solo con header (sin panel de acciones)
    if (!this.token && !this.informeUnlocked) {
      if (this.selectedTerritory && this.selectedTerritory !== name) {
        this.map.setFeatureState({ source: 'territories', id: this.selectedTerritory }, { selected: false });
      }
      this.selectedTerritory = name;
      this.map.setFeatureState({ source: 'territories', id: name }, { selected: true });

      const bounds = this.territoryBounds[name];
      if (bounds && !bounds.isEmpty()) {
        this.map.fitBounds(bounds, {
          padding: { top: 120, bottom: 120, left: 40, right: 40 },
          duration: 800, linear: false, essential: true
        });
      }

      // Abrir sheet solo con header
      document.getElementById('sheet-name').textContent = name.toUpperCase();
      const badge = document.getElementById('sheet-badge');
      badge.textContent = TYPE_LABELS[this.currentType] || this.currentType;
      badge.className   = `sheet-badge ${this.currentType}`;
      const normalPanel = document.getElementById('normal-panel');
      if (normalPanel) normalPanel.style.display = 'none';
      document.getElementById('bottom-sheet')?.classList.add('open');
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

    // Último trabajo
    const lastWorkedEl = document.getElementById('sheet-last-worked');
    if (lastWorkedEl) {
      const date  = this.territoryLastWorked[name];
      const label = date ? this._diasDesde(date) : null;
      if (label) {
        lastWorkedEl.textContent = `Último trabajo: ${label}`;
        lastWorkedEl.style.display = '';
      } else {
        lastWorkedEl.style.display = 'none';
      }
    }

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
    this._updateInformeBar();

    // Guardar en Firebase solo si hay token (vista capitán); en vista general se guarda en memoria hasta submitInforme
    if (!this._useMock && this.token) {
      try {
        await FB.updateEstado(this.token, this._sessionFecha, name, status, notes);
      } catch (err) {
        console.error('[TerritorialApp] Error guardando en Firebase', err);
        this.showToast('Error al guardar', 'error');
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Reintentar';
        return;
      }
    }

    const statusLabels = { completo: 'Completo ✅', parcial: 'En progreso 🟡', pendiente: 'Marcado pendiente ↩️' };
    this.showToast(statusLabels[status] || 'Guardado', 'success');

    this.closeSheet();

    // Auto-reset check: si completo, verificar si todos los territorios del lugar se completaron
    if (status === 'completo') this._checkAutoReset(name);

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

    // Persistir extras localmente (clave incluye fecha para no mezclar sesiones)
    try {
      localStorage.setItem(`extras_${this.token}_${this._sessionFecha}`, JSON.stringify(this.extraTerritories));
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
    this._skipNextMapClick = true; // ignorar click fantasma del botón en móvil
    const lugar = this.sessionInfo.lugar || '';
    const zoneList = _getZoneList(lugar);
    for (const name of this.allTerritoryNames) {
      if (this.assignedTerritories.includes(name)) {
        // Mis territorios → gris (ya los tengo)
        this.map.setFeatureState({ source: 'territories', id: name }, { addable: true });
      } else if (!zoneList.length || zoneList.includes(name)) {
        // En la zona del capitán → colores normales (disponible)
        this.map.setFeatureState({ source: 'territories', id: name }, { dim: false });
      }
      // Fuera de la zona → permanece dimmed (no se toca)
    }
    // Zoom: bounding box de los territorios de la zona, excluyendo outliers con bounds > 500m
    const MAX_DEG = 0.005; // ~500m — umbral para filtrar territorios anormalmente grandes
    const source = zoneList.length ? zoneList : this.assignedTerritories;
    const zoneBounds = source.reduce((acc, n) => {
      const b = this.territoryBounds[n];
      if (!b || b.isEmpty()) return acc;
      const w = b.getNorthEast().lng - b.getSouthWest().lng;
      const h = b.getNorthEast().lat - b.getSouthWest().lat;
      if (w > MAX_DEG || h > MAX_DEG) return acc; // ignorar outliers grandes
      return acc ? acc.extend(b) : new maplibregl.LngLatBounds(b.getSouthWest(), b.getNorthEast());
    }, null);
    if (zoneBounds) {
      this.map.setMinZoom(0);
      this.map.fitBounds(zoneBounds, {
        padding: { top: 80, bottom: 200, left: 40, right: 40 },
        duration: 800, linear: false, essential: true
      });
      this.map.once('moveend', () => this.map.setMinZoom(0));
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
    this._skipNextMapClick = true; // ignorar click fantasma del botón Cancelar en móvil
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
    const np = document.getElementById('normal-panel');
    if (np) np.style.display = '';
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

    this._updateFinishBar();
  },

  /* ── Finish Bar ──────────────────────────────────────────────────────────── */
  _updateFinishBar() {
    if (!this.token) return;
    const bar = document.getElementById('finish-bar');
    if (!bar) return;

    const total    = this.assignedTerritories.length;
    const completo = this.assignedTerritories.filter(n => this.territoryStatus[n] === 'completo').length;
    const parcial  = this.assignedTerritories.filter(n => this.territoryStatus[n] === 'parcial').length;
    const reported = completo + parcial;
    const pct      = total > 0 ? Math.round((reported / total) * 100) : 0;

    const fill  = document.getElementById('finish-bar-fill');
    const label = document.getElementById('finish-bar-label');
    const btn   = document.getElementById('finish-bar-btn');

    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = pct === 100 ? 'var(--success)' : '';
    }
    if (label) label.textContent = `${reported} / ${total} reportados`;
    if (btn) {
      if (this.submitted) {
        btn.textContent = 'Enviado ✓';
        btn.classList.add('submitted');
      } else {
        btn.textContent = pct === 100 ? 'Finalizar ✓' : 'Finalizar';
        btn.classList.remove('submitted');
      }
    }
  },

  openFinishSheet() {
    const total     = this.assignedTerritories.length;
    const completo  = this.assignedTerritories.filter(n => this.territoryStatus[n] === 'completo').length;
    const parcial   = this.assignedTerritories.filter(n => this.territoryStatus[n] === 'parcial').length;
    const pendiente = total - completo - parcial;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('finish-count-completo',  completo);
    setEl('finish-count-parcial',   parcial);
    setEl('finish-count-pendiente', pendiente);

    const warning = document.getElementById('finish-warning');
    if (warning) warning.style.display = pendiente > 0 ? '' : 'none';
    setEl('finish-pending-count', pendiente);

    const subInfo = document.getElementById('finish-submitted-info');
    if (subInfo) subInfo.style.display = this.submitted ? '' : 'none';
    if (this.submitTime) setEl('finish-submit-time', this.submitTime);

    const btn = document.getElementById('finish-submit-btn');
    if (btn) { btn.disabled = false; btn.textContent = this.submitted ? 'Reenviar informe' : 'Enviar informe'; }

    // Mostrar capitán asignado y resetear picker
    const capName = this.sessionInfo.capitan || '—';
    const nameEl  = document.getElementById('finish-capitan-name');
    const selEl   = document.getElementById('finish-capitan-select');
    const dispEl  = document.getElementById('finish-capitan-display');
    if (nameEl)  nameEl.textContent = capName;
    if (selEl)   { selEl.style.display = 'none'; selEl.value = ''; }
    if (dispEl)  dispEl.style.display = 'flex';

    document.getElementById('finish-sheet')?.classList.add('open');
    document.getElementById('finish-backdrop')?.classList.add('active');
  },

  closeFinishSheet() {
    document.getElementById('finish-sheet')?.classList.remove('open');
    document.getElementById('finish-backdrop')?.classList.remove('active');
  },

  _showCapitanPicker() {
    const selEl  = document.getElementById('finish-capitan-select');
    const dispEl = document.getElementById('finish-capitan-display');
    if (dispEl) dispEl.style.display = 'none';
    if (selEl)  { selEl.style.display = 'block'; selEl.focus(); }
  },

  async submitInforme() {
    // Usar capitán del picker si se cambió, si no usar el de la sesión
    const sel = document.getElementById('finish-capitan-select');
    const pickerVal = sel?.value?.trim() || '';
    const confirmedCapitan = pickerVal || this.sessionInfo.capitan || '';
    if (!confirmedCapitan) {
      this.showToast('Selecciona un capitán', 'error');
      return;
    }
    const confirmedToken = CAPITAN_TOKENS[confirmedCapitan] || this.token;

    const btn = document.getElementById('finish-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    // En vista general usar todos los territorios marcados; en modo capitán usar los asignados
    const srcTerritories = this.token
      ? this.assignedTerritories
      : this.allTerritoryNames.filter(n => this.territoryStatus[n]);

    // En vista general leer fecha del campo del sheet; lugar es automático por territorio
    const informeFecha = !this.token
      ? (document.getElementById('informe-fecha')?.value || FB.todayMX())
      : (this._sessionFecha || FB.todayMX());

    const payload = {
      token:       this.token,
      capitan:     this.sessionInfo.capitan,
      grupo:       this.sessionInfo.grupo,
      fecha:       this.sessionInfo.fecha,
      territorios: srcTerritories.map(name => ({
        id:     name,
        estado: this.territoryStatus[name] || 'pendiente',
        notas:  this.territoryNotes[name]  || ''
      }))
    };

    try {
      if (!this._useMock) {
        // Guardar en historial los territorios completo o parcial
        const entries = srcTerritories
          .filter(n => ['completo', 'parcial'].includes(this.territoryStatus[n]))
          .map(n => ({
            territorio:       n,
            lugar:            this.token ? (this.sessionInfo.lugar || '') : (TERRITORY_LOCATION[n] || ''),
            estado:           this.territoryStatus[n],
            notas:            this.territoryNotes[n] || '',
            capitan:          confirmedCapitan || this.sessionInfo.capitan || '',
            capitanToken:     confirmedToken,
            fechaPredicacion: informeFecha,
            fechaCompletado:  informeFecha,
            fechaArchivado:   FB.todayMX()
          }));
        if (entries.length) await FB.addHistorial(entries);
      } else {
        // Mock: simular delay
        await new Promise(r => setTimeout(r, 800));
      }

      this.submitted  = true;
      this.submitTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      this.closeFinishSheet();
      this.showToast('Informe enviado ✓', 'success');
      this._updateFinishBar();

    } catch (err) {
      console.error('[TerritorialApp] Error sending informe', err);
      this.showToast('Error al enviar', 'error');
      if (btn) { btn.disabled = false; btn.textContent = this.submitted ? 'Reenviar informe' : 'Enviar informe'; }
    }
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
    // En modo selección admin: el showList filter ya está aplicado, no sobreescribir
    if (this.adminSelectCapId) return;

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

    // Cancelar geocoding pendiente
    if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null; }

    this._clearSearchedState();

    if (!q) { this._fitToAssigned(); return; }

    // Buscar territorio por número — primero exacto, luego substring
    const match = this.allTerritoryNames.find(n => n === 't' + q || n === q)
               || this.allTerritoryNames.find(n => n.includes(q));
    if (match) {
      this.map.setFeatureState({ source: 'territories', id: match }, { searched: true });
      let t = 0;
      this._glowInterval = setInterval(() => {
        t += 0.08;
        const opacity = 0.3 + 0.6 * Math.abs(Math.sin(t));
        if (this.map.getLayer('territory-glow')) {
          this.map.setPaintProperty('territory-glow', 'line-opacity', opacity);
        }
      }, 40);
      if (this.territoryBounds[match]) {
        const b = this.territoryBounds[match];
        const w = b.getNorthEast().lng - b.getSouthWest().lng;
        const h = b.getNorthEast().lat - b.getSouthWest().lat;
        if (w > 0.005 || h > 0.005) {
          // Bounds demasiado grandes (territorio mixto disperso) → centroide real con zoom fijo
          const c = this.territoryCentroids[match] || b.getCenter();
          this.map.flyTo({ center: c, zoom: 17, duration: 800, essential: true });
        } else {
          this.map.fitBounds(b, {
            padding: { top: 160, bottom: 250, left: 60, right: 60 },
            duration: 800, linear: false, essential: true, maxZoom: 17
          });
        }
      }
      return;
    }

    // No es territorio → geocoding con debounce de 600ms
    this._searchTimer = setTimeout(() => this._geocodeSearch(query), 600);
  },

  async _geocodeSearch(query) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' Coacalco')}&limit=3&bbox=-99.11,19.57,-99.00,19.70`;
      const res  = await fetch(url);
      const data = await res.json();
      // Filtrar solo resultados dentro del área
      const bb = this._AREA_BBOX;
      const feat = data?.features?.find(f => {
        const [lon, lat] = f.geometry.coordinates;
        return lon >= bb.minLon && lon <= bb.maxLon && lat >= bb.minLat && lat <= bb.maxLat;
      });
      if (feat) {
        const [lon, lat] = feat.geometry.coordinates;
        const label = feat.properties.name || feat.properties.street || query;
        this.map.flyTo({ center: [lon, lat], zoom: 17, duration: 900, essential: true });
        this.showToast(`📍 ${label}`, 'info');
      } else {
        this.showToast('No se encontró en esta zona', 'error');
      }
    } catch(e) { this.showToast('No se encontró en esta zona', 'error'); }
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
    // Cargar tipo de sesión
    try {
      const tipo = localStorage.getItem('admin_session_tipo');
      if (tipo) { this.adminSessionTipo = tipo; localStorage.removeItem('admin_session_tipo'); }
    } catch(e) {}

    // Cargar territorios permitidos para este lugar de encuentro
    try {
      const stored = localStorage.getItem('admin_allowed_territories');
      if (stored) {
        this.adminAllowedTerritories = new Set(JSON.parse(stored).map(t => t.toLowerCase()));
        localStorage.removeItem('admin_allowed_territories');
      }
    } catch(e) {}

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

    // Filtrar adminSelectedTerritories a solo los permitidos (evita chips de sesiones anteriores)
    if (this.adminAllowedTerritories) {
      this.adminSelectedTerritories = new Set(
        [...this.adminSelectedTerritories].filter(t => this.adminAllowedTerritories.has(t))
      );
    }

    // Aplicar highlights pre-seleccionados
    for (const name of this.adminSelectedTerritories) {
      this.map.setFeatureState({ source: 'territories', id: name }, { selected: true });
    }

    // Filtrar capas para mostrar SOLO los territorios del lugar + tipo correcto
    {
      const tipoOk = (name) => this._getPrimaryType(name) === this.adminSessionTipo;
      const showList = this.allTerritoryNames.filter(n => {
        const inAllowed = !this.adminAllowedTerritories || this.adminAllowedTerritories.has(n);
        return inAllowed && tipoOk(n);
      });

      // Filtro MapLibre: solo mostrar territorios en showList
      const showFilter = ['in', ['get', 'name'], ['literal', showList]];
      ['territory-fill', 'territory-glow', 'territory-labels', 'territory-line'].forEach(id => {
        if (this.map.getLayer(id)) this.map.setFilter(id, showFilter);
      });
      // Capas de carta postal: ocultar en sesión casaencasa, filtrar en sesión carta
      const cartaVis = this.adminSessionTipo === 'carta' ? 'visible' : 'none';
      ['territory-line-carta', 'territory-line-mixto'].forEach(id => {
        if (this.map.getLayer(id)) {
          this.map.setLayoutProperty(id, 'visibility', cartaVis);
          if (this.adminSessionTipo === 'carta') this.map.setFilter(id, showFilter);
        }
      });

      this._adminShowList = new Set(showList);

      // Zoom al área del lugar de encuentro
      if (showList.length > 0) {
        const combined = showList.reduce((acc, name) => {
          const b = this.territoryBounds[name];
          if (!b || b.isEmpty()) return acc;
          return acc ? acc.extend(b) : b;
        }, null);
        if (combined) {
          this.map.fitBounds(combined, {
            padding: { top: 80, bottom: 180, left: 40, right: 40 },
            duration: 900, linear: false, essential: true
          });
        }
      }
    }

    this._updateAdminSelectCount();
  },

  toggleAdminTerritory(name) {
    if (this._adminShowList && !this._adminShowList.has(name)) return;
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.add('visible');
          // Auto-colapsar después de 4 segundos
          setTimeout(() => card.classList.add('collapsed'), 4000);
        });
      });
    }
    // Mostrar barra inferior de finalizar
    setTimeout(() => {
      document.getElementById('finish-bar')?.classList.add('visible');
      this.updateProgress();
    }, 400);
  },

  /* ── Informe bar (vista general, admin) ──────────────────────────────────── */
  _showInformeBar() {
    // Solo en vista general (sin token, sin adminSelect)
    if (this.token || this.adminSelectCapId) return;
    document.getElementById('informe-bar')?.classList.add('visible');
  },

  _unlockInformeBar() {
    this.informeUnlocked = true;
    const locked   = document.getElementById('informe-locked');
    const unlocked = document.getElementById('informe-unlocked');
    if (locked)   locked.style.display   = 'none';
    if (unlocked) unlocked.style.display = '';
    const legendStatus = document.getElementById('legend-status-section');
    if (legendStatus) legendStatus.style.display = '';
    this._updateInformeBar();
  },

  _updateInformeBar() {
    if (this.token) return;
    const names    = this.allTerritoryNames;
    const marked   = names.filter(n => this.territoryStatus[n] && this.territoryStatus[n] !== 'pendiente').length;
    const total    = names.length;
    const pct      = total > 0 ? Math.round((marked / total) * 100) : 0;

    const fill  = document.getElementById('informe-bar-fill');
    const label = document.getElementById('informe-bar-label');
    if (fill)  { fill.style.width = `${pct}%`; fill.style.background = pct === 100 ? 'var(--success)' : ''; }
    if (label) label.textContent = `${marked} / ${total} marcados`;
  },

  openInformeSheet() {
    const names     = this.allTerritoryNames;
    const completo  = names.filter(n => this.territoryStatus[n] === 'completo').length;
    const parcial   = names.filter(n => this.territoryStatus[n] === 'parcial').length;
    const pendiente = names.length - completo - parcial;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('finish-sheet-title',      'Agregar informe del día');
    setEl('finish-count-completo',   completo);
    setEl('finish-count-parcial',    parcial);
    setEl('finish-count-pendiente',  pendiente);

    const warning = document.getElementById('finish-warning');
    if (warning) warning.style.display = pendiente > 0 ? '' : 'none';
    setEl('finish-pending-count', pendiente);

    const subInfo = document.getElementById('finish-submitted-info');
    if (subInfo) subInfo.style.display = this.submitted ? '' : 'none';
    if (this.submitTime) setEl('finish-submit-time', this.submitTime);

    const btn = document.getElementById('finish-submit-btn');
    if (btn) { btn.disabled = false; btn.textContent = this.submitted ? 'Reenviar informe' : 'Enviar informe'; }

    // Vista general: mostrar picker de capitán + campos extra (lugar y fecha)
    const dispEl = document.getElementById('finish-capitan-display');
    const selEl  = document.getElementById('finish-capitan-select');
    if (dispEl) dispEl.style.display = 'none';
    if (selEl)  { selEl.style.display = 'block'; selEl.value = ''; }

    const extraFields = document.getElementById('informe-extra-fields');
    if (extraFields) extraFields.style.display = '';
    const fechaInput = document.getElementById('informe-fecha');
    if (fechaInput) fechaInput.value = this._sessionFecha || FB.todayMX();

    document.getElementById('finish-sheet')?.classList.add('open');
    document.getElementById('finish-backdrop')?.classList.add('active');
  },

  /* ── Historial resumen (último trabajo + ciclos) ─────────────────────────── */
  async loadHistorialResumen() {
    try {
      const entries = await FB.listHistorial();

      // Primera pasada: capturar resets de ciclo
      const resets = {};
      for (const e of entries) {
        if (e.estado !== 'ciclo_reset') continue;
        const lugar = e.lugar || e.territorio;
        const fecha = e.fechaPredicacion || '';
        if (!fecha) continue;
        if (!resets[lugar] || fecha > resets[lugar]) resets[lugar] = fecha;
      }
      this._cicloResets = resets;

      // Segunda pasada: último completo por territorio (solo dentro del ciclo actual)
      const latest = {};
      for (const e of entries) {
        if (e.estado !== 'completo') continue;
        const t     = e.territorio;
        const fecha = e.fechaPredicacion || e.fechaArchivado || '';
        if (!fecha) continue;
        const lugar       = TERRITORY_LOCATION[t] || '';
        const ultimoReset = resets[lugar] || '1900-01-01';
        if (fecha <= ultimoReset) continue; // anterior al ciclo actual
        if (!latest[t] || fecha > latest[t]) latest[t] = fecha;
      }
      this.territoryLastWorked = latest;

    } catch (err) {
      console.warn('[TerritorialApp] loadHistorialResumen:', err.message);
    }
  },

  _diasDesde(isoDate) {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split('-').map(Number);
    const then = new Date(y, m - 1, d, 12);
    const diff  = Math.floor((Date.now() - then) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7)   return `Hace ${diff} días`;
    if (diff < 14)  return 'Hace 1 semana';
    if (diff < 30)  return `Hace ${Math.floor(diff / 7)} semanas`;
    if (diff < 60)  return 'Hace 1 mes';
    return `Hace ${Math.floor(diff / 30)} meses`;
  },

  _getCompletadosEnCiclo(lugar) {
    const territorios = LOCATION_TERRITORIES[lugar] || [];
    const ultimoReset = this._cicloResets[lugar] || '1900-01-01';
    const hoy = FB.todayMX();
    return new Set(territorios.filter(t =>
      (this.territoryLastWorked[t] && this.territoryLastWorked[t] > ultimoReset)
      || (this.territoryStatus[t] === 'completo' && hoy > ultimoReset)
    ));
  },

  async _checkAutoReset(territorio) {
    const lugar = TERRITORY_LOCATION[territorio];
    if (!lugar) return;
    const todos       = LOCATION_TERRITORIES[lugar] || [];
    if (!todos.length) return;
    const completados = this._getCompletadosEnCiclo(lugar);
    if (!todos.every(t => completados.has(t))) return;
    await this._doAutoReset(lugar);
  },

  async _doAutoReset(lugar) {
    const fecha = FB.todayMX();
    try {
      await FB.addCicloReset(lugar, fecha);
      this._cicloResets[lugar] = fecha;
      const territorios = LOCATION_TERRITORIES[lugar] || [];
      territorios.forEach(t => {
        delete this.territoryLastWorked[t];
      });
      this.showToast(`¡Ciclo completo: ${lugar}! Territorios reiniciados 🔄`, 'success');
    } catch (err) {
      console.error('[AutoReset] Error:', err);
    }
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
