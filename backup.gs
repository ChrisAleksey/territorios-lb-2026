// =====================================================
// SCRIPT MAESTRO: Territorios LB Carta Postal
// Hoja: 1Ms08XH2pbE2zMJzwBDnbS2-AC7Tbs9EKMHla0U77RHg
// =====================================================

// ─── CONSTANTES ───────────────────────────────────────
var SS_ID = '1Ms08XH2pbE2zMJzwBDnbS2-AC7Tbs9EKMHla0U77RHg';

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
// Se ejecuta automáticamente al abrir la hoja
function onOpen() {
  configurarCheckboxesGuardar();
}

// ─── ON EDIT ──────────────────────────────────────────
// Se ejecuta automáticamente al editar cualquier celda
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();
  var col = e.range.getColumn();
  var row = e.range.getRow();
  if (row < 2) return;

  // ── CERRADAS: checkbox Guardar en columna H ──
  if (sheetName === 'Cerradas' && col === 8) {
    if (e.value === 'TRUE') {
      guardarCerradaFila(e, sheet, row);
      return;
    }
    // Restaurar checkbox si se borró
    if (e.value === '' || e.value === undefined) {
      sheet.getRange(row, 8).insertCheckboxes();
      sheet.getRange(row, 8).setValue(false);
      sheet.getRange(row, 8).setHorizontalAlignment('center');
      return;
    }
  }

  // ── REGISTRO DE CARTAS: restaurar checkbox Archivar en col J si se borró ──
  if (sheetName === 'Registro de Cartas' && col === 10) {
    if (e.value === '' || e.value === undefined) {
      var checkJ2 = sheet.getRange(row, 10);
      checkJ2.insertCheckboxes();
      checkJ2.setValue(false);
      checkJ2.setHorizontalAlignment('center');
      return;
    }
  }

  // ── REGISTRO DE CARTAS ──
  if (sheetName === 'Registro de Cartas') {

    var ss2 = e.source;
    var cerradasSheet2 = ss2.getSheetByName('Cerradas');
    var lastRowCerradas2 = cerradasSheet2.getLastRow();
    var datosCerradas2 = lastRowCerradas2 > 1 ? cerradasSheet2.getRange(2, 1, lastRowCerradas2 - 1, 4).getValues() : [];

    // Col A (No. Territorio) → filtrar cerradas de ese territorio en col C + auto-link + fecha
    if (col === 1 && e.value !== '') {
      var noTerr = e.value.toString();

      // Auto-link desde cache
      var mapaLinks = obtenerCacheLinks();
      var info = mapaLinks[noTerr];
      if (info && info.url) {
        var rt = SpreadsheetApp.newRichTextValue().setText(info.texto).setLinkUrl(info.url).build();
        sheet.getRange(row, 2).setRichTextValue(rt);
      }

      // Auto-fecha de registro en col I
      sheet.getRange(row, 9).setValue(new Date());
      sheet.getRange(row, 9).setNumberFormat('dd/MM/yyyy');

      // Checkbox Archivar en col J (dinámico)
      var checkJ = sheet.getRange(row, 10);
      checkJ.insertCheckboxes();
      checkJ.setValue(false);
      checkJ.setHorizontalAlignment('center');

      // Dropdowns dinámicos en esta fila
      // Col E: Carta Elaborada
      sheet.getRange(row, 5).clearDataValidations();
      sheet.getRange(row, 5).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
      );
      // Col F: Carta Enviada
      sheet.getRange(row, 6).clearDataValidations();
      sheet.getRange(row, 6).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
      );
      // Col G: Fecha Envío con calendario
      sheet.getRange(row, 7).clearDataValidations();
      sheet.getRange(row, 7).setDataValidation(
        SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
      );
      sheet.getRange(row, 7).setNumberFormat('dd/MM/yyyy');
      // Col H: Capitán
      sheet.getRange(row, 8).clearDataValidations();
      sheet.getRange(row, 8).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(CAPITANES, true).setAllowInvalid(false).build()
      );

      // Filtrar cerradas de ese territorio para col C
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
        var reglaC2 = SpreadsheetApp.newDataValidation()
          .requireValueInList(cerradasFiltradas, true)
          .setAllowInvalid(false).build();
        sheet.getRange(row, 3).setDataValidation(reglaC2);
      }
    }

    // Col C (Nombre Cerrada) → auto-llenar Territorio + Link si está vacío + filtrar casas en col D
    if (col === 3 && e.value !== '') {
      var nombreCerrada2 = e.value.toString();

      // Buscar territorio de esta cerrada en Cerradas
      var noTerrEncontrado = '';
      for (var j = 0; j < datosCerradas2.length; j++) {
        if (datosCerradas2[j][2] === nombreCerrada2) {
          noTerrEncontrado = String(datosCerradas2[j][0]);
          break;
        }
      }

      // Si col A está vacía, auto-llenar territorio y link
      if (noTerrEncontrado && sheet.getRange(row, 1).getValue() === '') {
        sheet.getRange(row, 1).setValue(Number(noTerrEncontrado));
        var mapaLinks2 = obtenerCacheLinks();
        var info2 = mapaLinks2[noTerrEncontrado];
        if (info2 && info2.url) {
          var rt2 = SpreadsheetApp.newRichTextValue().setText(info2.texto).setLinkUrl(info2.url).build();
          sheet.getRange(row, 2).setRichTextValue(rt2);
        }
        // Auto-fecha de registro en col I
        sheet.getRange(row, 9).setValue(new Date());
        sheet.getRange(row, 9).setNumberFormat('dd/MM/yyyy');
      }

      // Filtrar casas de esa cerrada para col D
      var mapaCasas = obtenerCacheCasas();
      sheet.getRange(row, 4).clearDataValidations();
      sheet.getRange(row, 4).clearContent();
      var casasFiltradas = mapaCasas[nombreCerrada2] || [];
      if (casasFiltradas.length > 0) {
        var reglaD = SpreadsheetApp.newDataValidation()
          .requireValueInList(casasFiltradas, true)
          .setAllowInvalid(false).build();
        sheet.getRange(row, 4).setDataValidation(reglaD);
      }
    }

    // Col J (checkbox Archivar) → archivar en Historial Cartas
    if (col === 10 && e.value === 'TRUE') {
      archivarCarta(e.source, sheet, row);
      e.range.setValue(false);
    }

    // Si se llenó col A en la última fila disponible → agregar siguiente fila
    if (col === 1 && e.value !== '') {
      var lastRowConDatos = sheet.getLastRow();
      // Si esta fila es la última con dropdown en col A, agregar una más
      var nextRow = lastRowConDatos + 1;
      var nextCell = sheet.getRange(nextRow, 1);
      if (nextCell.getDataValidation() === null) {
        agregarFilasRegistro(e.source, nextRow, nextRow);
      }
    }
  }
}

