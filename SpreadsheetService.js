// ============================================================
// SpreadsheetService.gs — Low-level Spreadsheet DB layer
// ============================================================

const SpreadsheetService = (() => {

  function getOrCreateSheet(name, headers) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length)
          .setBackground('#1a1a2e')
          .setFontColor('#ffffff')
          .setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }
    return sheet;
  }

  function initSheets() {
    getOrCreateSheet(CONFIG.SHEETS.MENU, [
      'id', 'name', 'category', 'price', 'description', 'imageUrl', 'isAvailable', 'createdAt'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.ORDERS, [
      'orderId', 'createdAt', 'cashierName', 'status', 'totalAmount', 'paymentMethod', 'notes'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.ORDER_ITEMS, [
      'id', 'orderId', 'menuId', 'menuName', 'qty', 'unitPrice', 'subtotal'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.SETTINGS, ['key', 'value']);
    seedSettings();
  }

  function seedSettings() {
    const sheet = getOrCreateSheet(CONFIG.SHEETS.SETTINGS, ['key', 'value']);
    const existing = getAllRows(CONFIG.SHEETS.SETTINGS);
    const existingKeys = existing.map(r => r[0]);
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (!existingKeys.includes(key)) {
        sheet.appendRow([key, value]);
      }
    });
  }

  // ── Generic read ──────────────────────────────────────────

  function getAllRows(sheetName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  }

  function getRowById(sheetName, idCol, id) {
    const rows = getAllRows(sheetName);
    return rows.find(r => String(r[idCol - 1]) === String(id)) || null;
  }

  // ── Generic write ─────────────────────────────────────────

  function appendRow(sheetName, rowData) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    sheet.appendRow(rowData);
  }

  function updateRow(sheetName, idCol, id, newRowData) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol - 1]) === String(id)) {
        sheet.getRange(i + 1, 1, 1, newRowData.length).setValues([newRowData]);
        return true;
      }
    }
    return false;
  }

  function deleteRow(sheetName, idCol, id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idCol - 1]) === String(id)) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  }

  function updateCellByKey(sheetName, keyCol, key, valueCol, value) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyCol - 1]) === String(key)) {
        sheet.getRange(i + 1, valueCol).setValue(value);
        return true;
      }
    }
    // If key not found, append
    sheet.appendRow([key, value]);
    return true;
  }

  // ── ID generation ─────────────────────────────────────────

  function generateId(prefix) {
    const ts = new Date().getTime();
    const rand = Math.floor(Math.random() * 1000);
    return `${prefix}-${ts}-${rand}`;
  }

  return {
    initSheets,
    getAllRows,
    getRowById,
    appendRow,
    updateRow,
    deleteRow,
    updateCellByKey,
    generateId,
    getOrCreateSheet,
  };

})();
