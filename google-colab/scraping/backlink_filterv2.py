# ╔══════════════════════════════════════════════════════════════╗
# ║         BACKLINK URL CHECKER — Google Colab Edition          ║
# ║   Expired Domain | Status Code | Illegal Content Detector    ║
# ║   ✅ Resume-safe: auto checkpoint, skip URL yg sudah dicek   ║
# ╚══════════════════════════════════════════════════════════════╝

# ── CELL 1: Install Dependencies ─────────────────────────────────
# !pip install requests beautifulsoup4 pandas tqdm -q

# ─────────────────────────────────────────────────────────────────
import requests
import pandas as pd
from bs4 import BeautifulSoup
from tqdm.notebook import tqdm
from datetime import datetime
from IPython.display import display, clear_output
import ipywidgets as widgets
import re, time, io, sys, json, os
from urllib.parse import urlparse

# ══════════════════════════════════════════════════════════════════
# CHECKPOINT CONFIG
# ══════════════════════════════════════════════════════════════════

CHECKPOINT_FILE = "url_checker_checkpoint.json"  # progress disimpan di sini
TODAY           = datetime.now().strftime("%Y%m%d")
OUTPUT_FILE     = f"backlink_filter_{TODAY}.csv"


# ══════════════════════════════════════════════════════════════════
# LOGGER
# ══════════════════════════════════════════════════════════════════

class Logger:
    COLORS = {
        "reset":   "\033[0m",  "bold":    "\033[1m",
        "grey":    "\033[90m", "green":   "\033[92m",
        "yellow":  "\033[93m", "red":     "\033[91m",
        "cyan":    "\033[96m", "magenta": "\033[95m",
        "blue":    "\033[94m", "white":   "\033[97m",
    }

    def _ts(self):
        return datetime.now().strftime("%H:%M:%S")

    def _c(self, text, *colors):
        codes = "".join(self.COLORS.get(c, "") for c in colors)
        return f"{codes}{text}{self.COLORS['reset']}"

    def banner(self):
        print(self._c("━" * 62, "cyan"))
        print(self._c("  ██╗   ██╗██████╗ ██╗      ██████╗██╗  ██╗███████╗ ██████╗", "cyan", "bold"))
        print(self._c("  ██║   ██║██╔══██╗██║     ██╔════╝██║  ██║██╔════╝██╔════╝", "cyan", "bold"))
        print(self._c("  ██║   ██║██████╔╝██║     ██║     ███████║█████╗  ██║     ", "cyan", "bold"))
        print(self._c("  ██║   ██║██╔══██╗██║     ██║     ██╔══██║██╔══╝  ██║     ", "cyan", "bold"))
        print(self._c("  ╚██████╔╝██║  ██║███████╗╚██████╗██║  ██║███████╗╚██████╗", "cyan", "bold"))
        print(self._c("   ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝", "cyan", "bold"))
        print(self._c("  Backlink URL Checker  •  Expired | Status | Illegal | Resume ✅", "grey"))
        print(self._c("━" * 62, "cyan"))

    def info(self, msg):
        print(f"  {self._c(self._ts(), 'grey')}  {self._c('INFO', 'cyan', 'bold')}  {msg}")

    def success(self, msg):
        print(f"  {self._c(self._ts(), 'grey')}  {self._c('  OK ', 'green', 'bold')}  {msg}")

    def warn(self, msg):
        print(f"  {self._c(self._ts(), 'grey')}  {self._c('WARN', 'yellow', 'bold')}  {msg}")

    def error(self, msg):
        print(f"  {self._c(self._ts(), 'grey')}  {self._c(' ERR', 'red', 'bold')}  {msg}")

    def skip(self, msg):
        print(f"  {self._c(self._ts(), 'grey')}  {self._c('SKIP', 'magenta', 'bold')}  {msg}")

    def result(self, url, status, expired, illegal, check_status, err=None):
        short = url[:42] + "…" if len(url) > 43 else url.ljust(43)

        if status == 200:
            s = self._c(f"[{status}]", "green", "bold")
        elif status and 300 <= status < 400:
            s = self._c(f"[{status}]", "yellow", "bold")
        elif status:
            s = self._c(f"[{status}]", "red", "bold")
        else:
            s = self._c("[---]", "grey")

        exp = self._c("⚠ EXPIRED", "yellow") if expired == "Yes" else self._c("✓ active ", "grey")
        ill = self._c("🚫 ILLEGAL", "red", "bold") if illegal == "Yes" else self._c("✓ clean  ", "grey")

        # badge check_status
        if check_status == "done":
            badge = self._c("[done]", "green")
        elif check_status == "resumed":
            badge = self._c("[skip]", "magenta")
        else:
            badge = self._c("[err] ", "red")

        er = self._c(f"  ⚡ {err}", "red") if err else ""
        print(f"  {self._c(self._ts(), 'grey')}  {s}  {badge}  {short}  {exp}  {ill}{er}")

    def section(self, title):
        print()
        line_len = max(0, 55 - len(title))
        print(f"  {self._c('┌─', 'cyan')} {self._c(title, 'white', 'bold')} {self._c('─' * line_len, 'cyan')}")

    def summary(self, total, ok200, expired, illegal, errors, resumed, duration):
        print()
        print(self._c("  ┌" + "─" * 58 + "┐", "cyan"))
        print(self._c("  │", "cyan") + self._c("  📊  HASIL AKHIR PEMERIKSAAN".center(58), "white", "bold") + self._c("│", "cyan"))
        print(self._c("  ├" + "─" * 58 + "┤", "cyan"))

        rows = [
            ("🔗  Total URL",            str(total),        "white"),
            ("✅  Status 200",           str(ok200),        "green"),
            ("⚠️   Expired Domain",       str(expired),      "yellow"),
            ("🚫  Konten Illegal",        str(illegal),      "red"),
            ("💥  Error / Timeout",       str(errors),       "red"),
            ("⏭️   Di-resume (skip)",      str(resumed),      "magenta"),
            ("⏱️   Durasi sesi ini",       f"{duration:.1f}s","cyan"),
        ]
        for label, val, color in rows:
            line = f"  {label:<30}  {self._c(val, color, 'bold')}"
            pad  = 58 - len(f"  {label:<30}  {val}")
            print(self._c("  │", "cyan") + line + " " * max(0, pad) + self._c("│", "cyan"))

        print(self._c("  └" + "─" * 58 + "┘", "cyan"))

