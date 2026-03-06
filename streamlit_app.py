import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import StringIO
from pathlib import Path
from typing import Optional

import pandas as pd
import streamlit as st


# ============================================================
# APP CONFIG
# ============================================================
st.set_page_config(page_title="Brightvision Ads Insights", page_icon="📊", layout="wide")


# ============================================================
# BRAND / THEME
# ============================================================
BV_RED = "#E2231A"
BG = "#FFFFFF"
TEXT = "#0B0F19"
MUTED = "#6B7280"
CARD_BG = "#FFFFFF"
BORDER = "rgba(15, 23, 42, 0.10)"
SHADOW = "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)"


def inject_css():
    st.markdown(
        f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap');

html, body, [class*="css"] {{
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: {TEXT};
}}
h1, h2, h3, h4, h5, h6 {{
  font-family: 'Space Grotesk', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  letter-spacing: -0.02em;
}}

/* Sidebar sizing */
section[data-testid="stSidebar"] {{
  width: 256px !important;
}}
section[data-testid="stSidebar"] > div {{
  background: {BG};
  border-right: 1px solid {BORDER};
}}

/* Streamlit topbar can overlap first element */
.block-container {{
  padding-top: 4.5rem;
  padding-bottom: 3rem;
}}

/* Cards */
.bv-card {{
  background: {CARD_BG};
  border: 1px solid {BORDER};
  border-radius: 14px;
  padding: 16px;
  box-shadow: {SHADOW};
}}
.bv-kpi-label {{
  font-size: 12px;
  color: {MUTED};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}}
.bv-kpi-value {{
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
}}
.bv-pill {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid {BORDER};
  background: rgba(226, 35, 26, 0.08);
  color: {BV_RED};
  font-size: 12px;
  font-weight: 700;
}}
.bv-nav a {{
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  color: {TEXT};
  text-decoration: none;
  border: 1px solid transparent;
}}
.bv-nav a:hover {{
  background: rgba(2, 6, 23, 0.04);
}}
.bv-nav a.active {{
  background: rgba(226, 35, 26, 0.08);
  border-color: rgba(226, 35, 26, 0.22);
  color: {BV_RED};
  font-weight: 700;
}}
.bv-progress {{
  height: 10px;
  background: rgba(2, 6, 23, 0.06);
  border-radius: 999px;
  overflow: hidden;
}}
.bv-progress > span {{
  display: block;
  height: 100%;
  background: {BV_RED};
}}
.bv-badge {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}}
.bv-badge-red {{
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.25);
  color: rgb(185, 28, 28);
}}
.bv-badge-yellow {{
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.25);
  color: rgb(161, 98, 7);
}}
.bv-muted {{
  color: {MUTED};
}}
</style>
""",
        unsafe_allow_html=True,
    )


inject_css()


# ============================================================
# DATA: LOAD LOCAL CSVs + FLEXIBLE SCHEMA MAPPING
# ============================================================
START_DATE_ALIASES = [
    "start_date",
    "start",
    "startdatum",
    "period_start",
    "start_date_",
    "startdate",
    # New sheet (Forecasting - Mutual)
    "ad_set_start_date",
    "campaign_group_start_date",
]
END_DATE_ALIASES = [
    "end_date",
    "end",
    "slutdatum",
    "period_end",
    "end_date_",
    "enddate",
    # New sheet (Forecasting - Mutual)
    "ad_set_end_date",
    "campaign_group_end_date",
]

# LinkedIn export: "Daily Budget" (do NOT treat as total budget)
DAILY_BUDGET_ALIASES = [
    "daily_budget",
    # New sheet (Forecasting - Mutual)
    "ad_set_daily_budget_set",
    "campaign_group_daily_budget_set",
]
BUDGET_ALIASES = [
    # Prefer ad-set budget when available, then fall back to group budget
    "ad_set_budget_applied",
    "campaign_group_budget_applied",
    "total_budget",
    "budget",
    "total_budget_",
    "planned_spend",
    "lifetime_budget",
    "current_budget",
    "current_budget_total",
    "current_total",
    "assigned_budget",
]
SPENT_ALIASES = [
    "ad_set_spend_to_date",
    "campaign_group_spend_to_date",
    "total_spent",
    "spent_to_date",
    "spent",
    "spend",
    "amount_spent",
    "cost",
    "current_spend",
    "current_budget_utilisation",
]
STATUS_ALIASES = [
    "ad_set_status_internal",
    "campaign_group_status_internal",
    "ad_set_status_platform",
    "campaign_group_status_platform",
    "status",
    "current_status",
    "off_on",
]
GROUP_ALIASES = ["group", "campaign_group_name", "campaign_group", "campaign_group_budget", "campaign_group_name_"]
CAMPAIGN_ALIASES = ["ad_set_name", "campaign_name", "campaign"]

PLATFORM_ALIASES = ["platform"]
ACCOUNT_ALIASES = ["account_id", "account"]

# LinkedIn export: "Currency"
CURRENCY_ALIASES = ["currency", "account_currency"]


def normalize_colname(name: str) -> str:
    s = str(name).strip().lower()
    s = s.replace("→", "to")
    s = re.sub(r"[^\w]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def first_existing_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def col_as_1d(df: pd.DataFrame, col: Optional[str], default: object = None) -> pd.Series:
    if col is None or col not in df.columns:
        return pd.Series([default] * len(df), index=df.index)
    sel = df.loc[:, col]
    if isinstance(sel, pd.DataFrame):
        if sel.shape[1] == 0:
            return pd.Series([default] * len(df), index=df.index)
        # Always return a 1D Series (never a scalar), even for single-row dataframes.
        out = sel.iloc[:, 0]
        return out if isinstance(out, pd.Series) else pd.Series([out] * len(df), index=df.index)
    # Always return a 1D Series (never a scalar), even for single-row dataframes.
    return sel if isinstance(sel, pd.Series) else pd.Series([sel] * len(df), index=df.index)


def parse_date(series: pd.Series) -> pd.Series:
    # Primary format across provided CSVs is MM/DD/YYYY (e.g. 9/16/2025).
    # We parse with an explicit format first to avoid pandas' "Could not infer format"
    # warning, then fall back to a flexible parser for any remaining values.
    s = series.astype(str).str.strip()
    s = s.replace(
        {
            "": pd.NA,
            "-": pd.NA,
            "—": pd.NA,
            "nan": pd.NA,
            "NaN": pd.NA,
            "None": pd.NA,
        }
    )

    parsed = pd.to_datetime(s, format="%m/%d/%Y", errors="coerce")

    # Fallback: parse remaining values using pandas' flexible "mixed" parser.
    mask = parsed.isna() & s.notna()
    if mask.any():
        parsed.loc[mask] = pd.to_datetime(s[mask], format="mixed", errors="coerce")

    # Final fallback: try day-first for any leftovers (covers occasional DD/MM/YYYY).
    mask2 = parsed.isna() & s.notna()
    if mask2.any():
        parsed.loc[mask2] = pd.to_datetime(s[mask2], format="mixed", dayfirst=True, errors="coerce")

    out = parsed.dt.date
    # Ensure missing values become None (not NaT) to keep downstream logic clean.
    out = out.where(parsed.notna(), None)
    return out


def round2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def to_decimal(value: object) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    s = str(value).strip()
    if s == "":
        return None
    try:
        s = s.replace(" ", "")
        if "," in s and "." not in s:
            s = s.replace(",", ".")
        s = re.sub(r"[^\d\.\-]", "", s)
        if s in ("", "-", ".", "-."):
            return None
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def series_to_cents(series: pd.Series) -> pd.Series:
    def _one(v: object) -> int:
        d = to_decimal(v)
        if d is None:
            return 0
        return int(round2(d) * 100)

    return series.apply(_one).astype("int64")


@st.cache_data(ttl=300)
def load_all_csvs() -> pd.DataFrame:
    base_dir = Path(__file__).resolve().parent
    # New source-of-truth baseline.
    # We no longer scan for legacy "Copy of Budgets*.csv" exports.
    paths: list[Path] = []
    mutual = base_dir / "Forecasting - Mutual.csv"
    if mutual.exists():
        paths.append(mutual)

    if not paths:
        return pd.DataFrame()

    frames: list[pd.DataFrame] = []
    for p in paths:
        df = read_csv_with_header_detection(p)
        df["__source_file"] = p.name
        frames.append(df)
    combined = pd.concat(frames, ignore_index=True, sort=False)
    combined = drop_duplicate_header_rows(combined)
    return combined


def read_csv_with_header_detection(path: Path) -> pd.DataFrame:
    text = path.read_text(encoding="utf-8", errors="replace")
    df = read_csv_text_with_header_detection(text)
    df = df.dropna(axis=1, how="all")
    df.columns = [str(c).strip() for c in df.columns]
    return df


def read_csv_text_with_header_detection(text: str) -> pd.DataFrame:
    """
    Read CSV text and detect the header row (first non-empty, comma-containing line with letters).
    This mirrors how many of the provided CSV exports include leading blank rows.
    """
    lines = str(text).splitlines()
    header_idx = 0
    for i, line in enumerate(lines):
        if line.strip() == "" or set(line.strip()) <= {","}:
            continue
        if "," in line and re.search(r"[A-Za-z]", line):
            header_idx = i
            break
    return pd.read_csv(StringIO(text), skiprows=header_idx, header=0)


def load_uploaded_csvs(uploaded_files, platform_by_filename: Optional[dict[str, str]] = None) -> pd.DataFrame:
    """
    Parse uploaded Streamlit CSV files and return a concatenated dataframe.
    Additive: these rows will later be appended to the locally discovered CSVs.
    """
    if not uploaded_files:
        return pd.DataFrame()

    frames: list[pd.DataFrame] = []
    for uf in uploaded_files:
        try:
            # Streamlit UploadedFile supports .getvalue()
            raw = uf.getvalue()
            if isinstance(raw, bytes):
                text = raw.decode("utf-8", errors="replace")
            else:
                text = str(raw)
            df = read_csv_text_with_header_detection(text)
            filename = getattr(uf, "name", "uploaded.csv")
            df["__source_file"] = filename

            # Platform confirmation step (required): stamp every row with the user-confirmed platform.
            # This avoids unreliable inference from filenames/keywords and prevents everything being "Other".
            if platform_by_filename and filename in platform_by_filename:
                df["platform"] = platform_by_filename[filename]
            frames.append(df)
        except Exception:
            # Keep going even if one file fails to parse
            continue

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True, sort=False)
    combined = drop_duplicate_header_rows(combined)
    return combined


def drop_duplicate_header_rows(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    cols = list(df.columns)
    cols_l = [str(c).strip().lower() for c in cols]

    def is_header_row(row: pd.Series) -> bool:
        matches = 0
        for c, cl in zip(cols, cols_l):
            vs = str(row.get(c, "")).strip().lower()
            if cl and vs == cl:
                matches += 1
        return matches >= max(2, int(len(cols) * 0.5))

    return df.loc[~df.apply(is_header_row, axis=1)].reset_index(drop=True)


def split_hierarchy_from_group(group_path: pd.Series) -> pd.DataFrame:
    s = group_path.astype(str).fillna("").replace("nan", "")
    segs = s.str.split(r"\s*/\s*|\s*\|\s*|\s+I\s+", expand=True)
    for i in range(3):
        if segs.shape[1] <= i:
            segs[i] = ""
    return pd.DataFrame(
        {
            "customer": segs.iloc[:, 0].fillna(""),
            "industry": segs.iloc[:, 1].fillna(""),
            "program": segs.iloc[:, 2].fillna(""),
        }
    )


def infer_platform(text_series: pd.Series) -> pd.Series:
    t = text_series.astype(str).str.lower().fillna("")
    platform = pd.Series(["Other"] * len(t), index=t.index, dtype="string")
    platform[t.str.contains("linkedin|convo|spotlight|si ads|thought leadership", na=False)] = "LinkedIn"
    platform[t.str.contains("google|search|pmax|performance max|display|rda", na=False)] = "Google"
    platform[t.str.contains("meta|facebook|instagram", na=False)] = "Meta"
    return platform


def map_platform_explicit(platform_series: pd.Series) -> pd.Series:
    """
    Map explicit platform column values to our internal channel names.
    """
    t = platform_series.astype(str).str.lower().fillna("")
    out = pd.Series(["Other"] * len(t), index=t.index, dtype="string")
    out[t.str.contains("linkedin", na=False)] = "LinkedIn"
    out[t.str.contains("google", na=False)] = "Google"
    out[t.str.contains("meta|facebook|instagram", na=False)] = "Meta"
    return out


def build_internal_table(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Output columns:
      customer, channel, campaign, group,
      start_date, end_date,
      total_budget_cents, total_spent_cents,
      status, source_file
    """
    if raw.empty:
        return pd.DataFrame()

    df = raw.copy()
    df = df.rename(columns={c: normalize_colname(c) for c in df.columns})

    platform_col = first_existing_col(df, PLATFORM_ALIASES)
    account_col = first_existing_col(df, ACCOUNT_ALIASES)
    currency_col = first_existing_col(df, CURRENCY_ALIASES)
    group_col = first_existing_col(df, GROUP_ALIASES)
    camp_col = first_existing_col(df, CAMPAIGN_ALIASES)
    budget_col = first_existing_col(df, BUDGET_ALIASES)
    daily_budget_col = first_existing_col(df, DAILY_BUDGET_ALIASES)
    spent_col = first_existing_col(df, SPENT_ALIASES)
    status_col = first_existing_col(df, STATUS_ALIASES)
    start_col = first_existing_col(df, START_DATE_ALIASES)
    end_col = first_existing_col(df, END_DATE_ALIASES)

    group_path = col_as_1d(df, group_col, default="")
    campaign = col_as_1d(df, camp_col, default="")
    platform_raw = col_as_1d(df, platform_col, default="")
    account_raw = col_as_1d(df, account_col, default="")
    currency_raw = col_as_1d(df, currency_col, default="")
    budget_raw = col_as_1d(df, budget_col, default=0)
    daily_budget_raw = col_as_1d(df, daily_budget_col, default=0)
    spent_raw = col_as_1d(df, spent_col, default=0)
    status_raw = col_as_1d(df, status_col, default="")
    start_raw = col_as_1d(df, start_col, default=None)
    end_raw = col_as_1d(df, end_col, default=None)

    # Flatten + validate types
    start_date = parse_date(start_raw)
    end_date = parse_date(end_raw)

    total_budget_cents = series_to_cents(budget_raw)
    daily_budget_set_cents = series_to_cents(daily_budget_raw)
    total_spent_cents = series_to_cents(spent_raw)

    # Hierarchy: use Group to extract customer/channel-ish, then infer platform from combined text
    hier = split_hierarchy_from_group(group_path)
    combined_text = group_path.astype(str) + " " + campaign.astype(str)
    channel = map_platform_explicit(platform_raw) if platform_col else infer_platform(combined_text)

    # Prefer explicit account_id for customer when provided, otherwise fallback to hierarchy extraction
    customer = account_raw.astype(str).fillna("").replace("nan", "")
    customer = customer.where(customer.str.strip() != "", hier["customer"].astype(str).fillna(""))

    out = pd.DataFrame(
        {
            "customer": customer,
            "industry": hier["industry"].astype(str).fillna(""),
            "program": hier["program"].astype(str).fillna(""),
            "channel": channel.astype(str).fillna("Other"),
            "currency": currency_raw.astype(str).fillna(""),
            "group": group_path.astype(str).fillna(""),
            "campaign": campaign.astype(str).fillna(""),
            "status": status_raw.astype(str).fillna(""),
            "start_date": start_date,
            "end_date": end_date,
            "total_budget_cents": total_budget_cents,
            "daily_budget_set_cents": daily_budget_set_cents,
            "total_spent_cents": total_spent_cents,
            "source_file": col_as_1d(df, "__source_file", default="").astype(str),
        }
    )

    # Drop obvious totals
    def is_totalish(x: object) -> bool:
        t = str(x).strip().lower()
        return t.startswith("total") or t in {"tot", "sum", "grand_total"}

    mask_total = out["group"].apply(is_totalish) | out["campaign"].apply(is_totalish)
    out = out.loc[~mask_total].copy()

    # Drop rows with no identifiable group/campaign after mapping
    out = out.loc[~((out["group"].str.strip() == "") & (out["campaign"].str.strip() == ""))].copy()

    # If campaign empty, use group as a fallback label
    out.loc[out["campaign"].str.strip() == "", "campaign"] = out["group"]

    return out


