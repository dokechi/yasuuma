import csv
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Any

JST = timezone(timedelta(hours=9))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data.json")
MONEY_PATH = os.path.join(ROOT, "money.json")
SITE_CONFIG_PATH = os.path.join(ROOT, "site_config.json")

SHEET_YUTAI = "01_優待マスタ"
SHEET_MONEY = "02_money_固定費導線"
SHEET_CTA = "03_CTA_アフィ導線"
SHEET_CATEGORY = "04_カテゴリ"
SHEET_DISCLAIMER = "05_免責_文言"
SHEET_SETTING = "06_サイト設定"


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def today_jst() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d")


def extract_spreadsheet_id(value: str) -> str:
    value = (value or "").strip()
    if not value:
        raise SystemExit("ERROR: GSHEET_URL is empty. Add it to GitHub Secrets.")
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", value)
    if m:
        return m.group(1)
    if re.fullmatch(r"[a-zA-Z0-9-_]{20,}", value):
        return value
    raise SystemExit("ERROR: GSHEET_URL must be a Google Sheets URL or spreadsheet ID.")


def normalize_header(s: Any) -> str:
    return str(s or "").strip().replace("\n", "").replace(" ", "").replace("　", "").lower()


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {normalize_header(k): v for k, v in row.items() if str(k or "").strip()}


def pick(row: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        nk = normalize_header(key)
        if nk in row:
            value = row.get(nk)
            if value is not None and str(value).strip() != "":
                return value
    return default


def clean_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def clean_url(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    if text.startswith("http://") or text.startswith("https://"):
        return text
    return ""


def to_int(value: Any, default: int | None = None) -> int | None:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    text = text.replace(",", "").replace("円", "").replace("¥", "").replace("株", "")
    text = re.sub(r"[^0-9.\-]", "", text)
    if not text:
        return default
    try:
        return int(round(float(text)))
    except ValueError:
        return default


def to_bool(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    text = str(value).strip().lower()
    if text == "":
        return default
    if text in {"false", "0", "no", "n", "off", "非表示", "停止", "inactive"}:
        return False
    return True


def split_steps(value: Any) -> list[str]:
    text = clean_text(value)
    if not text:
        return []
    parts = re.split(r"\r?\n|\s*\|\s*|\s*｜\s*", text)
    return [p.strip() for p in parts if p.strip()]


def load_existing_json(path: str) -> Any:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, value: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")


def fetch_csv_sheet(spreadsheet_id: str, sheet_name: str) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"tqx": "out:csv", "sheet": sheet_name})
    url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "yasuuma-gsheet-sync/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8-sig", errors="replace")
    except Exception as e:
        raise RuntimeError(
            f"Failed to read public sheet '{sheet_name}'. "
            f"Use GOOGLE_SERVICE_ACCOUNT_JSON, or make the sheet viewable by link. Details: {e}"
        ) from e
    return list(csv.DictReader(io.StringIO(raw)))


def fetch_with_gspread(spreadsheet_id: str, sheet_name: str) -> list[dict[str, Any]]:
    try:
        import gspread
    except ImportError as e:
        raise RuntimeError("gspread is not installed. Run: pip install -r requirements-gsheet.txt") from e

    creds_raw = env("GOOGLE_SERVICE_ACCOUNT_JSON")
    try:
        creds = json.loads(creds_raw)
    except json.JSONDecodeError as e:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.") from e

    gc = gspread.service_account_from_dict(creds)
    sh = gc.open_by_key(spreadsheet_id)
    try:
        ws = sh.worksheet(sheet_name)
    except Exception as e:
        raise RuntimeError(f"Sheet not found: {sheet_name}") from e
    return ws.get_all_records()


def fetch_sheet(spreadsheet_id: str, sheet_name: str) -> list[dict[str, Any]]:
    if env("GOOGLE_SERVICE_ACCOUNT_JSON"):
        rows = fetch_with_gspread(spreadsheet_id, sheet_name)
    else:
        rows = fetch_csv_sheet(spreadsheet_id, sheet_name)
    return [normalize_row(r) for r in rows]