log = Logger()


# ══════════════════════════════════════════════════════════════════
# KONFIGURASI
# ══════════════════════════════════════════════════════════════════

TIMEOUT = 10

EXPIRED_DOMAIN_INDICATORS = [
    "mamma.com", "sedo.com", "sedoparking.com", "dan.com",
    "hugedomains.com", "godaddy.com/domain", "afternic.com",
    "namecheap.com/domains/registration", "parkingcrew.net",
    "bodis.com", "above.com", "trellian.com", "domainsponsor.com",
    "domainadvert.com", "parked",
]

ILLEGAL_TERMS_ID = [
    "judi", "togel", "slot", "poker", "bandar", "taruhan", "betting",
    "kasino", "casino", "gacor", "maxwin", "scatter", "jackpot",
    "bokep", "ngentot", "memek", "kontol", "bugil", "telanjang",
    "dewasa", "xxx",
]

ILLEGAL_TERMS_EN = [
    "gambling", "bet", "casino", "poker", "lottery", "slot machine",
    "porn", "pornography", "nude", "naked", "sex", "xxx",
    "adult content", "escort",
]

ALL_ILLEGAL_TERMS = ILLEGAL_TERMS_ID + ILLEGAL_TERMS_EN

# Urutan prioritas TLD — dicek dari atas ke bawah.
# TLD yang tidak ada di list ini tetap dicek, tapi paling akhir (diurutkan alfabetis).
TLD_PRIORITY_ORDER = [
    ".com",
    ".net",
    ".org",
    ".io",
    ".co",
    ".info",
    ".biz",
    ".id",
    ".co.id",
    ".or.id",
    ".ac.id",
    ".go.id",
    ".uk",
    ".co.uk",
    ".au",
    ".de",
    ".fr",
    ".jp",
    ".sg",
    ".my",
]


# ══════════════════════════════════════════════════════════════════
# URL NORMALIZATION & TLD EXTRACTOR
# ══════════════════════════════════════════════════════════════════

def normalize_url(raw: str) -> str:
    url = raw.strip().strip("_").strip()
    if not re.match(r'^https?://', url, re.IGNORECASE):
        url = "https://" + url
    return url


