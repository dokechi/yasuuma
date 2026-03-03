import csv
import json
import math
import os
import urllib.request
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))

DATA_PATH = "data.json"

def fetch_latest_close_stooq_jp(code: str) -> float | None:
    """
    Fetch latest daily close from Stooq CSV.
    Example: https://stooq.pl/q/d/l/?s=7203.jp&i=d
    Returns float close or None.
    """
    ticker = f"{code}.jp"
    url = f"https://stooq.pl/q/d/l/?s={ticker}&i=d"
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception:
        return None

    # CSV: Date,Open,High,Low,Close,Volume
    rows = list(csv.DictReader(raw.splitlines()))
    if not rows:
        return None

    # Find last valid close (some rows might be empty)
    for r in reversed(rows):
        c = (r.get("Close") or "").strip()
        if c and c.lower() != "nan":
            try:
                return float(c)
            except ValueError:
                continue
    return None

def main():
    if not os.path.exists(DATA_PATH):
        raise SystemExit(f"{DATA_PATH} not found")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    today_jst = datetime.now(JST).strftime("%Y-%m-%d")

    changed = 0
    for item in data:
        code = str(item.get("code", "")).strip()
        if not code.isdigit():
            continue

        close = fetch_latest_close_stooq_jp(code)
        if close is None:
            continue

        # 円表示に寄せる（小数は四捨五入）
        price = int(round(close))

        # 更新
        prev = item.get("pricePerShareYen")
        item["pricePerShareYen"] = price

        min_shares = item.get("minSharesForPerk")
        try:
            min_shares_int = int(min_shares)
        except Exception:
            min_shares_int = 1

        item["needMoneyPerkYen"] = price * max(1, min_shares_int)
        item["lastChecked"] = today_jst

        if prev != price:
            changed += 1

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"updated items: {changed}")

if __name__ == "__main__":
    main()
