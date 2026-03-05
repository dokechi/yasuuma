import csv
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
DATA_PATH = "data.json"

DOMAINS = [
    "https://stooq.com",
    "https://stooq.pl",
]

SUFFIXES = [
    ".jp",  # common in Stooq examples
    ".t",   # sometimes used by data vendors
]

UA = "Mozilla/5.0 (compatible; yasuuma-bot/1.0; +https://github.com/)"

def _fetch_text(url: str) -> str | None:
    """Fetch URL and return text, or None on error."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return None

def _looks_like_html(text: str) -> bool:
    t = text.lstrip().lower()
    return t.startswith("<!doctype") or t.startswith("<html") or t.startswith("<")

def _parse_latest_close_from_quote_csv(raw: str) -> float | None:
    """
    Parse Stooq 'quote' CSV response:
      https://stooq.com/q/l/?s=7203.jp&f=sd2t2ohlcv&h&e=csv
    """
    rows = list(csv.DictReader(raw.splitlines()))
    if not rows:
        return None
    r = rows[-1]
    # Key might be Close / CLOSE depending on response
    for k in ("Close", "CLOSE", "close"):
        if k in r and str(r[k]).strip():
            try:
                return float(str(r[k]).strip())
            except ValueError:
                return None
    return None

def _parse_latest_close_from_daily_csv(raw: str) -> float | None:
    """
    Parse Stooq 'daily history' CSV response:
      https://stooq.com/q/d/l/?s=7203.jp&i=d
    """
    rows = list(csv.DictReader(raw.splitlines()))
    if not rows:
        return None
    for r in reversed(rows):
        c = (r.get("Close") or r.get("CLOSE") or r.get("close") or "").strip()
        if c and c.lower() != "nan":
            try:
                return float(c)
            except ValueError:
                continue
    return None

def fetch_latest_close(code: str) -> float | None:
    """
    Try multiple domains/suffixes/endpoints to get latest close.
    Returns close price (float) or None.
    """
    code = code.strip()
    if not code.isdigit():
        return None

    for suffix in SUFFIXES:
        ticker = f"{code}{suffix}"
        for domain in DOMAINS:
            # 1) quote endpoint (fast)
            quote_url = f"{domain}/q/l/?s={ticker}&f=sd2t2ohlcv&h&e=csv"
            raw = _fetch_text(quote_url)
            if raw and not _looks_like_html(raw):
                close = _parse_latest_close_from_quote_csv(raw)
                if close is not None:
                    return close

            # 2) daily history endpoint (fallback)
            daily_url = f"{domain}/q/d/l/?s={ticker}&i=d"
            raw = _fetch_text(daily_url)
            if raw and not _looks_like_html(raw):
                close = _parse_latest_close_from_daily_csv(raw)
                if close is not None:
                    return close

    return None

def main() -> int:
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] {DATA_PATH} not found", file=sys.stderr)
        return 2

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    today_jst = datetime.now(JST).strftime("%Y-%m-%d")

    fetched = 0
    changed = 0
    failed_codes = []

    for item in data:
        code = str(item.get("code", "")).strip()
        close = fetch_latest_close(code)
        if close is None:
            failed_codes.append(code)
            continue

        fetched += 1
        price = int(round(close))

        prev = item.get("pricePerShareYen")
        item["pricePerShareYen"] = price

        try:
            min_shares = int(item.get("minSharesForPerk") or 1)
        except Exception:
            min_shares = 1
        min_shares = max(1, min_shares)

        item["needMoneyPerkYen"] = price * min_shares
        item["lastChecked"] = today_jst

        if prev != price:
            changed += 1

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"fetched prices: {fetched} / {len(data)}")
    print(f"updated items (price changed or first fill): {changed}")

    # If we couldn't fetch ANY price, fail the workflow so it's obvious.
    if fetched == 0:
        print("[ERROR] Could not fetch prices for any code. Check Stooq availability or ticker suffix.", file=sys.stderr)
        # Print a few sample failures to make debugging easier.
        sample = [c for c in failed_codes if c][:10]
        if sample:
            print("[ERROR] Sample failed codes:", ", ".join(sample), file=sys.stderr)
        return 1

    # Succeed even if some codes failed (partial update is still useful)
    if failed_codes:
        sample = [c for c in failed_codes if c][:10]
        print("warning: failed codes (sample):", ", ".join(sample))

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
