# lowcost-pos-app-script
pos-coffeeshop/
├── Code.gs                 # Main entry point, routing
├── Config.gs               # Constants, sheet names, config
├── MenuService.gs          # CRUD operations for menu
├── OrderService.gs         # Order management logic
├── AnalyticsService.gs     # Reporting & analytics queries
├── SpreadsheetService.gs   # Low-level DB operations
├── pages/
│   ├── Home.html           # POS / cashier view
│   ├── Analytics.html      # Transaction reports
│   ├── MenuManager.html    # Menu management
│   └── Settings.html       # App settings
├── components/
│   ├── Sidebar.html        # Navigation sidebar (include)
│   ├── Styles.html         # Global CSS (include)
│   └── Scripts.html        # Shared JS utilities (include)
└── appsscript.json         # Manifest