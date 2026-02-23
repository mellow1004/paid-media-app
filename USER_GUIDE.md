# Brightvision Ads Insights Tool - User Guide

## Getting Started

### Running the Application
```bash
cd /Users/melkerlowenbrand/prompt-studio
python3 -m streamlit run streamlit_app.py
```

The app will open at **http://localhost:8502**

---

## Navigation

The sidebar contains four main pages:
- **Budget Overview** - High-level KPIs and allocation
- **Spend Tracking** - Campaign-level performance with alerts
- **Simulation** - What-if budget scenario planning
- **Settings** - Alert configuration and system info

---

## Page 1: Budget Overview

### What You'll See
- **4 KPI Cards** at the top:
  - Total Assigned Budget (sum of all campaigns)
  - Current Spend (actual money spent)
  - Active Customers (count of unique customers)
  - Active Channels (count of unique channels)

- **Budget Allocation Donut Chart**:
  - Shows % distribution across LinkedIn, Google, Meta, Other
  - Colors: LinkedIn (Red), Google (Blue), Meta (Purple), Other (Gray)

- **Customer Budget vs Spend Bar Chart**:
  - Horizontal bars comparing planned budget (red) vs actual spend (green)
  - Sorted by budget size (largest at top)

- **Customer Utilization Progress Bars**:
  - One bar per customer
  - Shows spend / budget ratio
  - Red bar if utilization ≥ 90%

- **Channel Spend Tracker**:
  - Progress bars for each channel
  - Label shows: "Channel Name (X.X% of total)"
  - Right side shows: "Current Spend / Total Budget"

### How to Use
1. **Filter by Customer**: Use sidebar dropdown to focus on one customer
2. **Filter by Channel**: Use sidebar dropdown to see only LinkedIn, Google, Meta, or Other
3. **Sync Data**: Click "Sync data" in sidebar to reload CSV files

---

## Page 2: Spend Tracking

### What You'll See
- **Campaign Performance Table** with columns:
  - **Status**: Icon showing campaign state
    - 🟢 Active/On
    - 🟡 Paused/Off
    - 🔴 Stopped/Ended
  - **Platform**: LinkedIn, Google, Meta, Other
  - **Campaign Name**: Name from CSV
  - **Assigned Budget**: Total budget allocated (in SEK)
  - **Current Spend**: Actual spend to date (in SEK)
  - **Daily Budget**: Planned daily spend (totalBudget / activeDays)
  - **Avg Daily Spend**: Actual average daily spend (currentSpend / elapsedDays)
  - **Forecasted Spend**: Projected total spend at campaign end
  - **Utilization**: Progress bar showing spend / budget ratio
  - **Active Days**: Total days minus paused days
  - **Days Left**: Remaining days until end_date
  - **Alerts**: Badge showing Critical (red) or Warning (yellow) if triggered

- **Cumulative Spend vs Budget Chart**:
  - Area chart showing estimated cumulative spend over time
  - Red area = Spend, Gray area = Budget

### How to Read Alerts
- **🔴 Critical**: Utilization ≥ 90% OR unexpected stop
- **🟡 Warning**: Forecasted spend will exceed budget by >5%
- **No badge**: Campaign is on track

### Key Metrics Explained
- **Daily Budget** = Total Budget ÷ Active Days
  - This is the *planned* daily spend rate
- **Avg Daily Spend** = Current Spend ÷ Elapsed Days
  - This is the *actual* daily burn rate
- **Forecasted Spend** = Current Spend + (Avg Daily Spend × Days Left)
  - Projects what total spend will be at campaign end

### How to Use
1. **Sort by column**: Click column headers to sort
2. **Identify overspending**: Look for red Critical badges
3. **Check forecast**: Yellow Warning badges indicate projected overruns
4. **Review pacing**: Compare Daily Budget vs Avg Daily Spend
   - If Avg > Daily Budget → spending too fast
   - If Avg < Daily Budget → underpacing

---

## Page 3: Simulation

