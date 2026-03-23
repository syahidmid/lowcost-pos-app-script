// ============================================================
// SpreadsheetService.gs — Low-level Spreadsheet DB layer
// ============================================================

const SpreadsheetService = (() => {

  // ── Singleton cache — hanya buka spreadsheet SEKALI per eksekusi ──
  let _ss = null;
  let _sheetCache = {};

  function getSpreadsheet() {
    if (_ss) return _ss; // ✅ langsung return kalau sudah ada

    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) { _ss = active; return _ss; }

    const props = PropertiesService.getScriptProperties();
    const storedId = props.getProperty('SPREADSHEET_ID');
    if (storedId) {
      try { _ss = SpreadsheetApp.openById(storedId); return _ss; } catch (e) { }
    }

    const newSs = SpreadsheetApp.create(CONFIG.APP_NAME + ' Database');
    props.setProperty('SPREADSHEET_ID', newSs.getId());
    _ss = newSs;
    return _ss;
  }

  // ── Sheet helper — cache per nama ─────────────────────────

  function getSheet(name) {
    if (_sheetCache[name]) return _sheetCache[name]; // ✅ dari cache
    const sheet = getSpreadsheet().getSheetByName(name);
    if (sheet) _sheetCache[name] = sheet;
    return sheet;
  }

  function getOrCreateSheet(name, headers) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length)
          .setBackground('#1a73e8')
          .setFontColor('#ffffff')
          .setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }
    _sheetCache[name] = sheet; // ✅ cache hasil
    return sheet;
  }

  function initSheets() {
    getOrCreateSheet(CONFIG.SHEETS.MENU, [
      'id', 'name', 'category', 'price', 'description', 'imageUrl', 'isAvailable', 'createdAt'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.ORDERS, [
      'orderId', 'createdAt', 'cashierName', 'status', 'totalAmount', 'paymentMethod', 'notes', 'customerName'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.ORDER_ITEMS, [
      'id', 'orderId', 'menuId', 'menuName', 'qty', 'unitPrice', 'subtotal', 'description'
    ]);
    getOrCreateSheet(CONFIG.SHEETS.SETTINGS, ['key', 'value']);
    seedSettings();
  }

  function seedSettings() {
    const sheet = getOrCreateSheet(CONFIG.SHEETS.SETTINGS, ['key', 'value']);
    const existing = getAllRows(CONFIG.SHEETS.SETTINGS);
    const existingKeys = existing.map(r => r[0]);
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (!existingKeys.includes(key)) sheet.appendRow([key, value]);
    });
  }

  // ── Generic read ──────────────────────────────────────────

  function getAllRows(sheetName) {
    const sheet = getSheet(sheetName); // ✅ dari cache
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
    const sheet = getSheet(sheetName); // ✅ dari cache
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    sheet.appendRow(rowData);
  }

  // ✅ BARU — batch write, semua rows dalam 1 API call
  function appendRows(sheetName, rowsData) {
    if (!rowsData || !rowsData.length) return;
    const sheet = getSheet(sheetName); // ✅ dari cache
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rowsData.length, rowsData[0].length)
      .setValues(rowsData);
  }

  function updateRow(sheetName, idCol, id, newRowData) {
    const sheet = getSheet(sheetName); // ✅ dari cache
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
    const sheet = getSheet(sheetName); // ✅ dari cache
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

  // ✅ BARU — delete semua rows by orderId dalam 1 kali baca sheet
  function deleteRowsByOrderId(sheetName, orderIdCol, orderId) {
    const sheet = getSheet(sheetName); // ✅ dari cache
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    // loop dari bawah supaya index tidak geser saat delete
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][orderIdCol - 1]) === String(orderId)) {
        sheet.deleteRow(i + 1);
      }
    }
  }

  function updateCellByKey(sheetName, keyCol, key, valueCol, value) {
    const sheet = getSheet(sheetName); // ✅ dari cache
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyCol - 1]) === String(key)) {
        sheet.getRange(i + 1, valueCol).setValue(value);
        return true;
      }
    }
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
    appendRows,           // ✅ baru
    deleteRowsByOrderId,  // ✅ baru
    updateRow,
    deleteRow,
    updateCellByKey,
    generateId,
    getOrCreateSheet,
  };

})();