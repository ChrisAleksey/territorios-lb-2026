// =========================================================================
// BACKEND.GS — Territorios LB 2026
// Web App API for the territory management frontend (GitHub Pages)
//
// Deploy as: Execute as "Me", Who has access "Anyone"
// =========================================================================

// =========================================================================
// CONFIGURATION
// =========================================================================

// Presencial territories workbook
var PRESENCIAL_SHEET_ID = '1qYCSdwrFM297CIBivOkUHWSdNG6Edv50Hy8Ssct0T6c';

// Carta Postal territories workbook
var CARTA_SHEET_ID = 'PLACEHOLDER_CARTA_ID';

// Backend workbook (Capitanes / Sesiones / Estados tabs live here)
// After running setupBackend() for the first time, note the ID from the URL
// of the newly created spreadsheet and paste it here, then redeploy.
var BACKEND_SHEET_ID = 'PLACEHOLDER_BACKEND_SHEET_ID';

// Timezone used for date formatting and comparison
var TIMEZONE = 'America/Mexico_City';

// =========================================================================
// GRUPO → TERRITORY MAPPING
// =========================================================================

/**
 * Returns a flat array of territory IDs that belong to the given group numbers.
 * Groups are numbered 1–11 per meeting place, but each place covers a range.
 *
 * We store groups by their "meeting family" number (1–11 within each place),
 * and each captain's record stores which numbered groups they oversee.
 * Territories are mapped per group index across all places.
 */
var GRUPO_TERRITORIOS = {
  'hernandez-mora':      ['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10','t11'],
  'espinosa-valencia':   ['t12','t13','t14','t15','t16','t17','t18','t19','t20','t21','t22'],
  'najera-galvan':       ['t23','t24','t25','t26','t27','t28','t29','t30','t31','t32','t33'],
  'reyes-maldonado':     ['t34','t35','t36','t37'],
  'maldonado-vilchis':   ['t38','t39','t40','t41','t42'],
  'lozano-gonzales':     ['t43','t44','t45','t46','t47'],
  'salon-reino':         ['t48','t49','t50','t51','t52','t53','t54','t55','t56','t57','t58','t59','t60','t61','t62','t63','t64','t65','t66','t67','t68'],
  'rivas-arredondo':     ['t69','t70','t71','t72','t73','t74','t75','t76'],
  'diez-reyes':          ['t77','t78','t79','t80','t81','t82'],
  'hernandez-alanis':    ['t83','t84','t85','t86','t87','t88','t89'],
  'aparicio-lopez':      ['t90','t91','t92','t93','t94','t95','t96','t97','t98','t99','t100','t101','t102','t103','t104','t105','t106']
};

// =========================================================================
// WEB APP ENTRY POINTS
// =========================================================================