def extract_tld(url: str) -> str:
    try:
        hostname = urlparse(url).hostname or ""
        parts    = hostname.rstrip(".").split(".")
        if len(parts) >= 3 and parts[-2] in ("co", "ac", "or", "net", "go", "sch", "my", "com"):
            return "." + ".".join(parts[-2:])
        elif len(parts) >= 2:
            return "." + parts[-1]
        return hostname
    except Exception:
        return "-"


def sort_by_tld_priority(url_list: list) -> list:
    """
    Urutkan URL berdasarkan TLD_PRIORITY_ORDER.
    TLD yang ada di list → dapat index prioritas (0 = paling prioritas).
    TLD yang tidak ada di list → index = len(TLD_PRIORITY_ORDER), diurutkan alfabetis by TLD.
    Urutan asli dalam CSV dipertahankan sebagai tiebreaker (stable sort).
    """
    priority_map = {tld: i for i, tld in enumerate(TLD_PRIORITY_ORDER)}
    fallback     = len(TLD_PRIORITY_ORDER)

    def sort_key(url_raw):
        tld = extract_tld(normalize_url(url_raw))
        return (priority_map.get(tld, fallback), tld)

    return sorted(url_list, key=sort_key)


# ══════════════════════════════════════════════════════════════════
# CHECKPOINT HELPERS
# ══════════════════════════════════════════════════════════════════

def load_checkpoint() -> dict:
    """Baca checkpoint dari file JSON. Return dict {url_normalized: result}."""
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data  # {url: result_dict}
        except Exception:
            return {}
    return {}


def save_checkpoint(checkpoint: dict):
    """Simpan satu checkpoint setiap kali URL selesai dicek."""
    try:
        with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
            json.dump(checkpoint, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log.warn(f"Gagal simpan checkpoint: {e}")


def clear_checkpoint():
    """Hapus file checkpoint setelah semua selesai & CSV tersimpan."""
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        log.info("Checkpoint dihapus (sesi selesai).")


# ══════════════════════════════════════════════════════════════════
# FUNGSI CEK URL
# ══════════════════════════════════════════════════════════════════

def check_url(url_raw: str) -> dict:
    url = normalize_url(url_raw)
    tld = extract_tld(url)

    result = {
        "url_original":        url_raw,
        "url_normalized":      url,
        "domain_tld":          tld,
        "status_code":         None,
        "final_url":           None,
        "expired_domain":      "No",
        "illegal_terms_found": [],
        "is_illegal":          "No",
        "check_status":        "done",   # done | error
        "error":               None,
    }

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        resp = requests.get(url, timeout=TIMEOUT, headers=headers, allow_redirects=True)
        result["status_code"] = resp.status_code
        result["final_url"]   = resp.url

        final_url_lower = resp.url.lower()
        page_text_lower = resp.text.lower()

        expired_hints = [
            any(ind in final_url_lower for ind in EXPIRED_DOMAIN_INDICATORS),
            "this domain" in page_text_lower and ("sale" in page_text_lower or "parked" in page_text_lower),
            "domain for sale"             in page_text_lower,
            "buy this domain"             in page_text_lower,
            "domain is for sale"          in page_text_lower,
            "this domain may be for sale" in page_text_lower,
        ]
        if any(expired_hints):
            result["expired_domain"] = "Yes"

        try:
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "meta", "head"]):
                tag.decompose()
            clean_text = soup.get_text(separator=" ").lower()
        except Exception:
            clean_text = page_text_lower

        found_terms = [
            term for term in ALL_ILLEGAL_TERMS
            if re.search(r'\b' + re.escape(term) + r'\b', clean_text)
        ]
        if found_terms:
            result["illegal_terms_found"] = found_terms
            result["is_illegal"]          = "Yes"

    except requests.exceptions.Timeout:
        result["error"]        = "Timeout"
        result["check_status"] = "error"
    except requests.exceptions.ConnectionError:
        result["error"]        = "Connection Error"
        result["check_status"] = "error"
    except requests.exceptions.TooManyRedirects:
        result["error"]           = "Too Many Redirects"
        result["expired_domain"]  = "Possible"
        result["check_status"]    = "error"
    except Exception as e:
        result["error"]        = str(e)[:60]
        result["check_status"] = "error"

    return result


# ══════════════════════════════════════════════════════════════════
# LOAD CSV
# ══════════════════════════════════════════════════════════════════

