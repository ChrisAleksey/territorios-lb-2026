// =========================================================================
// 1. FUNCIÓN PRINCIPAL (ONEDIT)
// =========================================================================

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var nombreHoja = sheet.getName();
  var row = range.getRow();
  var col = range.getColumn();
  // Solo ejecutar en la hoja de Territorios por Lugares de Encuentro
  if (e.source.getId() !== 
  '1qYCSdwrFM297CIBivOkUHWSdNG6Edv50Hy8Ssct0T6c') return;
  
  var colEstado = 3;   // Columna C
  var colCapitan = 5;  // Columna E 
  var colFechaPred = 6;// Columna F 
  var colArchivar = 7; // Columna G
  var hojaHistorialNombre = "HISTORIAL GLOBAL";

  // FILTROS RÁPIDOS
  if (nombreHoja === hojaHistorialNombre || nombreHoja === "Home" || nombreHoja === "Resumen General" || nombreHoja === "Hoja 3" || nombreHoja === "S-13" || row < 2) return;

  // ========================================================
  // CASO 1: ASIGNACIÓN Y LIMPIEZA AUTOMÁTICA DE FECHA
  // ========================================================
  if (col === colCapitan) {
    var valorNuevo = e.value; 
    var celdaFecha = sheet.getRange(row, colFechaPred);
    
    if (valorNuevo !== undefined && valorNuevo !== "" && celdaFecha.getValue() === "") {
      celdaFecha.setValue(new Date());
    } 
    else if (valorNuevo === undefined || valorNuevo === "") {
      celdaFecha.clearContent();
    }
    return;
  }

  // ========================================================
  // CASO 2: CAMBIO DE ESTADO
  // ========================================================
  if (col === colEstado) {
    actualizarSiguienteTerritorio_(sheet);
    return;
  }

  // ========================================================
  // CASO 3: CHECKBOX ARCHIVAR
  // ========================================================
  var valorCasilla = range.getValue();
  var estaMarcada = (valorCasilla === true || valorCasilla === "TRUE" || valorCasilla === "true" || valorCasilla === "VERDADERO");

  if (col === colArchivar && estaMarcada) {
    
    limpiarAlerta_(sheet); // Limpia la alerta vieja AL INSTANTE
    sheet.autoResizeRows(row, 1);

    var datosFila      = sheet.getRange(row, 1, 1, 7).getValues()[0];
    var numTerritorio  = datosFila[0];
    var estado         = datosFila[2];
    var notas          = datosFila[3];
    var capitan        = datosFila[4];
    var fechaPred      = datosFila[5]; 
    var lugarEncuentro = nombreHoja;

    // VALIDACIÓN ESTRICTA
    var errores = [];
    if (!estado || estado === "" || estado.toString().indexOf("Sin trabajar") !== -1)
      errores.push("Estado inválido");
    if (!capitan || capitan === "")
      errores.push("Falta Capitán");
    if (!fechaPred || fechaPred === "")
      errores.push("Falta Fecha");
    if (estado && estado.toString().indexOf("Parcial") !== -1 && (!notas || notas === ""))
      errores.push("Faltan Notas");

    // 🔴 SI HAY ERRORES: Mostrar en la celda J y salir
    if (errores.length > 0) {
      mostrarAlerta_(sheet, "⚠️ " + errores.join(" · "));
      range.setValue(false); 
      return;
    }

    // GUARDAR EN HISTORIAL
    var hojaHistorial   = e.source.getSheetByName(hojaHistorialNombre);
    var fechaHoy        = new Date();
    var fechaCompletado = (estado.toString().indexOf("Completo") !== -1) ? fechaPred : "";

    hojaHistorial.insertRowAfter(1);
    sheet.getRange(row, 2).copyTo(hojaHistorial.getRange(2, 2)); 
    hojaHistorial.getRange(2, 1).setValue(numTerritorio);
    
    hojaHistorial.getRange(2, 3, 1, 7).setValues([[lugarEncuentro, estado, notas, capitan, fechaPred, fechaCompletado, fechaHoy]]);

    // LIMPIAR O ACTUALIZAR HOJA ORIGINAL
    if (estado.toString().indexOf("Parcial") !== -1) {
      sheet.getRange(row, 5, 1, 2).clearContent(); 
      sheet.getRange(row, 7).setValue(false); 
    } else {
      marcarRecientementeCompletado_(sheet, row);
      SpreadsheetApp.flush(); 
      reiniciarRondaSiTerminada_(sheet);
    }

    actualizarSiguienteTerritorio_(sheet);
    
    // 🟢 SI ES ÉXITO: Mostrar en la celda J
    mostrarAlerta_(sheet, "✅ Territorio " + numTerritorio + " archivado correctamente");
  }
}

