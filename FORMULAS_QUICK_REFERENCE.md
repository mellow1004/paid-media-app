# Business Logic Formulas - Quick Reference Card

## Core Metrics

### Utilization
```
Utilization % = (spentToDate / totalBudget) × 100
```

### Daily Budget
```
dailyBudget = totalBudget / activeDays
where activeDays = totalDays - pausedDays
```

### Average Daily Spend
```
avgDailySpend = spentToDate / elapsedActiveDays
where elapsedActiveDays = min(today, end_date) - start_date + 1
```

### Forecasted Spend
```
forecastedSpend = spentToDate + (avgDailySpend × activeDaysRemaining)
where activeDaysRemaining = end_date - min(today, end_date)
```

### Active Days
```
activeDays = totalDays - pausedDays
where totalDays = end_date - start_date + 1
```

### Channel Allocation
```
channelAllocation % = (channelBudget / totalAllChannels) × 100
```

### Customer Utilization
```
customerUtilization = sum(groupSpends) / totalAssignedBudget
```

---

## Alert Triggers

### Critical Alert (Red Badge)
```
IF utilization ≥ threshold (default 90%)
OR (status IN ['stopped', 'ended', 'paused'] AND end_date > today)
THEN trigger Critical
```

### Warning Alert (Yellow Badge)
```
IF forecastedSpend ≥ (totalBudget × forecast_threshold)
   where forecast_threshold = default 1.05 (5% overrun)
THEN trigger Warning
```

### No Alert
```
IF utilization < threshold
AND forecastedSpend < (totalBudget × forecast_threshold)
AND status is normal
THEN no alert
```

---

## Hierarchical Aggregations

### Customer Level
```
assignedBudget = SUM(campaign.totalBudget WHERE campaign.customer = X)
currentSpend = SUM(campaign.spentToDate WHERE campaign.customer = X)
utilization = currentSpend / assignedBudget × 100
```

### Channel Level
```
allocatedBudget = SUM(campaign.totalBudget WHERE campaign.channel = X)
currentSpend = SUM(campaign.spentToDate WHERE campaign.channel = X)
utilization = currentSpend / allocatedBudget × 100
allocation_pct = allocatedBudget / SUM(all channels.allocatedBudget) × 100
```

### Campaign Group Level
```
assignedBudget = SUM(campaign.totalBudget WHERE campaign.group = X)
currentSpend = SUM(campaign.spentToDate WHERE campaign.group = X)
utilization = currentSpend / assignedBudget × 100
```

---

## Simulation Calculations

### Delta (Absolute)
```
delta = simulatedTotal - originalTotal
```

### Delta (Percentage)
```
delta % = (delta / originalTotal) × 100
```

### Per-Channel Adjustment
```
simulatedBudget = inputAmount × (1 + sliderPercentage / 100)
```

---

## Formatting Standards

### Currency (SEK)
```
display = cents / 100, formatted to 2 decimals
example: 123456 cents → "1,234.56"
```

### Precision
```
All financial calculations: integer cents (no floating-point errors)
Rounding: ROUND_HALF_UP (deterministic)
Display: 2 decimal places
```

---

## Date Calculations

### Elapsed Days
```
elapsed = min(today, end_date) - start_date + 1
```

### Remaining Days
```
remaining = end_date - min(today, end_date)
```

### Total Days
```
total = end_date - start_date + 1
```

---

## Status Icons

```
🟢 Active/On      → Campaign is running
🟡 Paused/Off     → Campaign is paused
🔴 Stopped/Ended  → Campaign has ended
⚪ Unknown        → Status not recognized
```

---

## User-Configurable Thresholds

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| `alert_threshold` | 0.90 (90%) | 0.50-1.00 | Critical utilization trigger |
| `forecast_threshold` | 1.05 (105%) | 1.00-1.50 | Forecast overrun warning |
| `alert_enabled` | True | True/False | Master alert toggle |

---

## Data Flow

```
CSV Files
    ↓
load_all_csvs() [cached 5min]
    ↓
build_internal_table() [schema mapping]
    ↓
compute_*_metrics() [hierarchical aggregations]
    ↓
compute_campaign_metrics() [full enrichment]
    ↓
Page Components [display + visualization]
```

---

## Performance Notes

- All calculations are **vectorized** (pandas operations)
- CSV loading is **cached** (5-minute TTL)
- Integer-cents arithmetic ensures **deterministic** results
- Expected performance: <500ms for up to 10,000 campaigns

---

**Last Updated**: 2026-01-26  
**Version**: 1.0  
**Currency**: SEK (Swedish Krona)

