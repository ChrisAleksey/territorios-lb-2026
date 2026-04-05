// =====================================================
// SCRIPT MAESTRO: Territorios LB Carta Postal
// Hoja: 1Ms08XH2pbE2zMJzwBDnbS2-AC7Tbs9EKMHla0U77RHg
// =====================================================

var CAPITANES = [
  'Hno. Abraham Maldonado', 'Hno. Alejandro Vazquez Maciel', 'Hno. Aleksey Cruz',
  'Hno. Amadiz Lozano', 'Hno. Arturo Aparicio', 'Hno. Christian Cruz Grajales',
  'Hno. Emanuel Evangelista', 'Hno. Fernando Frausto Trujillo', 'Hno. Fernando Reyes Piferrer',
  'Hno. Francisco Javier Garcia', 'Hno. Ivan García', 'Hno. Joel Espinosa Hernandez',
  'Hno. Jorge Diez Frausto', 'Hno. Jorge Diez Reyes', 'Hno. Jose Alberto Davila',
  'Hno. Jose Luis Najera', 'Hno. José Carlos Matadamas', 'Hno. Juan Carlos Valero',
  'Hno. Luis Fernando Ruiz', 'Hno. Luis Roberto Aparicio', 'Hno. Nestor Yedan Montoya',
  'Hno. Omar Vazquez Maciel', 'Hno. Orlando Najera', 'Hno. René Villegas Cano',
  'Hno. Sergio Armando Hernandez'
];

// ─── ON OPEN ──────────────────────────────────────────
function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cerradasSheet = ss.getSheetByName('Cerradas');
  cerradasSheet.getRange('H2:H108').setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

  SpreadsheetApp.getUi()
    .createMenu('📬 Carta Postal')
    .addItem('📁 Archivar masivo (cartas enviadas)', 'archivarMasivo')
    .addItem('🔢 Reparar fila TOTAL del Resumen', 'repararFilaTotal')
    .addToUi();
}

function archivarMasivo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No hay registros para archivar.');
    return;
  }

  var count = 0;
  // Recorrer de atrás hacia adelante
  for (var r = lastRow; r >= 2; r--) {
    var noTerr = sheet.getRange(r, 1).getValue();
    var cartaEnvMasivo = sheet.getRange(r, 6).getValue();
    if (noTerr !== '' && cartaEnvMasivo === '✅ Sí') {
      archivarCarta(ss, sheet, r);
      count++;
    }
  }

  if (count > 0) {
    SpreadsheetApp.getUi().alert('✅ Se archivaron ' + count + ' cartas enviadas en Historial Cartas.');
  } else {
    SpreadsheetApp.getUi().alert('No se encontraron cartas con ✅ Carta Enviada para archivar.');
  }
}