// ─── GUARDAR CERRADA FILA ─────────────────────────────
// Cuando se marca el checkbox en columna H de Cerradas
function guardarCerradaFila(e, sheet, row) {
  var ss = e.source;
  var casasSheet = ss.getSheetByName('Casas');

  var datos = sheet.getRange(row, 1, 1, 7).getValues()[0];
  var richLink = sheet.getRange(row, 2).getRichTextValue();

  var noTerritorio = datos[0];
  var nombreCerrada = datos[2];
  var numCasas = parseInt(datos[3]) || 0;

  // Desmarcar checkbox siempre
  e.range.setValue(false);

  if (!nombreCerrada || numCasas <= 0) {
    SpreadsheetApp.getUi().alert('⚠️ Falta el nombre de la cerrada o el número de casas.');
    return;
  }

  // Borrar filas existentes de esta cerrada en Casas (de atrás hacia adelante)
  var lastRowCasas = casasSheet.getLastRow();
  if (lastRowCasas > 1) {
    var datosCasas = casasSheet.getRange(2, 1, lastRowCasas - 1, 3).getValues();
    for (var i = datosCasas.length - 1; i >= 0; i--) {
      if (String(datosCasas[i][0]) === String(noTerritorio) && datosCasas[i][2] === nombreCerrada) {
        casasSheet.deleteRow(i + 2);
      }
    }
  }

  // Agregar nuevas filas al final
  var nuevaFila = casasSheet.getLastRow() + 1;
  var casasRows = [];
  for (var c = 1; c <= numCasas; c++) {
    casasRows.push([noTerritorio, richLink ? richLink.getText() : '', nombreCerrada, c, '']);
  }
  casasSheet.getRange(nuevaFila, 1, casasRows.length, 5).setValues(casasRows);

  // Aplicar hyperlinks en columna B
  if (richLink && richLink.getLinkUrl()) {
    for (var j = 0; j < numCasas; j++) {
      casasSheet.getRange(nuevaFila + j, 2).setRichTextValue(richLink);
    }
  }

  // Actualizar Resumen
  actualizarResumenFila(ss, noTerritorio);

  // Actualizar cache
  cachearDatos(ss);

  SpreadsheetApp.getUi().alert('✅ ' + nombreCerrada + ': ' + numCasas + ' casas guardadas correctamente.');
}