// =========================================================================
// 2. FUNCIONES AUXILIARES
// =========================================================================

function mostrarAlerta_(sheet, mensaje) {
  sheet.getRange("J4")
       .setValue("🔔 Alertas del sistema")
       .setFontWeight("bold")
       .setFontSize(10)
       .setBackground("#434343")
       .setFontColor("#FFFFFF")
       .setHorizontalAlignment("center");

  var esError   = mensaje.indexOf("⚠️") !== -1;
  var esExito   = mensaje.indexOf("✅") !== -1;
  var bgColor   = esError ? "#FCE8E6" : esExito ? "#D9EAD3" : "#FFF2CC";
  var fontColor = esError ? "#C0392B" : esExito ? "#276221" : "#7D6608";

  sheet.getRange("J5")
       .setValue(mensaje)
       .setFontWeight("normal")
       .setFontSize(10)
       .setBackground(bgColor)
       .setFontColor(fontColor)
       .setHorizontalAlignment("left")
       .setWrap(true);

  sheet.autoResizeRow(5);
}

function limpiarAlerta_(sheet) {
  sheet.getRange("J4")
       .setValue("")
       .setBackground("#FFFFFF")
       .setFontColor("#000000")
       .setFontWeight("normal");

  sheet.getRange("J5")
       .setValue("")
       .setBackground("#FFFFFF")
       .setFontColor("#000000");

  sheet.setRowHeight(4, 21);
  sheet.setRowHeight(5, 21);
}

function marcarRecientementeCompletado_(sheet, row) {
  sheet.getRange(row, 3, 1, 5).setValues([["🔵 Recientemente Completado", "", "", "", false]]);
}

function reiniciarRondaSiTerminada_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var datos              = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var total              = 0;
  var completosRecientes = 0;

  for (var i = 0; i < datos.length; i++) {
    if (datos[i][0] === "" || datos[i][0] === null) continue;
    total++;
    if ((datos[i][2] || "").toString().indexOf("Recientemente Completado") !== -1)
      completosRecientes++;
  }

  if (total > 0 && completosRecientes === total) {
    sheet.getRange(2, 3, total, 1).setValues(Array(total).fill(["⚪ Sin trabajar"]));
    sheet.getRange(2, 4, total, 3).clearContent(); 
    sheet.getRange(2, 7, total, 1).setValues(Array(total).fill([false])); 
    SpreadsheetApp.getActiveSpreadsheet().toast("¡Se reinició la asignación!", "🔄 Ronda completada", 5);
  }
}

function actualizarSiguienteTerritorio_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var datos     = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var siguiente = "";

  for (var i = 0; i < datos.length; i++) {
    if (datos[i][0] === "" || datos[i][0] === null) continue;
    if ((datos[i][2] || "").toString().indexOf("Recientemente Completado") === -1) {
      siguiente = datos[i][0];
      break;
    }
  }

  var celda = sheet.getRange("J2");
  if (siguiente !== "") {
    celda.setValue(siguiente)
         .setFontWeight("bold")
         .setFontSize(14)
         .setBackground("#FFF2CC")
         .setFontColor("#000000")
         .setHorizontalAlignment("center");
  } else {
    celda.setValue("Todos completados ✅")
         .setFontWeight("bold")
         .setFontSize(12)
         .setBackground("#D9EAD3")
         .setFontColor("#000000")
         .setHorizontalAlignment("center");
  }
}