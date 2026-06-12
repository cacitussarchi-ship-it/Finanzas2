const SHEET_NAMES = [
  "Ingresos generales",
  "Stands de mueblerías",
  "Feria del mueble 2026",
  "Afiliados",
  "Gastos",
  "Pendientes de cobro"
];

function doGet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const data = SHEET_NAMES.flatMap((sheetName) => readSheet(spreadsheet, sheetName));

  return ContentService
    .createTextOutput(JSON.stringify({ data, updatedAt: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(normalizeHeader);

  return values
    .filter((row) => row.some(Boolean))
    .map((row) => {
      const item = { hoja: mapSheetLabel(sheetName) };
      headers.forEach((header, index) => item[header] = row[index]);
      return item;
    });
}

function normalizeHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function mapSheetLabel(sheetName) {
  const labels = {
    "Ingresos generales": "Otros ingresos",
    "Stands de mueblerías": "Stands de mueblerías",
    "Feria del mueble 2026": "Feria del Mueble 2026",
    "Afiliados": "Pagos de afiliados",
    "Gastos": "Gastos",
    "Pendientes de cobro": "Pendientes de recaudar"
  };

  return labels[sheetName] || sheetName;
}