def load_urls_from_csv(content_bytes: bytes) -> list:
    df      = pd.read_csv(io.BytesIO(content_bytes), header=0)
    url_col = next((col for col in df.columns if "url" in col.strip().lower()), None)
    if url_col is None:
        raise ValueError(f"Kolom URL tidak ditemukan. Kolom tersedia: {list(df.columns)}")
    log.success(f"Kolom URL terdeteksi  →  '{url_col}'")
    urls   = df[url_col].dropna().astype(str).str.strip().tolist()
    log.info(f"Total URL dimuat      →  {len(urls)}")
    sample = normalize_url(urls[0]) if urls else "-"
    log.info(f"Contoh normalisasi    →  {urls[0]!r}  ➜  {sample}")
    return urls


# ══════════════════════════════════════════════════════════════════
# RUNNER — dengan checkpoint & resume
# ══════════════════════════════════════════════════════════════════

def run_checker(url_list: list, delay: float = 0.5) -> pd.DataFrame:
    checkpoint   = load_checkpoint()
    resumed_keys = set(checkpoint.keys())

    if resumed_keys:
        log.warn(f"Checkpoint ditemukan  →  {len(resumed_keys)} URL sudah pernah dicek, akan di-skip")
    else:
        log.info("Tidak ada checkpoint — mulai dari awal")

    # ── SORT BY TLD PRIORITY ──
    url_list_sorted = sort_by_tld_priority(url_list)

    # Hitung breakdown TLD setelah sorting untuk preview
    from collections import Counter
    tld_counts = Counter(
        extract_tld(normalize_url(u)) for u in url_list_sorted
    )
    log.section("URUTAN PRIORITAS TLD")
    shown = 0
    for tld in TLD_PRIORITY_ORDER:
        if tld in tld_counts:
            log.info(f"  {tld:<12}  →  {tld_counts[tld]} URL")
            shown += 1
    # Tampilkan TLD lain yang tidak ada di priority list
    for tld, cnt in sorted(tld_counts.items()):
        if tld not in TLD_PRIORITY_ORDER:
            log.info(f"  {tld:<12}  →  {cnt} URL  (unlisted)")
    print()

    log.section("MEMULAI PEMERIKSAAN URL")
    print()

    results       = []
    resumed_count = 0

    for url_raw in tqdm(url_list_sorted, desc="  Progress", unit="url",
                        bar_format="  {l_bar}{bar:30}{r_bar}"):
        url_norm = normalize_url(url_raw)

        # ── RESUME: skip kalau sudah ada di checkpoint ──
        if url_norm in checkpoint:
            res              = checkpoint[url_norm]
            res["check_status"] = "resumed"  # tandai sebagai resumed
            resumed_count   += 1
            log.result(
                url=url_norm, status=res.get("status_code"),
                expired=res.get("expired_domain", "No"),
                illegal=res.get("is_illegal", "No"),
                check_status="resumed",
            )
            results.append(res)
            continue

        # ── CEK BARU ──
        res = check_url(url_raw)
        log.result(
            url=res["url_normalized"], status=res["status_code"],
            expired=res["expired_domain"], illegal=res["is_illegal"],
            check_status=res["check_status"],
        )

        # Simpan ke checkpoint (key = url_normalized)
        checkpoint[url_norm] = res
        save_checkpoint(checkpoint)

        results.append(res)
        time.sleep(delay)

    # ── Build DataFrame ──
    df = pd.DataFrame(results)
    df["illegal_terms_found"] = df["illegal_terms_found"].apply(
        lambda x: ", ".join(x) if isinstance(x, list) else (x or "-")
    )

    # Tambahkan kolom rank prioritas TLD (1-based, untuk referensi)
    priority_map = {tld: i + 1 for i, tld in enumerate(TLD_PRIORITY_ORDER)}
    fallback_rank = len(TLD_PRIORITY_ORDER) + 1
    df["tld_priority_rank"] = df["domain_tld"].apply(
        lambda t: priority_map.get(t, fallback_rank)
    )

    return df, resumed_count


# ══════════════════════════════════════════════════════════════════
# FORM UPLOAD — WIDGET COLAB
# ══════════════════════════════════════════════════════════════════