/**
 * doGet — handles GET requests from the frontend.
 *
 * Query parameters:
 *   t      (required) — captain token
 *   action (optional) — if 'crear_sesion', creates a new session instead
 *                        (also requires a JSON body or additional params)
 *
 * Normal response (today's assignment for the captain):
 * {
 *   ok: true,
 *   capitan: "Fernando Frausto",
 *   grupo: "1, 3, 5",
 *   fecha: "Sábado 4 de Abril 2026",
 *   hora: "9:30 am",
 *   lugar: "Fam. Hernández Mora",
 *   tipo: "presencial",
 *   territorios: ["t1", "t2"],
 *   estados: { "t1": { status: "pendiente", notas: "" } }
 * }
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var token  = params.t || params.token || '';

    if (!token) {
      return errorResponse('Token requerido. Usa ?t=TU_TOKEN');
    }

    // ── Action: crear_sesion ──────────────────────────────────────────────
    if (params.action === 'crear_sesion') {
      var datos = {
        token:       token,
        fecha:       params.fecha       || '',
        tipo:        params.tipo        || 'presencial',
        hora:        params.hora        || '',
        lugar:       params.lugar       || '',
        grupos:      params.grupos      || '',
        territorios: params.territorios || ''
      };
      return crearSesion(datos);
    }

    // ── Normal: return today's assignment ────────────────────────────────
    var capitan = getCapitanByToken(token);
    if (!capitan) {
      return errorResponse('Capitán no encontrado para el token proporcionado.');
    }

    var sesion = getSesionHoy(token);

    var fechaHoy    = '';
    var hora        = '';
    var lugar       = '';
    var tipo        = capitan.tipo || 'presencial';
    var territorios = [];

    if (sesion) {
      fechaHoy    = sesion.fecha;
      hora        = sesion.hora;
      lugar       = sesion.lugar;
      tipo        = sesion.tipo || tipo;
      territorios = sesion.territorios
        ? sesion.territorios.split(',').map(function(t) { return t.trim(); }).filter(Boolean)
        : [];
    }

    var estados = getEstadosHoy(token, fechaHoy);

    var result = {
      ok:          true,
      capitan:     capitan.nombre,
      grupo:       capitan.grupos,
      fecha:       fechaHoy ? formatFechaLarga(fechaHoy) : formatFechaLarga(todayISO()),
      hora:        hora,
      lugar:       lugar,
      tipo:        tipo,
      territorios: territorios,
      estados:     estados
    };

    return jsonResponse(result);

  } catch (err) {
    return errorResponse('Error interno en doGet: ' + err.message);
  }
}

/**
 * doPost — handles POST requests to save a territory status update.
 *
 * Expected JSON body:
 * {
 *   token:     "fernando-abc123",
 *   territorio: "t1",
 *   status:    "completo",   // "completo" | "parcial" | "pendiente"
 *   notas:     ""
 * }
 *
 * Response:
 * { ok: true, mensaje: "Estado guardado" }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse('Cuerpo de solicitud vacío o inválido.');
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return errorResponse('JSON inválido en el cuerpo: ' + parseErr.message);
    }

    var token      = body.token      || '';
    var territorio = body.territorio || '';
    var status     = body.status     || 'pendiente';
    var notas      = body.notas      || '';

    if (!token) {
      return errorResponse('Campo "token" requerido.');
    }
    if (!territorio) {
      return errorResponse('Campo "territorio" requerido.');
    }

    var validos = ['completo', 'parcial', 'pendiente'];
    if (validos.indexOf(status) === -1) {
      return errorResponse('Status inválido. Usa: completo, parcial o pendiente.');
    }

    // Verify the token belongs to a known captain
    var capitan = getCapitanByToken(token);
    if (!capitan) {
      return errorResponse('Token no reconocido.');
    }

    return guardarEstado(token, territorio, status, notas);

  } catch (err) {
    return errorResponse('Error interno en doPost: ' + err.message);
  }
}

// =========================================================================
// BUSINESS LOGIC
// =========================================================================

/**
 * Looks up a captain in the "Capitanes" tab by their token.
 *
 * Sheet columns: A=ID | B=Nombre | C=Teléfono | D=Token | E=Grupos | F=Tipo | G=Activo
 *
 * Returns an object { id, nombre, telefono, token, grupos, tipo, activo }
 * or null if not found / not active.
 */
function getCapitanByToken(token) {
  try {
    var sheet = getOrCreateSheet(BACKEND_SHEET_ID, 'Capitanes');
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowToken = String(row[3]).trim();
      if (rowToken === token) {
        var activo = String(row[6]).trim().toLowerCase();
        // Accept 'true', '1', 'sí', 'si', 'yes', or empty (default active)
        var isActivo = activo === 'true' || activo === '1' ||
                       activo === 'sí'   || activo === 'si' ||
                       activo === 'yes'  || activo === '';
        if (!isActivo) return null;

        return {
          id:       String(row[0]).trim(),
          nombre:   String(row[1]).trim(),
          telefono: String(row[2]).trim(),
          token:    rowToken,
          grupos:   String(row[4]).trim(),
          tipo:     String(row[5]).trim() || 'presencial',
          activo:   true
        };
      }
    }
    return null;

  } catch (err) {
    Logger.log('getCapitanByToken error: ' + err.message);
    return null;
  }
}

/**
 * Finds today's session for the given captain token in the "Sesiones" tab.
 *
 * Sheet columns: A=Fecha | B=Tipo | C=Hora | D=Lugar | E=CapitanToken | F=GruposAsignados | G=Territorios
 *
 * Dates in the sheet are stored as ISO strings (YYYY-MM-DD).
 * Returns an object { fecha, tipo, hora, lugar, grupos, territorios }
 * or null if no session for today.
 */
