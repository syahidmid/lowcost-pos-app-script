# Brew POS

Point of Sale berbasis Google Apps Script + Google Sheets.

---

## Tech Stack

- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Frontend:** HTML + CSS + Vanilla JS (mobile-first)

---

## File Structure

```
Code.js                  — doGet, routing, API endpoints
Config.js                — constants, sheet columns, default settings
SpreadsheetService.js    — low-level sheet read/write
MenuService.js           — menu CRUD + options parser
OrderService.js          — order create/update + item description JSON
AnalyticsService.js      — reporting queries
SettingsService.js       — app settings

pages/
  Home.html              — kasir: menu + antrian + cart
  Queue.html             — manajemen antrian detail
  Analytics.html         — laporan penjualan
  MenuManager.html       — kelola menu + opsi
  Settings.html          — pengaturan toko

components/
  Styles.html            — global CSS (light theme)
  Sidebar.html           — desktop sidebar + mobile bottom nav + hamburger
  Scripts.html           — shared JS utilities (gasCall, Toast, Loader, dll)
```

---

## Data Schema

**Menu** — `id, name, category, price, description||[options JSON], imageUrl, isAvailable, createdAt`

**Orders** — `orderId, createdAt, cashierName, status, totalAmount, paymentMethod, notes, customerName`

**OrderItems** — `id, orderId, menuId, menuName, qty, unitPrice, subtotal, description (JSON)`

**Settings** — `key, value`

---

## TODO

### Refactor
- [x] Buat `components/OrderCard.html` — shared JS component untuk render order card (dipakai di Home + Queue)
  - [x] Tombol **Edit Pesanan** di order card — bisa tambah item baru ke order yang sudah ada (status pending/preparing)
  - [x] Edit pesanan bisa dipanggil dari tab Antrian di Home maupun halaman Queue
- [ ] Migrasi navigasi ke SPA (show/hide div) untuk performa lebih smooth

### Fitur
- [ ] **Edit Pesanan** — flow lengkap:
  - Tap "Edit" di order card → load item yang sudah ada ke cart
  - Kasir bisa tambah/hapus item, ubah qty
  - Submit → update order di sheet (recalculate total, append item baru ke OrderItems)
  - Backend: `apiUpdateOrder(orderId, newItems)` di `OrderService` + `Code.js`
- [ ] **Harga tambahan per opsi (price modifier)** — opsi seperti "Large" bisa dikenakan biaya tambahan
  - Extend schema options di `MenuService`: `{ name, values, default, prices }` — contoh `prices: { Regular: 0, Large: 4000 }`
  - `_encodeDescription` / `_parseDescription` di `MenuService` menyimpan & membaca `prices` per value
  - Kalkulasi `unitPrice` di `OrderService` memperhitungkan modifier dari `selectedOptions`
  - Frontend (cart + edit modal) menampilkan harga modifier (+Rp 4.000) di samping pill yang dipilih
  - Subtotal & total otomatis menyesuaikan saat opsi diganti
- [ ] **Default options di MenuManager** — saat membuat/edit menu, kasir bisa set nilai default per option group
  - `MenuService` sudah punya field `default` di schema options, pastikan `MenuManager.html` expose UI-nya
  - Tambahkan contoh preset di `Config.js`: Size (Regular / Large, default: Regular)
- [ ] **Status pipeline lengkap** — tambah status `unpaid` dan `paid` ke alur pesanan
  - Status flow: `pending → preparing → done → unpaid → paid`
  - Pill filter di tab Antrian (Home) dan halaman Queue menyesuaikan: Semua · Pending · Diproses · Selesai · Belum Bayar · Lunas
  - `OrderService` validasi transisi status yang diizinkan
  - `renderOrderCard()` di `OrderCard.html` tampilkan tombol aksi sesuai status baru
- [ ] Notifikasi audio saat ada order masuk baru di tab Antrian
- [ ] Struk/receipt sederhana setelah order dikonfirmasi
- [ ] Analytics breakdown per opsi (contoh: Espresso Panas Large terjual berapa)
- [ ] Export laporan ke CSV/Excel

### Polish
- [ ] Animasi transisi antar tab (Menu ↔ Antrian)
- [ ] Loading skeleton untuk menu grid
- [ ] Halaman Antrian — tab badge update realtime tanpa full refresh