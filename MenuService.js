// ============================================================
// MenuService.gs — Menu management business logic
// ============================================================

const MenuService = (() => {

  const C = CONFIG.COLS.MENU;
  const SHEET = CONFIG.SHEETS.MENU;

  // ── Options helpers ───────────────────────────────────────

  // Parse description field: "Deskripsi biasa||[{...}]"
  // Returns { description, options }
  function _parseDescription(raw) {
    if (!raw) return { description: '', options: [] };
    var str = String(raw);
    var idx = str.indexOf('||');
    if (idx === -1) return { description: str, options: [] };
    var desc = str.substring(0, idx).trim();
    var jsonStr = str.substring(idx + 2).trim();
    var options = [];
    try { options = JSON.parse(jsonStr); } catch (e) { options = []; }
    return { description: desc, options: options };
  }

  // Encode description + options back to string
  function _encodeDescription(description, options) {
    var desc = (description || '').trim();
    if (!options || !options.length) return desc;
    return desc + '||' + JSON.stringify(options);
  }

  // ── Row mapper ────────────────────────────────────────────

  function _rowToObj(row) {
    var parsed = _parseDescription(row[C.DESCRIPTION - 1]);
    return {
      id: String(row[C.ID - 1]),
      name: row[C.NAME - 1],
      category: row[C.CATEGORY - 1],
      price: Number(row[C.PRICE - 1]),
      description: parsed.description,
      options: parsed.options,   // [{ name: "Suhu", values: ["Panas","Dingin"], default: "Panas" }]
      imageUrl: row[C.IMAGE_URL - 1],
      isAvailable: row[C.IS_AVAILABLE - 1] === true || row[C.IS_AVAILABLE - 1] === 'TRUE' || row[C.IS_AVAILABLE - 1] === 'true',
      createdAt: row[C.CREATED_AT - 1] ? new Date(row[C.CREATED_AT - 1]).toISOString() : '',
    };
  }

  // ── Queries ───────────────────────────────────────────────

  function getAll() {
    return SpreadsheetService.getAllRows(SHEET).map(_rowToObj);
  }

  function getByCategory(category) {
    return getAll().filter(function (m) { return m.category === category; });
  }

  function getAvailable() {
    return getAll().filter(function (m) { return m.isAvailable; });
  }

  function getById(id) {
    var row = SpreadsheetService.getRowById(SHEET, C.ID, id);
    return row ? _rowToObj(row) : null;
  }

  // ── Mutations ─────────────────────────────────────────────

  function create(data) {
    var id = SpreadsheetService.generateId('MNU');
    var now = new Date();
    var encodedDesc = _encodeDescription(data.description, data.options);
    var row = [
      id,
      data.name,
      data.category,
      Number(data.price),
      encodedDesc,
      data.imageUrl || '',
      true,
      now,
    ];
    SpreadsheetService.appendRow(SHEET, row);
    return { success: true, id: id };
  }

  function update(id, data) {
    var existing = getById(id);
    if (!existing) return { success: false, error: 'Menu not found' };

    // Merge options: kalau data.options dikirim, pakai itu. Kalau tidak, preserve existing
    var options = data.options !== undefined ? data.options : existing.options;
    var desc = data.description !== undefined ? data.description : existing.description;
    var encodedDesc = _encodeDescription(desc, options);

    var row = [
      id,
      data.name || existing.name,
      data.category || existing.category,
      data.price !== undefined ? Number(data.price) : existing.price,
      encodedDesc,
      data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
      data.isAvailable !== undefined ? data.isAvailable : existing.isAvailable,
      existing.createdAt ? new Date(existing.createdAt) : new Date(),
    ];
    SpreadsheetService.updateRow(SHEET, C.ID, id, row);
    return { success: true };
  }

  function toggleAvailability(id) {
    var existing = getById(id);
    if (!existing) return { success: false, error: 'Menu not found' };
    return update(id, { isAvailable: !existing.isAvailable });
  }

  function remove(id) {
    var deleted = SpreadsheetService.deleteRow(SHEET, C.ID, id);
    return { success: deleted };
  }

  return { getAll, getByCategory, getAvailable, getById, create, update, toggleAvailability, remove };

})();