### What You'll See
- **3 Channel Cards** (LinkedIn, Google, Meta):
  - Current Spend display
  - Amount input field (direct SEK value)
  - Percentage slider (-50% to +100%)
  - Real-time Original → Simulated preview
  - Delta (change amount in SEK)

- **3 Summary KPI Cards**:
  - Original Total: Current total budget
  - Simulated Total: Adjusted total budget
  - Delta: Difference with percentage change

- **Current vs Simulated Donut Charts**:
  - Side-by-side comparison
  - Shows allocation % before and after

- **Comparison Summary Table**:
  - Platform, Original, Simulated, Delta, Change %

- **Current vs Simulated Bar Chart**:
  - Horizontal bars for visual comparison

### How to Use
1. **Direct Amount Adjustment**:
   - Type a new budget amount in the "Amount (SEK)" field
   - Useful for precise budget allocation

2. **Percentage Adjustment**:
   - Use the slider to increase/decrease by %
   - The slider applies to the amount field value
   - Example: If amount is 10,000 and slider is +50%, simulated = 15,000

3. **Combined Approach**:
   - Set base amount in input field
   - Fine-tune with slider
   - Changes are applied: `simulated = amount × (1 + slider/100)`

4. **Review Impact**:
   - Watch the Delta card to see total budget change
   - Compare donut charts to see allocation shift
   - Check the summary table for per-channel changes

5. **Reset**:
   - Set slider back to 0% to return to original
   - Or reload the page

### Use Cases
- **Budget reallocation**: Shift budget from underperforming to high-performing channels
- **Seasonal planning**: Test +20% increase for Q4
- **Cost cutting**: Test -30% reduction across all channels
- **Platform prioritization**: Model doubling LinkedIn budget

---

## Page 4: Settings

### Alert Configuration
- **Enable alerts**: Toggle to turn all alerts on/off globally
- **Critical utilization threshold**: Set the % at which campaigns trigger red alerts
  - Default: 90%
  - Range: 50%-100%
  - Example: Set to 80% for earlier warnings
- **Forecast overrun threshold**: Set how much forecast overrun triggers warnings
  - Default: 105% (5% overrun)
  - Range: 100%-150%
  - Example: Set to 110% to only warn if forecast exceeds budget by 10%+

### Advanced Options
- **Show debug panels**: Toggle to display raw CSV data at bottom of pages
  - Useful for troubleshooting data mapping issues

### Data Source Info
- Shows that data comes from local `Copy of Budgets*.csv` files
- Explains that all calculations are real-time

### Business Logic Reference
- Shows the formulas used for all calculations
- Currency: SEK
- Precision: 2 decimals

---

## Sidebar Controls

### Filters (Global)
- **Customer**: Filter all pages to show only one customer
- **Channel**: Filter all pages to show only one channel
- Both set to "All" by default

### Alerts & Thresholds (Quick Access)
- Collapsible expander with same controls as Settings page
- Changes here apply immediately

### Sync Data
- Button to reload all CSV files
- Shows timestamp of last sync
- Use this when you've updated CSV files

---

## Understanding the Metrics

### Utilization
- **Formula**: (Current Spend / Total Budget) × 100
- **Interpretation**:
  - <70%: Underpacing (may need to increase spend)
  - 70-90%: On track
  - 90-100%: Critical (near budget limit)
  - >100%: Over budget

### Forecasted Spend
- **Formula**: Current Spend + (Avg Daily Spend × Days Left)
- **Interpretation**:
  - If Forecast < Budget: Underpacing, safe
  - If Forecast ≈ Budget: On track
  - If Forecast > Budget: Warning, will overspend

### Daily Budget vs Avg Daily Spend
- **Daily Budget**: What you *should* spend per day
- **Avg Daily Spend**: What you *actually* spend per day
- **Pacing Check**:
  - Avg > Daily Budget: Spending too fast
  - Avg = Daily Budget: Perfect pacing
  - Avg < Daily Budget: Spending too slow

---

## Alert System Logic

