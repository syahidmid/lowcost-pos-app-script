// ============================================================
// OrderService.gs — Order management business logic
// ============================================================

const OrderService = (() => {

  const CO = CONFIG.COLS.ORDERS;
  const CI = CONFIG.COLS.ORDER_ITEMS;
  const SO = CONFIG.SHEETS.ORDERS;
  const SI = CONFIG.SHEETS.ORDER_ITEMS;

  // ── Helpers ───────────────────────────────────────────────

  function _buildOrderRow(orderId, now, cashierName, status, total, paymentMethod, notes, customerName) {
    return [
      orderId, now, cashierName, status, total,
      paymentMethod, notes || '', customerName || '',
    ];
  }

  // Build description JSON for order item
  // { notes: "less sugar", options: { "Suhu": "Panas", "Size": "Large" } }
  function _buildItemDescription(item) {
    var hasNotes = item.notes && item.notes.trim();
    var hasOptions = item.selectedOptions && Object.keys(item.selectedOptions).length > 0;
    if (!hasNotes && !hasOptions) return '';
    var obj = {};
    if (hasNotes) obj.notes = item.notes.trim();
    if (hasOptions) obj.options = item.selectedOptions;
    return JSON.stringify(obj);
  }

  // ── Mappers ───────────────────────────────────────────────

  function _orderRowToObj(row) {
    return {
      orderId: String(row[CO.ORDER_ID - 1]),
      createdAt: row[CO.CREATED_AT - 1] ? new Date(row[CO.CREATED_AT - 1]).toISOString() : '',
      cashierName: row[CO.CASHIER_NAME - 1],
      status: row[CO.STATUS - 1],
      totalAmount: Number(row[CO.TOTAL_AMOUNT - 1]),
      paymentMethod: row[CO.PAYMENT_METHOD - 1],
      notes: row[CO.NOTES - 1],
      customerName: row[CO.CUSTOMER_NAME - 1] || '',
    };
  }

  function _itemRowToObj(row) {
    // Parse description JSON — fallback gracefully if malformed
    var descRaw = row[CI.DESCRIPTION - 1] || '';
    var descObj = {};
    if (descRaw) {
      try { descObj = JSON.parse(descRaw); } catch (e) { descObj = {}; }
    }

    return {
      id: String(row[CI.ID - 1]),
      orderId: String(row[CI.ORDER_ID - 1]),
      menuId: String(row[CI.MENU_ID - 1]),
      menuName: row[CI.MENU_NAME - 1],
      qty: Number(row[CI.QTY - 1]),
      unitPrice: Number(row[CI.UNIT_PRICE - 1]),
      subtotal: Number(row[CI.SUBTOTAL - 1]),
      notes: descObj.notes || '',         // catatan teks bebas
      options: descObj.options || {},     // { "Suhu": "Panas", "Size": "Large" }
      description: descRaw,              // raw JSON string, untuk analytics
    };
  }

  // ── Queries ───────────────────────────────────────────────

  function getAllOrders() {
    return SpreadsheetService.getAllRows(SO).map(_orderRowToObj);
  }

  function getOrderById(orderId) {
    const row = SpreadsheetService.getRowById(SO, CO.ORDER_ID, orderId);
    return row ? _orderRowToObj(row) : null;
  }

  function getItemsByOrderId(orderId) {
    return SpreadsheetService.getAllRows(SI)
      .map(_itemRowToObj)
      .filter(i => i.orderId === String(orderId));
  }

  function getOrdersByDateRange(startDate, endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    return getAllOrders().filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
  }

  function getActiveOrders() {
    return getAllOrders().filter(o =>
      o.status === CONFIG.ORDER_STATUS.PENDING ||
      o.status === CONFIG.ORDER_STATUS.PREPARING
    );
  }

  // ── Mutations ─────────────────────────────────────────────

  /**
   * Create a new order
   * @param {Object} payload
   * {
   *   items: [{
   *     menuId, menuName, qty, unitPrice,
   *     notes?,           // catatan teks bebas
   *     selectedOptions?  // { "Suhu": "Panas", "Size": "Large" }
   *   }],
   *   paymentMethod, cashierName, notes, customerName
   * }
   */
  function createOrder(payload) {
    try {
      const orderId = SpreadsheetService.generateId('ORD');
      const now = new Date();
      const taxRate = Number(SettingsService.get('tax_rate') || 0) / 100;
      const subtotal = payload.items.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
      const total = subtotal + (subtotal * taxRate);

      // Write order header
      SpreadsheetService.appendRow(SO, _buildOrderRow(
        orderId, now,
        payload.cashierName || SettingsService.get('cashier_name') || 'Cashier',
        CONFIG.ORDER_STATUS.PENDING,
        total,
        payload.paymentMethod || 'Cash',
        payload.notes || '',
        payload.customerName || '',
      ));

      // ✅ FIX #2 — build semua item rows dulu, tulis SEKALI (1 API call)
      const itemRows = payload.items.map(item => {
        const descJson = _buildItemDescription(item);
        return [
          SpreadsheetService.generateId('ITM'),
          orderId,
          item.menuId,
          item.menuName,
          Number(item.qty),
          Number(item.unitPrice),
          Number(item.unitPrice) * Number(item.qty),
          descJson,
        ];
      });
      SpreadsheetService.appendRows(SI, itemRows);

      return { success: true, orderId, total };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function updateStatus(orderId, newStatus) {
    const existing = getOrderById(orderId);
    if (!existing) return { success: false, error: 'Order not found' };
    SpreadsheetService.updateRow(SO, CO.ORDER_ID, orderId, _buildOrderRow(
      orderId,
      existing.createdAt ? new Date(existing.createdAt) : new Date(),
      existing.cashierName,
      newStatus,
      existing.totalAmount,
      existing.paymentMethod,
      existing.notes,
      existing.customerName,
    ));
    return { success: true };
  }

  function cancelOrder(orderId) {
    return updateStatus(orderId, CONFIG.ORDER_STATUS.CANCELLED);
  }

  /**
   * Update items of an existing order (replace all items + recalculate total)
   * @param {string} orderId
   * @param {Object} payload - { items: [{menuId, menuName, qty, unitPrice, notes, selectedOptions}] }
   */
  function updateOrderItems(orderId, payload) {
    try {
      const existing = getOrderById(orderId);
      if (!existing) return { success: false, error: 'Order not found' };
      if (existing.status === CONFIG.ORDER_STATUS.DONE ||
        existing.status === CONFIG.ORDER_STATUS.CANCELLED) {
        return { success: false, error: 'Cannot edit completed or cancelled order' };
      }

      const taxRate = Number(SettingsService.get('tax_rate') || 0) / 100;
      const subtotal = payload.items.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
      const total = subtotal + (subtotal * taxRate);

      // 1. Update order total
      SpreadsheetService.updateRow(SO, CO.ORDER_ID, orderId, _buildOrderRow(
        orderId,
        existing.createdAt ? new Date(existing.createdAt) : new Date(),
        existing.cashierName,
        existing.status,
        total,
        existing.paymentMethod,
        existing.notes,
        existing.customerName,
      ));

      // 2. ✅ FIX #2 — delete semua item lama sekaligus (1x baca sheet)
      SpreadsheetService.deleteRowsByOrderId(SI, CI.ORDER_ID, orderId);

      // 3. ✅ FIX #2 — insert semua item baru sekaligus (1 API call)
      const itemRows = payload.items.map(item => {
        const descJson = _buildItemDescription(item);
        return [
          SpreadsheetService.generateId('ITM'),
          orderId,
          item.menuId,
          item.menuName,
          Number(item.qty),
          Number(item.unitPrice),
          Number(item.unitPrice) * Number(item.qty),
          descJson,
        ];
      });
      SpreadsheetService.appendRows(SI, itemRows);

      return { success: true, orderId, total };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Full order with items ─────────────────────────────────

  function getOrderWithItems(orderId) {
    const order = getOrderById(orderId);
    if (!order) return null;
    order.items = getItemsByOrderId(orderId);
    return order;
  }

  // ✅ FIX #1 — baca ORDER_ITEMS sekali, group di memory (bukan N+1 query)
  function getActiveOrdersWithItems() {
    const activeOrders = getActiveOrders();
    if (!activeOrders.length) return [];

    const allItemRows = SpreadsheetService.getAllRows(SI).map(_itemRowToObj);

    const itemsByOrder = {};
    allItemRows.forEach(item => {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    });

    return activeOrders
      .map(o => ({ ...o, items: itemsByOrder[o.orderId] || [] }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return {
    getAllOrders,
    getOrderById,
    getItemsByOrderId,
    getOrdersByDateRange,
    getActiveOrders,
    createOrder,
    updateStatus,
    cancelOrder,
    updateOrderItems,
    getOrderWithItems,
    getActiveOrdersWithItems,
  };

})();