// ─── ARCHIVAR CARTA ───────────────────────────────────
// Copia la fila de Registro de Cartas a Historial Cartas
function archivarCarta(ss, sheet, row) {
  var historial = ss.getSheetByName('Historial Cartas');

  // Configurar encabezados si la hoja está vacía
  if (historial.getLastRow() === 0) {
    historial.appendRow([
      'No. Territorio', 'Nombre Cerrada', '# Casa',
      'Carta Elaborada', 'Carta Enviada', 'Fecha Envío',
      'Capitán', 'Fecha de Registro', 'Fecha Archivado'
    ]);
    // Formato encabezados
    historial.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#434343').setFontColor('#FFFFFF');
  }

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
}

// ─── ACTUALIZAR RESUMEN FILA ──────────────────────────
// Actualiza los conteos del Resumen para un territorio específico
function actualizarResumenFila(ss, noTerritorio) {
  var cerradasSheet = ss.getSheetByName('Cerradas');
  var resumenSheet = ss.getSheetByName('Resumen');

  var lastRowCerradas = cerradasSheet.getLastRow();
  if (lastRowCerradas < 2) return;

  var datosCerradas = cerradasSheet.getRange(2, 1, lastRowCerradas - 1, 7).getValues();

  var totalCerradas = 0;
  var siPuede = 0;
  var noPuede = 0;
  var aveces = 0;
  var totalCasas = 0;

  for (var i = 0; i < datosCerradas.length; i++) {
    if (String(datosCerradas[i][0]) !== String(noTerritorio)) continue;
    if (!datosCerradas[i][2]) continue; // sin nombre de cerrada
    totalCerradas++;
    totalCasas += parseInt(datosCerradas[i][3]) || 0;
    var sePuede = datosCerradas[i][4];
    if (sePuede === '✅ Sí') siPuede++;
    else if (sePuede === '❌ No') noPuede++;
    else if (sePuede === '⚠️ A veces') aveces++;
  }

  // Encontrar fila del territorio en Resumen
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

// ─── ACTUALIZAR RESUMEN COMPLETO ──────────────────────
// Recalcula el Resumen para todos los territorios
function actualizarResumenCompleto() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
      if (String(datosCerradas[i][0]) !== String(noTerritorio)) continue;
      if (!datosCerradas[i][2]) continue;
      totalCerradas++;
      totalCasas += parseInt(datosCerradas[i][3]) || 0;
      var sePuede = datosCerradas[i][4];
      if (sePuede === '✅ Sí') siPuede++;
      else if (sePuede === '❌ No') noPuede++;
      else if (sePuede === '⚠️ A veces') aveces++;
    }

    resumenSheet.getRange(r + 2, 3, 1, 5).setValues([[totalCerradas, siPuede, noPuede, aveces, totalCasas]]);
  }

  // Fila TOTAL siempre en fila 108
  var filaTotal = 108;
  resumenSheet.getRange(filaTotal, 1).setValue('TOTAL');
  resumenSheet.getRange(filaTotal, 1).setFontWeight('bold');
  for (var col = 3; col <= 7; col++) {
    var colLetra = String.fromCharCode(64 + col);
    resumenSheet.getRange(filaTotal, col).setFormula('=SUM(' + colLetra + '2:' + colLetra + '107)');
    resumenSheet.getRange(filaTotal, col).setFontWeight('bold');
  }

  Logger.log('Resumen actualizado completo.');
}

// ─── CACHE ────────────────────────────────────────────
// Guarda en memoria temporal los links de territorios y casas por cerrada
function cachearDatos(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var cache = CacheService.getScriptCache();

  // Links de territorios
  var terrSheet = ss.getSheetByName('Territorios');
  var terrData = terrSheet.getDataRange();
  var numRowsTerr = terrData.getNumRows();
  var mapaLinks = {};
  for (var k = 2; k <= numRowsTerr; k++) {
    var no = terrSheet.getRange(k, 1).getValue().toString();
    if (no === '' || no === '0') continue;
    var richCell = terrSheet.getRange(k, 2).getRichTextValue();
    mapaLinks[no] = {
      url: richCell ? (richCell.getLinkUrl() || '') : '',
      texto: richCell ? (richCell.getText() || '') : ''
    };
  }
  cache.put('mapaLinks', JSON.stringify(mapaLinks), 21600);

  // Casas por cerrada (para dropdown cascada en Registro de Cartas)
  var casasSheet = ss.getSheetByName('Casas');
  var casasData = casasSheet.getDataRange();
  var numRowsCasas = casasData.getNumRows();
  var mapaCasas = {};
  for (var m = 2; m <= numRowsCasas; m++) {
    var cerrada = casasSheet.getRange(m, 3).getValue().toString();
    var casa = casasSheet.getRange(m, 4).getValue().toString();
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
  str = cache.get('mapaLinks');
  return str ? JSON.parse(str) : {};
}

function obtenerCacheCasas() {
  var cache = CacheService.getScriptCache();
  var str = cache.get('mapaCasas');
  if (str) return JSON.parse(str);
  cachearDatos();
  str = cache.get('mapaCasas');
  return str ? JSON.parse(str) : {};
}

// ─── SETUP INICIAL ────────────────────────────────────
// Ejecutar UNA VEZ para configurar checkboxes, dropdowns y cache
function resetRegistroCartas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  configurarDropdownsRegistro(ss);
}