// ─── ON EDIT ──────────────────────────────────────────
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();
  var col = e.range.getColumn();
  var row = e.range.getRow();
  if (row < 2) return;

  // ── CERRADAS: cualquier edición actualiza el Resumen automáticamente ──
  if (sheetName === 'Cerradas') {
    if (col === 8) {
      // Checkbox Guardar
      if (e.value === 'TRUE') {
        guardarCerradaFila(e, sheet, row);
      } else if (e.value === '' || e.value === undefined) {
        sheet.getRange(row, 8).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
        sheet.getRange(row, 8).setValue(false);
        sheet.getRange(row, 8).setHorizontalAlignment('center');
      }
      return;
    }
    // Cualquier edición en cols C, D, E, F → actualizar Resumen del territorio
    if (col >= 3 && col <= 6) {
      var noTerr = sheet.getRange(row, 1).getValue();
      if (noTerr) actualizarResumenFila(e.source, noTerr);
    }
    return;
  }

  // ── REGISTRO DE CARTAS: col J (Archivar) ──
  if (sheetName === 'Registro de Cartas' && col === 10) {
    if (e.value === 'TRUE') {
      archivarCarta(e.source, sheet, row);
      // La fila fue eliminada por archivarCarta — no se necesita setValue
    } else if (e.value === '' || e.value === undefined) {
      var checkJ = sheet.getRange(row, 10);
      checkJ.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      checkJ.setValue(false);
      checkJ.setHorizontalAlignment('center');
    }
    return;
  }

  // ── REGISTRO DE CARTAS ──
  if (sheetName === 'Registro de Cartas') {
    var ss2 = e.source;
    var cerradasSheet2 = ss2.getSheetByName('Cerradas');
    var lastRowCerradas2 = cerradasSheet2.getLastRow();
    var datosCerradas2 = lastRowCerradas2 > 1 ? cerradasSheet2.getRange(2, 1, lastRowCerradas2 - 1, 4).getValues() : [];

    // Col A → auto-link + fecha + dropdowns dinámicos + filtrar cerradas
    if (col === 1 && e.value !== '') {
      var noTerr = e.value.toString();

      // Auto-link
      var mapaLinks = obtenerCacheLinks();
      var info = mapaLinks[noTerr];
      if (info && info.url) {
        var rt = SpreadsheetApp.newRichTextValue().setText(info.texto).setLinkUrl(info.url).build();
        sheet.getRange(row, 2).setRichTextValue(rt);
      }

      // Auto-fecha registro col I
      sheet.getRange(row, 9).setValue(new Date());
      sheet.getRange(row, 9).setNumberFormat('dd/MM/yyyy');

      // Checkbox Archivar col J
      var checkJ2 = sheet.getRange(row, 10);
      checkJ2.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      checkJ2.setValue(false);
      checkJ2.setHorizontalAlignment('center');

      // Dropdowns dinámicos fila
      sheet.getRange(row, 5).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
      );
      sheet.getRange(row, 6).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
      );
      sheet.getRange(row, 7).setDataValidation(
        SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
      );
      sheet.getRange(row, 7).setNumberFormat('dd/MM/yyyy');
      sheet.getRange(row, 8).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(CAPITANES, true).setAllowInvalid(false).build()
      );

      // Filtrar cerradas del territorio en col C
      var cerradasFiltradas = [];
      for (var i = 0; i < datosCerradas2.length; i++) {
        if (String(datosCerradas2[i][0]) === noTerr && datosCerradas2[i][2] && cerradasFiltradas.indexOf(datosCerradas2[i][2]) === -1) {
          cerradasFiltradas.push(datosCerradas2[i][2]);
        }
      }
      sheet.getRange(row, 3).clearDataValidations();
      sheet.getRange(row, 3).clearContent();
      sheet.getRange(row, 4).clearDataValidations();
      sheet.getRange(row, 4).clearContent();
      if (cerradasFiltradas.length > 0) {
        sheet.getRange(row, 3).setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(cerradasFiltradas, true).setAllowInvalid(false).build()
        );
      }

      // Agregar siguiente fila si es la última
      var nextRow = sheet.getLastRow() + 1;
      if (sheet.getRange(nextRow, 1).getDataValidation() === null) {
        agregarFilaRegistro(ss2, nextRow);
      }
    }

    // Col C → auto-llenar territorio + link + filtrar casas
    if (col === 3 && e.value !== '') {
      var nombreCerrada2 = e.value.toString();
      var noTerrEncontrado = '';
      for (var j = 0; j < datosCerradas2.length; j++) {
        if (datosCerradas2[j][2] === nombreCerrada2) {
          noTerrEncontrado = String(datosCerradas2[j][0]);
          break;
        }
      }
      if (noTerrEncontrado && sheet.getRange(row, 1).getValue() === '') {
        sheet.getRange(row, 1).setValue(Number(noTerrEncontrado));
        var mapaLinks2 = obtenerCacheLinks();
        var info2 = mapaLinks2[noTerrEncontrado];
        if (info2 && info2.url) {
          var rt2 = SpreadsheetApp.newRichTextValue().setText(info2.texto).setLinkUrl(info2.url).build();
          sheet.getRange(row, 2).setRichTextValue(rt2);
        }
        sheet.getRange(row, 9).setValue(new Date());
        sheet.getRange(row, 9).setNumberFormat('dd/MM/yyyy');
      }
      var mapaCasas = obtenerCacheCasas();
      sheet.getRange(row, 4).clearDataValidations();
      sheet.getRange(row, 4).clearContent();
      var casasFiltradas = mapaCasas[nombreCerrada2] || [];
      if (casasFiltradas.length > 0) {
        sheet.getRange(row, 4).setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(casasFiltradas, true).setAllowInvalid(false).build()
        );
      }
    }

  }
}

