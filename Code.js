// ============================================================
// Code.gs — Main entry point, routing, server-side handlers
// ============================================================

function doGet(e) {
  SpreadsheetService.initSheets();
  const page = e.parameter.page || 'home';
  const pageMap = {
    home: 'pages/Home',
    queue: 'pages/Queue',
    analytics: 'pages/Analytics',
    menu: 'pages/MenuManager',
    settings: 'pages/Settings',
  };
  const template = HtmlService.createTemplateFromFile(pageMap[page] || 'pages/Home');
  template.page = page;
  template.appName = CONFIG.APP_NAME;
  template.shopName = SettingsService.get('shop_name') || CONFIG.APP_NAME;

  return template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── HTML include helper ───────────────────────────────────

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Navigation helper — returns exec URL for client-side nav ──

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// ============================================================
// SERVER-SIDE API — called via google.script.run
// ============================================================

// ── Menu API ──────────────────────────────────────────────

function apiGetMenus() { return JSON.stringify(MenuService.getAll()); }
function apiGetAvailableMenus() { return JSON.stringify(MenuService.getAvailable()); }
function apiCreateMenu(dataJson) { return JSON.stringify(MenuService.create(JSON.parse(dataJson))); }
function apiUpdateMenu(id, dataJson) { return JSON.stringify(MenuService.update(id, JSON.parse(dataJson))); }
function apiToggleMenuAvailability(id) { return JSON.stringify(MenuService.toggleAvailability(id)); }
function apiDeleteMenu(id) { return JSON.stringify(MenuService.remove(id)); }

// ── Order API ─────────────────────────────────────────────

function apiCreateOrder(payloadJson) { return JSON.stringify(OrderService.createOrder(JSON.parse(payloadJson))); }
function apiGetActiveOrders() { return JSON.stringify(OrderService.getActiveOrdersWithItems()); }
function apiUpdateOrderStatus(orderId, status) { return JSON.stringify(OrderService.updateStatus(orderId, status)); }
function apiCancelOrder(orderId) { return JSON.stringify(OrderService.cancelOrder(orderId)); }
function apiUpdateOrderItems(orderId, payloadJson) { return JSON.stringify(OrderService.updateOrderItems(orderId, JSON.parse(payloadJson))); }
function apiGetOrderWithItems(orderId) { return JSON.stringify(OrderService.getOrderWithItems(orderId)); }

// ── Analytics API ─────────────────────────────────────────

function apiGetTodaySummary() { return JSON.stringify(AnalyticsService.getTodaySummary()); }
function apiGetSummaryByRange(startDate, endDate) { return JSON.stringify(AnalyticsService.getSummaryByRange(startDate, endDate)); }
function apiGetTransactionList(startDate, endDate) { return JSON.stringify(AnalyticsService.getTransactionList(startDate, endDate)); }
function apiGetHourlyRevenue(date) { return JSON.stringify(AnalyticsService.getHourlyRevenue(date)); }

// ── Settings API ──────────────────────────────────────────

function apiGetSettings() { return JSON.stringify(SettingsService.getAll()); }
function apiSaveSettings(dataJson) { return JSON.stringify(SettingsService.setAll(JSON.parse(dataJson))); }

// ── ✅ Initial data — gabung settings + menus + orders dalam 1 call ──

function apiGetInitialData() {
  return JSON.stringify({
    settings: SettingsService.getAll(),
    menus: MenuService.getAvailable(),
    orders: OrderService.getActiveOrdersWithItems(),
  });
}

// ── Utility ───────────────────────────────────────────────

function apiGetConfig() {
  return JSON.stringify({
    categories: CONFIG.MENU_CATEGORIES,
    paymentMethods: CONFIG.PAYMENT_METHODS,
    orderStatus: CONFIG.ORDER_STATUS,
    appName: CONFIG.APP_NAME,
  });
}