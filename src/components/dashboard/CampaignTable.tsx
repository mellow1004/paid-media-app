import { useCampaignStore } from '../../store/campaignStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { forecastTotalSpend } from '../../utils/budgetCalculations';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

type HealthStatus = 'good' | 'warning' | 'critical';

interface CampaignWithHealth {
  campaign_id: string;
  name: string;
  status: string;
  total_budget: number;
  actual_spend: number;
  start_date: Date;
  end_date: Date;
  daily_budget: number;
  utilization: number;
  forecastedSpend: number;
  health: HealthStatus;
  healthReason: string;
}

export function CampaignTable() {
  const { campaigns, pauseWindows } = useCampaignStore();
  const { customers } = useDashboardStore();

  // Get currency from first customer or default to SEK
  const currency = customers[0]?.currency || 'SEK';

  // Calculate health status for each campaign
  const campaignsWithHealth: CampaignWithHealth[] = campaigns
    .filter(() => {
      // In a real app, we'd filter by selectedCustomerId and selectedChannelId
      return true;
    })
    .map(campaign => {
      const utilization = campaign.total_budget > 0 
        ? (campaign.actual_spend / campaign.total_budget) * 100 
        : 0;
      
      const campaignPauseWindows = pauseWindows.filter(
        pw => pw.campaign_id === campaign.campaign_id
      );
      
      const forecast = forecastTotalSpend(campaign, campaignPauseWindows);
      const forecastedSpend = forecast.projectedSpend;
      const forecastOverrun = forecastedSpend > campaign.total_budget * 1.05;
      
      let health: HealthStatus = 'good';
      let healthReason = 'On track';
      
      if (utilization >= 95 || forecastOverrun) {
        health = 'critical';
        healthReason = forecastOverrun 
          ? `Forecast exceeds budget by ${((forecastedSpend / campaign.total_budget - 1) * 100).toFixed(0)}%`
          : 'Budget nearly exhausted';
      } else if (utilization >= 90) {
        health = 'warning';
        healthReason = 'Approaching budget limit';
      }
      
      return {
        ...campaign,
        utilization,
        forecastedSpend,
        health,
        healthReason,
      };
    });

  const getHealthBadge = (health: HealthStatus) => {
    switch (health) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive animate-pulse-fast">
            <AlertCircle className="w-3.5 h-3.5" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <CheckCircle className="w-3.5 h-3.5" />
            Good
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning-700">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Paused
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            Stopped
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressBarColor = (health: HealthStatus) => {
    if (health === 'critical') return 'bg-destructive';
    if (health === 'warning') return 'bg-warning';
    return 'bg-success';
  };

  const getForecastTrend = (campaign: CampaignWithHealth) => {
    const ratio = campaign.forecastedSpend / campaign.total_budget;
    if (ratio > 1.05) {
      return (
        <span className="inline-flex items-center gap-1 text-destructive text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          +{((ratio - 1) * 100).toFixed(0)}%
        </span>
      );
    }
    if (ratio < 0.95) {
      return (
        <span className="inline-flex items-center gap-1 text-warning-600 text-xs">
          <TrendingDown className="w-3.5 h-3.5" />
          {((ratio - 1) * 100).toFixed(0)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-success text-xs">
        On track
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campaign Performance</CardTitle>
        <span className="text-sm text-muted-foreground">
          {campaignsWithHealth.length} campaigns
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Campaign
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Budget
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Spend
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Utilization
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Forecast
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Health
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {campaignsWithHealth.map((campaign) => (
                <tr 
                  key={campaign.campaign_id} 
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(campaign.status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">
                      {formatCurrency(campaign.total_budget, currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">
                      {formatCurrency(campaign.actual_spend, currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {campaign.utilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(campaign.health)}`}
                          style={{ width: `${Math.min(campaign.utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-foreground">
                        {formatCurrency(campaign.forecastedSpend, currency)}
                      </span>
                      {getForecastTrend(campaign)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {getHealthBadge(campaign.health)}
                      <span className="text-xs text-muted-foreground max-w-32 truncate" title={campaign.healthReason}>
                        {campaign.healthReason}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