// ─── GUARDAR CERRADA FILA ─────────────────────────────
function guardarCerradaFila(e, sheet, row) {
  var ss = e.source;
  var casasSheet = ss.getSheetByName('Casas');
  var datos = sheet.getRange(row, 1, 1, 7).getValues()[0];
  var richLink = sheet.getRange(row, 2).getRichTextValue();
  var noTerritorio = datos[0];
  var nombreCerrada = datos[2];
  var identificadores = expandirRangos(datos[3]);
  var numCasas = identificadores.length;

  e.range.setValue(false);

  if (!noTerritorio || !nombreCerrada || numCasas <= 0) {
    SpreadsheetApp.getUi().alert('⚠️ Falta el número de territorio, el nombre de la cerrada o el número de casas.');
    return;
  }

  // ── Verificar Registro de Cartas ANTES de modificar nada ──
  var registroSheet = ss.getSheetByName('Registro de Cartas');
  var lastRowReg = registroSheet.getLastRow();
  var datosReg = [];
  if (lastRowReg > 1) {
    datosReg = registroSheet.getRange(2, 1, lastRowReg - 1, 6).getValues();
    var tieneConDatos = false;
    for (var rk = 0; rk < datosReg.length; rk++) {
      if (String(datosReg[rk][0]) === String(noTerritorio) && datosReg[rk][2] === nombreCerrada) {
        if (datosReg[rk][4] !== '' || datosReg[rk][5] !== '') { tieneConDatos = true; break; }
      }
    }
    if (tieneConDatos) {
      var ui = SpreadsheetApp.getUi();
      var confirmar = ui.alert('⚠️ Advertencia',
        'Ya hay registros con cartas marcadas para "' + nombreCerrada + '".\n¿Sobrescribir? Se perderán los datos de cartas elaboradas/enviadas.',
        ui.ButtonSet.YES_NO);
      if (confirmar !== ui.Button.YES) { e.range.setValue(false); return; }
    }
  }

  // Borrar filas existentes de esta cerrada en Casas
  var lastRowCasas = casasSheet.getLastRow();
  if (lastRowCasas > 1) {
    var datosCasas = casasSheet.getRange(2, 1, lastRowCasas - 1, 3).getValues();
    for (var i = datosCasas.length - 1; i >= 0; i--) {
      if (String(datosCasas[i][0]) === String(noTerritorio) && datosCasas[i][2] === nombreCerrada) {
        casasSheet.deleteRow(i + 2);
      }
    }
  }

  // Agregar nuevas filas en Casas
  var nuevaFila = casasSheet.getLastRow() + 1;
  var casasRows = [];
  for (var c = 0; c < numCasas; c++) {
    casasRows.push([noTerritorio, richLink ? richLink.getText() : '', nombreCerrada, identificadores[c], '']);
  }
  casasSheet.getRange(nuevaFila, 1, casasRows.length, 5).setValues(casasRows);
  if (richLink && richLink.getLinkUrl()) {
    for (var j = 0; j < numCasas; j++) {
      casasSheet.getRange(nuevaFila + j, 2).setRichTextValue(richLink);
    }
  }

  // ── Registro de Cartas: borrar filas existentes de esta cerrada ──
  for (var ri = datosReg.length - 1; ri >= 0; ri--) {
    if (String(datosReg[ri][0]) === String(noTerritorio) && datosReg[ri][2] === nombreCerrada) {
      registroSheet.deleteRow(ri + 2);
    }
  }

  // ── Registro de Cartas: insertar una fila por casa ──
  var insertaEn = registroSheet.getLastRow() + 1;
  var regRows = [];
  var ahora = new Date();
  for (var rc = 0; rc < numCasas; rc++) {
    regRows.push([noTerritorio, richLink ? richLink.getText() : '', nombreCerrada, identificadores[rc], '', '', '', '', ahora]);
  }
  registroSheet.getRange(insertaEn, 1, numCasas, 9).setValues(regRows);

  // Rich text link col B
  if (richLink && richLink.getLinkUrl()) {
    for (var rl = 0; rl < numCasas; rl++) {
      registroSheet.getRange(insertaEn + rl, 2).setRichTextValue(richLink);
    }
  }

  // Validaciones por columna (en bloque)
  var terrList = [];
  for (var t = 1; t <= 106; t++) terrList.push(String(t));
  registroSheet.getRange(insertaEn, 1, numCasas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(terrList, true).setAllowInvalid(false).build()
  );
  registroSheet.getRange(insertaEn, 5, numCasas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
  );
  registroSheet.getRange(insertaEn, 6, numCasas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
  );
  registroSheet.getRange(insertaEn, 7, numCasas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
  );
  registroSheet.getRange(insertaEn, 7, numCasas, 1).setNumberFormat('dd/MM/yyyy');
  registroSheet.getRange(insertaEn, 8, numCasas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CAPITANES, true).setAllowInvalid(false).build()
  );
  registroSheet.getRange(insertaEn, 9, numCasas, 1).setNumberFormat('dd/MM/yyyy');
  registroSheet.getRange(insertaEn, 10, numCasas, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  registroSheet.getRange(insertaEn, 10, numCasas, 1).setValue(false);
  registroSheet.getRange(insertaEn, 10, numCasas, 1).setHorizontalAlignment('center');

  // Preparar siguiente fila vacía en Registro de Cartas
  agregarFilaRegistro(ss, registroSheet.getLastRow() + 1);

  actualizarResumenFila(ss, noTerritorio);
  cachearDatos(ss);

  SpreadsheetApp.getUi().alert('✅ ' + nombreCerrada + ': ' + numCasas + ' casas guardadas correctamente.');
}

