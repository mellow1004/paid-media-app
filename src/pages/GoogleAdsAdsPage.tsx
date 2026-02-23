import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaignStore } from '../store/campaignStore';
import { useDashboardStore } from '../store/dashboardStore';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/formatters';
import { parseGoogleNordcloudRaw } from '../data/googleAdsRaw';

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u00A0/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function GoogleAdsAdsPage() {
  const navigate = useNavigate();
  const { customerId, channelId, campaignId } = useParams();

  const { customers, channels } = useDashboardStore();
  const { campaigns } = useCampaignStore();

  const customer = customers.find(c => c.customer_id === customerId) ?? customers[0];
  const channel = channels.find(ch => ch.channel_id === channelId);
  const campaign = campaigns.find(c => c.campaign_id === campaignId);

  const rows = useMemo(() => {
    const raw = parseGoogleNordcloudRaw();
    if (!customer || !campaign) return [];

    // Best-effort matching: raw Google file naming differs from our normalized campaign names.
    const key = normalizeKey(campaign.name);
    const customerRows = raw.filter(r => r.customer === customer.name);
    const matched = customerRows.filter(r => normalizeKey(r.campaign).includes(key) || key.includes(normalizeKey(r.campaign)));
    return matched.length > 0 ? matched : customerRows;
  }, [customer, campaign]);

  if (!customer || !channel || !campaign) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Customers', to: '/customers' }, { label: 'Google Ads' }, { label: 'Ads' }]} onBack={() => navigate(-1)} />
        <p className="text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Customers', to: '/customers' },
          { label: customer.name, to: `/customers/${customer.customer_id}` },
          { label: channel.name, to: `/customers/${customer.customer_id}/platform/${channel.channel_id}` },
          { label: campaign.name },
          { label: 'Ads' },
        ]}
        onBack={() => navigate(`/customers/${customer.customer_id}/platform/${channel.channel_id}`)}
      />

      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Ads</h1>
        <p className="text-muted-foreground mt-1">
          Raw Google export (best-effort match). If your raw file includes true ad-level rows, they will appear here.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{campaign.name}</CardTitle>
          <span className="text-sm text-muted-foreground">{rows.length} rows</span>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No matching rows found in `Copy of Budgets  - Google Nordcloud.csv` for this campaign.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Raw Item
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Daily Budget
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Forecast Remaining
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((r, idx) => (
                    <tr key={`${r.campaign}-${idx}`} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">{r.campaign}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-foreground">{formatCurrency(r.dailyBudget, 'SEK')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-foreground">{formatCurrency(r.forecastedRemaining, 'SEK')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-foreground">{formatCurrency(r.totalSpent, 'SEK')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-muted-foreground">{r.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

