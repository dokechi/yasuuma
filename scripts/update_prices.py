import csv
import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data.json")


def _fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; yasuuma-bot/1.0)"}
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        return None


def _parse_latest_daily_from_csv(raw: str) -> tuple[str | None, float | None]:
    rows = list(csv.DictReader(raw.splitlines()))
    if not rows:
        return None, None

    for r in reversed(rows):
        d = (r.get("Date") or "").strip()
        c = (r.get("Close") or "").strip()
        if d and c and c.lower() != "nan":
            try:
                return d, float(c)
            except ValueError:
                continue

    return None, None


def fetch_latest_close(code: str) -> tuple[str | None, float | None, str]:
    """
    Returns (price_date, close, used_url)
    """
    tickers = [f"{code}.jp", f"{code}.t"]
    bases = ["https://stooq.com", "https://stooq.pl"]

    # 1) single quote endpoint
    for base in bases:
        for tkr in tickers:
            url = f"{base}/q/l/?s={tkr}&f=sd2t2ohlcv&h&e=csv"
            raw = _fetch(url)
            if not raw:
                continue
            price_date, close = _parse_latest_daily_from_csv(raw)
            if close is not None:
                return price_date, close, url

    # 2) daily quotes endpoint
    for base in bases:
        for tkr in tickers:
            url = f"{base}/q/d/l/?s={tkr}&i=d"
            raw = _fetch(url)
            if not raw:
                continue
            price_date, close = _parse_latest_daily_from_csv(raw)
            if close is not None:
                return price_date, close, url

    return None, None, ""


def main():
    if not os.path.exists(DATA_PATH):
        raise SystemExit(f"{DATA_PATH} not found")

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    today_jst = datetime.now(JST).strftime("%Y-%m-%d")

    changed = 0
    fetched = 0
    failed = []

    for item in data:
        code = str(item.get("code", "")).strip()
        if not code.isdigit():
            failed.append((code, "code_not_digit", ""))
            continue

        price_date, close, used = fetch_latest_close(code)
        if close is None:
            failed.append((code, "no_close", used))
            continue

        fetched += 1
        price = int(round(close))
        prev = item.get("pricePerShareYen")

        item["pricePerShareYen"] = price

        try:
            min_shares_int = int(item.get("minSharesForPerk") or 1)
        except Exception:
            min_shares_int = 1

        item["needMoneyPerkYen"] = price * max(1, min_shares_int)
        item["lastChecked"] = today_jst
        item["priceDate"] = price_date
        item["priceSource"] = used

        if prev != price:
            changed += 1

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"fetched prices: {fetched}/{len(data)}")
    print(f"updated items: {changed}")

    if failed:
        print("fail sample (up to 10):")
        for code, reason, used in failed[:10]:
            print(f"  code={code} reason={reason} url={used}")

    if fetched == 0:
        raise SystemExit("ERROR: fetched prices is 0. Stooq blocked/unreachable or tickers not found.")


if __name__ == "__main__":
    main()