// ─── ARCHIVAR CARTA ───────────────────────────────────
function archivarCarta(ss, sheet, row) {
  var historial = ss.getSheetByName('Historial Cartas');
  var noTerritorio  = sheet.getRange(row, 1).getValue();
  var nombreCerrada = sheet.getRange(row, 3).getValue();
  var numCasa       = sheet.getRange(row, 4).getValue();
  var cartaElab     = sheet.getRange(row, 5).getValue();
  var cartaEnv      = sheet.getRange(row, 6).getValue();
  var fechaEnvio    = sheet.getRange(row, 7).getValue();
  var capitan       = sheet.getRange(row, 8).getValue();
  var fechaReg      = sheet.getRange(row, 9).getValue();
  var fechaArchivado = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  historial.appendRow([noTerritorio, nombreCerrada, numCasa, cartaElab, cartaEnv, fechaEnvio, capitan, fechaReg, fechaArchivado]);
  sheet.deleteRow(row); // Eliminar de Registro de Cartas al archivar
}

// ─── ACTUALIZAR RESUMEN FILA ──────────────────────────
function actualizarResumenFila(ss, noTerritorio) {
  var cerradasSheet = ss.getSheetByName('Cerradas');
  var resumenSheet = ss.getSheetByName('Resumen');
  var lastRowCerradas = cerradasSheet.getLastRow();
  if (lastRowCerradas < 2) return;
  var datosCerradas = cerradasSheet.getRange(2, 1, lastRowCerradas - 1, 7).getValues();
  var totalCerradas = 0, siPuede = 0, noPuede = 0, aveces = 0, totalCasas = 0;
  for (var i = 0; i < datosCerradas.length; i++) {
    if (String(datosCerradas[i][0]) !== String(noTerritorio) || !datosCerradas[i][2]) continue;
    totalCerradas++;
    totalCasas += expandirRangos(datosCerradas[i][3]).length;
    if (datosCerradas[i][4] === '✅ Sí') siPuede++;
    else if (datosCerradas[i][4] === '❌ No') noPuede++;
    else if (datosCerradas[i][4] === '⚠️ A veces') aveces++;
  }
  var lastRowResumen = resumenSheet.getLastRow();
  if (lastRowResumen < 2) return;
  var nosResumen = resumenSheet.getRange(2, 1, lastRowResumen - 1, 1).getValues();
  for (var r = 0; r < nosResumen.length; r++) {
    if (String(nosResumen[r][0]) === String(noTerritorio)) {
      resumenSheet.getRange(r + 2, 3, 1, 5).setValues([[totalCerradas, siPuede, noPuede, aveces, totalCasas]]);
      break;
    }
  }
}