def validate_internal_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validation gate before calculations.
    If required base values are missing/invalid, we flag rows and exclude them from KPIs/metrics.
    Required:
      - total_budget_cents > 0
      - start_date and end_date parseable, and end_date >= start_date
      - total_spent_cents >= 0
    """
    if df.empty:
        return df

    start_dt = pd.to_datetime(df["start_date"], errors="coerce")
    end_dt = pd.to_datetime(df["end_date"], errors="coerce")

    budget_invalid = df["total_budget_cents"].astype("int64") <= 0
    spend_invalid = df["total_spent_cents"].astype("int64") < 0
    dates_invalid = start_dt.isna() | end_dt.isna() | (end_dt < start_dt)

    is_valid = ~(budget_invalid | spend_invalid | dates_invalid)

    def build_error(i: int) -> str:
        errs: list[str] = []
        if bool(budget_invalid.iloc[i]):
            errs.append("Missing/invalid budget")
        if bool(spend_invalid.iloc[i]):
            errs.append("Missing/invalid spend")
        if bool(dates_invalid.iloc[i]):
            errs.append("Missing/invalid dates")
        return ", ".join(errs)

    out = df.copy()
    out["is_valid"] = is_valid.astype("bool")
    out["validation_error"] = [build_error(i) if not bool(is_valid.iloc[i]) else "" for i in range(len(df))]
    return out


def split_valid_invalid(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    if df.empty or "is_valid" not in df.columns:
        return df, pd.DataFrame()
    valid = df.loc[df["is_valid"] == True].copy()  # noqa: E712
    invalid = df.loc[df["is_valid"] != True].copy()
    return valid, invalid


# ============================================================
# SETTINGS / ALERTS (session_state)
# ============================================================
if "alert_enabled" not in st.session_state:
    st.session_state.alert_enabled = True
if "alert_threshold" not in st.session_state:
    st.session_state.alert_threshold = 0.90
if "forecast_threshold" not in st.session_state:
    st.session_state.forecast_threshold = 1.05  # 5% overrun
if "show_debug" not in st.session_state:
    st.session_state.show_debug = False


# ============================================================
# CORE BUSINESS LOGIC: METRIC CALCULATIONS
# ============================================================
def compute_utilization(df: pd.DataFrame) -> pd.Series:
    """
    Utilization % = (spentToDate / totalBudget) × 100
    Returns as a ratio (0.0-1.0+)
    """
    budget = df["total_budget_cents"].astype("int64")
    spent = df["total_spent_cents"].astype("int64")
    util = pd.Series([0.0] * len(df), index=df.index, dtype="float64")
    mask = budget > 0
    util.loc[mask] = (spent.loc[mask] / budget.loc[mask]).astype("float64")
    return util.clip(lower=0.0)


def compute_active_days(df: pd.DataFrame) -> pd.Series:
    """
    Active Days = totalDays - pausedDays
    For now, pausedDays = 0 (no pause window data in CSVs)
    """
    today = pd.Timestamp.today().date()
    start = parse_date(df["start_date"]).fillna(today)
    end = parse_date(df["end_date"]).fillna(today)
    
    total_days = (pd.to_datetime(end) - pd.to_datetime(start)).dt.days + 1
    total_days = total_days.clip(lower=1)
    
    # TODO: subtract pausedDays when pause window data is available
    paused_days = 0
    return (total_days - paused_days).clip(lower=0)


def compute_elapsed_active_days(df: pd.DataFrame) -> pd.Series:
    """
    Days elapsed from start_date to min(today, end_date)
    """
    today = pd.Timestamp.today().date()
    start = parse_date(df["start_date"]).fillna(today)
    end = parse_date(df["end_date"]).fillna(today)
    
    elapsed_end = pd.Series([min(today, e) for e in end], index=df.index)
    elapsed = (pd.to_datetime(elapsed_end) - pd.to_datetime(start)).dt.days + 1
    return elapsed.clip(lower=1)


def compute_remaining_active_days(df: pd.DataFrame) -> pd.Series:
    """
    Days remaining from min(today, end_date) to end_date
    """
    today = pd.Timestamp.today().date()
    end = parse_date(df["end_date"]).fillna(today)
    
    elapsed_end = pd.Series([min(today, e) for e in end], index=df.index)
    remaining = (pd.to_datetime(end) - pd.to_datetime(elapsed_end)).dt.days
    return remaining.clip(lower=0)


def compute_avg_daily_spend_cents(df: pd.DataFrame) -> pd.Series:
    """
    avgDailySpend = spentToDate / elapsedActiveDays
    """
    elapsed = compute_elapsed_active_days(df)
    spent = df["total_spent_cents"].astype("int64")
    return (spent / elapsed).astype("float64")


def compute_daily_budget_cents(df: pd.DataFrame) -> pd.Series:
    """
    dailyBudget = totalBudget / activeDays
    """
    if "daily_budget_set_cents" in df.columns:
        set_daily = df["daily_budget_set_cents"].astype("int64")
        mask = set_daily > 0
        out = pd.Series([0.0] * len(df), index=df.index, dtype="float64")
        out.loc[mask] = set_daily.loc[mask].astype("float64")
        if (~mask).any():
            active_days = compute_active_days(df.loc[~mask])
            budget = df.loc[~mask, "total_budget_cents"].astype("int64")
            out.loc[~mask] = (budget / active_days).astype("float64")
        return out

    active_days = compute_active_days(df)
    budget = df["total_budget_cents"].astype("int64")
    return (budget / active_days).astype("float64")


def compute_forecast_cents(df: pd.DataFrame) -> pd.Series:
    """
    Forecasted Spend = spentToDate + (avgDailySpend × activeDaysRemaining)
    """
    spent = df["total_spent_cents"].astype("int64")
    avg_daily = compute_avg_daily_spend_cents(df)
    remaining = compute_remaining_active_days(df)
    
    forecast = spent + (avg_daily * remaining).round().astype("int64")
    return forecast.clip(lower=0)


# ============================================================
# ALERT LOGIC: THREE-TIER SYSTEM
# ============================================================
def compute_alert_level(row: pd.Series) -> str:
    """
    Returns: 'critical', 'warning', or ''
    
    Critical: Utilization ≥ threshold OR Unexpected Status
    Warning: Forecast Overrun ≥ forecast_threshold
    """
    if not st.session_state.alert_enabled:
        return ""
    
    utilization = float(row.get("utilization", 0.0))
    forecast_cents = int(row.get("forecast_cents", 0))
    budget_cents = int(row.get("total_budget_cents", 1))
    status = str(row.get("status", "")).strip().lower()
    
    # Critical: Budget exceeded or unexpected stop
    if utilization >= st.session_state.alert_threshold:
        return "critical"
    
    unexpected_statuses = {"stopped", "ended", "paused", "off"}
    today = pd.Timestamp.today().date()
    end_date = row.get("end_date", today)
    if isinstance(end_date, str):
        end_date = parse_date(pd.Series([end_date])).iloc[0]
    if end_date is None:
        end_date = today
    
    # Unexpected stop: campaign is stopped but end_date is in future
    if status in unexpected_statuses and end_date > today:
        return "critical"
    
    # Warning: Forecast overrun
    forecast_ratio = float(forecast_cents / budget_cents) if budget_cents > 0 else 0.0
    if forecast_ratio >= st.session_state.forecast_threshold:
        return "warning"
    
    return ""


def alert_badge(alert_level: str) -> str:
    """
    Renders HTML badge for alert level
    """
    if alert_level == "critical":
        return '<span class="bv-badge bv-badge-red">● Critical</span>'
    elif alert_level == "warning":
        return '<span class="bv-badge bv-badge-yellow">● Warning</span>'
    return ""


# ============================================================
# HIERARCHY METRICS: AGGREGATIONS
# ============================================================
@dataclass
class HierarchyMetrics:
    """Container for hierarchical budget metrics"""
    customer: str
    assigned_budget_cents: int
    current_spend_cents: int
    utilization: float
    forecast_cents: int
    alert_level: str


def compute_customer_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Customer Level: assignedBudget, currentSpend, utilization
    """
    agg = df.groupby("customer", dropna=False).agg({
        "total_budget_cents": "sum",
        "total_spent_cents": "sum",
    }).reset_index()
    
    agg["utilization"] = agg.apply(
        lambda r: float(r["total_spent_cents"] / r["total_budget_cents"]) if r["total_budget_cents"] > 0 else 0.0,
        axis=1
    )
    
    return agg