def build_upload_form():
    clear_output()
    log.banner()

    # Tampilkan info checkpoint kalau ada
    cp = load_checkpoint()
    if cp:
        log.warn(f"Ada checkpoint aktif  →  {len(cp)} URL tersimpan  ({CHECKPOINT_FILE})")
        log.info("Klik 'Reset Checkpoint' untuk mulai ulang dari awal")
    else:
        log.info("Tidak ada checkpoint aktif — siap mulai baru")

    print()

    upload_widget = widgets.FileUpload(
        accept="".join([".csv"]), multiple=False,
        description="📂 Upload CSV", button_style="primary",
        layout=widgets.Layout(width="200px"),
    )

    delay_slider = widgets.FloatSlider(
        value=0.5, min=0.1, max=3.0, step=0.1,
        description="Delay (s):",
        style={"description_width": "80px"},
        layout=widgets.Layout(width="350px"),
    )

    run_btn = widgets.Button(
        description="  🚀  Jalankan / Resume",
        button_style="success",
        layout=widgets.Layout(width="220px", height="38px"),
        style={"font_weight": "bold"},
    )

    reset_btn = widgets.Button(
        description="  🗑️  Reset Checkpoint",
        button_style="warning",
        layout=widgets.Layout(width="200px", height="38px"),
    )

    status_label = widgets.Label(value="⬆️  Upload CSV lalu klik Jalankan. Atau Resume kalau ada checkpoint.")
    output_area  = widgets.Output()

    form = widgets.VBox([
        widgets.HTML("<hr style='border-color:#444'>"),
        widgets.HTML("<b style='font-size:14px'>⚙️  Konfigurasi</b>"),
        upload_widget,
        delay_slider,
        widgets.HTML("<br>"),
        widgets.HBox([run_btn, widgets.HTML("&nbsp;&nbsp;"), reset_btn]),
        status_label,
        widgets.HTML("<hr style='border-color:#444'>"),
        output_area,
    ], layout=widgets.Layout(padding="10px"))

    display(form)

    # ── Handler: Reset Checkpoint ──
    def on_reset_clicked(_):
        with output_area:
            clear_output()
            clear_checkpoint()
            log.success("Checkpoint berhasil dihapus. Upload CSV baru dan klik Jalankan.")
        status_label.value = "🗑️  Checkpoint direset. Siap mulai dari awal."

    reset_btn.on_click(on_reset_clicked)

    # ── Handler: Jalankan / Resume ──
    def on_run_clicked(_):
        with output_area:
            clear_output()

            if not upload_widget.value:
                log.error("Belum ada file yang diupload!")
                return

            uploaded = list(upload_widget.value.values())[0]
            filename = list(upload_widget.value.keys())[0]
            status_label.value = f"⏳  Memproses {filename} ..."

            try:
                log.section(f"FILE  →  {filename}")
                url_list = load_urls_from_csv(uploaded["content"])
            except Exception as e:
                log.error(str(e))
                status_label.value = "❌  Gagal membaca CSV."
                return

            start                  = time.time()
            df_result, resumed_cnt = run_checker(url_list, delay=delay_slider.value)
            duration               = time.time() - start

            log.summary(
                total    = len(df_result),
                ok200    = (df_result["status_code"] == 200).sum(),
                expired  = (df_result["expired_domain"] == "Yes").sum(),
                illegal  = (df_result["is_illegal"] == "Yes").sum(),
                errors   = df_result["error"].notna().sum(),
                resumed  = resumed_cnt,
                duration = duration,
            )

            # Simpan CSV final
            df_result.to_csv(OUTPUT_FILE, index=False)
            log.success(f"CSV disimpan  →  {OUTPUT_FILE}")

            # Hapus checkpoint hanya kalau semua URL sudah dicek (tidak ada yang di-error skip)
            total_done_or_resumed = (
                df_result["check_status"].isin(["done", "resumed"]).sum()
            )
            if total_done_or_resumed == len(df_result):
                clear_checkpoint()
                log.success("Semua URL selesai — checkpoint dihapus otomatis ✓")
            else:
                log.warn("Beberapa URL masih error — checkpoint dipertahankan untuk resume berikutnya")

            # Auto-download
            try:
                from google.colab import files
                files.download(OUTPUT_FILE)
                log.success("Auto-download dimulai ✓")
            except Exception:
                log.warn("Auto-download tidak tersedia. Ambil manual dari panel file Colab.")

            status_label.value = f"✅  Selesai! {len(df_result)} URL | {resumed_cnt} di-resume | {duration:.1f}s"

    run_btn.on_click(on_run_clicked)


# ══════════════════════════════════════════════════════════════════
# JALANKAN
# ══════════════════════════════════════════════════════════════════
build_upload_form()