// ─── EXPANDIR RANGOS ──────────────────────────────────
// Acepta número (42) → devuelve [1,2,...42]
// Acepta rangos (A101-A104, B101-B104) → devuelve ['A101','A102','A103','A104','B101',...]
function expandirRangos(valor) {
  var str = String(valor || '').trim();
  if (!str || str === '0') return [];
  if (/^\d+$/.test(str)) {
    var n = parseInt(str);
    var arr = [];
    for (var i = 1; i <= n; i++) arr.push(i);
    return arr;
  }
  var tokens = str.split(/[,;]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  var results = [];
  var re = /^([A-Za-z]+)(\d+)-([A-Za-z]*)(\d+)$/;
  for (var t = 0; t < tokens.length; t++) {
    var m = tokens[t].match(re);
    if (!m) { results.push(tokens[t]); continue; }
    var prefix = m[1];
    var numA = parseInt(m[2]);
    var numB = parseInt(m[4]);
    var width = Math.max(m[2].length, m[4].length);
    for (var k = numA; k <= numB; k++) {
      var s = String(k);
      while (s.length < width) s = '0' + s;
      results.push(prefix + s);
    }
  }
  return results;
}

// ─── CACHE ────────────────────────────────────────────
function cachearDatos(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var cache = CacheService.getScriptCache();

  var terrSheet = ss.getSheetByName('Territorios');
  var numRowsTerr = terrSheet.getDataRange().getNumRows();
  var mapaLinks = {};
  for (var k = 2; k <= numRowsTerr; k++) {
    var no = terrSheet.getRange(k, 1).getValue().toString();
    if (!no || no === '0') continue;
    var richCell = terrSheet.getRange(k, 2).getRichTextValue();
    mapaLinks[no] = {
      url: richCell ? (richCell.getLinkUrl() || '') : '',
      texto: richCell ? (richCell.getText() || '') : ''
    };
  }
  cache.put('mapaLinks', JSON.stringify(mapaLinks), 21600);

  var casasSheet = ss.getSheetByName('Casas');
  var numRowsCasas = casasSheet.getDataRange().getNumRows();
  var mapaCasas = {};
  for (var m = 2; m <= numRowsCasas; m++) {
    var cerrada = casasSheet.getRange(m, 3).getValue().toString();
    var casaVal = casasSheet.getRange(m, 4).getValue();
    var casa = casaVal !== '' && casaVal !== null ? String(casaVal) : '';
    if (!cerrada || !casa) continue;
    if (!mapaCasas[cerrada]) mapaCasas[cerrada] = [];
    if (mapaCasas[cerrada].indexOf(casa) === -1) mapaCasas[cerrada].push(casa);
  }
  cache.put('mapaCasas', JSON.stringify(mapaCasas), 21600);
  Logger.log('Cache actualizado.');
}

function obtenerCacheLinks() {
  var cache = CacheService.getScriptCache();
  var str = cache.get('mapaLinks');
  if (str) return JSON.parse(str);
  cachearDatos();
  return JSON.parse(cache.get('mapaLinks') || '{}');
}

function obtenerCacheCasas() {
  var cache = CacheService.getScriptCache();
  var str = cache.get('mapaCasas');
  if (str) return JSON.parse(str);
  cachearDatos();
  return JSON.parse(cache.get('mapaCasas') || '{}');
}

// ─── AGREGAR FILA REGISTRO ────────────────────────────
function agregarFilaRegistro(ss, fila) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');
  var cerradas = ss.getSheetByName('Cerradas');

  // Obtener territorios 1-106 fijos y cerradas desde datos
  var territorios = [];
  for (var t = 1; t <= 106; t++) territorios.push(String(t));

  var nombresCerradas = [];
  try {
    var lastRowCerradas = cerradas.getLastRow();
    if (lastRowCerradas > 1) {
      for (var i = 2; i <= lastRowCerradas; i++) {
        var nombre = cerradas.getRange(i, 3).getValue();
        if (nombre && nombresCerradas.indexOf(nombre) === -1) nombresCerradas.push(nombre);
      }
    }
  } catch(err) {
    Logger.log('Error leyendo cerradas: ' + err);
  }

  if (territorios.length > 0) {
    sheet.getRange(fila, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(territorios, true).setAllowInvalid(false).build()
    );
  }
  if (nombresCerradas.length > 0) {
    sheet.getRange(fila, 3).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(nombresCerradas, true).setAllowInvalid(false).build()
    );
  }
  sheet.getRange(fila, 10).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sheet.getRange(fila, 10).setValue(false);
  sheet.getRange(fila, 10).setHorizontalAlignment('center');
}

// =====================================================
// FUNCIONES DE SETUP (ejecutar manualmente si es necesario)
// =====================================================