def compute_channel_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Channel Level: allocatedBudget, currentSpend, allocation %
    """
    agg = df.groupby("channel", dropna=False).agg({
        "total_budget_cents": "sum",
        "total_spent_cents": "sum",
    }).reset_index()
    
    total_all_channels = agg["total_budget_cents"].sum()
    
    agg["utilization"] = agg.apply(
        lambda r: float(r["total_spent_cents"] / r["total_budget_cents"]) if r["total_budget_cents"] > 0 else 0.0,
        axis=1
    )
    
    agg["allocation_pct"] = agg.apply(
        lambda r: float(r["total_budget_cents"] / total_all_channels * 100) if total_all_channels > 0 else 0.0,
        axis=1
    )
    
    return agg


def compute_campaign_group_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Campaign Group Level: assignedBudget, currentSpend
    """
    agg = df.groupby(["customer", "channel", "group"], dropna=False).agg({
        "total_budget_cents": "sum",
        "total_spent_cents": "sum",
    }).reset_index()
    
    agg["utilization"] = agg.apply(
        lambda r: float(r["total_spent_cents"] / r["total_budget_cents"]) if r["total_budget_cents"] > 0 else 0.0,
        axis=1
    )
    
    return agg


def compute_campaign_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Campaign Level: totalBudget, dailyBudget, spentToDate, avgDailySpend
    """
    campaigns = df.copy()
    
    # Add calculated metrics
    campaigns["daily_budget_cents"] = compute_daily_budget_cents(campaigns)
    campaigns["avg_daily_spend_cents"] = compute_avg_daily_spend_cents(campaigns)
    campaigns["utilization"] = compute_utilization(campaigns)
    campaigns["forecast_cents"] = compute_forecast_cents(campaigns)
    campaigns["active_days"] = compute_active_days(campaigns)
    campaigns["remaining_days"] = compute_remaining_active_days(campaigns)
    
    # Compute alert level for each campaign
    campaigns["alert_level"] = campaigns.apply(compute_alert_level, axis=1)
    
    return campaigns


def money(cents: int) -> str:
    return f"{Decimal(int(cents)) / Decimal(100):,.2f}"


# ============================================================
# CHARTS (Vega-Lite)
# ============================================================
def vega_donut(values: list[dict], title: str, color_domain: Optional[list[str]] = None, color_range: Optional[list[str]] = None):
    enc_color = {"field": "label", "type": "nominal", "legend": {"title": ""}}
    if color_domain and color_range:
        enc_color["scale"] = {"domain": color_domain, "range": color_range}
    spec = {
        "title": title,
        "data": {"values": values},
        "mark": {"type": "arc", "innerRadius": 62},
        "encoding": {
            "theta": {"field": "value", "type": "quantitative"},
            "color": enc_color,
            "tooltip": [{"field": "label"}, {"field": "value"}],
        },
        "view": {"stroke": None},
    }
    st.vega_lite_chart(spec, use_container_width=True)


def vega_hbar(values: list[dict], title: str):
    spec = {
        "title": title,
        "data": {"values": values},
        "mark": {"type": "bar", "cornerRadiusEnd": 4},
        "encoding": {
            "y": {"field": "label", "type": "nominal", "sort": "-x", "title": ""},
            "x": {"field": "value", "type": "quantitative", "title": ""},
            "color": {"field": "series", "type": "nominal", "legend": {"title": ""}},
            "tooltip": [{"field": "label"}, {"field": "series"}, {"field": "value"}],
        },
        "height": 360,
    }
    st.vega_lite_chart(spec, use_container_width=True)


def vega_area(values: list[dict], title: str):
    spec = {
        "title": title,
        "data": {"values": values},
        "mark": {"type": "area", "line": {"color": BV_RED}, "color": {"value": "rgba(226,35,26,0.20)"}},
        "encoding": {
            "x": {"field": "date", "type": "temporal", "title": ""},
            "y": {"field": "value", "type": "quantitative", "title": ""},
            "tooltip": [{"field": "date"}, {"field": "value"}],
        },
        "height": 260,
    }
    st.vega_lite_chart(spec, use_container_width=True)


# ============================================================
# UI COMPONENTS
# ============================================================
def kpi_card(label: str, value: str, sub: str = ""):
    st.markdown(
        f"""
