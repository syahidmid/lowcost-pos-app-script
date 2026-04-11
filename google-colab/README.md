# 🤖 Google Colab Tools

Kumpulan notebook Python untuk keperluan SEO, scraping, dan riset domain. Dirancang untuk dijalankan di Google Colab — tidak perlu setup environment lokal.

---

## 📁 Struktur Repo
```
google-colab/
├── .gitignore
├── README.md
├── scraping/
│   ├── WHOIS_scraper.ipynb
│   ├── backlink_filter.ipynb
│   ├── backlinks_filter.ipynb
│   ├── shopify/
│   │   ├── new_shopify_id_checker.ipynb
│   │   └── shopify_id_checker.ipynb
│   └── site-audit/
│       ├── get_sitemap_url.ipynb
│       ├── heading_meta_audit.ipynb
│       └── orphan_checker.ipynb
└── wordpress/
    ├── case-study/
    │   ├── fix_duplicate_title.ipynb
    │   ├── fix_duplicate_title_v2_retry.ipynb
    │   ├── get_dulicate_title.ipynb
    │   └── tag_redirection_map_by_similiarity.ipynb
    ├── category/
    │   ├── create_categories.ipynb
    │   └── get_category.ipynb
    ├── media/
    │   ├── get_media_library.ipynb
    │   └── update_alt_image.ipynb
    ├── post/
    │   └── get_post.ipynb
    └── tag/
        ├── delete_tag.ipynb
        ├── delete_tagipynb.ipynb
        └── get_tag.ipynb
```

---

## 🛠️ Daftar Tools

### 🛒 Shopify ID Checker
**`scraping/shopify/shopify_id_checker.ipynb`**

Mengambil Shopify internal ID dari halaman publik toko secara bulk, lalu menghasilkan direct link ke Shopify Admin (CMS URL).

**Mendukung tipe halaman:**
- `/collections/{handle}` → **collection**
- `/blogs/{handle}/{article}` → **article**
- `/blogs/{handle}` → **blog**
- `/pages/{handle}` → **page**

**Fitur:**
- Input via upload file `.txt` (satu URL per baris)
- Auto-deteksi tipe halaman dari pola URL
- Generate CMS URL langsung ke Shopify Admin
- Simpan hasil ke CSV secara real-time (aman jika berhenti di tengah jalan)
- Delay 5 detik antar request untuk menghindari rate limit

**Output CSV:**

| Kolom | Keterangan |
|---|---|
| `url` | URL publik yang di-scrape |
| `page_type` | Tipe halaman (collection / article / blog / page) |
| `shopify_id` | ID internal Shopify |
| `cms_url` | Link langsung ke Shopify Admin |
| `status` | Status scraping (ok / error / skipped) |

---

### 🔗 Backlink Filter
**`backlink_filter.ipynb` / `backlinks_filter.ipynb`**

Filter dan analisis data backlink dari hasil export tools SEO (Ahrefs, Semrush, dll).

---

### 🌐 WHOIS Scraper
**`WHOIS_scraper.ipynb`**

Scrape informasi WHOIS domain secara bulk — cocok untuk riset kompetitor atau validasi domain.

---

## 🚀 Cara Pakai

1. Buka notebook yang diinginkan di [Google Colab](https://colab.research.google.com)
2. Jalankan cell instalasi dependencies (`pip install ...`)
3. Ikuti instruksi di tiap notebook (biasanya: isi konfigurasi → upload file input → run → download output)

**Buka langsung dari GitHub:**
> File → Open notebook → tab GitHub → masukkan URL repo ini

---

## 📦 Dependencies Umum

```
requests
beautifulsoup4
pandas
```

Semua dependencies diinstall otomatis di dalam notebook masing-masing.

---

## 📝 Catatan

- Semua notebook didesain untuk **Google Colab** (ada `files.upload()` dan `files.download()`)
- Gunakan delay yang wajar saat scraping untuk menghindari pemblokiran server
- Output CSV disimpan secara real-time sehingga data tidak hilang jika runtime Colab timeout