// Configura todo desde cero — ejecutar UNA VEZ al iniciar
function setupInicial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Cerradas: dropdowns y checkboxes
  var cerradasSheet = ss.getSheetByName('Cerradas');
  // Col E: ¿Se puede pasar?
  cerradasSheet.getRange('E2:E108').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No', '⚠️ A veces'], true).setAllowInvalid(false).build()
  );
  // Col F: ¿Cuenta con Buzón?
  cerradasSheet.getRange('F2:F108').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No tiene buzón'], true).setAllowInvalid(false).build()
  );
  // Col D: nota de ayuda en el encabezado
  cerradasSheet.getRange('D1').setNote('Escribe un número simple (ej: 42)\no rangos alfanuméricos separados por comas:\nEj: A101-A104, A201-A204, B101-B104, B201-B204');

  // Col H: checkboxes Guardar
  cerradasSheet.getRange('H1').setValue('💾 Guardar').setFontWeight('bold').setHorizontalAlignment('center');
  cerradasSheet.getRange('H2:H108').setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  cerradasSheet.getRange('H2:H108').setValue(false);
  cerradasSheet.getRange('H2:H108').setHorizontalAlignment('center');

  // Registro de Cartas: encabezados + primeras 5 filas
  var registro = ss.getSheetByName('Registro de Cartas');
  registro.getRange('I1').setValue('Fecha de Registro');
  registro.getRange('J1').setValue('📁 Archivar').setFontWeight('bold').setHorizontalAlignment('center');
  for (var r = 2; r <= 6; r++) { agregarFilaRegistro(ss, r); }

  // Historial Cartas: encabezados
  var historial = ss.getSheetByName('Historial Cartas');
  historial.getRange(1, 1, 1, 9).setValues([[
    'No. Territorio', 'Nombre Cerrada', '# Casa',
    'Carta Elaborada', 'Carta Enviada', 'Fecha Envío',
    'Capitán', 'Fecha de Registro', 'Fecha Archivado'
  ]]).setFontWeight('bold').setBackground('#434343').setFontColor('#FFFFFF');

  // Resumen: fila TOTAL
  var resumen = ss.getSheetByName('Resumen');
  resumen.getRange(108, 1).setValue('TOTAL').setFontWeight('bold');
  for (var col = 3; col <= 7; col++) {
    var letra = String.fromCharCode(64 + col);
    resumen.getRange(108, col).setFormula('=SUM(' + letra + '2:' + letra + '107)').setFontWeight('bold');
  }

  // Cache
  cachearDatos(ss);

  // Resumen completo
  actualizarResumenCompleto(ss);

  Logger.log('✅ Setup inicial completado.');
}

// Limpia FALSE de col J y restaura checkboxes
function limpiarFalseArchivar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 10, lastRow - 1, 1).clearContent().clearDataValidations();
  sheet.getRange(2, 10, lastRow - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sheet.getRange(2, 10, lastRow - 1, 1).setValue(false);
  sheet.getRange(2, 10, lastRow - 1, 1).setHorizontalAlignment('center');
  Logger.log('Checkboxes Archivar restaurados.');
}

// Repara TODOS los dropdowns y checkboxes de Registro de Cartas
function repararDropdownsRegistro() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');
  var cerradas = ss.getSheetByName('Cerradas');
  var lastRow = Math.max(sheet.getLastRow(), 6);

  // Obtener territorios y cerradas disponibles
  var territorios = [];
  for (var t = 1; t <= 106; t++) territorios.push(String(t));
  var nombresCerradas = [];
  try {
    var lastRowC = cerradas.getLastRow();
    for (var i = 2; i <= lastRowC; i++) {
      var nombre = cerradas.getRange(i, 3).getValue();
      if (nombre && nombresCerradas.indexOf(nombre) === -1) nombresCerradas.push(nombre);
    }
  } catch(err) {}

  for (var r = 2; r <= lastRow; r++) {
    // Col A: No. Territorio
    sheet.getRange(r, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(territorios, true).setAllowInvalid(false).build()
    );
    // Col C: Nombre Cerrada
    if (nombresCerradas.length > 0) {
      sheet.getRange(r, 3).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(nombresCerradas, true).setAllowInvalid(false).build()
      );
    }
    // Col E: Carta Elaborada
    sheet.getRange(r, 5).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
    );
    // Col F: Carta Enviada
    sheet.getRange(r, 6).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
    );
    // Col G: Fecha Envío
    sheet.getRange(r, 7).setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
    );
    sheet.getRange(r, 7).setNumberFormat('dd/MM/yyyy');
    // Col H: Capitán
    sheet.getRange(r, 8).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(CAPITANES, true).setAllowInvalid(false).build()
    );
    // Col I: Fecha Registro
    sheet.getRange(r, 9).setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
    );
    sheet.getRange(r, 9).setNumberFormat('dd/MM/yyyy');
    // Col J: Checkbox Archivar
    sheet.getRange(r, 10).clearContent().clearDataValidations();
    sheet.getRange(r, 10).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    sheet.getRange(r, 10).setValue(false);
    sheet.getRange(r, 10).setHorizontalAlignment('center');
  }

  // Encabezados
  sheet.getRange('I1').setValue('Fecha de Registro');
  sheet.getRange('J1').setValue('📁 Archivar').setFontWeight('bold').setHorizontalAlignment('center');

  Logger.log('✅ Dropdowns y checkboxes reparados en ' + (lastRow - 1) + ' filas.');
}