<div class="bv-card">
  <div class="bv-kpi-label">{label}</div>
  <div class="bv-kpi-value">{value}</div>
  <div class="bv-muted" style="margin-top:6px; font-size:13px;">{sub}</div>
</div>
""",
        unsafe_allow_html=True,
    )


def progress_row(label: str, ratio: float, right: str, color: str = BV_RED):
    pct = max(0.0, min(1.0, float(ratio)))
    st.markdown(
        f"""
<div class="bv-card" style="padding: 12px 14px;">
  <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
    <div style="font-weight:700;">{label}</div>
    <div class="bv-muted" style="font-weight:700;">{right}</div>
  </div>
  <div class="bv-progress" style="margin-top:10px;">
    <span style="width:{pct*100:.1f}%; background:{color};"></span>
  </div>
  <div class="bv-muted" style="margin-top:8px; font-size:12px;">{pct*100:.1f}% utilization</div>
</div>
""",
        unsafe_allow_html=True,
    )


# ============================================================
# LOAD DATA
# ============================================================
if "csv_uploader_key" not in st.session_state:
    st.session_state.csv_uploader_key = 0

with st.expander("Import CSV (additive)", expanded=False):
    st.caption(
        "Baseline: **Forecasting - Mutual.csv**. Upload one or multiple CSV files to add them on top (additive)."
    )
    uploaded_files = st.file_uploader(
        "Upload CSV files",
        type=["csv"],
        accept_multiple_files=True,
        key=f"csv_uploader_{st.session_state.csv_uploader_key}",
    )
    platform_by_filename: dict[str, str] = {}
    needs_platform_confirmation = False
    if uploaded_files:
        st.markdown("**Confirm platform per file (required)**")
        st.caption("We do not guess platform from filenames/keywords. Each uploaded CSV is stamped with your selection.")
        for uf in uploaded_files:
            fname = getattr(uf, "name", "uploaded.csv")
            choice = st.selectbox(
                f"Platform for {fname}",
                options=["Select…", "LinkedIn", "Google", "Meta"],
                index=0,
                key=f"platform_for_{fname}",
            )
            if choice == "Select…":
                needs_platform_confirmation = True
            else:
                platform_by_filename[fname] = choice
    cols = st.columns([1, 1, 2])
    with cols[0]:
        st.metric("Uploaded files", 0 if not uploaded_files else len(uploaded_files))
    with cols[1]:
        if st.button("Clear uploads", use_container_width=True):
            st.session_state.csv_uploader_key += 1
            st.rerun()
    with cols[2]:
        if uploaded_files:
            st.write(", ".join([f.name for f in uploaded_files[:6]]) + ("" if len(uploaded_files) <= 6 else f" … +{len(uploaded_files)-6} more"))

raw = load_all_csvs()
if uploaded_files and needs_platform_confirmation:
    st.warning("Select a platform for every uploaded CSV to import it.")
    uploaded_raw = pd.DataFrame()
else:
    uploaded_raw = load_uploaded_csvs(uploaded_files, platform_by_filename=platform_by_filename)
frames = [df for df in [raw, uploaded_raw] if df is not None and not df.empty]
if frames:
    raw = pd.concat(frames, ignore_index=True, sort=False)
    raw = drop_duplicate_header_rows(raw)
else:
    raw = pd.DataFrame()

data = build_internal_table(raw) if not raw.empty else pd.DataFrame()
data = validate_internal_table(data) if not data.empty else data

def empty_state():
    st.info("No CSV data loaded yet. Use **Import CSV (additive)** above to upload one or more CSV files to begin.")


# ============================================================
# SIDEBAR (fixed-style nav + filters + sync)
# ============================================================
def set_page(p: str):
    st.session_state.page = p


if "page" not in st.session_state:
    st.session_state.page = "Budget Overview"

with st.sidebar:
    st.markdown(
        f"""