function getSesionHoy(token) {
  try {
    var sheet   = getOrCreateSheet(BACKEND_SHEET_ID, 'Sesiones');
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    var hoy  = todayISO();
    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    // Iterate in reverse so the most recent entry wins if duplicates exist
    for (var i = data.length - 1; i >= 0; i--) {
      var row         = data[i];
      var fechaCell   = row[0];
      var tokenCell   = String(row[4]).trim();

      // Normalise date: may be a Date object or a string
      var fechaISO = '';
      if (fechaCell instanceof Date) {
        fechaISO = Utilities.formatDate(fechaCell, TIMEZONE, 'yyyy-MM-dd');
      } else {
        fechaISO = String(fechaCell).trim().substring(0, 10); // take YYYY-MM-DD portion
      }

      if (fechaISO === hoy && tokenCell === token) {
        return {
          fecha:       fechaISO,
          tipo:        String(row[1]).trim(),
          hora:        String(row[2]).trim(),
          lugar:       String(row[3]).trim(),
          grupos:      String(row[5]).trim(),
          territorios: String(row[6]).trim()
        };
      }
    }
    return null;

  } catch (err) {
    Logger.log('getSesionHoy error: ' + err.message);
    return null;
  }
}

/**
 * Retrieves territory status entries from "Estados" for a captain on a given date.
 *
 * Sheet columns: A=Fecha | B=CapitanToken | C=Territorio | D=Estado | E=Notas | F=Timestamp
 *
 * Returns an object keyed by territory ID:
 * { "t1": { status: "completo", notas: "..." }, ... }
 *
 * If multiple entries exist for the same territory on the same day,
 * the last one (most recent by row order) wins.
 */
function getEstadosHoy(token, fecha) {
  var estados = {};
  try {
    var sheet   = getOrCreateSheet(BACKEND_SHEET_ID, 'Estados');
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return estados;

    var fechaBuscar = fecha || todayISO();
    var data        = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    for (var i = 0; i < data.length; i++) {
      var row       = data[i];
      var fechaCell = row[0];
      var fechaISO  = '';

      if (fechaCell instanceof Date) {
        fechaISO = Utilities.formatDate(fechaCell, TIMEZONE, 'yyyy-MM-dd');
      } else {
        fechaISO = String(fechaCell).trim().substring(0, 10);
      }

      if (fechaISO === fechaBuscar && String(row[1]).trim() === token) {
        var terrId = String(row[2]).trim();
        if (terrId) {
          estados[terrId] = {
            status: String(row[3]).trim() || 'pendiente',
            notas:  String(row[4]).trim()
          };
        }
      }
    }
  } catch (err) {
    Logger.log('getEstadosHoy error: ' + err.message);
  }
  return estados;
}

/**
 * Saves (appends) a territory status record to the "Estados" tab.
 * Uses LockService to prevent duplicate / corrupted rows under concurrent writes.
 *
 * Returns a JSON response.
 */
function guardarEstado(token, territorio, status, notas) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for the lock
    lock.waitLock(10000);

    var sheet     = getOrCreateSheet(BACKEND_SHEET_ID, 'Estados');
    var timestamp = new Date();
    var fechaHoy  = todayISO();

    sheet.appendRow([fechaHoy, token, territorio, status, notas || '', timestamp]);

    return jsonResponse({ ok: true, mensaje: 'Estado guardado' });

  } catch (err) {
    Logger.log('guardarEstado error: ' + err.message);
    return errorResponse('No se pudo guardar el estado: ' + err.message);
  } finally {
    try { lock.releaseLock(); } catch (e) { /* ignore */ }
  }
}

/**
 * Creates a new session record in the "Sesiones" tab.
 *
 * datos: { token, fecha, tipo, hora, lugar, grupos, territorios }
 *
 * - fecha: ISO date string YYYY-MM-DD (defaults to today)
 * - territorios: comma-separated territory IDs, e.g. "t1,t2,t3"
 *   If empty, the system auto-resolves territories from the captain's group list.
 *
 * Returns a JSON response.
 */