// Recalcula el Resumen para todos los territorios
function actualizarResumenCompleto(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var cerradasSheet = ss.getSheetByName('Cerradas');
  var resumenSheet = ss.getSheetByName('Resumen');
  var lastRowCerradas = cerradasSheet.getLastRow();
  var lastRowResumen = resumenSheet.getLastRow();
  if (lastRowCerradas < 2 || lastRowResumen < 2) return;
  var datosCerradas = cerradasSheet.getRange(2, 1, lastRowCerradas - 1, 7).getValues();
  var nosResumen = resumenSheet.getRange(2, 1, lastRowResumen - 1, 1).getValues();
  for (var r = 0; r < nosResumen.length; r++) {
    var noTerritorio = nosResumen[r][0];
    var totalCerradas = 0, siPuede = 0, noPuede = 0, aveces = 0, totalCasas = 0;
    for (var i = 0; i < datosCerradas.length; i++) {
      if (String(datosCerradas[i][0]) !== String(noTerritorio) || !datosCerradas[i][2]) continue;
      totalCerradas++;
      totalCasas += expandirRangos(datosCerradas[i][3]).length;
      if (datosCerradas[i][4] === '✅ Sí') siPuede++;
      else if (datosCerradas[i][4] === '❌ No') noPuede++;
      else if (datosCerradas[i][4] === '⚠️ A veces') aveces++;
    }
    resumenSheet.getRange(r + 2, 3, 1, 5).setValues([[totalCerradas, siPuede, noPuede, aveces, totalCasas]]);
  }
  // Asegurar que la fila TOTAL (108) tenga las fórmulas correctas
  resumenSheet.getRange(108, 1).setValue('TOTAL').setFontWeight('bold');
  for (var tc = 3; tc <= 7; tc++) {
    var letraTotal = String.fromCharCode(64 + tc);
    resumenSheet.getRange(108, tc).setFormula('=SUM(' + letraTotal + '2:' + letraTotal + '107)').setFontWeight('bold');
  }
  Logger.log('Resumen actualizado completo.');
}

// Repara las fórmulas de totales en la fila 108 del Resumen
function repararFilaTotal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resumen = ss.getSheetByName('Resumen');
  resumen.getRange(108, 1).setValue('TOTAL').setFontWeight('bold');
  for (var col = 3; col <= 7; col++) {
    var letra = String.fromCharCode(64 + col);
    resumen.getRange(108, col).setFormula('=SUM(' + letra + '2:' + letra + '107)').setFontWeight('bold');
  }
  SpreadsheetApp.getUi().alert('✅ Fila TOTAL del Resumen reparada.');
}

