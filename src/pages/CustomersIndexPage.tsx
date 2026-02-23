import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { useCampaignStore } from '../store/campaignStore';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../utils/formatters';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

export function CustomersIndexPage() {
  const navigate = useNavigate();
  const { customers, channels, campaignGroups } = useDashboardStore();
  const { campaigns } = useCampaignStore();

  const rows = useMemo(() => {
    return customers.map((customer) => {
      const channelIds = new Set(channels.filter(ch => ch.customer_id === customer.customer_id).map(ch => ch.channel_id));
      const groupIds = new Set(campaignGroups.filter(g => channelIds.has(g.channel_id)).map(g => g.group_id));
      const cs = campaigns.filter(c => groupIds.has(c.group_id));

      const totalBudget = cs.reduce((s, c) => s + c.total_budget, 0);
      const totalSpend = cs.reduce((s, c) => s + c.actual_spend, 0);
      const remaining = Math.max(0, totalBudget - totalSpend);
      const activeCampaigns = cs.filter(c => c.status === 'active').length;

      return {
        customer,
        totalSpend,
        remaining,
        activeCampaigns,
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, channels, campaignGroups, campaigns]);

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs items={[{ label: 'Customers' }]} />

      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">
          Choose a customer to start the step-by-step drill-down.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rows.map((r) => (
          <button
            key={r.customer.customer_id}
            onClick={() => navigate(`/customers/${r.customer.customer_id}`)}
            className="text-left"
          >
            <Card>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-display font-bold text-foreground">{r.customer.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Active campaigns: <span className="text-foreground font-medium">{r.activeCampaigns.toFixed(0)}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total spent</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(r.totalSpend, 'SEK')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(r.remaining, 'SEK')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