function crearSesion(datos) {
  try {
    var token = String(datos.token || '').trim();
    if (!token) {
      return errorResponse('Token requerido para crear sesión.');
    }

    var capitan = getCapitanByToken(token);
    if (!capitan) {
      return errorResponse('Token no reconocido al crear sesión.');
    }

    var fecha  = String(datos.fecha || '').trim() || todayISO();
    var tipo   = String(datos.tipo  || '').trim() || capitan.tipo || 'presencial';
    var hora   = String(datos.hora  || '').trim();
    var lugar  = String(datos.lugar || '').trim();
    var grupos = String(datos.grupos || datos.grupo || capitan.grupos || '').trim();

    // Auto-resolve territories from groups if none provided
    var territoriosStr = String(datos.territorios || '').trim();
    if (!territoriosStr && grupos) {
      territoriosStr = resolverTerritoriosPorGrupos(grupos).join(',');
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var sheet = getOrCreateSheet(BACKEND_SHEET_ID, 'Sesiones');
      sheet.appendRow([fecha, tipo, hora, lugar, token, grupos, territoriosStr]);
    } finally {
      try { lock.releaseLock(); } catch (e) { /* ignore */ }
    }

    return jsonResponse({
      ok:          true,
      mensaje:     'Sesión creada',
      fecha:       fecha,
      tipo:        tipo,
      territorios: territoriosStr.split(',').map(function(t){ return t.trim(); }).filter(Boolean)
    });

  } catch (err) {
    Logger.log('crearSesion error: ' + err.message);
    return errorResponse('Error al crear sesión: ' + err.message);
  }
}

// =========================================================================
// HELPERS
// =========================================================================

/**
 * Returns today's date as an ISO string (YYYY-MM-DD) in the project timezone.
 */
function todayISO() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a Spanish long-form date,
 * e.g. "Sábado 4 de Abril 2026".
 */
function formatFechaLarga(isoDate) {
  try {
    // Parse safely: "2026-04-04" → new Date(2026, 3, 4) (months are 0-based)
    var parts = isoDate.substring(0, 10).split('-');
    var year  = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day   = parseInt(parts[2], 10);

    // Build date at noon to avoid DST edge cases
    var d = new Date(year, month, day, 12, 0, 0);

    var dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    var meses  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()] + ' ' + d.getFullYear();
  } catch (err) {
    return isoDate; // fallback: return raw string
  }
}

/**
 * Given a comma-separated groups string (e.g. "1, 3, 5" or "hernandez-mora"),
 * returns a flat array of territory IDs.
 *
 * Group resolution works in two ways:
 *   1. If the string contains slug keys matching GRUPO_TERRITORIOS, use them directly.
 *   2. If the string contains numbers, map them to grupos by position (1-based index
 *      across all groups in insertion order of GRUPO_TERRITORIOS).
 */
function resolverTerritoriosPorGrupos(gruposStr) {
  var resultado = [];
  if (!gruposStr) return resultado;

  var grupoKeys = Object.keys(GRUPO_TERRITORIOS);

  // Check if any slug is mentioned directly
  var lowerStr = gruposStr.toLowerCase();
  var foundSlug = false;
  for (var i = 0; i < grupoKeys.length; i++) {
    if (lowerStr.indexOf(grupoKeys[i]) !== -1) {
      foundSlug = true;
      var terrs = GRUPO_TERRITORIOS[grupoKeys[i]];
      for (var j = 0; j < terrs.length; j++) {
        if (resultado.indexOf(terrs[j]) === -1) resultado.push(terrs[j]);
      }
    }
  }
  if (foundSlug) return resultado;

  // Fall back: numeric indices (1-based) into grupoKeys
  var partes = gruposStr.split(',');
  for (var p = 0; p < partes.length; p++) {
    var n = parseInt(partes[p].trim(), 10);
    if (!isNaN(n) && n >= 1 && n <= grupoKeys.length) {
      var key  = grupoKeys[n - 1];
      var list = GRUPO_TERRITORIOS[key];
      for (var k = 0; k < list.length; k++) {
        if (resultado.indexOf(list[k]) === -1) resultado.push(list[k]);
      }
    }
  }
  return resultado;
}

/**
 * Returns a reference to a tab in the given spreadsheet.
 * If the tab does not exist it is created with default headers.
 *
 * Supported tabNames: 'Capitanes', 'Sesiones', 'Estados'
 */
