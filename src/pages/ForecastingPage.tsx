import { useMemo } from 'react';
import { differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useCampaignStore } from '../store/campaignStore';
import { useDashboardStore } from '../store/dashboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function daysRemaining(start: Date, end: Date): number {
  const today = startOfDay(new Date());
  const s = startOfDay(new Date(start));
  const e = startOfDay(new Date(end));
  const from = isBefore(today, s) ? s : today;
  if (isBefore(e, from)) return 0;
  return differenceInDays(e, from) + 1;
}

export function ForecastingPage() {
  const { campaigns, simulationByCampaignId, setSimulation, resetAllSimulations } = useCampaignStore();
  const { campaignGroups } = useDashboardStore();

  const groupById = useMemo(() => new Map(campaignGroups.map(g => [g.group_id, g])), [campaignGroups]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof campaigns>();
    for (const c of campaigns) {
      const list = byGroup.get(c.group_id) ?? [];
      list.push(c);
      byGroup.set(c.group_id, list);
    }

    return Array.from(byGroup.entries())
      .map(([groupId, cs]) => {
        const group = groupById.get(groupId);
        const currentTotalBudget = cs.reduce((s, c) => s + c.total_budget, 0);
        const currentTotalSpend = cs.reduce((s, c) => s + c.actual_spend, 0);
        const currentRemaining = Math.max(0, currentTotalBudget - currentTotalSpend);

        const currentForecast = cs.reduce((s, c) => s + (c.actual_spend + c.daily_budget * daysRemaining(c.start_date, c.end_date)), 0);
        const simulatedForecast = cs.reduce((s, c) => {
          const sim = simulationByCampaignId[c.campaign_id];
          const daily = sim?.dailyBudget ?? c.daily_budget;
          return s + (c.actual_spend + daily * daysRemaining(c.start_date, c.end_date));
        }, 0);

        const simulatedTotalBudget = cs.reduce((s, c) => s + (simulationByCampaignId[c.campaign_id]?.totalBudget ?? c.total_budget), 0);

        return {
          groupId,
          groupName: group?.name ?? 'Uncategorized',
          campaigns: cs.slice().sort((a, b) => b.actual_spend - a.actual_spend),
          currentTotalBudget,
          currentTotalSpend,
          currentRemaining,
          currentForecast,
          simulatedTotalBudget,
          simulatedForecast,
        };
      })
      .sort((a, b) => b.currentTotalSpend - a.currentTotalSpend);
  }, [campaigns, groupById, simulationByCampaignId]);

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs items={[{ label: 'Forecasting' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Forecasting</h1>
          <p className="text-muted-foreground mt-1">
            Mutualized simulation across groups and campaigns. Adjust sliders to see deltas at group level.
          </p>
        </div>

        <button
          onClick={() => resetAllSimulations()}
          className="h-10 px-4 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted/30 transition-colors"
        >
          Reset all
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((g) => {
          const deltaBudget = g.simulatedTotalBudget - g.currentTotalBudget;
          const deltaForecast = g.simulatedForecast - g.currentForecast;
          const util = g.currentTotalBudget > 0 ? (g.currentTotalSpend / g.currentTotalBudget) * 100 : 0;

          return (
            <Card key={g.groupId}>
              <CardHeader>
                <CardTitle>{g.groupName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Group summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Spent</p>
                    <p className="font-semibold text-foreground">{formatCurrency(g.currentTotalSpend, 'SEK')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <p className="font-semibold text-foreground">{formatCurrency(g.currentRemaining, 'SEK')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Utilization</p>
                    <p className="font-semibold text-foreground">{formatPercentage(util, 2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Forecast Δ</p>
                    <p className="font-semibold text-foreground">{formatCurrency(deltaForecast, 'SEK')}</p>
                  </div>
                </div>

                {/* Campaign list with sliders */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Current (Budget / Daily)
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Simulated (Budget / Daily)
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Delta
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {g.campaigns.map((c) => {
                        const sim = simulationByCampaignId[c.campaign_id] ?? { totalBudget: c.total_budget, dailyBudget: c.daily_budget };

                        const maxTotal = Math.max(c.total_budget, sim.totalBudget) * 2 || 1000;
                        const maxDaily = Math.max(c.daily_budget, sim.dailyBudget) * 2 || 100;

                        const delta = {
                          total: sim.totalBudget - c.total_budget,
                          daily: sim.dailyBudget - c.daily_budget,
                        };

                        return (
                          <tr key={c.campaign_id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-4 align-top">
                              <div className="min-w-[280px]">
                                <p className="font-medium text-foreground">{c.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Spent: {formatCurrency(c.actual_spend, 'SEK')}
                                </p>
                              </div>

                              <div className="mt-3 space-y-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Simulated total budget</p>
                                  <input
                                    type="range"
                                    min={0}
                                    max={Math.ceil(maxTotal)}
                                    step={Math.max(1, Math.ceil(maxTotal / 200))}
                                    value={clamp(sim.totalBudget, 0, maxTotal)}
                                    onChange={(e) =>
                                      setSimulation(c.campaign_id, { totalBudget: Number(e.target.value) })
                                    }
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Simulated daily budget</p>
                                  <input
                                    type="range"
                                    min={0}
                                    max={Math.ceil(maxDaily)}
                                    step={Math.max(0.01, maxDaily / 200)}
                                    value={clamp(sim.dailyBudget, 0, maxDaily)}
                                    onChange={(e) =>
                                      setSimulation(c.campaign_id, { dailyBudget: Number(e.target.value) })
                                    }
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right align-top">
                              <div className="space-y-1">
                                <p className="text-foreground">{formatCurrency(c.total_budget, 'SEK')}</p>
                                <p className="text-muted-foreground">{formatCurrency(c.daily_budget, 'SEK')}</p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right align-top">
                              <div className="space-y-1">
                                <p className="text-foreground">{formatCurrency(sim.totalBudget, 'SEK')}</p>
                                <p className="text-muted-foreground">{formatCurrency(sim.dailyBudget, 'SEK')}</p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right align-top">
                              <div className="space-y-1">
                                <p className="text-foreground">{formatCurrency(delta.total, 'SEK')}</p>
                                <p className="text-muted-foreground">{formatCurrency(delta.daily, 'SEK')}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end text-sm text-muted-foreground">
                  Group budget Δ: <span className="ml-2 text-foreground font-medium">{formatCurrency(deltaBudget, 'SEK')}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