function configurarHistorialCartas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var historial = ss.getSheetByName('Historial Cartas');

  // Limpiar fila 1 y poner encabezados
  historial.getRange(1, 1, 1, 9).clearContent().clearFormat();
  historial.getRange(1, 1, 1, 9).setValues([[
    'No. Territorio', 'Nombre Cerrada', '# Casa',
    'Carta Elaborada', 'Carta Enviada', 'Fecha Envío',
    'Capitán', 'Fecha de Registro', 'Fecha Archivado'
  ]]);
  historial.getRange(1, 1, 1, 9)
    .setFontWeight('bold')
    .setBackground('#434343')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');

  // Formato fechas en cols F, H, I
  historial.getRange('F2:F1000').setNumberFormat('dd/MM/yyyy');
  historial.getRange('H2:H1000').setNumberFormat('dd/MM/yyyy');
  historial.getRange('I2:I1000').setNumberFormat('dd/MM/yyyy HH:mm');

  Logger.log('Historial Cartas configurado correctamente.');
}

function setupInicial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  configurarCheckboxesGuardar();
  configurarDropdownsRegistro(ss);
  cachearDatos(ss);

  Logger.log('✅ Setup inicial completado correctamente.');
}

// Configura los checkboxes en columna H de Cerradas
function configurarCheckboxesGuardar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cerradasSheet = ss.getSheetByName('Cerradas');

  var header = cerradasSheet.getRange('H1');
  header.setValue('💾 Guardar');
  header.setFontWeight('bold');
  header.setHorizontalAlignment('center');

  var checkRange = cerradasSheet.getRange('H2:H107');
  checkRange.insertCheckboxes();
  checkRange.setValue(false);
  checkRange.setHorizontalAlignment('center');

  Logger.log('Checkboxes configurados en Cerradas H2:H107.');
}

// Configura los dropdowns de Registro de Cartas
function configurarDropdownsRegistro(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');

  // Limpiar todo
  sheet.getRange('A2:J1000').clearDataValidations();
  sheet.getRange('A2:J1000').clearContent();

  // Encabezados especiales
  sheet.getRange('I1').setValue('Fecha de Registro');
  sheet.getRange('J1').setValue('📁 Archivar');
  sheet.getRange('J1').setFontWeight('bold');
  sheet.getRange('J1').setHorizontalAlignment('center');

  // Pre-cargar primeras 5 filas con dropdowns listos
  agregarFilasRegistro(ss, 2, 5);

  Logger.log('Dropdowns de Registro de Cartas configurados.');
}

// Agrega dropdowns en un rango de filas de Registro de Cartas
function agregarFilasRegistro(ss, filaInicio, filaFin) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registro de Cartas');
  var cerradas = ss.getSheetByName('Cerradas');

  for (var r = filaInicio; r <= filaFin; r++) {
    // Col A: No. Territorio
    sheet.getRange(r, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(cerradas.getRange('A2:A200'), true)
        .setAllowInvalid(false).build()
    );
    // Col C: Nombre Cerrada
    sheet.getRange(r, 3).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(cerradas.getRange('C2:C200'), true)
        .setAllowInvalid(false).build()
    );
    // Col E: Carta Elaborada
    sheet.getRange(r, 5).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
    );
    // Col F: Carta Enviada
    sheet.getRange(r, 6).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['✅ Sí', '❌ No'], true).setAllowInvalid(false).build()
    );
    // Col G: Fecha Envío con calendario
    sheet.getRange(r, 7).setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
    );
    sheet.getRange(r, 7).setNumberFormat('dd/MM/yyyy');
    // Col H: Capitán
    sheet.getRange(r, 8).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(CAPITANES, true).setAllowInvalid(false).build()
    );
    // Col I: Fecha de Registro con calendario
    sheet.getRange(r, 9).setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build()
    );
    sheet.getRange(r, 9).setNumberFormat('dd/MM/yyyy');
    // Col J: Checkbox Archivar
    sheet.getRange(r, 10).insertCheckboxes();
    sheet.getRange(r, 10).setValue(false);
    sheet.getRange(r, 10).setHorizontalAlignment('center');
  }
}