function getOrCreateSheet(spreadsheetId, tabName) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    throw new Error('No se pudo abrir el spreadsheet con ID "' + spreadsheetId + '": ' + err.message);
  }

  var sheet = ss.getSheetByName(tabName);
  if (sheet) return sheet;

  // Create tab with appropriate headers
  sheet = ss.insertSheet(tabName);

  var headers = {
    'Capitanes': ['ID', 'Nombre', 'Teléfono', 'Token', 'Grupos', 'Tipo', 'Activo'],
    'Sesiones':  ['Fecha', 'Tipo', 'Hora', 'Lugar', 'CapitanToken', 'GruposAsignados', 'Territorios'],
    'Estados':   ['Fecha', 'CapitanToken', 'Territorio', 'Estado', 'Notas', 'Timestamp']
  };

  var rowHeaders = headers[tabName] || [];
  if (rowHeaders.length > 0) {
    var headerRange = sheet.getRange(1, 1, 1, rowHeaders.length);
    headerRange.setValues([rowHeaders]);
    headerRange.setFontWeight('bold')
               .setBackground('#434343')
               .setFontColor('#ffffff')
               .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }

  Logger.log('Pestaña "' + tabName + '" creada en spreadsheet ' + spreadsheetId);
  return sheet;
}

/**
 * Wraps any object as a JSON ContentService output.
 * Apps Script Web Apps deployed as "Anyone" handle CORS automatically;
 * we still set MIME type to JSON for correct client parsing.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns a standard error JSON response.
 */
function errorResponse(msg) {
  return jsonResponse({ ok: false, error: msg });
}

// =========================================================================
// SETUP
// =========================================================================

/**
 * setupBackend() — run ONCE from the Apps Script editor.
 *
 * Creates (or verifies) all required tabs in BACKEND_SHEET_ID:
 *   - Capitanes
 *   - Sesiones
 *   - Estados
 *
 * After running this, update BACKEND_SHEET_ID if you created a new spreadsheet,
 * then redeploy the Web App.
 */
function setupBackend() {
  Logger.log('=== setupBackend START ===');

  // If BACKEND_SHEET_ID is still a placeholder, create a new spreadsheet
  var backendId = BACKEND_SHEET_ID;
  if (backendId === 'PLACEHOLDER_BACKEND_SHEET_ID') {
    var newSS = SpreadsheetApp.create('Backend Territorios LB 2026');
    backendId = newSS.getId();
    Logger.log('*** Nuevo spreadsheet creado. Actualiza BACKEND_SHEET_ID con: ' + backendId);
    Logger.log('    URL: ' + newSS.getUrl());
  }

  getOrCreateSheet(backendId, 'Capitanes');
  getOrCreateSheet(backendId, 'Sesiones');
  getOrCreateSheet(backendId, 'Estados');

  Logger.log('=== setupBackend COMPLETO. Backend ID: ' + backendId + ' ===');
}

/**
 * seedCapitanes() — run ONCE after setupBackend() to populate mock captains.
 *
 * Clears existing rows (keeps header) and inserts the seed data.
 * Safe to re-run: it replaces all data.
 */
function seedCapitanes() {
  var sheet = getOrCreateSheet(BACKEND_SHEET_ID, 'Capitanes');

  // Clear everything below the header row
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  }

  // Columns: ID | Nombre | Teléfono | Token | Grupos | Tipo | Activo
  var seed = [
    ['CAP001', 'Abraam Maldonado',   '525512345001', 'abraam-abc123',     'Grupos 1,3,5,7,9',         'presencial', 'true'],
    ['CAP002', 'Fernando Frausto',   '525512345002', 'fernando-def456',   'Grupos 2,4,6,8,10,11',     'presencial', 'true'],
    ['CAP003', 'Jorge Diez Reyes',   '525512345003', 'jorge-ghi789',      'Grupos 1,2,5,6,9,10',      'presencial', 'true'],
    ['CAP004', 'Ivan García',        '525512345004', 'ivan-jkl012',       'Grupos 3,4,7,8,11',        'presencial', 'true'],
    ['CAP005', 'Roberto Aparicio',   '525512345005', 'roberto-mno345',    'Grupos 1,2,5,6,9,10',      'presencial', 'true'],
    ['CAP006', 'Fernando Frausto',   '525512345002', 'fernando-cartas',   'Todos',                    'cartas',     'true'],
    ['CAP007', 'Aleksey Cruz',       '525512345010', 'aleksey-abc890',    'Admin',                    'admin',      'true']
  ];

  sheet.getRange(2, 1, seed.length, 7).setValues(seed);
  Logger.log('seedCapitanes: ' + seed.length + ' capitanes insertados.');
}