def try_fetch_sheet(spreadsheet_id: str, sheet_name: str) -> list[dict[str, Any]]:
    try:
        return fetch_sheet(spreadsheet_id, sheet_name)
    except Exception as e:
        print(f"WARN: skipped {sheet_name}: {e}", file=sys.stderr)
        return []


def existing_by_code() -> dict[str, dict[str, Any]]:
    current = load_existing_json(DATA_PATH)
    if not isinstance(current, list):
        return {}
    out = {}
    for item in current:
        code = str(item.get("code", "")).strip()
        if code:
            out[code] = item
    return out


def build_yutai_json(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    old = existing_by_code()
    out: list[dict[str, Any]] = []
    checked_default = today_jst()

    for row in rows:
        if not to_bool(pick(row, "is_active", "表示", "有効", default=True)):
            continue

        code = clean_text(pick(row, "code", "証券コード", "銘柄コード"))
        name = clean_text(pick(row, "name", "会社名", "銘柄名"))
        perk = clean_text(pick(row, "perk", "優待内容"))
        if not code or not name or not perk:
            continue

        prev = old.get(code, {})
        min_shares = to_int(pick(row, "minSharesForPerk", "min_shares", "必要株数"), 1) or 1
        price = to_int(pick(row, "pricePerShareYen", "price_per_share_yen", "株価"), None)
        if price is None:
            price = to_int(prev.get("pricePerShareYen"), None)

        need_money = to_int(pick(row, "needMoneyPerkYen", "need_money_perk_yen", "必要資金"), None)
        if need_money is None and price is not None:
            need_money = price * max(1, min_shares)
        elif need_money is None:
            need_money = to_int(prev.get("needMoneyPerkYen"), None)

        item: dict[str, Any] = {
            "code": code,
            "name": name,
            "recordMonth": clean_text(pick(row, "recordMonth", "record_month", "権利月")),
            "minSharesForPerk": min_shares,
            "perk": perk,
            "category": clean_text(pick(row, "category", "カテゴリ", "優待カテゴリ")),
            "sourceUrl": clean_url(pick(row, "sourceUrl", "source_url", "参考URL", "出典URL")),
            "pricePerShareYen": price,
            "needMoneyPerkYen": need_money,
            "perkValueYen": to_int(pick(row, "perkValueYen", "perk_value_yen", "優待価値"), None),
            "perkNotes": clean_text(pick(row, "perkNotes", "perk_notes", "holding_period", "長期保有条件", "注意点", "caution")),
            "lastChecked": clean_text(pick(row, "lastChecked", "last_checked", "確認日"), prev.get("lastChecked") or checked_default),
            "priceSource": clean_url(pick(row, "priceSource", "price_source", "株価取得元")) or prev.get("priceSource", ""),
            "officialUrl": clean_url(pick(row, "officialUrl", "official_url", "公式URL")),
            "sourceLabel": clean_text(pick(row, "sourceLabel", "source_label", "出典名")),
            "priceDate": clean_text(pick(row, "priceDate", "price_date", "株価日付"), prev.get("priceDate") or ""),
        }

        cost_band = clean_text(pick(row, "cost_band", "costBand", "必要資金帯"))
        beginner_tag = clean_text(pick(row, "beginner_tag", "beginnerTag", "初心者タグ"))
        cta_type = clean_text(pick(row, "cta_type", "ctaType", "導線タイプ"))
        sort_priority = to_int(pick(row, "sort_priority", "sortPriority", "表示順"), None)
        if cost_band:
            item["costBand"] = cost_band
        if beginner_tag:
            item["beginnerTag"] = beginner_tag
        if cta_type:
            item["ctaType"] = cta_type
        if sort_priority is not None:
            item["sortPriority"] = sort_priority

        out.append(item)

    out.sort(key=lambda x: (x.get("sortPriority", 999999), str(x.get("code", ""))))
    return out


def build_money_json(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        if not to_bool(pick(row, "is_active", "表示", "有効", default=True)):
            continue
        offer_id = clean_text(pick(row, "id", "offer_id", "ID"))
        title = clean_text(pick(row, "title", "タイトル"))
        if not offer_id or not title:
            continue
        item = {
            "id": offer_id,
            "category": clean_text(pick(row, "category", "カテゴリ")),
            "kind": clean_text(pick(row, "kind", "種別")),
            "title": title,
            "fitLabel": clean_text(pick(row, "fitLabel", "fit_label", "向く人")),
            "desc": clean_text(pick(row, "desc", "説明")),
            "monthlySaveMin": to_int(pick(row, "monthlySaveMin", "monthly_save_min", "月間削減額min"), 0) or 0,
            "monthlySaveMax": to_int(pick(row, "monthlySaveMax", "monthly_save_max", "月間削減額max"), 0) or 0,
            "steps": split_steps(pick(row, "steps", "手順")),
            "ctaLabel": clean_text(pick(row, "ctaLabel", "cta_label", "ボタン文言")),
            "affUrl": clean_url(pick(row, "affUrl", "aff_url", "URL", "アフィURL")),
            "note": clean_text(pick(row, "note", "注記")),
        }
        sort_priority = to_int(pick(row, "sort_priority", "sortPriority", "表示順"), None)
        if sort_priority is not None:
            item["sortPriority"] = sort_priority
        out.append(item)
    out.sort(key=lambda x: (x.get("sortPriority", 999999), str(x.get("id", ""))))
    for item in out:
        item.pop("sortPriority", None)
    return out


def build_site_config(spreadsheet_id: str) -> dict[str, Any]:
    categories = try_fetch_sheet(spreadsheet_id, SHEET_CATEGORY)
    ctas = try_fetch_sheet(spreadsheet_id, SHEET_CTA)
    disclaimers = try_fetch_sheet(spreadsheet_id, SHEET_DISCLAIMER)
    settings_rows = try_fetch_sheet(spreadsheet_id, SHEET_SETTING)

    settings: dict[str, str] = {}
    for row in settings_rows:
        key = clean_text(pick(row, "key", "設定名"))
        value = clean_text(pick(row, "value", "値"))
        if key:
            settings[key] = value

    return {
        "generatedAt": datetime.now(JST).isoformat(),
        "categories": [r for r in categories if to_bool(pick(r, "is_active", "表示", "有効", default=True))],
        "ctas": [r for r in ctas if to_bool(pick(r, "is_active", "表示", "有効", default=True))],
        "disclaimers": [r for r in disclaimers if to_bool(pick(r, "is_active", "表示", "有効", default=True))],
        "settings": settings,
    }


def main() -> None:
    spreadsheet_id = extract_spreadsheet_id(env("GSHEET_URL") or env("GSHEET_ID"))

    yutai_rows = fetch_sheet(spreadsheet_id, SHEET_YUTAI)
    money_rows = fetch_sheet(spreadsheet_id, SHEET_MONEY)

    data_json = build_yutai_json(yutai_rows)
    money_json = build_money_json(money_rows)
    site_config = build_site_config(spreadsheet_id)

    write_json(DATA_PATH, data_json)
    write_json(MONEY_PATH, money_json)
    write_json(SITE_CONFIG_PATH, site_config)

    print(f"data.json: {len(data_json)} items")
    print(f"money.json: {len(money_json)} items")
    print("site_config.json: generated")

    if not data_json:
        raise SystemExit("ERROR: data.json is empty. Check 01_優待マスタ headers and is_active values.")
    if not money_json:
        raise SystemExit("ERROR: money.json is empty. Check 02_money_固定費導線 headers and is_active values.")


if __name__ == "__main__":
    main()
