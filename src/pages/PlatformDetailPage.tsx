import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { useCampaignStore } from '../store/campaignStore';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/formatters';

type TabKey = 'groups' | 'campaigns';

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function PlatformDetailPage() {
  const navigate = useNavigate();
  const { customerId, channelId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get('view') as TabKey) || 'groups';
  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('view', next);
    setSearchParams(sp, { replace: true });
  };

  const { customers, channels, campaignGroups } = useDashboardStore();
  const { campaigns } = useCampaignStore();

  const customer = customers.find(c => c.customer_id === customerId) ?? customers[0];
  const channel = channels.find(ch => ch.channel_id === channelId);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const groupsForChannel = useMemo(() => {
    if (!channel) return [];
    return campaignGroups.filter(g => g.channel_id === channel.channel_id);
  }, [campaignGroups, channel]);

  const campaignsForChannel = useMemo(() => {
    const groupIds = new Set(groupsForChannel.map(g => g.group_id));
    return campaigns.filter(c => groupIds.has(c.group_id));
  }, [campaigns, groupsForChannel]);

  const groupRows = useMemo(() => {
    const groups = groupsForChannel.map(g => {
      const cs = campaignsForChannel.filter(c => c.group_id === g.group_id);
      const totalSpend = sum(cs.map(c => c.actual_spend));
      const totalBudget = sum(cs.map(c => c.total_budget));
      const remaining = Math.max(0, totalBudget - totalSpend);
      const active = cs.filter(c => c.status === 'active').length;
      return {
        group: g,
        totalSpend,
        remaining,
        active,
        campaignCount: cs.length,
      };
    });

    return groups.sort((a, b) => b.totalSpend - a.totalSpend);
  }, [groupsForChannel, campaignsForChannel]);

  const filteredCampaigns = useMemo(() => {
    if (!selectedGroupId) return campaignsForChannel;
    return campaignsForChannel.filter(c => c.group_id === selectedGroupId);
  }, [campaignsForChannel, selectedGroupId]);

  if (!customer || !channel) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Customers', to: '/customers' }, { label: 'Platform' }]} onBack={() => navigate(-1)} />
        <p className="text-muted-foreground">Platform not found for this customer.</p>
      </div>
    );
  }

  const isGoogle = channel.name === 'Google Ads';

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Customers', to: '/customers' },
          { label: customer.name, to: `/customers/${customer.customer_id}` },
          { label: channel.name },
        ]}
        onBack={() => navigate(`/customers/${customer.customer_id}`)}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-foreground">{channel.name}</h1>
        <p className="text-muted-foreground">
          Drill down by Campaign Group or view all campaigns. Click a group to filter campaigns.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('groups')}
          className={`h-9 px-4 rounded-lg text-sm font-medium border transition-colors ${
            tab === 'groups'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-muted/30'
          }`}
        >
          Campaign Group View
        </button>
        <button
          onClick={() => setTab('campaigns')}
          className={`h-9 px-4 rounded-lg text-sm font-medium border transition-colors ${
            tab === 'campaigns'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-muted/30'
          }`}
        >
          Campaign / Ad Set View
        </button>

        {selectedGroupId && (
          <button
            onClick={() => setSelectedGroupId(null)}
            className="ml-auto h-9 px-4 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted/30 transition-colors"
          >
            Clear group filter
          </button>
        )}
      </div>

      {tab === 'groups' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Groups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Campaign Group
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Active Campaigns
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Campaigns
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {groupRows.map(({ group, totalSpend, remaining, active, campaignCount }) => {
                    const isSelected = selectedGroupId === group.group_id;
                    return (
                      <tr
                        key={group.group_id}
                        className={`cursor-pointer hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => setSelectedGroupId(group.group_id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-foreground">{group.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-foreground">{formatCurrency(totalSpend, 'SEK')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-foreground">{formatCurrency(remaining, 'SEK')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-foreground">{active.toFixed(0)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-muted-foreground">{campaignCount.toFixed(0)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign list (always shown; filtered when group selected or in Campaign tab) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {tab === 'campaigns' ? 'Campaigns' : 'Campaigns (filtered)'}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {filteredCampaigns.length} items
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Campaign / Ad Set
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Budget
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Remaining
                  </th>
                  {isGoogle && (
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ads
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCampaigns
                  .slice()
                  .sort((a, b) => b.actual_spend - a.actual_spend)
                  .map((c) => {
                    const remaining = Math.max(0, c.total_budget - c.actual_spend);
                    const adsLink = isGoogle
                      ? `/customers/${customer.customer_id}/platform/${channel.channel_id}/campaign/${c.campaign_id}/ads`
                      : null;

                    return (
                      <tr key={c.campaign_id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{c.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Group:{' '}
                              {groupsForChannel.find(g => g.group_id === c.group_id)?.name ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-foreground">{formatCurrency(c.total_budget, 'SEK')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-foreground">{formatCurrency(c.actual_spend, 'SEK')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-foreground">{formatCurrency(remaining, 'SEK')}</span>
                        </td>
                        {isGoogle && (
                          <td className="px-6 py-4 text-right">
                            {adsLink ? (
                              <NavLink
                                to={adsLink}
                                className="text-primary hover:text-primary-700 text-sm font-medium"
                              >
                                View ads
                              </NavLink>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
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

