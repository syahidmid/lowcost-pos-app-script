// ============================================================
// MenuService.gs — Menu management business logic
// ============================================================

const MenuService = (() => {

  const C = CONFIG.COLS.MENU;
  const SHEET = CONFIG.SHEETS.MENU;

  function _rowToObj(row) {
    return {
      id:          String(row[C.ID - 1]),
      name:        row[C.NAME - 1],
      category:    row[C.CATEGORY - 1],
      price:       Number(row[C.PRICE - 1]),
      description: row[C.DESCRIPTION - 1],
      imageUrl:    row[C.IMAGE_URL - 1],
      isAvailable: row[C.IS_AVAILABLE - 1] === true || row[C.IS_AVAILABLE - 1] === 'TRUE' || row[C.IS_AVAILABLE - 1] === 'true',
      createdAt:   row[C.CREATED_AT - 1] ? new Date(row[C.CREATED_AT - 1]).toISOString() : '',
    };
  }

  function getAll() {
    const rows = SpreadsheetService.getAllRows(SHEET);
    return rows.map(_rowToObj);
  }

  function getByCategory(category) {
    return getAll().filter(m => m.category === category);
  }

  function getAvailable() {
    return getAll().filter(m => m.isAvailable);
  }

  function getById(id) {
    const row = SpreadsheetService.getRowById(SHEET, C.ID, id);
    return row ? _rowToObj(row) : null;
  }

  function create(data) {
    const id = SpreadsheetService.generateId('MNU');
    const now = new Date();
    const row = [
      id,
      data.name,
      data.category,
      Number(data.price),
      data.description || '',
      data.imageUrl || '',
      true,
      now,
    ];
    SpreadsheetService.appendRow(SHEET, row);
    return { success: true, id };
  }

  function update(id, data) {
    const existing = getById(id);
    if (!existing) return { success: false, error: 'Menu not found' };
    const row = [
      id,
      data.name        || existing.name,
      data.category    || existing.category,
      data.price !== undefined ? Number(data.price) : existing.price,
      data.description !== undefined ? data.description : existing.description,
      data.imageUrl    !== undefined ? data.imageUrl    : existing.imageUrl,
      data.isAvailable !== undefined ? data.isAvailable : existing.isAvailable,
      existing.createdAt ? new Date(existing.createdAt) : new Date(),
    ];
    SpreadsheetService.updateRow(SHEET, C.ID, id, row);
    return { success: true };
  }

  function toggleAvailability(id) {
    const existing = getById(id);
    if (!existing) return { success: false, error: 'Menu not found' };
    return update(id, { isAvailable: !existing.isAvailable });
  }

  function remove(id) {
    const deleted = SpreadsheetService.deleteRow(SHEET, C.ID, id);
    return { success: deleted };
  }

  return { getAll, getByCategory, getAvailable, getById, create, update, toggleAvailability, remove };

})();