<div style="padding: 14px 8px 10px 8px;">
  <div style="display:flex; align-items:center; gap:10px;">
    <div style="width:36px; height:36px; border-radius:12px; background:rgba(226,35,26,0.12); border:1px solid rgba(226,35,26,0.22);"></div>
    <div>
      <div style="font-family:'Space Grotesk'; font-weight:800; font-size:16px; line-height:1;">Brightvision</div>
      <div class="bv-muted" style="font-size:12px; margin-top:2px;">Ads Insights</div>
    </div>
  </div>
  <div style="margin-top:10px;">
    <span class="bv-pill">Internal Tool</span>
  </div>
</div>
""",
        unsafe_allow_html=True,
    )

    # Navigation
    st.markdown('<div class="bv-nav" style="padding: 0 8px;">', unsafe_allow_html=True)
    pages = ["Budget Overview", "Spend Tracking", "Simulation", "Settings"]
    for p in pages:
        active = "active" if st.session_state.page == p else ""
        if st.button(p, use_container_width=True, key=f"nav-{p}"):
            set_page(p)
        # Style buttons via CSS is limited; we keep button but provide nearby hint:
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("---")

    # Global filters for Budget Overview
    customers = ["All"]
    if not data.empty and "customer" in data.columns:
        customers = ["All"] + sorted([c for c in data["customer"].unique().tolist() if str(c).strip() != ""])
    channels = ["All", "LinkedIn", "Google", "Meta", "Other"]
    selected_customer = st.selectbox("Customer", options=customers, index=0)
    selected_channel = st.selectbox("Channel", options=channels, index=0)

    st.markdown("---")

    with st.expander("Alerts & thresholds", expanded=False):
        st.session_state.alert_enabled = st.toggle("Enable alerts", value=st.session_state.alert_enabled)
        st.session_state.alert_threshold = st.slider("Critical utilization", 0.50, 1.00, float(st.session_state.alert_threshold), 0.01, format="%.0f%%")
        st.session_state.forecast_threshold = st.slider("Forecast overrun", 1.00, 1.50, float(st.session_state.forecast_threshold), 0.01, format="%.0f%%")
        st.session_state.show_debug = st.toggle("Show debug panels", value=st.session_state.show_debug)

    st.markdown("---")
    # "Sync" button
    if st.button("Sync data", use_container_width=True):
        load_all_csvs.clear()
        st.session_state.last_sync = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        st.rerun()
    last_sync = st.session_state.get("last_sync", pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"))
    st.caption(f"Last sync: {last_sync}")


# Apply filters
filtered = data.copy() if not data.empty else pd.DataFrame()
if selected_customer != "All":
    filtered = filtered.loc[filtered["customer"] == selected_customer].copy()
if selected_channel != "All":
    filtered = filtered.loc[filtered["channel"] == selected_channel].copy()


# ============================================================
# PAGE: BUDGET OVERVIEW
# ============================================================
def page_budget_overview(df: pd.DataFrame):
    st.markdown("## Budget Overview")
    st.markdown('<div class="bv-muted">Overview of budgets, spend and allocation across channels.</div>', unsafe_allow_html=True)

    if df.empty:
        empty_state()
        return

    valid_df, invalid_df = split_valid_invalid(df)
    if not invalid_df.empty:
        st.warning(
            f"{len(invalid_df)} rows are missing valid budget/spend/dates and are excluded from calculations."
        )
        with st.expander("Show excluded rows"):
            show_cols = [c for c in ["source_file", "channel", "group", "campaign", "start_date", "end_date", "total_budget_cents", "total_spent_cents", "validation_error"] if c in invalid_df.columns]
            st.dataframe(invalid_df.loc[:, show_cols], use_container_width=True, hide_index=True)

    # KPIs
    total_budget = int(valid_df["total_budget_cents"].sum())
    total_spent = int(valid_df["total_spent_cents"].sum())
    active_customers = int(valid_df["customer"].replace("", pd.NA).dropna().nunique())
    active_channels = int(valid_df["channel"].replace("", pd.NA).dropna().nunique())

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        kpi_card("Total Assigned Budget", money(total_budget))
    with c2:
        kpi_card("Current Spend", money(total_spent))
    with c3:
        kpi_card("Active Customers", f"{active_customers}")
    with c4:
        kpi_card("Active Channels", f"{active_channels}")

    st.markdown("###")

    left, right = st.columns([1, 1])

    # Donut: allocation by channel
    alloc = valid_df.groupby("channel", dropna=False)["total_budget_cents"].sum().reindex(["LinkedIn", "Google", "Meta", "Other"]).fillna(0).reset_index()
    alloc["value"] = alloc["total_budget_cents"].apply(lambda c: float(Decimal(int(c)) / Decimal(100)))
    donut_values = [{"label": r["channel"], "value": r["value"]} for _, r in alloc.iterrows() if r["value"] > 0]

    with left:
        st.markdown('<div class="bv-card">', unsafe_allow_html=True)
        if donut_values:
            vega_donut(
                donut_values,
                "Budget Allocation by Channel",
                color_domain=["LinkedIn", "Google", "Meta", "Other"],
                color_range=[BV_RED, "#2563EB", "#9333EA", "#94A3B8"],
            )
        else:
            st.info("No budget values available for allocation chart.")
        st.markdown("</div>", unsafe_allow_html=True)

    # HBar: customer budget vs spend
    cust = valid_df.groupby("customer", dropna=False)[["total_budget_cents", "total_spent_cents"]].sum().reset_index()
    cust = cust[cust["customer"].astype(str).str.strip() != ""].sort_values("total_budget_cents", ascending=False).head(12)
    hbar_vals: list[dict] = []
    for _, r in cust.iterrows():
        hbar_vals.append({"label": r["customer"], "series": "Budget", "value": float(Decimal(int(r["total_budget_cents"])) / Decimal(100))})
        hbar_vals.append({"label": r["customer"], "series": "Actual", "value": float(Decimal(int(r["total_spent_cents"])) / Decimal(100))})

    with right:
        st.markdown('<div class="bv-card">', unsafe_allow_html=True)
        if hbar_vals:
            vega_hbar(hbar_vals, "Customer Budget vs Spend")
        else:
            st.info("No customer rows found.")
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("###")
    st.markdown("## Customer Utilization")
    st.markdown('<div class="bv-muted">Spend vs. assigned budget per customer</div>', unsafe_allow_html=True)
    st.markdown("##")
    
    # Customer-level hierarchy metrics
    customer_metrics = compute_customer_metrics(valid_df)
    customer_metrics = customer_metrics[customer_metrics["customer"].str.strip() != ""].sort_values("total_spent_cents", ascending=False).head(8)
    
    if not customer_metrics.empty:
        for _, r in customer_metrics.iterrows():
            util = float(r["utilization"])
            label = str(r["customer"])
            right = f"{money(int(r['total_spent_cents']))} / {money(int(r['total_budget_cents']))}"
            # Color-code by utilization: red if >90%, otherwise BV_RED
            color = "#EF4444" if util >= 0.90 else BV_RED
            progress_row(label, util, right, color=color)
    
    st.markdown("###")
    st.markdown("## Spend Tracker by Channel")
    st.markdown('<div class="bv-muted">Channel allocation % and utilization</div>', unsafe_allow_html=True)
    st.markdown("##")

    # Use hierarchical channel metrics
    channel_metrics = compute_channel_metrics(valid_df)
    channel_metrics = channel_metrics.sort_values("total_spent_cents", ascending=False)
    
    colors = {"LinkedIn": BV_RED, "Google": "#2563EB", "Meta": "#9333EA", "Other": "#94A3B8"}
    
    for _, r in channel_metrics.iterrows():
        util = float(r["utilization"])
        label = f"{r['channel']} ({r['allocation_pct']:.1f}% of total)"
        right = f"{money(int(r['total_spent_cents']))} / {money(int(r['total_budget_cents']))}"
        progress_row(label, util, right, color=colors.get(r['channel'], BV_RED))


# ============================================================
# PAGE: SPEND TRACKING
# ============================================================
def page_spend_tracking(df: pd.DataFrame):
    st.markdown("## Spend Tracking")
    st.markdown('<div class="bv-muted">Campaign-level spend, forecast and utilization with alerts.</div>', unsafe_allow_html=True)

    if df.empty:
        empty_state()
        return

    valid_df, invalid_df = split_valid_invalid(df)
    if not invalid_df.empty:
        st.warning(
            f"{len(invalid_df)} rows are missing valid budget/spend/dates and are excluded from campaign calculations."
        )
        with st.expander("Show excluded rows"):
            show_cols = [c for c in ["source_file", "channel", "group", "campaign", "start_date", "end_date", "total_budget_cents", "total_spent_cents", "validation_error"] if c in invalid_df.columns]
            st.dataframe(invalid_df.loc[:, show_cols], use_container_width=True, hide_index=True)

    # Build campaign table using enhanced metrics
    campaigns_agg = (
        valid_df.groupby(["channel", "campaign", "group"], dropna=False)[["total_budget_cents", "total_spent_cents"]]
        .sum()
        .reset_index()
    )
    
    # Join dates/status (best-effort)
    meta = (
        valid_df.groupby(["channel", "campaign", "group"], dropna=False)[["start_date", "end_date", "status"]]
        .agg({"start_date": "min", "end_date": "max", "status": "last"})
        .reset_index()
    )
    campaigns_base = campaigns_agg.merge(meta, on=["channel", "campaign", "group"], how="left")
    
    # Apply full business logic metrics
    campaigns = compute_campaign_metrics(campaigns_base)

    # Status icon
    def status_icon(s: object) -> str:
        t = str(s).strip().lower()
        if "active" in t or t in {"on"}:
            return "🟢"
        if "paused" in t or t in {"off"}:
            return "🟡"
        if "stopped" in t or "ended" in t:
            return "🔴"
        return "⚪"

    campaigns["status_icon"] = campaigns["status"].apply(status_icon)
    campaigns["alert_badge_html"] = campaigns["alert_level"].apply(alert_badge)

    # Pretty columns with all calculated metrics
    table = pd.DataFrame(
        {
            "Status": campaigns["status_icon"],
            "Platform": campaigns["channel"],
            "Campaign Name": campaigns["campaign"],
            "Assigned Budget": campaigns["total_budget_cents"].apply(money),
            "Current Spend": campaigns["total_spent_cents"].apply(money),
            "Daily Budget": campaigns["daily_budget_cents"].apply(lambda c: money(int(c))),
            "Avg Daily Spend": campaigns["avg_daily_spend_cents"].apply(lambda c: money(int(c))),
            "Forecasted Spend": campaigns["forecast_cents"].apply(money),
            "Utilization": campaigns["utilization"].astype("float64"),
            "Active Days": campaigns["active_days"].astype("int64"),
            "Remaining": campaigns["remaining_days"].astype("int64"),
            "Alerts": campaigns["alert_badge_html"],
        }
    ).sort_values("Current Spend", ascending=False)

    st.data_editor(
        table,
        use_container_width=True,
        hide_index=True,
        disabled=True,
        column_config={
            "Utilization": st.column_config.ProgressColumn(
                "Utilization",
                help="(spentToDate / totalBudget) × 100",
                format="%.0f%%",
                min_value=0.0,
                max_value=1.2,
            ),
            "Active Days": st.column_config.NumberColumn("Active Days", help="Total days - paused days"),
            "Remaining": st.column_config.NumberColumn("Days Left", help="Days remaining until end_date"),
            "Alerts": st.column_config.TextColumn("Alerts"),
        },
    )

    st.markdown("###")
    st.markdown("## Cumulative Spend vs Budget")

    # Area chart: approximate cumulative series using budget/spend spread over time
    today = pd.Timestamp.today().normalize()
    # Use the largest active window from data as chart horizon
    min_start = pd.to_datetime(parse_date(df["start_date"]), errors="coerce").min()
    max_end = pd.to_datetime(parse_date(df["end_date"]), errors="coerce").max()
    if pd.isna(min_start) or pd.isna(max_end):
        st.info("Not enough date coverage to build cumulative chart.")
        return
    horizon_start = max(min_start.normalize(), today - pd.Timedelta(days=90))
    horizon_end = min(max_end.normalize(), today)

    dates = pd.date_range(horizon_start, horizon_end, freq="D")
    if len(dates) <= 1:
        st.info("Not enough date coverage to build cumulative chart.")
        return

    total_budget = Decimal(int(df["total_budget_cents"].sum())) / Decimal(100)
    total_spent = Decimal(int(df["total_spent_cents"].sum())) / Decimal(100)
    # linear cum estimates
    budget_per_day = float(total_budget / Decimal(max(1, len(dates))))
    spend_per_day = float(total_spent / Decimal(max(1, len(dates))))
    values = []
    cum_budget = 0.0
    cum_spend = 0.0
    for d in dates:
        cum_budget += budget_per_day
        cum_spend += spend_per_day
        values.append({"date": d.date().isoformat(), "value": cum_spend, "series": "Spend"})
        values.append({"date": d.date().isoformat(), "value": cum_budget, "series": "Budget"})

    # Layered area via vega-lite
    spec = {
        "title": "Cumulative Spend vs Budget (estimated)",
        "data": {"values": values},
        "layer": [
            {
                "mark": {"type": "area", "opacity": 0.25},
                "encoding": {
                    "x": {"field": "date", "type": "temporal"},
                    "y": {"field": "value", "type": "quantitative"},
                    "color": {"field": "series", "type": "nominal", "scale": {"domain": ["Spend", "Budget"], "range": [BV_RED, "#94A3B8"]}},
                },
            },
            {
                "mark": {"type": "line", "strokeWidth": 2},
                "encoding": {
                    "x": {"field": "date", "type": "temporal"},
                    "y": {"field": "value", "type": "quantitative"},
                    "color": {"field": "series", "type": "nominal", "scale": {"domain": ["Spend", "Budget"], "range": [BV_RED, "#94A3B8"]}},
                },
            },
        ],
        "height": 280,
    }
    st.vega_lite_chart(spec, use_container_width=True)


# ============================================================
# PAGE: SIMULATION
# ============================================================
@dataclass(frozen=True)
class SimRow:
    channel: str
    original_cents: int
    simulated_cents: int


def page_simulation(df: pd.DataFrame):
    st.markdown("## Simulation")
    st.markdown('<div class="bv-muted">Adjust budgets by platform and compare allocation.</div>', unsafe_allow_html=True)

    if df.empty:
        empty_state()
        return

    valid_df, invalid_df = split_valid_invalid(df)
    if not invalid_df.empty:
        st.warning(
            f"{len(invalid_df)} rows are missing valid budget/spend/dates and are excluded from simulation totals."
        )

    # Get channel metrics for base values
    channel_metrics = compute_channel_metrics(valid_df)
    base = channel_metrics.set_index("channel")["total_budget_cents"].reindex(["LinkedIn", "Google", "Meta"]).fillna(0).astype("int64").to_dict()
    base_spend = channel_metrics.set_index("channel")["total_spent_cents"].reindex(["LinkedIn", "Google", "Meta"]).fillna(0).astype("int64").to_dict()

    def base_money(ch: str) -> Decimal:
        return round2(Decimal(int(base.get(ch, 0))) / Decimal(100))

    st.markdown("###")
    cols = st.columns(3)
    channels = ["LinkedIn", "Google", "Meta"]
    sim: dict[str, int] = {}
    
    for i, ch in enumerate(channels):
        with cols[i]:
            st.markdown(f'<div class="bv-card"><div class="bv-kpi-label">{ch}</div>', unsafe_allow_html=True)
            orig = base_money(ch)
            current_spend = round2(Decimal(int(base_spend.get(ch, 0))) / Decimal(100))
            
            amt = st.number_input(
                f"{ch} amount (SEK)", 
                min_value=0.0, 
                value=float(orig), 
                step=50.0, 
                key=f"sim-amt-{ch}",
                help=f"Current spend: {current_spend:,.2f} SEK"
            )
            pct = st.slider(
                f"{ch} change %", 
                min_value=-50, 
                max_value=100, 
                value=0, 
                step=5, 
                key=f"sim-pct-{ch}"
            )
            
            # Apply percentage change to the input amount
            simulated = Decimal(str(amt)) * (Decimal(100 + int(pct)) / Decimal(100))
            sim[ch] = int(round2(simulated) * 100)
            
            delta_cents = int(round2(simulated) * 100) - int(base.get(ch, 0))
            delta_sign = "+" if delta_cents >= 0 else "−"
            
            st.markdown(
                f'<div class="bv-muted" style="margin-top:8px;">Current Spend</div>'
                f'<div style="font-size:14px; font-weight:700; margin-bottom:8px;">{current_spend:,.2f} SEK</div>'
                f'<div class="bv-muted">Original → Simulated</div>'
                f'<div style="font-family:Space Grotesk; font-weight:800; font-size:20px;">{orig:,.2f} → {round2(simulated):,.2f}</div>'
                f'<div class="bv-muted" style="margin-top:6px; font-size:12px;">{delta_sign}{money(abs(delta_cents))}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )

    original_total = sum(int(base.get(ch, 0)) for ch in channels)
    simulated_total = sum(sim.values())
    delta = simulated_total - original_total
    sign = "+" if delta >= 0 else "−"

    st.markdown("###")
    k1, k2, k3 = st.columns(3)
    with k1:
        kpi_card("Original Total", f"{money(original_total)} SEK", sub="Current allocation")
    with k2:
        kpi_card("Simulated Total", f"{money(simulated_total)} SEK", sub="After adjustments")
    with k3:
        delta_pct = (float(delta) / float(original_total) * 100) if original_total > 0 else 0.0
        kpi_card("Delta", f"{sign}{money(abs(delta))} SEK", sub=f"{delta_pct:+.1f}%")

    st.markdown("###")
    left, right = st.columns([1, 1])

    current_vals = [{"label": ch, "value": float(Decimal(int(base.get(ch, 0))) / Decimal(100))} for ch in channels]
    sim_vals = [{"label": ch, "value": float(Decimal(int(sim.get(ch, 0))) / Decimal(100))} for ch in channels]
    with left:
        st.markdown('<div class="bv-card">', unsafe_allow_html=True)
        vega_donut(current_vals, "Current Allocation", color_domain=channels, color_range=[BV_RED, "#2563EB", "#9333EA"])
        st.markdown("</div>", unsafe_allow_html=True)
    with right:
        st.markdown('<div class="bv-card">', unsafe_allow_html=True)
        vega_donut(sim_vals, "Simulated Allocation", color_domain=channels, color_range=[BV_RED, "#2563EB", "#9333EA"])
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("###")
    st.markdown("## Comparison Summary")
    
    # Summary table
    summary_data = []
    for ch in channels:
        orig_cents = int(base.get(ch, 0))
        sim_cents = int(sim.get(ch, 0))
        delta_cents = sim_cents - orig_cents
        delta_pct = (float(delta_cents) / float(orig_cents) * 100) if orig_cents > 0 else 0.0
        
        summary_data.append({
            "Platform": ch,
            "Original Budget": f"{money(orig_cents)} SEK",
            "Simulated Budget": f"{money(sim_cents)} SEK",
            "Delta": f"{'+' if delta_cents >= 0 else '−'}{money(abs(delta_cents))} SEK",
            "Change %": f"{delta_pct:+.1f}%"
        })
    
    summary_df = pd.DataFrame(summary_data)
    st.dataframe(summary_df, use_container_width=True, hide_index=True)
    
    st.markdown("###")
    # Comparison bar
    bar_vals = []
    for ch in channels:
        bar_vals.append({"label": ch, "series": "Current", "value": float(Decimal(int(base.get(ch, 0))) / Decimal(100))})
        bar_vals.append({"label": ch, "series": "Simulated", "value": float(Decimal(int(sim.get(ch, 0))) / Decimal(100))})
    st.markdown('<div class="bv-card">', unsafe_allow_html=True)
    vega_hbar(bar_vals, "Current vs Simulated")
    st.markdown("</div>", unsafe_allow_html=True)


# ============================================================
# PAGE: SETTINGS
# ============================================================
def page_settings():
    st.markdown("## Settings")
    st.markdown('<div class="bv-muted">Configure alerts and data diagnostics.</div>', unsafe_allow_html=True)
    st.markdown("###")
    
    st.markdown("### Alert Configuration")
    st.session_state.alert_enabled = st.toggle("Enable alerts", value=st.session_state.alert_enabled)
    
    st.markdown("**Budget Warning Threshold**")
    st.caption("Trigger 'Critical' alert when Utilization ≥ this value")
    st.session_state.alert_threshold = st.slider(
        "Critical utilization threshold", 
        0.50, 1.00, 
        float(st.session_state.alert_threshold), 
        0.01,
        format="%.0f%%"
    )
    
    st.markdown("**Forecast Overrun Threshold**")
    st.caption("Trigger 'Warning' alert when Forecasted Spend exceeds budget by this ratio")
    st.session_state.forecast_threshold = st.slider(
        "Forecast overrun threshold", 
        1.00, 1.50, 
        float(st.session_state.forecast_threshold), 
        0.01,
        format="%.0f%%",
        help="1.05 = 5% overrun"
    )
    
    st.markdown("###")
    st.markdown("### Advanced Options")
    st.session_state.show_debug = st.toggle("Show debug panels", value=st.session_state.show_debug)
    
    st.markdown("###")
    st.markdown("### Data Source")
    st.markdown(
        '<div class="bv-card"><div class="bv-kpi-label">CSV Files</div>'
        '<div style="font-weight:700; margin-top:6px;">Baseline: <code>Forecasting - Mutual.csv</code></div>'
        '<div class="bv-muted" style="margin-top:8px; font-size:13px;">Uploads are additive and are stamped with your confirmed platform</div>'
        "</div>",
        unsafe_allow_html=True,
    )
    
    st.markdown("###")
    st.markdown("### Business Logic")
    st.markdown("""
