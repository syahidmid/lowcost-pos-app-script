// ============================================================
// SettingsService.gs — App settings management
// ============================================================

const SettingsService = (() => {

  const SHEET = CONFIG.SHEETS.SETTINGS;
  const C     = CONFIG.COLS.SETTINGS;

  function getAll() {
    const rows = SpreadsheetService.getAllRows(SHEET);
    const settings = {};
    rows.forEach(row => {
      settings[row[C.KEY - 1]] = row[C.VALUE - 1];
    });
    return settings;
  }

  function get(key) {
    const rows = SpreadsheetService.getAllRows(SHEET);
    const row  = rows.find(r => r[C.KEY - 1] === key);
    return row ? row[C.VALUE - 1] : null;
  }

  function set(key, value) {
    SpreadsheetService.updateCellByKey(SHEET, C.KEY, key, C.VALUE, value);
    return { success: true };
  }

  function setAll(data) {
    Object.entries(data).forEach(([key, value]) => set(key, value));
    return { success: true };
  }

  return { getAll, get, set, setAll };

})();