// =========================================================================
// TEST
// =========================================================================

/**
 * test() — run from the Apps Script editor to verify the main flows.
 *
 * Checks:
 *   1. getCapitanByToken with a known token
 *   2. getSesionHoy (may return null if no session for today)
 *   3. guardarEstado with a test territory
 *   4. getEstadosHoy to confirm the saved state is returned
 *   5. doGet simulation
 *   6. doPost simulation
 *   7. crearSesion simulation
 */
function test() {
  Logger.log('===== TEST START =====');

  var testToken = 'abraam-abc123';

  // 1. Lookup captain
  var capitan = getCapitanByToken(testToken);
  Logger.log('1. getCapitanByToken("' + testToken + '"): ' + JSON.stringify(capitan));
  if (!capitan) {
    Logger.log('   WARN: Capitán no encontrado. Asegúrate de haber ejecutado seedCapitanes() primero.');
  }

  // 2. Today's session (may be null)
  var sesion = getSesionHoy(testToken);
  Logger.log('2. getSesionHoy: ' + JSON.stringify(sesion));

  // 3. Save a test state
  var saveResult = guardarEstado(testToken, 'test-territorio-99', 'parcial', 'Nota de prueba');
  var saveBody   = JSON.parse(saveResult.getContent());
  Logger.log('3. guardarEstado: ' + JSON.stringify(saveBody));

  // 4. Retrieve states for today
  var estados = getEstadosHoy(testToken, todayISO());
  Logger.log('4. getEstadosHoy: ' + JSON.stringify(estados));
  if (estados['test-territorio-99']) {
    Logger.log('   OK: Estado de test-territorio-99 encontrado: ' + estados['test-territorio-99'].status);
  } else {
    Logger.log('   WARN: Estado de test-territorio-99 NO encontrado.');
  }

  // 5. Simulate doGet
  var fakeGetEvent = { parameter: { t: testToken } };
  var getResult    = doGet(fakeGetEvent);
  var getBody      = JSON.parse(getResult.getContent());
  Logger.log('5. doGet simulation: ok=' + getBody.ok + ', capitan=' + getBody.capitan);

  // 6. Simulate doPost
  var fakePostEvent = {
    postData: {
      contents: JSON.stringify({
        token:      testToken,
        territorio: 'test-post-t1',
        status:     'completo',
        notas:      'Test doPost'
      })
    }
  };
  var postResult = doPost(fakePostEvent);
  var postBody   = JSON.parse(postResult.getContent());
  Logger.log('6. doPost simulation: ' + JSON.stringify(postBody));

  // 7. Simulate crearSesion via doGet with action=crear_sesion
  var fakeSessionEvent = {
    parameter: {
      t:           testToken,
      action:      'crear_sesion',
      fecha:       todayISO(),
      tipo:        'presencial',
      hora:        '9:30 am',
      lugar:       'Fam. Hernández Mora',
      grupos:      'Grupos 1,3',
      territorios: 't1,t2,t3'
    }
  };
  var sesionResult = doGet(fakeSessionEvent);
  var sesionBody   = JSON.parse(sesionResult.getContent());
  Logger.log('7. crearSesion simulation: ' + JSON.stringify(sesionBody));

  // 8. Date formatting check
  Logger.log('8. formatFechaLarga("2026-04-04"): ' + formatFechaLarga('2026-04-04'));
  Logger.log('8. todayISO(): ' + todayISO());

  // 9. Territory resolver check
  var terrs = resolverTerritoriosPorGrupos('hernandez-mora');
  Logger.log('9. resolverTerritoriosPorGrupos("hernandez-mora"): ' + terrs.join(','));

  Logger.log('===== TEST END =====');
}