// ─── CARGAR DATOS REALES TERRITORIO 106 ───────────────
// Ejecutar UNA VEZ para pre-cargar las 3 cerradas de Lomas de Santander
function cargarLotesEjemplo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cerradas = ss.getSheetByName('Cerradas');

  var rangos = 'A101-A104, A201-A204, A301-A304, A401-A404, A501-A504, B101-B104, B201-B204, B301-B304, B401-B404, B501-B504, C101-C104, C201-C204, C301-C304, C401-C404, C501-C504';
  var direccion = 'Mz 038, Lomas de Coacalco, sección Bosques, 55736 San Francisco Coacalco, Méx.';

  var entradas = [
    [106, '', 'Lomas de Santander No 3', rangos, '', '', direccion],
    [106, '', 'Lomas de Santander No 5', rangos, '', '', direccion],
    [106, '', 'Lomas de Santander No 7', rangos, '', '', direccion]
  ];

  // Verificar que no existan ya
  var lastRow = cerradas.getLastRow();
  if (lastRow > 1) {
    var existentes = cerradas.getRange(2, 3, lastRow - 1, 1).getValues();
    for (var e = 0; e < existentes.length; e++) {
      if (String(existentes[e][0]).indexOf('Lomas de Santander') !== -1) {
        SpreadsheetApp.getUi().alert('⚠️ Ya existen entradas de Lomas de Santander. Operación cancelada para evitar duplicados.');
        return;
      }
    }
  }

  var nuevaFila = cerradas.getLastRow() + 1;
  cerradas.getRange(nuevaFila, 1, entradas.length, 7).setValues(entradas);
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setValue(false);
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setHorizontalAlignment('center');

  SpreadsheetApp.getUi().alert(
    '✅ 3 cerradas de Lomas de Santander cargadas en territorio 106.\n\n' +
    'Ve a la hoja Cerradas, llena ¿Se puede pasar? y ¿Cuenta con Buzón?\n' +
    'y luego marca el checkbox 💾 Guardar en cada fila para generar las 60 casas.'
  );
}

// ─── CARGAR DATOS REALES: MURCIA (T25) Y VALENCIA (T20) ───────────────
// Ejecutar UNA VEZ para cargar Lomas de Murcia No 2 y Lomas de Valencia 3
function cargarLotesMurciaValencia() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cerradas = ss.getSheetByName('Cerradas');

  // Verificar duplicados
  var lastRow = cerradas.getLastRow();
  if (lastRow > 1) {
    var existentes = cerradas.getRange(2, 3, lastRow - 1, 1).getValues();
    for (var e = 0; e < existentes.length; e++) {
      var nombre = String(existentes[e][0]);
      if (nombre.indexOf('Lomas de Murcia') !== -1 || nombre.indexOf('Lomas de Valencia') !== -1) {
        SpreadsheetApp.getUi().alert('⚠️ Ya existen entradas de Murcia o Valencia. Operación cancelada para evitar duplicados.');
        return;
      }
    }
  }

  var dirMurcia  = 'Mz3 Lt2, Col. Lomas de Coacalco sección Bosques, Coacalco, C.P. 55736';
  var dirValencia = 'Mz10 Lt9, Col. Lomas de Coacalco sección Bosques, Coacalco, C.P. 55736';

  // Territorio 25 — Lomas de Murcia No 2 (57 deptos)
  // A: 20 deptos, B: 18 (sin B104 y B201), C: 19 (sin C204)
  var rangosMurcia =
    'A101-A104, A201-A204, A301-A304, A401-A404, A501-A504, ' +
    'B101-B103, B202-B204, B301-B304, B401-B404, B501-B504, ' +
    'C101-C104, C201-C203, C301-C304, C401-C404, C501-C504';

  // Territorio 20 — Lomas de Valencia 3 (54 deptos)
  // A: 14 deptos, B: 20 deptos, C: 20 deptos
  var rangosValencia =
    'A103-A104, A201-A204, A301-A304, A401, A403, A501, A503, ' +
    'B101-B104, B201-B204, B301-B304, B401-B404, B501-B504, ' +
    'C101-C104, C201-C204, C301-C304, C401-C404, C501-C504';

  var entradas = [
    [25, '', 'Lomas de Murcia No 2 Mz3 Lt2',  rangosMurcia,   '', '', dirMurcia],
    [20, '', 'Lomas de Valencia 3 Mz10 Lt9',   rangosValencia, '', '', dirValencia]
  ];

  var nuevaFila = cerradas.getLastRow() + 1;
  cerradas.getRange(nuevaFila, 1, entradas.length, 7).setValues(entradas);
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setValue(false);
  cerradas.getRange(nuevaFila, 8, entradas.length, 1).setHorizontalAlignment('center');

  SpreadsheetApp.getUi().alert(
    '✅ 2 cerradas cargadas:\n' +
    '• Territorio 25: Lomas de Murcia No 2 (57 deptos)\n' +
    '• Territorio 20: Lomas de Valencia 3 (54 deptos)\n\n' +
    'Ve a Cerradas, llena ¿Se puede pasar? y ¿Cuenta con Buzón?\n' +
    'y marca 💾 Guardar en cada fila para generar las casas.'
  );
}