### Three-Tier System

#### 🔴 Critical (Red Badge)
**Triggers when:**
1. Utilization ≥ threshold (default 90%), OR
2. Campaign status is "stopped"/"ended"/"paused" but end_date is still in the future

**What it means:**
- Budget is almost exhausted or exceeded
- Campaign stopped unexpectedly
- **Action required**: Review campaign immediately

#### 🟡 Warning (Yellow Badge)
**Triggers when:**
- Forecasted Spend ≥ (Total Budget × forecast_threshold)
- Default threshold: 105% (5% overrun)

**What it means:**
- Current burn rate will cause budget overrun by campaign end
- **Action suggested**: Reduce daily spend or extend campaign

#### No Badge
- Campaign is on track
- No action needed

---

## Data Sources

### CSV File Requirements
The app automatically loads all files matching:
```
Copy of Budgets*.csv
```

### Supported Column Names
The app is flexible with column names. It recognizes variations like:
- **Dates**: "Start date", "Start", "Startdatum", "period_start", etc.
- **Budget**: "Budget", "Total Budget", "Planned Spend", "Assigned Budget", etc.
- **Spend**: "Spend", "Amount spent", "Cost", "Current Spend", etc.
- **Status**: "Status", "Current Status", "Off_On", etc.

### Hierarchy Extraction
- Customer/Industry/Program extracted from "Group" column
- Format: "Customer / Industry / Program" or "Customer | Industry | Program"
- Platform (LinkedIn/Google/Meta) inferred from campaign text

---

## Tips & Best Practices

### Daily Workflow
1. **Morning**: Check Spend Tracking page for Critical alerts
2. **Mid-week**: Review Budget Overview for channel allocation
3. **End of week**: Use Simulation to plan next week's budgets

### Monthly Planning
1. Export current metrics (via debug panel)
2. Run simulations for next month scenarios
3. Adjust thresholds in Settings if needed
4. Compare forecasts to targets

### Troubleshooting
- **Missing data?** 
  - Check that CSV files are in the same folder as `streamlit_app.py`
  - Click "Sync data" in sidebar
- **Wrong calculations?**
  - Enable "Show debug panels" in Settings
  - Check the "mapped internal table" for data quality
- **Alerts not showing?**
  - Check that "Enable alerts" is toggled on in Settings
  - Verify thresholds aren't set too high

---

## Keyboard Shortcuts

- **Ctrl/Cmd + R**: Refresh page (re-runs all calculations)
- **Ctrl/Cmd + F**: Find text on page
- **Tab**: Navigate between input fields in Simulation

---

## Performance

- **Initial load**: 2-5 seconds (depending on CSV file count)
- **Page switching**: Instant (cached data)
- **Filter changes**: <500ms
- **Simulation updates**: Real-time (no delay)

### Cache Behavior
- CSV data is cached for 5 minutes
- Click "Sync data" to force refresh
- Calculations are performed on every page load (but use cached CSV data)

---

## Support

### Documentation Files
- **BUSINESS_LOGIC_DOCUMENTATION.md** - Complete technical documentation
- **FORMULAS_QUICK_REFERENCE.md** - Formula reference card
- **USER_GUIDE.md** - This file

### Common Issues

**Q: Why are some campaigns missing?**  
A: The app filters out rows where the campaign name contains "Total", "Sum", or "Grand Total".

**Q: Can I edit budgets directly in the app?**  
A: No, budgets are read-only from CSV files. Use the Simulation page to test changes.

**Q: How often should I sync data?**  
A: Data is cached for 5 minutes. Sync manually if you've just updated CSV files.

**Q: Can I export simulation results?**  
A: Currently, simulation results are view-only. Take screenshots or use the summary table.

---

## Version Info

- **Version**: 1.0
- **Last Updated**: 2026-01-26
- **Currency**: SEK (Swedish Krona)
- **Decimal Precision**: 2 decimals for all monetary values

---

**Need help?** Check the debug panels in Settings or review the technical documentation files.

