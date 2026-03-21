// ============================================================
// Config.gs — App constants & sheet configuration
// ============================================================

const CONFIG = {
  APP_NAME: 'Brew POS',
  VERSION: '1.0.0',
  // Tidak ada SPREADSHEET_ID — dihandle otomatis oleh SpreadsheetService

  SHEETS: {
    MENU: 'Menu',
    ORDERS: 'Orders',
    ORDER_ITEMS: 'OrderItems',
    SETTINGS: 'Settings',
  },

  MENU_CATEGORIES: ['Coffee', 'No Coffee', 'Snack'],

  ORDER_STATUS: {
    PENDING: 'pending',
    PREPARING: 'preparing',
    DONE: 'done',
    CANCELLED: 'cancelled',
  },

  PAYMENT_METHODS: ['Cash', 'QRIS', 'Transfer'],

  COLS: {
    MENU: {
      ID: 1,
      NAME: 2,
      CATEGORY: 3,
      PRICE: 4,
      DESCRIPTION: 5,
      IMAGE_URL: 6,
      IS_AVAILABLE: 7,
      CREATED_AT: 8,
    },
    ORDERS: {
      ORDER_ID: 1,
      CREATED_AT: 2,
      CASHIER_NAME: 3,
      STATUS: 4,
      TOTAL_AMOUNT: 5,
      PAYMENT_METHOD: 6,
      NOTES: 7,
      CUSTOMER_NAME: 8,
    },
    ORDER_ITEMS: {
      ID: 1,
      ORDER_ID: 2,
      MENU_ID: 3,
      MENU_NAME: 4,
      QTY: 5,
      UNIT_PRICE: 6,
      SUBTOTAL: 7,
    },
    SETTINGS: {
      KEY: 1,
      VALUE: 2,
    },
  },
};

const DEFAULT_SETTINGS = {
  shop_name: 'My Coffee Shop',
  shop_address: 'Jl. Kopi No. 1',
  shop_tagline: 'Sip. Relax. Repeat.',
  tax_rate: '0',
  cashier_name: 'Admin',
  currency: 'IDR',
};