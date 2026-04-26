'use strict';

(function (global) {
  function tRange(from, to) {
    const arr = [];
    for (let i = from; i <= to; i++) arr.push(`t${i}`);
    return arr;
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  const KNOWN_GRUPOS = ['1','2','3','4','5','6','7','8','9','10','11','Congregación'];
  const TERRITORY_TYPES = ['casaencasa', 'carta'];
  const ONLY_CARTA_TERRITORIES = ['t5', 't25', 't33', 't58', 't90', 't102', 't103'];
  const CARTA_TERRITORIES = [
    't5', 't15', 't20', 't25', 't33', 't35', 't41', 't58', 't59', 't60',
    't61', 't63', 't66', 't69', 't70', 't72', 't73', 't90', 't95', 't99',
    't101', 't102', 't103', 't105', 't106'
  ];
  const TERRITORIES_BY_TYPE = {
    casaencasa: tRange(1, 106).filter(t => !ONLY_CARTA_TERRITORIES.includes(t)),
    carta: CARTA_TERRITORIES
  };

  const DEFAULT_CYCLE_CONFIG = {
    version: 1,
    lugares: {
      'Fam. Hernández Mora': {
        nombre: 'Fam. Hernández Mora',
        territorios: tRange(1, 11),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Espinosa Valencia': {
        nombre: 'Fam. Espinosa Valencia',
        territorios: tRange(12, 22),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Nájera Galván': {
        nombre: 'Fam. Nájera Galván',
        territorios: tRange(23, 33),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Reyes Maldonado': {
        nombre: 'Fam. Reyes Maldonado',
        territorios: tRange(34, 37),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Maldonado Vilchis': {
        nombre: 'Fam. Maldonado Vilchis',
        territorios: tRange(38, 42),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Lozano Gonzales': {
        nombre: 'Fam. Lozano Gonzales',
        territorios: tRange(43, 47),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Salón del Reino / Casa de Toñito': {
        nombre: 'Salón del Reino / Casa de Toñito',
        territorios: tRange(48, 68),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Rivas Arredondo': {
        nombre: 'Fam. Rivas Arredondo',
        territorios: tRange(69, 76),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Diez Reyes': {
        nombre: 'Fam. Diez Reyes',
        territorios: tRange(77, 82),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Hernández Alanís': {
        nombre: 'Fam. Hernández Alanís',
        territorios: tRange(83, 89),
        tipos: TERRITORY_TYPES,
        activo: true
      },
      'Fam. Aparicio López': {
        nombre: 'Fam. Aparicio López',
        territorios: tRange(90, 106),
        tipos: TERRITORY_TYPES,
        activo: true
      }
    }
  };

  function normalizeTerritoryName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function resolveConfig(config) {
    if (!config || typeof config !== 'object' || !config.lugares || typeof config.lugares !== 'object') {
      return DEFAULT_CYCLE_CONFIG;
    }

    const lugares = {};
    for (const [key, raw] of Object.entries(config.lugares)) {
      if (!raw || typeof raw !== 'object') continue;
      const nombre = String(raw.nombre || key || '').trim();
      if (!nombre) continue;
      const territorios = Array.isArray(raw.territorios)
        ? raw.territorios.map(normalizeTerritoryName).filter(Boolean)
        : [];
      if (!territorios.length) continue;
      lugares[nombre] = {
        nombre,
        territorios,
        tipos: Array.isArray(raw.tipos) ? raw.tipos.filter(Boolean) : ['casaencasa'],
        activo: raw.activo !== false
      };
    }

    return Object.keys(lugares).length
      ? { version: Number(config.version || 1), lugares }
      : DEFAULT_CYCLE_CONFIG;
  }

  function getKnownLocations(config) {
    return Object.values(resolveConfig(config).lugares)
      .filter(lugar => lugar.activo !== false)
      .map(lugar => lugar.nombre);
  }

  function getLocationEntry(config, lugar) {
    const resolved = resolveConfig(config);
    const direct = resolved.lugares[lugar];
    if (direct) return direct;

    const wanted = normalize(lugar);
    return Object.values(resolved.lugares).find(entry => normalize(entry.nombre) === wanted) || null;
  }

  function getTerritoriesForLugar(config, lugar, tipo) {
    const entry = getLocationEntry(config, lugar);
    if (!entry) return [];
    const territorios = entry.territorios.slice();
    if (!tipo) return territorios;
    if (Array.isArray(entry.tipos) && entry.tipos.length && !entry.tipos.includes(tipo)) return [];
    const allowed = new Set(TERRITORIES_BY_TYPE[tipo] || []);
    return territorios.filter(t => allowed.has(t));
  }

  function getCycleKey(lugar, tipo) {
    return tipo ? `${lugar}::${tipo}` : lugar;
  }

  function splitCycleKey(key) {
    const [lugar, tipo] = String(key || '').split('::');
    return { lugar, tipo: TERRITORY_TYPES.includes(tipo) ? tipo : '' };
  }

  function getTerritoryLocationMap(config) {
    const map = {};
    for (const entry of Object.values(resolveConfig(config).lugares)) {
      if (entry.activo === false) continue;
      entry.territorios.forEach(t => { map[normalizeTerritoryName(t)] = entry.nombre; });
    }
    return map;
  }

  function getLugarForTerritory(config, territory) {
    return getTerritoryLocationMap(config)[normalizeTerritoryName(territory)] || '';
  }

  function getAllCycleTerritories(config) {
    return [...new Set(Object.values(resolveConfig(config).lugares).flatMap(entry => (
      entry.activo === false ? [] : entry.territorios.map(normalizeTerritoryName)
    )))].sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')) || a.localeCompare(b));
  }

  function defaultConfigForFirestore() {
    return JSON.parse(JSON.stringify(DEFAULT_CYCLE_CONFIG));
  }

  global.TerritoryModel = {
    KNOWN_GRUPOS,
    TERRITORY_TYPES,
    TERRITORIES_BY_TYPE,
    DEFAULT_CYCLE_CONFIG,
    normalize,
    resolveConfig,
    getKnownLocations,
    getLocationEntry,
    getTerritoriesForLugar,
    getCycleKey,
    splitCycleKey,
    getTerritoryLocationMap,
    getLugarForTerritory,
    getAllCycleTerritories,
    defaultConfigForFirestore
  };
})(window);
