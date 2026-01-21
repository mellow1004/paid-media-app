import { useCampaignStore } from '../store/campaignStore';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Target, Play, Pause, StopCircle } from 'lucide-react';

export function CampaignsPage() {
  const { campaigns } = useCampaignStore();
  const { customers } = useDashboardStore();
  
  const currency = customers[0]?.currency || 'SEK';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-success" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-warning" />;
      case 'stopped':
        return <StopCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
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

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
  const stoppedCampaigns = campaigns.filter(c => c.status === 'stopped').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Campaigns
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage all advertising campaigns
        </p>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{campaigns.length}</p>
            <p className="text-sm text-muted-foreground">Total Campaigns</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success/10 text-success">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{activeCampaigns}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-warning/10 text-warning-600">
            <Pause className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{pausedCampaigns}</p>
            <p className="text-sm text-muted-foreground">Paused</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground">
            <StopCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stoppedCampaigns}</p>
            <p className="text-sm text-muted-foreground">Stopped</p>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
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
                    Duration
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Budget
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Daily Budget
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actual Spend
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {campaigns.map((campaign) => {
                  const utilization = campaign.total_budget > 0 
                    ? (campaign.actual_spend / campaign.total_budget) * 100 
                    : 0;
                  
                  return (
                    <tr 
                      key={campaign.campaign_id} 
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(campaign.status)}
                          <span className="font-medium text-foreground">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-foreground">
                          {formatCurrency(campaign.total_budget, currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-muted-foreground">
                          {formatCurrency(campaign.daily_budget, currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-foreground">
                          {formatCurrency(campaign.actual_spend, currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 overflow-hidden rounded-full bg-muted">
                            <div 
                              className={`h-full transition-all duration-300 rounded-full ${
                                utilization >= 95 ? 'bg-destructive' :
                                utilization >= 90 ? 'bg-warning' :
                                'bg-success'
                              }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            utilization >= 95 ? 'text-destructive' :
                            utilization >= 90 ? 'text-warning-600' :
                            'text-success'
                          }`}>
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