<div class="bv-card">
  <div class="bv-kpi-label">Active Calculations</div>
  <ul style="margin-top:10px; font-size:13px; line-height:1.7;">
    <li><strong>Utilization %</strong> = (spentToDate / totalBudget) × 100</li>
    <li><strong>Forecasted Spend</strong> = spentToDate + (avgDailySpend × activeDaysRemaining)</li>
    <li><strong>Active Days</strong> = totalDays - pausedDays</li>
    <li><strong>Channel Allocation %</strong> = (channelBudget / totalAllChannels) × 100</li>
    <li><strong>Customer Utilization</strong> = Sum of all group spends vs. total assigned budget</li>
  </ul>
  <div class="bv-muted" style="margin-top:12px; font-size:13px;">
    All monetary values displayed in <strong>SEK</strong> with <strong>2 decimal precision</strong>.
  </div>
</div>
""", unsafe_allow_html=True)


# ============================================================
# ROUTER
# ============================================================
page = st.session_state.page
if page == "Budget Overview":
    page_budget_overview(filtered)
elif page == "Spend Tracking":
    page_spend_tracking(filtered)
elif page == "Simulation":
    page_simulation(filtered)
elif page == "Settings":
    page_settings()
else:
    page_budget_overview(filtered)


if st.session_state.show_debug:
    with st.expander("Debug: mapped internal table", expanded=False):
        st.dataframe(data.head(400), use_container_width=True)
    with st.expander("Debug: raw combined CSV", expanded=False):
        st.dataframe(raw.head(400), use_container_width=True)

