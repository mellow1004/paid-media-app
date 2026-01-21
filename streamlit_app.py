import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from pathlib import Path
from typing import Optional

import pandas as pd
import streamlit as st

# ============================================================
# APP CONFIGURATION
# ============================================================
st.set_page_config(page_title="Google Sheets Data Hub", page_icon="📊", layout="wide")
st.title("Google Sheets Data Hub")


# ============================================================
# CONSTANTS / DEFAULTS
# ============================================================
HIERARCHY_COLS = ["Program", "Industry", "Channel", "Campaign", "Phase"]

# Allocation logic is intentionally modular so we can plug in EQUAL_SPLIT/WEIGHTED later.
ALLOCATION_METHODS = ("EQUAL_SPLIT", "WEIGHTED")

# Platform constraints (extend as needed).
MIN_DAILY_BY_CHANNEL = {
    "LinkedIn": Decimal("10.00"),
}

# Canonical internal column set for the finance engine
CANON_COLS = [
    "Program",
    "Industry",
    "Channel",
    "Campaign",
    "Phase",
    "start_date",
    "end_date",
    "total_budget_baseline",
    "total_budget_whatif",
    "spent_to_date",
    "paused_days_total",
    "paused_days_to_date",
    "CPM",
    "CTR",
    "CPL",
    "__source_file",
    "__parse_error",
]

# Flexible column mapping (user-provided variants + common normalized forms)
START_DATE_ALIASES = ["start_date", "start", "startdatum", "period_start"]
END_DATE_ALIASES = ["end_date", "end", "slutdatum", "period_end"]
TOTAL_BUDGET_ALIASES = ["total_budget", "budget", "planned_spend"]
TOTAL_SPENT_ALIASES = ["spent_to_date", "total_spent", "spend", "amount_spent", "cost", "spent"]


# ============================================================
# UTILITIES (deterministic rounding + parsing)
# ============================================================
def _round2(x: Decimal) -> Decimal:
    """Deterministic 2-decimal rounding (banking bugs avoided via HALF_UP)."""
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _to_decimal(value: object) -> Optional[Decimal]:
    if value is None or (isinstance(value, float) and pd.isna(value)) or (isinstance(value, str) and value.strip() == ""):
        return None
    try:
        # Accept common formats like "1,234.56" or "1 234,56"
        s = str(value).strip()
        s = s.replace(" ", "")
        # If comma is used as decimal separator and dot not present, swap.
        if "," in s and "." not in s:
            s = s.replace(",", ".")
        # Strip currency symbols.
        s = re.sub(r"[^\d\.\-]", "", s)
        if s in ("", "-", ".", "-."):
            return None
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def series_to_cents(series: pd.Series) -> pd.Series:
    """
    Convert a numeric series to integer cents (Int64) with deterministic rounding.
    This is the key for making parent totals exactly equal sum(children).
    """
    def _one(v: object) -> Optional[int]:
        d = _to_decimal(v)
        if d is None:
            return None
        d2 = _round2(d)
        return int(d2 * 100)

    return series.apply(_one).astype("Int64")


def cents_to_money(cents: pd.Series) -> pd.Series:
    # Keep display as 2-decimal strings to avoid float artifacts.
    def _fmt(v: object) -> Optional[str]:
        if v is None or (isinstance(v, float) and pd.isna(v)) or (isinstance(v, pd._libs.missing.NAType)):
            return None
        return f"{Decimal(int(v)) / Decimal(100):.2f}"

    return cents.apply(_fmt)


