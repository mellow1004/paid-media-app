import { useMemo, useState } from 'react';
import { differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useCampaignStore } from '../../store/campaignStore';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Calculator, RotateCcw } from 'lucide-react';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function remainingDays(start: Date, end: Date): number {
  const today = startOfDay(new Date());
  const s = startOfDay(new Date(start));
  const e = startOfDay(new Date(end));
  const from = isBefore(today, s) ? s : today;
  if (isBefore(e, from)) return 0;
  return differenceInDays(e, from) + 1;
}

export function SimulationPanel() {
  const {
    campaigns,
    simulationByCampaignId,
    setSimulation,
    resetSimulation,
  } = useCampaignStore();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const selectedCampaign = campaigns.find(c => c.campaign_id === selectedCampaignId);
  const baseline = selectedCampaign ? simulationByCampaignId[selectedCampaign.campaign_id] : undefined;

  const metrics = useMemo(() => {
    if (!selectedCampaign || !baseline) return null;

    const daysRemaining = remainingDays(selectedCampaign.start_date, selectedCampaign.end_date);

    const current = {
      totalBudget: selectedCampaign.total_budget,
      dailyBudget: selectedCampaign.daily_budget,
      forecastedSpend: selectedCampaign.actual_spend + (selectedCampaign.daily_budget * daysRemaining),
      utilization: selectedCampaign.total_budget > 0 ? (selectedCampaign.actual_spend / selectedCampaign.total_budget) * 100 : 0,
    };

    const simulated = {
      totalBudget: baseline.totalBudget,
      dailyBudget: baseline.dailyBudget,
      forecastedSpend: selectedCampaign.actual_spend + (baseline.dailyBudget * daysRemaining),
      utilization: baseline.totalBudget > 0 ? (selectedCampaign.actual_spend / baseline.totalBudget) * 100 : 0,
    };

    return {
      daysRemaining,
      current,
      simulated,
      delta: {
        totalBudget: simulated.totalBudget - current.totalBudget,
        dailyBudget: simulated.dailyBudget - current.dailyBudget,
        forecastedSpend: simulated.forecastedSpend - current.forecastedSpend,
      },
    };
  }, [selectedCampaign, baseline]);

  const maxTotalBudget = selectedCampaign
    ? Math.max(selectedCampaign.total_budget, baseline?.totalBudget ?? 0) * 2 || 1000
    : 1000;

  const maxDailyBudget = selectedCampaign
    ? Math.max(selectedCampaign.daily_budget, baseline?.dailyBudget ?? 0) * 2 || 100
    : 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Budget Simulator</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare Current vs Simulated (baseline from “New” columns)
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Campaign
          </label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a campaign...</option>
            {campaigns.map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCampaign && baseline && metrics && (
          <>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Spend to date</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(selectedCampaign.actual_spend, 'SEK')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Days remaining</p>
                <p className="text-lg font-semibold text-foreground">
                  {metrics.daysRemaining.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm text-foreground">{formatDate(selectedCampaign.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End Date</p>
                <p className="text-sm text-foreground">{formatDate(selectedCampaign.end_date)}</p>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Simulated Total Budget (SEK)</p>
                  <p className="text-xs text-muted-foreground">Delta vs current: {formatCurrency(metrics.delta.totalBudget, 'SEK')}</p>
                </div>
                <button
                  onClick={() => resetSimulation(selectedCampaign.campaign_id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-muted/70 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={Math.ceil(maxTotalBudget)}
                step={Math.max(1, Math.ceil(maxTotalBudget / 200))}
                value={clamp(baseline.totalBudget, 0, maxTotalBudget)}
                onChange={(e) => setSimulation(selectedCampaign.campaign_id, { totalBudget: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(0, 'SEK')}</span>
                <span>{formatCurrency(maxTotalBudget, 'SEK')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Simulated Daily Budget (SEK)</p>
                <p className="text-xs text-muted-foreground">Delta vs current: {formatCurrency(metrics.delta.dailyBudget, 'SEK')}</p>
              </div>

              <input
                type="range"
                min={0}
                max={Math.ceil(maxDailyBudget)}
                step={Math.max(0.01, maxDailyBudget / 200)}
                value={clamp(baseline.dailyBudget, 0, maxDailyBudget)}
                onChange={(e) => setSimulation(selectedCampaign.campaign_id, { dailyBudget: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(0, 'SEK')}</span>
                <span>{formatCurrency(maxDailyBudget, 'SEK')}</span>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm font-semibold text-foreground mb-3">Current</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total budget</span>
                    <span className="text-foreground">{formatCurrency(metrics.current.totalBudget, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily budget</span>
                    <span className="text-foreground">{formatCurrency(metrics.current.dailyBudget, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="text-foreground">{formatPercentage(metrics.current.utilization, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forecasted spend</span>
                    <span className="text-foreground">{formatCurrency(metrics.current.forecastedSpend, 'SEK')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-semibold text-foreground mb-3">Simulated</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total budget</span>
                    <span className="text-foreground">{formatCurrency(metrics.simulated.totalBudget, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily budget</span>
                    <span className="text-foreground">{formatCurrency(metrics.simulated.dailyBudget, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="text-foreground">{formatPercentage(metrics.simulated.utilization, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forecasted spend</span>
                    <span className="text-foreground">{formatCurrency(metrics.simulated.forecastedSpend, 'SEK')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <p className="text-sm font-medium text-foreground mb-2">Delta</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total budget</p>
                  <p className="font-semibold text-foreground">{formatCurrency(metrics.delta.totalBudget, 'SEK')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Daily budget</p>
                  <p className="font-semibold text-foreground">{formatCurrency(metrics.delta.dailyBudget, 'SEK')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Forecasted spend</p>
                  <p className="font-semibold text-foreground">{formatCurrency(metrics.delta.forecastedSpend, 'SEK')}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