def parse_date_col(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce").dt.date


def safe_int(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0).astype("int64")


def normalize_colname(name: str) -> str:
    s = str(name).strip().lower()
    s = s.replace("→", "to")
    s = re.sub(r"[^\w]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def coalesce_first(*values: object) -> Optional[object]:
    for v in values:
        if v is None:
            continue
        if isinstance(v, float) and pd.isna(v):
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        return v
    return None


def first_existing_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    for c in candidates:
        if c in df.columns:
            return c
    return None

def col_as_1d_series(df: pd.DataFrame, col: Optional[str], default: object = None) -> pd.Series:
    """
    Safely extract a column as a 1D Series even if duplicate column names exist.
    In pandas, df["col"] returns a DataFrame when there are duplicate column names.
    """
    if col is None or col not in df.columns:
        return pd.Series([default] * len(df), index=df.index)

    sel = df.loc[:, col]  # can be Series OR DataFrame (if duplicate col names)
    if isinstance(sel, pd.DataFrame):
        if sel.shape[1] == 0:
            return pd.Series([default] * len(df), index=df.index)
        # take the first duplicate column deterministically
        return sel.iloc[:, 0].squeeze()

    # sel is a Series
    return sel.squeeze()


def ensure_1d(obj: object, index: pd.Index, default: object = None) -> pd.Series:
    """
    Force arbitrary objects into a 1D Series aligned to `index`.
    """
    if obj is None:
        return pd.Series([default] * len(index), index=index)
    if isinstance(obj, pd.Series):
        return obj.reindex(index).squeeze()
    if isinstance(obj, pd.DataFrame):
        if obj.shape[1] == 0:
            return pd.Series([default] * len(index), index=index)
        return obj.iloc[:, 0].reindex(index).squeeze()
    # scalar
    return pd.Series([obj] * len(index), index=index)


def drop_duplicate_header_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Some source exports repeat header rows inside the data.
    We drop any row that matches its column names for a majority of columns.
    """
    if df.empty:
        return df

    cols = list(df.columns)
    cols_l = [str(c).strip().lower() for c in cols]

    def is_header_row(row: pd.Series) -> bool:
        matches = 0
        for c, cl in zip(cols, cols_l):
            v = row.get(c, "")
            vs = str(v).strip().lower()
            if vs == cl and cl != "":
                matches += 1
        # at least 2 columns and at least half the columns must match
        return matches >= max(2, int(len(cols) * 0.5))

    mask = df.apply(is_header_row, axis=1)
    return df.loc[~mask].reset_index(drop=True)


# ============================================================
# DOMAIN MODEL (optional: helps keep logic readable)
# ============================================================
@dataclass(frozen=True)
class ScenarioConfig:
    name: str
    budget_col: str


def infer_scenario_columns(df: pd.DataFrame) -> list[ScenarioConfig]:
    """
    Support both:
    - A single column: total_budget
    - Dual columns: total_budget_baseline / total_budget_whatif
    """
    cols = set(df.columns)
    if {"total_budget_baseline", "total_budget_whatif"}.issubset(cols):
        return [
            ScenarioConfig("Baseline", "total_budget_baseline"),
            ScenarioConfig("What-if", "total_budget_whatif"),
        ]
    if "total_budget" in cols:
        return [
            ScenarioConfig("Baseline", "total_budget"),
            ScenarioConfig("What-if", "total_budget"),
        ]
    return []


# ============================================================
# DATA LOADING (local CSVs)
# ============================================================
@st.cache_data(ttl=300)
def load_local_budget_csvs() -> pd.DataFrame:
    """
    Load all CSV files in the project directory matching:
      'Copy of Budgets*.csv'
    Then concatenate them into a single DataFrame.
    """
    base_dir = Path(__file__).resolve().parent
    paths = sorted(base_dir.glob("Copy of Budgets*.csv"))

    if not paths:
        return pd.DataFrame()

    frames: list[pd.DataFrame] = []
    for p in paths:
        try:
            df = read_csv_with_header_detection(p)
            df["__source_file"] = p.name
            frames.append(df)
        except Exception:
            # Keep going if one file is malformed; we show it in the UI later.
            frames.append(pd.DataFrame({"__source_file": [p.name], "__load_error": ["failed_to_parse"]}))

    combined = pd.concat(frames, ignore_index=True, sort=False)
    combined = drop_duplicate_header_rows(combined)
    return combined


def read_csv_with_header_detection(path: Path) -> pd.DataFrame:
    """
    Handles files that start with a few blank rows before the real header.
    We find the first "header-like" line and read from there.
    """
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    header_idx = 0
    for i, line in enumerate(lines):
        # skip empty-ish lines
        if line.strip() == "":
            continue
        if set(line.strip()) <= {","}:
            continue
        # header-like: contains commas + at least one alphabetic character
        if "," in line and re.search(r"[A-Za-z]", line):
            header_idx = i
            break

    df = pd.read_csv(path, skiprows=header_idx, header=0)
    # drop fully empty columns that sometimes appear from trailing commas
    df = df.dropna(axis=1, how="all")
    # If there are duplicate column names, keep them (pandas allows) but downstream code must
    # be robust. We still strip whitespace here to reduce accidental dupes.
    df.columns = [str(c).strip() for c in df.columns]
    return df


def parse_local_data_to_canonical(raw: pd.DataFrame) -> pd.DataFrame:
    """
    Convert heterogeneous local CSV formats into one canonical schema:
      Program, Industry, Channel, Campaign, Phase,
      start_date, end_date,
      total_budget_baseline, total_budget_whatif,
      spent_to_date,
      paused_days_total, paused_days_to_date,
      CPM, CTR, CPL
    """
    if raw.empty:
        return raw

    frames: list[pd.DataFrame] = []
    parse_errors: list[dict[str, object]] = []

    # Work per-source-file because different files have different schemas.
    for source, df_src in raw.groupby("__source_file", dropna=False):
        try:
            df = df_src.copy()

            # Normalize column names (but keep originals accessible via df.columns in df_src if needed).
            colmap = {c: normalize_colname(c) for c in df.columns}
            df = df.rename(columns=colmap)

            cols = set(df.columns)

            def seg_at(segs_df: pd.DataFrame, idx: int) -> pd.Series:
                if segs_df.shape[1] > idx:
                    return segs_df.iloc[:, idx].fillna("").astype(str)
                return pd.Series([""] * len(segs_df), index=segs_df.index, dtype="string")

            # Map synonyms to internal names if present
            start_col = first_existing_col(df, START_DATE_ALIASES)
            end_col = first_existing_col(df, END_DATE_ALIASES)
            budget_col = first_existing_col(df, TOTAL_BUDGET_ALIASES)
            spent_col_syn = first_existing_col(df, TOTAL_SPENT_ALIASES)

            if "start_date" not in df.columns and start_col is not None:
                df["start_date"] = df[start_col]
            if "end_date" not in df.columns and end_col is not None:
                df["end_date"] = df[end_col]
            if "total_budget" not in df.columns and budget_col is not None:
                df["total_budget"] = df[budget_col]
            if "spent_to_date" not in df.columns and spent_col_syn is not None:
                df["spent_to_date"] = df[spent_col_syn]

            # Format A: "Group → Campaign" with budgets/spend/remaining (Sheet4)
            if "group_to_campaign" in cols and any(c.startswith("current_budget") for c in cols):
                group_col = "group_to_campaign"

                # Identify budget/spend columns (best-effort)
                budget_current_col = coalesce_first(
                    "current_budget",
                    next((c for c in df.columns if c.startswith("current_budget")), None),
                )
                spent_col = coalesce_first(
                    "spent_to_date",
                    "spent",
                    next((c for c in df.columns if c.startswith("spent")), None),
                )
                new_budget_col = coalesce_first(
                    "new_budget",
                    next((c for c in df.columns if c.startswith("new_budget")), None),
                )

                # Split hierarchy from the path.
                # Example: "AWS / Traffic → SI AWS Partner"
                parts = df[group_col].astype(str).str.split(r"\s*[→>]\s*", n=1, expand=True)
                group_path = parts.iloc[:, 0].fillna("").astype(str)

                # IMPORTANT: parts does not always have a second column.
                if getattr(parts, "shape", (0, 0))[1] > 1:
                    second = parts.iloc[:, 1].fillna("").astype(str)
                    campaign_name = second.where(second.str.strip() != "", group_path)
                else:
                    campaign_name = group_path

                segs = group_path.str.split(r"\s*/\s*", expand=True)
                program = seg_at(segs, 0)
                industry = seg_at(segs, 1)
                channel = seg_at(segs, 2)

                canon = pd.DataFrame(
                    {
                        "Program": program,
                        "Industry": industry,
                        "Channel": channel,
                        "Campaign": campaign_name,
                        "Phase": "",
                        "start_date": df.get("start_date", None),
                        "end_date": df.get("end_date", None),
                        "total_budget_baseline": (
                            df.get("total_budget", None)
                            if "total_budget" in df.columns
                            else (df[budget_current_col] if (budget_current_col in df.columns) else None)
                        ),
                        "total_budget_whatif": (
                            df[new_budget_col]
                            if (new_budget_col in df.columns)
                            else (
                                df.get("total_budget", None)
                                if "total_budget" in df.columns
                                else (df[budget_current_col] if (budget_current_col in df.columns) else None)
                            )
                        ),
                        "spent_to_date": df[spent_col] if (spent_col in df.columns) else None,
                        "paused_days_total": 0,
                        "paused_days_to_date": 0,
                        "CPM": None,
                        "CTR": None,
                        "CPL": None,
                        "__source_file": source,
                        "__parse_error": None,
                    }
                )
                frames.append(canon)
                continue

            # Format B: detailed campaign export with start/end and spend (e.g. "december 15th from doc.csv")
            if {"campaign_group_name", "campaign_name"}.issubset(cols) and (
                ("spent" in cols) or ("spent_to_date" in cols) or ("spend" in cols) or ("cost" in cols) or ("amount_spent" in cols)
            ):
                group_path = df.get("campaign_group_name", pd.Series([""] * len(df), index=df.index)).astype(str)
                campaign_name = df.get("campaign_name", pd.Series([""] * len(df), index=df.index)).astype(str)

                # Heuristic: derive Program/Industry/Channel from group path segments split by " / " or " | "
                segs = group_path.str.split(r"\s*/\s*|\s*\|\s*", expand=True)
                program = seg_at(segs, 0)
                industry = seg_at(segs, 1)
                channel = seg_at(segs, 2)

                canon = pd.DataFrame(
                    {
                        "Program": program,
                        "Industry": industry,
                        "Channel": channel,
                        "Campaign": campaign_name,
                        "Phase": "",
                        "start_date": df.get("start_date", None),
                        "end_date": df.get("end_date", None),
                        "total_budget_baseline": df.get("total_budget", None),
                        "total_budget_whatif": df.get("total_budget", None),
                        "spent_to_date": df.get("spent_to_date", df.get("spent", None)),
                        "paused_days_total": 0,
                        "paused_days_to_date": 0,
                        "CPM": df.get("cpm", None),
                        "CTR": df.get("ctr", None),
                        "CPL": df.get("cpl", None),
                        "__source_file": source,
                        "__parse_error": None,
                    }
                )
                frames.append(canon)
                continue

            # Format C: planning file with end date and new daily budget (e.g. "New calculations 16 DECEMBER .csv")
            if {"campaign_group", "campaign_name", "the_end_date"}.issubset(cols):
                group_path = df.get("campaign_group", pd.Series([""] * len(df), index=df.index)).astype(str)
                campaign_name = df.get("campaign_name", pd.Series([""] * len(df), index=df.index)).astype(str)
                segs = group_path.str.split(r"\s*/\s*|\s*\|\s*", expand=True)
                program = seg_at(segs, 0)
                industry = seg_at(segs, 1)
                channel = seg_at(segs, 2)

                canon = pd.DataFrame(
                    {
                        "Program": program,
                        "Industry": industry,
                        "Channel": channel,
                        "Campaign": campaign_name,
                        "Phase": "",
                        "start_date": df.get("start_date", None),
                        "end_date": df.get("the_end_date", None),
                        "total_budget_baseline": None,
                        "total_budget_whatif": None,
                        "spent_to_date": None,
                        "paused_days_total": 0,
                        "paused_days_to_date": 0,
                        "CPM": None,
                        "CTR": None,
                        "CPL": df.get("cpl", None),
                        "__source_file": source,
                        "__parse_error": None,
                    }
                )
                frames.append(canon)
                continue

            # Unknown format: ignore (still visible in raw preview)
            continue
        except Exception as e:
            parse_errors.append({"__source_file": source, "__parse_error": f"{type(e).__name__}: {e}"})
            continue

    if not frames:
        # Still return a DataFrame that can be inspected in the UI without crashing.
        out_err = pd.DataFrame(parse_errors) if parse_errors else pd.DataFrame()
        # Ensure canonical columns always exist (avoid KeyError downstream)
        for c in CANON_COLS:
            if c not in out_err.columns:
                out_err[c] = None
        # Default dates to today if missing
        today_d = pd.Timestamp.today().date()
        out_err["start_date"] = out_err["start_date"].fillna(today_d)
        out_err["end_date"] = out_err["end_date"].fillna(today_d)
        return out_err[CANON_COLS]

    out = pd.concat(frames, ignore_index=True, sort=False)
    out = drop_duplicate_header_rows(out)
    # Ensure canonical columns always exist (avoid KeyError downstream)
    for c in CANON_COLS:
        if c not in out.columns:
            out[c] = None

    # Default dates to today if missing
    today_d = pd.Timestamp.today().date()
    out["start_date"] = out["start_date"].fillna(today_d)
    out["end_date"] = out["end_date"].fillna(today_d)

    if parse_errors:
        # Keep parse errors available in the UI (does not affect finance calcs)
        err_df = pd.DataFrame(parse_errors)
        for c in CANON_COLS:
            if c not in err_df.columns:
                err_df[c] = None
        err_df["start_date"] = err_df["start_date"].fillna(today_d)
        err_df["end_date"] = err_df["end_date"].fillna(today_d)
        out = pd.concat([out, err_df[CANON_COLS]], ignore_index=True, sort=False)
    return out[CANON_COLS]


# ============================================================
# CORE FINANCIAL CALCS (pandas-first)
# ============================================================
def apply_allocation_logic(df: pd.DataFrame, method: str) -> pd.DataFrame:
    """
    Placeholder: later we can implement EQUAL_SPLIT/WEIGHTED allocations.
    For now, it returns df unchanged.
    """
    _ = method  # reserved
    return df


def compute_financials(
    df: pd.DataFrame,
    scenario_budget_col: str,
    today: pd.Timestamp,
) -> pd.DataFrame:
    """
    Compute leaf-level campaign/phase metrics, then allow aggregation to keep
    parent totals matching sum(children).
    """
    out = df.copy()

    # Hierarchy normalization
    for c in HIERARCHY_COLS:
        if c not in out.columns:
            out[c] = ""
        out[c] = out[c].astype(str).fillna("").replace("nan", "")

    # Dates
    if "start_date" not in out.columns:
        out["start_date"] = pd.Timestamp(today).date()
    if "end_date" not in out.columns:
        out["end_date"] = pd.Timestamp(today).date()
    out["start_date"] = parse_date_col(out["start_date"])
    out["end_date"] = parse_date_col(out["end_date"])

    # Pause inputs (optional)
    # paused_days_total: total paused days over campaign lifetime
    # paused_days_to_date: paused days already elapsed as of today
    if "paused_days_total" not in out.columns:
        out["paused_days_total"] = 0
    if "paused_days_to_date" not in out.columns:
        out["paused_days_to_date"] = 0
    out["paused_days_total"] = safe_int(out["paused_days_total"]).clip(lower=0)
    out["paused_days_to_date"] = safe_int(out["paused_days_to_date"]).clip(lower=0)

    # Money columns (stored as cents to enforce exact sum invariants)
    out["total_budget_cents"] = series_to_cents(out[scenario_budget_col]).fillna(0).astype("int64")
    out["spent_to_date_cents"] = series_to_cents(out["spent_to_date"]).fillna(0).astype("int64")

    # remaining_budget = total_budget - spent_to_date
    out["remaining_budget_cents"] = (out["total_budget_cents"] - out["spent_to_date_cents"]).clip(lower=0)

    # Day math
    # total_days = inclusive days between start and end (if both valid)
    start_dt = pd.to_datetime(out["start_date"], errors="coerce")
    end_dt = pd.to_datetime(out["end_date"], errors="coerce")
    total_days = (end_dt - start_dt).dt.days + 1
    out["total_days"] = total_days.fillna(0).astype("int64").clip(lower=0)

    out["active_days_total"] = (out["total_days"] - out["paused_days_total"]).clip(lower=0)

    # elapsed days up to today (inclusive) capped to campaign window
    today_date = pd.to_datetime(today).normalize()
    effective_end = pd.to_datetime(out["end_date"], errors="coerce").fillna(today_date)
    effective_start = pd.to_datetime(out["start_date"], errors="coerce").fillna(today_date)
    capped_today = pd.Series([today_date] * len(out), index=out.index)
    elapsed_end = pd.concat([capped_today, effective_end], axis=1).min(axis=1)
    elapsed_start = effective_start
    elapsed_days = (elapsed_end - elapsed_start).dt.days + 1
    out["elapsed_days"] = elapsed_days.fillna(0).astype("int64").clip(lower=0)

    out["elapsed_active_days"] = (out["elapsed_days"] - out["paused_days_to_date"]).clip(lower=0)
    out["remaining_active_days"] = (out["active_days_total"] - out["elapsed_active_days"]).clip(lower=0)

    # required_daily = remaining_budget / remaining_active_days
    # Keep as Decimal-ish string with deterministic rounding for display.
    def _required_daily_str(row) -> Optional[str]:
        rad = int(row["remaining_active_days"])
        if rad <= 0:
            return None
        cents = int(row["remaining_budget_cents"])
        val = Decimal(cents) / Decimal(100) / Decimal(rad)
        return f"{_round2(val):.2f}"

    out["required_daily"] = out.apply(_required_daily_str, axis=1)

    # Platform min daily constraint
    def _min_daily(channel: str) -> Optional[Decimal]:
        return MIN_DAILY_BY_CHANNEL.get(channel)

    out["min_daily"] = out["Channel"].apply(_min_daily).apply(lambda d: f"{d:.2f}" if d is not None else None)

    def _min_daily_violation(row) -> bool:
        md = _min_daily(str(row["Channel"]))
        if md is None:
            return False
        if row["required_daily"] is None:
            return False
        try:
            req = Decimal(str(row["required_daily"]))
        except InvalidOperation:
            return False
        return req < md

    out["min_daily_violation"] = out.apply(_min_daily_violation, axis=1)

    # Forecast engine (optional inputs)
    # If CPM & CTR provided: impressions = (spend / CPM) * 1000 ; clicks = impressions * CTR
    # If CPL provided: leads = spend / CPL
    for col in ("CPM", "CTR", "CPL"):
        if col not in out.columns:
            out[col] = None

    out["CPM_dec"] = out["CPM"].apply(_to_decimal)
    out["CTR_dec"] = out["CTR"].apply(_to_decimal)
    out["CPL_dec"] = out["CPL"].apply(_to_decimal)

    # Use projected spend = total budget (can be swapped later with forecasted spend)
    out["projected_spend_dec"] = out["total_budget_cents"].apply(lambda c: Decimal(int(c)) / Decimal(100))

    # forecast_leads
    def _forecast_leads(row) -> Optional[str]:
        cpl = row["CPL_dec"]
        if cpl is None or cpl <= 0:
            return None
        leads = row["projected_spend_dec"] / cpl
        return f"{_round2(leads):.2f}"

    out["forecast_leads"] = out.apply(_forecast_leads, axis=1)

    # forecast_impressions / forecast_clicks
    def _forecast_impressions(row) -> Optional[str]:
        cpm = row["CPM_dec"]
        if cpm is None or cpm <= 0:
            return None
        imps = (row["projected_spend_dec"] / cpm) * Decimal(1000)
        # impressions are typically integer-like, but we keep 2 decimals deterministically
        return f"{_round2(imps):.2f}"

    def _forecast_clicks(row) -> Optional[str]:
        imps_str = _forecast_impressions(row)
        ctr = row["CTR_dec"]
        if imps_str is None or ctr is None:
            return None
        try:
            imps = Decimal(imps_str)
        except InvalidOperation:
            return None
        clicks = imps * ctr
        return f"{_round2(clicks):.2f}"

    out["forecast_impressions"] = out.apply(_forecast_impressions, axis=1)
    out["forecast_clicks"] = out.apply(_forecast_clicks, axis=1)

    # Pacing
    # expected_spend_to_date = total_budget * elapsed_active_days / active_days_total
    def _expected_spend_to_date_cents(row) -> int:
        ad = int(row["active_days_total"])
        if ad <= 0:
            return 0
        elapsed = int(row["elapsed_active_days"])
        total = int(row["total_budget_cents"])
        # deterministic prorate in cents, rounding HALF_UP
        val = (Decimal(total) * Decimal(elapsed) / Decimal(ad)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return int(val)

    out["expected_spend_to_date_cents"] = out.apply(_expected_spend_to_date_cents, axis=1).astype("int64")

    def _pacing_ratio(row) -> Optional[str]:
        expected = int(row["expected_spend_to_date_cents"])
        actual = int(row["spent_to_date_cents"])
        if expected <= 0:
            return None
        ratio = Decimal(actual) / Decimal(expected)
        return f"{_round2(ratio):.2f}"

    out["pacing_ratio"] = out.apply(_pacing_ratio, axis=1)

    return out


def aggregate_to_campaign(df_leaf: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate Phase rows into Campaign rows.
    Parent totals are exact sums of children because budgets/spend are in integer cents.
    """
    group_cols = ["Program", "Industry", "Channel", "Campaign"]

    money_cols = [
        "total_budget_cents",
        "spent_to_date_cents",
        "remaining_budget_cents",
        "expected_spend_to_date_cents",
    ]

    summed = (
        df_leaf.groupby(group_cols, dropna=False)[money_cols]
        .sum()
        .reset_index()
    )

    # For day-based metrics, take min(start) and max(end) per campaign (safe default).
    dates = (
        df_leaf.groupby(group_cols, dropna=False)[["start_date", "end_date"]]
        .agg({"start_date": "min", "end_date": "max"})
        .reset_index()
    )

    paused = (
        df_leaf.groupby(group_cols, dropna=False)[["paused_days_total", "paused_days_to_date"]]
        .max()
        .reset_index()
    )

    # Keep CPM/CTR/CPL only if consistent; else show blank (we can refine later).
    def _consistent_or_none(s: pd.Series):
        vals = [v for v in s.tolist() if v is not None and not (isinstance(v, float) and pd.isna(v))]
        vals = list(dict.fromkeys(vals))
        return vals[0] if len(vals) == 1 else None

    perf = (
        df_leaf.groupby(group_cols, dropna=False)[["CPM", "CTR", "CPL"]]
        .agg(_consistent_or_none)
        .reset_index()
    )

    out = summed.merge(dates, on=group_cols, how="left").merge(paused, on=group_cols, how="left").merge(perf, on=group_cols, how="left")
    return out


def compute_campaign_metrics_from_cents(df_campaign: pd.DataFrame, today: pd.Timestamp) -> pd.DataFrame:
    """
    Compute derived metrics on already-aggregated campaign rows.
    IMPORTANT: Inputs are already in integer cents to preserve exact totals.
    """
    out = df_campaign.copy()

    # Ensure required columns exist / types
    out["total_budget_cents"] = pd.to_numeric(out["total_budget_cents"], errors="coerce").fillna(0).astype("int64")
    out["spent_to_date_cents"] = pd.to_numeric(out["spent_to_date_cents"], errors="coerce").fillna(0).astype("int64")
    out["remaining_budget_cents"] = (out["total_budget_cents"] - out["spent_to_date_cents"]).clip(lower=0).astype("int64")

    out["start_date"] = parse_date_col(out["start_date"])
    out["end_date"] = parse_date_col(out["end_date"])

    if "paused_days_total" not in out.columns:
        out["paused_days_total"] = 0
    if "paused_days_to_date" not in out.columns:
        out["paused_days_to_date"] = 0
    out["paused_days_total"] = safe_int(out["paused_days_total"]).clip(lower=0)
    out["paused_days_to_date"] = safe_int(out["paused_days_to_date"]).clip(lower=0)

    # Day math
    start_dt = pd.to_datetime(out["start_date"], errors="coerce")
    end_dt = pd.to_datetime(out["end_date"], errors="coerce")
    total_days = (end_dt - start_dt).dt.days + 1
    out["total_days"] = total_days.fillna(0).astype("int64").clip(lower=0)
    out["active_days_total"] = (out["total_days"] - out["paused_days_total"]).clip(lower=0)

    today_date = pd.to_datetime(today).normalize()
    effective_end = pd.to_datetime(out["end_date"], errors="coerce").fillna(today_date)
    effective_start = pd.to_datetime(out["start_date"], errors="coerce").fillna(today_date)
    capped_today = pd.Series([today_date] * len(out), index=out.index)
    elapsed_end = pd.concat([capped_today, effective_end], axis=1).min(axis=1)
    elapsed_days = (elapsed_end - effective_start).dt.days + 1
    out["elapsed_days"] = elapsed_days.fillna(0).astype("int64").clip(lower=0)
    out["elapsed_active_days"] = (out["elapsed_days"] - out["paused_days_to_date"]).clip(lower=0)
    out["remaining_active_days"] = (out["active_days_total"] - out["elapsed_active_days"]).clip(lower=0)

    # expected_spend_to_date_cents (deterministic prorate)
    def _expected_spend_to_date_cents(row) -> int:
        ad = int(row["active_days_total"])
        if ad <= 0:
            return 0
        elapsed = int(row["elapsed_active_days"])
        total = int(row["total_budget_cents"])
        val = (Decimal(total) * Decimal(elapsed) / Decimal(ad)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return int(val)

    out["expected_spend_to_date_cents"] = out.apply(_expected_spend_to_date_cents, axis=1).astype("int64")

    # required_daily (string)
    def _required_daily_str(row) -> Optional[str]:
        rad = int(row["remaining_active_days"])
        if rad <= 0:
            return None
        cents = int(row["remaining_budget_cents"])
        val = Decimal(cents) / Decimal(100) / Decimal(rad)
        return f"{_round2(val):.2f}"

    out["required_daily"] = out.apply(_required_daily_str, axis=1)

    # Platform min daily constraint
    def _min_daily(channel: str) -> Optional[Decimal]:
        return MIN_DAILY_BY_CHANNEL.get(channel)

    out["min_daily"] = out["Channel"].astype(str).apply(_min_daily).apply(lambda d: f"{d:.2f}" if d is not None else None)

    def _min_daily_violation(row) -> bool:
        md = _min_daily(str(row["Channel"]))
        if md is None:
            return False
        if row["required_daily"] is None:
            return False
        try:
            req = Decimal(str(row["required_daily"]))
        except InvalidOperation:
            return False
        return req < md

    out["min_daily_violation"] = out.apply(_min_daily_violation, axis=1)

    # Forecast engine (optional inputs)
    for col in ("CPM", "CTR", "CPL"):
        if col not in out.columns:
            out[col] = None
    out["CPM_dec"] = out["CPM"].apply(_to_decimal)
    out["CTR_dec"] = out["CTR"].apply(_to_decimal)
    out["CPL_dec"] = out["CPL"].apply(_to_decimal)
    out["projected_spend_dec"] = out["total_budget_cents"].apply(lambda c: Decimal(int(c)) / Decimal(100))

    def _forecast_leads(row) -> Optional[str]:
        cpl = row["CPL_dec"]
        if cpl is None or cpl <= 0:
            return None
        leads = row["projected_spend_dec"] / cpl
        return f"{_round2(leads):.2f}"

    out["forecast_leads"] = out.apply(_forecast_leads, axis=1)

    def _forecast_impressions(row) -> Optional[str]:
        cpm = row["CPM_dec"]
        if cpm is None or cpm <= 0:
            return None
        imps = (row["projected_spend_dec"] / cpm) * Decimal(1000)
        return f"{_round2(imps):.2f}"

    def _forecast_clicks(row) -> Optional[str]:
        ctr = row["CTR_dec"]
        imps_str = _forecast_impressions(row)
        if ctr is None or imps_str is None:
            return None
        try:
            imps = Decimal(imps_str)
        except InvalidOperation:
            return None
        clicks = imps * ctr
        return f"{_round2(clicks):.2f}"

    out["forecast_impressions"] = out.apply(_forecast_impressions, axis=1)
    out["forecast_clicks"] = out.apply(_forecast_clicks, axis=1)

    # pacing_ratio
    def _pacing_ratio(row) -> Optional[str]:
        expected = int(row["expected_spend_to_date_cents"])
        actual = int(row["spent_to_date_cents"])
        if expected <= 0:
            return None
        ratio = Decimal(actual) / Decimal(expected)
        return f"{_round2(ratio):.2f}"

    out["pacing_ratio"] = out.apply(_pacing_ratio, axis=1)

    return out


# ============================================================
# UI
# ============================================================
def _is_totalish(s: object) -> bool:
    if s is None:
        return False
    t = str(s).strip().lower()
    return t.startswith("total") or t in {"tot", "sum", "grand_total"}


def infer_group_path_column(df_norm: pd.DataFrame) -> Optional[str]:
    candidates = [
        "group",
        "campaign_group_name",
        "campaign_group",
        "campaign_group_budget",
        "campaign_group_name_",
    ]
    return first_existing_col(df_norm, candidates)


def infer_campaign_name_column(df_norm: pd.DataFrame) -> Optional[str]:
    candidates = ["campaign", "campaign_name"]
    return first_existing_col(df_norm, candidates)


def infer_budget_column(df_norm: pd.DataFrame) -> Optional[str]:
    # preference order: lifetime/total first, then current/new allocations
    candidates = [
        "lifetime_budget",
        "current_budget_total",
        "current_total",
        "total_budget",
        "planned_spend",
        "budget",
        "current_budget",
        "new_budget",
        "new_total",
        "new_budget_allocation_campaign_level",
        "current_budget_allocation_campaign_level",
    ]
    return first_existing_col(df_norm, candidates)


def infer_spend_column(df_norm: pd.DataFrame) -> Optional[str]:
    candidates = [
        "spent_to_date",
        "spent",
        "total_spent",
        "amount_spent",
        "cost",
        "current_budget_utilisation",
        "current_spend",
    ]
    return first_existing_col(df_norm, candidates)


def infer_status_column(df_norm: pd.DataFrame) -> Optional[str]:
    return first_existing_col(df_norm, ["status", "current_status", "off_on"])


def split_group_path(group_path: pd.Series) -> pd.DataFrame:
    """
    Extract Program / Industry / Channel from a "Group" path.
    Handles delimiters like:
    - "BV / Nordcloud / AWS / Traffic"
    - "BV I DECERNO I Awareness I 2025"
    - "AO | General Funnel | Awareness"
    """
    s = group_path.astype(str).fillna("").replace("nan", "")
    segs = s.str.split(r"\s*/\s*|\s*\|\s*|\s+I\s+", expand=True)
    # Ensure at least 3 cols exist
    for i in range(3):
        if segs.shape[1] <= i:
            segs[i] = ""
    return pd.DataFrame(
        {
            "Program": segs.iloc[:, 0].fillna(""),
            "Industry": segs.iloc[:, 1].fillna(""),
            "Channel": segs.iloc[:, 2].fillna(""),
        }
    )


def map_platform(channel: pd.Series) -> pd.Series:
    c = channel.astype(str).str.lower()
    platform = pd.Series(["Other"] * len(channel), index=channel.index, dtype="string")
    platform[c.str.contains("linkedin", na=False)] = "LinkedIn"
    platform[c.str.contains("google", na=False)] = "Google"
    platform[c.str.contains("meta|facebook|instagram", na=False)] = "Meta"
    return platform


def build_fact_table(raw_combined: pd.DataFrame) -> pd.DataFrame:
    """
    Build a unified fact table for the UI from heterogeneous CSV schemas.
    Uses a best-effort column inference and the "Group" path to extract hierarchy.
    """
    if raw_combined.empty:
        return pd.DataFrame()

    df = raw_combined.copy()
    # Normalize columns
    df = df.rename(columns={c: normalize_colname(c) for c in df.columns})

    group_col = infer_group_path_column(df)
    camp_col = infer_campaign_name_column(df)
    bud_col = infer_budget_column(df)
    sp_col = infer_spend_column(df)
    st_col = infer_status_column(df)

    # If no recognizable group column, we can't build hierarchy
    if group_col is None:
        return pd.DataFrame()

    group_path = col_as_1d_series(df, group_col, default="").astype(str).fillna("")
    hier = split_group_path(group_path)

    campaign = col_as_1d_series(df, camp_col, default="").astype(str).fillna("")

    # Date columns (flex mapping already present in START_DATE_ALIASES/END_DATE_ALIASES)
    start_col = first_existing_col(df, START_DATE_ALIASES)
    end_col = first_existing_col(df, END_DATE_ALIASES)
    start_date = col_as_1d_series(df, start_col, default=None)
    end_date = col_as_1d_series(df, end_col, default=None)

    budget_raw = col_as_1d_series(df, bud_col, default=None)
    spend_raw = col_as_1d_series(df, sp_col, default=None)
    status_raw = col_as_1d_series(df, st_col, default="")

    # Extra validation to guarantee 1D inputs for DataFrame constructor
    start_date = ensure_1d(start_date, df.index, default=None)
    end_date = ensure_1d(end_date, df.index, default=None)
    budget_raw = ensure_1d(budget_raw, df.index, default=None)
    spend_raw = ensure_1d(spend_raw, df.index, default=None)
    status_raw = ensure_1d(status_raw, df.index, default="")

    out = pd.DataFrame(
        {
            "Group": group_path,
            "Program": hier["Program"],
            "Industry": hier["Industry"],
            "Channel": hier["Channel"],
            "Platform": map_platform(hier["Channel"]),
            "Campaign": campaign,
            "Status": status_raw.astype(str).fillna(""),
            "start_date": start_date,
            "end_date": end_date,
            "budget_raw": budget_raw,
            "spend_raw": spend_raw,
            "__source_file": df.get("__source_file", ""),
        }
    )

    # Remove obvious total rows
    mask_total = out["Group"].apply(_is_totalish) | out["Campaign"].apply(_is_totalish)
    out = out.loc[~mask_total].copy()

    # Parse money
    out["budget_cents"] = series_to_cents(out["budget_raw"]).fillna(0).astype("int64")
    out["spend_cents"] = series_to_cents(out["spend_raw"]).fillna(0).astype("int64")

    # Dates default + type validation
    today_d = pd.Timestamp.today().date()
    out["start_date"] = parse_date_col(out["start_date"]).fillna(today_d)
    out["end_date"] = parse_date_col(out["end_date"]).fillna(today_d)

    # Aggregate to campaign grain for visuals
    key_cols = ["Program", "Industry", "Channel", "Platform", "Group", "Campaign"]
    agg = out.groupby(key_cols, dropna=False)[["budget_cents", "spend_cents"]].sum().reset_index()
    agg["start_date"] = out.groupby(key_cols, dropna=False)["start_date"].min().reset_index(drop=True)
    agg["end_date"] = out.groupby(key_cols, dropna=False)["end_date"].max().reset_index(drop=True)
    return agg


def money_fmt_from_cents(cents: int) -> str:
    return f"{Decimal(int(cents)) / Decimal(100):,.2f}"


def vega_donut(df: pd.DataFrame, label_col: str, value_col: str, title: str):
    spec = {
        "title": title,
        "data": {"values": df[[label_col, value_col]].to_dict(orient="records")},
        "mark": {"type": "arc", "innerRadius": 55},
        "encoding": {
            "theta": {"field": value_col, "type": "quantitative"},
            "color": {"field": label_col, "type": "nominal", "legend": {"title": ""}},
            "tooltip": [{"field": label_col}, {"field": value_col}],
        },
        "view": {"stroke": None},
    }
    st.vega_lite_chart(spec, use_container_width=True)


def vega_grouped_bar(df: pd.DataFrame, x: str, series: str, y: str, title: str):
    spec = {
        "title": title,
        "data": {"values": df[[x, series, y]].to_dict(orient="records")},
        "mark": "bar",
        "encoding": {
            "x": {"field": x, "type": "nominal", "sort": "-y", "axis": {"labelAngle": -20}},
            "y": {"field": y, "type": "quantitative"},
            "color": {"field": series, "type": "nominal", "legend": {"title": ""}},
            "xOffset": {"field": series},
            "tooltip": [{"field": x}, {"field": series}, {"field": y}],
        },
    }
    st.vega_lite_chart(spec, use_container_width=True)


def vega_area(df: pd.DataFrame, x: str, y: str, title: str):
    spec = {
        "title": title,
        "data": {"values": df[[x, y]].to_dict(orient="records")},
        "mark": {"type": "area", "line": True},
        "encoding": {
            "x": {"field": x, "type": "temporal"},
            "y": {"field": y, "type": "quantitative"},
            "tooltip": [{"field": x}, {"field": y}],
        },
    }
    st.vega_lite_chart(spec, use_container_width=True)


def build_daily_spend_timeline(df_campaign: pd.DataFrame, days: int = 60) -> pd.DataFrame:
    """
    Best-effort daily spend series.
    If no true daily spend exists, spread each campaign's spend evenly over elapsed days.
    """
    if df_campaign.empty:
        return pd.DataFrame(columns=["date", "spend"])

    today = pd.Timestamp.today().normalize()
    start_bound = today - pd.Timedelta(days=days - 1)

    # Compute per-campaign elapsed window
    start = pd.to_datetime(df_campaign["start_date"], errors="coerce").fillna(today)
    end = pd.to_datetime(df_campaign["end_date"], errors="coerce").fillna(today)
    elapsed_end = pd.concat([end, pd.Series([today] * len(end), index=end.index)], axis=1).min(axis=1)
    elapsed_start = pd.concat([start, pd.Series([start_bound] * len(start), index=start.index)], axis=1).max(axis=1)
    elapsed_days = (elapsed_end - elapsed_start).dt.days + 1
    elapsed_days = elapsed_days.clip(lower=1)

    spend = df_campaign["spend_cents"].astype("int64")
    per_day = (spend / elapsed_days).fillna(0)

    # Expand into daily rows (small datasets expected)
    rows: list[dict[str, object]] = []
    for idx in df_campaign.index[:2000]:
        s = elapsed_start.loc[idx]
        e = elapsed_end.loc[idx]
        if pd.isna(s) or pd.isna(e) or s > e:
            continue
        dr = pd.date_range(s, e, freq="D")
        v = float(per_day.loc[idx]) / 100.0
        for d in dr:
            rows.append({"date": d.date().isoformat(), "spend": v})

    if not rows:
        return pd.DataFrame(columns=["date", "spend"])

    out = pd.DataFrame(rows)
    out = out.groupby("date", as_index=False)["spend"].sum()
    return out


# -------------------------
# Load local data once
# -------------------------
raw = load_local_budget_csvs()
if raw.empty:
    st.error("No local CSV files found. Expected files like: `Copy of Budgets  - Sheet4.csv`")
    st.stop()

fact = build_fact_table(raw)
if fact.empty:
    st.error("Could not build a hierarchy fact table. Make sure your CSVs include a `Group` or `campaign group name` column.")
    with st.expander("Raw combined CSV data preview"):
        st.dataframe(raw.head(300), use_container_width=True)
    st.stop()


# -------------------------
# Sidebar navigation
# -------------------------
with st.sidebar:
    st.header("Navigation")
    page = st.radio("Menu", options=["Budget Overview", "Performance", "Simulation"], label_visibility="collapsed")
    st.caption("Data source: local CSV files matching `Copy of Budgets*.csv`")


if page == "Budget Overview":
    st.subheader("Budget Overview")

    total_budget_cents = int(fact["budget_cents"].sum())
    total_spend_cents = int(fact["spend_cents"].sum())
    active_customers = int(fact["Program"].replace("", pd.NA).dropna().nunique())
    channels = int(fact["Platform"].replace("", pd.NA).dropna().nunique())

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Assigned Budget", money_fmt_from_cents(total_budget_cents))
    c2.metric("Current Spend", money_fmt_from_cents(total_spend_cents))
    c3.metric("Active Customers", f"{active_customers}")
    c4.metric("Channels", f"{channels}")

    st.markdown("---")
    left, right = st.columns([1, 1])

    # Donut: allocation by platform (LinkedIn/Google/Meta/Other)
    alloc = fact.groupby("Platform", dropna=False)["budget_cents"].sum().reset_index()
    alloc = alloc[alloc["budget_cents"] > 0].sort_values("budget_cents", ascending=False)
    alloc["budget"] = alloc["budget_cents"].apply(lambda c: float(Decimal(int(c)) / Decimal(100)))
    if alloc.empty:
        left.info("No budget values found for donut chart.")
    else:
        with left:
            vega_donut(alloc.rename(columns={"Platform": "Channel", "budget": "Budget"}), "Channel", "Budget", "Budget Allocation by Channel")

    # Bar: customer budget vs spend (by Program)
    cust = fact.groupby("Program", dropna=False)[["budget_cents", "spend_cents"]].sum().reset_index()
    cust = cust[cust["Program"].astype(str).str.strip() != ""]
    cust = cust.sort_values("budget_cents", ascending=False).head(12)
    if cust.empty:
        right.info("No customer budget/spend data found.")
    else:
        plot_rows = []
        for _, r in cust.iterrows():
            plot_rows.append({"Customer": r["Program"], "Series": "Budget", "Value": float(Decimal(int(r["budget_cents"])) / Decimal(100))})
            plot_rows.append({"Customer": r["Program"], "Series": "Spend", "Value": float(Decimal(int(r["spend_cents"])) / Decimal(100))})
        with right:
            vega_grouped_bar(pd.DataFrame(plot_rows), x="Customer", series="Series", y="Value", title="Customer Budget vs Spend")


elif page == "Performance":
    st.subheader("Performance")

    spend_cents = int(fact["spend_cents"].sum())
    # Optional metrics: if present in any raw CSV we could map them later; for now show 0 if missing.
    impressions = 0
    clicks = 0
    conversions = 0

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Spend", money_fmt_from_cents(spend_cents))
    c2.metric("Impressions", f"{impressions:,}")
    c3.metric("Clicks", f"{clicks:,}")
    c4.metric("Conversions", f"{conversions:,}")

    st.markdown("---")
    timeline = build_daily_spend_timeline(fact, days=60)
    if timeline.empty:
        st.info("Not enough date/spend info to build a daily spend timeline.")
    else:
        vega_area(timeline, x="date", y="spend", title="Daily Spend Timeline (estimated)")

    st.markdown("---")
    st.subheader("Campaign Group Performance")

    grp = fact.groupby("Group", dropna=False)[["budget_cents", "spend_cents"]].sum().reset_index()
    grp = grp[grp["Group"].astype(str).str.strip() != ""]
    grp["utilization"] = grp.apply(
        lambda r: float(Decimal(int(r["spend_cents"])) / Decimal(int(r["budget_cents"]))) if int(r["budget_cents"]) > 0 else 0.0,
        axis=1,
    )
    grp["budget"] = grp["budget_cents"].apply(money_fmt_from_cents)
    grp["spend"] = grp["spend_cents"].apply(money_fmt_from_cents)
    grp = grp.sort_values("spend_cents", ascending=False).head(25)

    table = grp[["Group", "budget", "spend", "utilization"]].rename(
        columns={"budget": "Budget", "spend": "Spend", "utilization": "Utilization"}
    )
    st.data_editor(
        table,
        use_container_width=True,
        hide_index=True,
        disabled=True,
        column_config={
            "Utilization": st.column_config.ProgressColumn(
                "Utilization",
                help="Spend / Budget",
                format="%.0f%%",
                min_value=0.0,
                max_value=1.0,
            )
        },
    )


elif page == "Simulation":
    st.subheader("Simulation")

    base = fact.groupby("Platform", dropna=False)["budget_cents"].sum().reset_index()
    base = base.set_index("Platform")["budget_cents"].to_dict()

    def base_money(platform: str) -> Decimal:
        return _round2(Decimal(int(base.get(platform, 0))) / Decimal(100))

    st.markdown("Adjust platform budgets (best-effort; allocation logic can be added later).")

    colL, colG, colM = st.columns(3)
    with colL:
        li_val = st.slider(
            "LinkedIn",
            min_value=0.0,
            max_value=float(base_money("LinkedIn") * Decimal(2) + Decimal("1000")),
            value=float(base_money("LinkedIn")),
            step=10.0,
        )
    with colG:
        g_val = st.slider(
            "Google",
            min_value=0.0,
            max_value=float(base_money("Google") * Decimal(2) + Decimal("1000")),
            value=float(base_money("Google")),
            step=10.0,
        )
    with colM:
        m_val = st.slider(
            "Meta",
            min_value=0.0,
            max_value=float(base_money("Meta") * Decimal(2) + Decimal("1000")),
            value=float(base_money("Meta")),
            step=10.0,
        )

    original_total = base_money("LinkedIn") + base_money("Google") + base_money("Meta")
    simulated_total = _round2(Decimal(str(li_val)) + Decimal(str(g_val)) + Decimal(str(m_val)))
    delta = _round2(simulated_total - original_total)

    k1, k2, k3 = st.columns(3)
    k1.metric("Original Total", f"{original_total:,.2f}")
    k2.metric("Simulated Total", f"{simulated_total:,.2f}")
    k3.metric("Difference", f"{delta:,.2f}")

    st.markdown("---")
    sim_table = pd.DataFrame(
        [
            {"Platform": "LinkedIn", "Original": float(base_money("LinkedIn")), "Simulated": float(li_val)},
            {"Platform": "Google", "Original": float(base_money("Google")), "Simulated": float(g_val)},
            {"Platform": "Meta", "Original": float(base_money("Meta")), "Simulated": float(m_val)},
        ]
    )
    st.dataframe(sim_table, use_container_width=True, hide_index=True)


with st.expander("Raw combined CSV data preview"):
    st.dataframe(raw.head(500), use_container_width=True)

