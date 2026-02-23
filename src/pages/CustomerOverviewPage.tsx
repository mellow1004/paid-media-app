import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { useCampaignStore } from '../store/campaignStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/formatters';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Linkedin, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { addDays, differenceInDays, endOfMonth, isBefore, startOfDay } from 'date-fns';

type PlatformCardConfig = {
  channelName: 'LinkedIn' | 'Google Ads';
  title: string;
  icon: typeof Linkedin;
  accent: string;
};

const PLATFORM_CARDS: PlatformCardConfig[] = [
  {
    channelName: 'LinkedIn',
    title: 'LinkedIn',
    icon: Linkedin,
    accent: 'bg-linkedin/10 text-linkedin',
  },
  {
    channelName: 'Google Ads',
    title: 'Google Ads',
    icon: Search,
    accent: 'bg-google/10 text-google',
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function daysRemainingWithinMonth(start: Date, end: Date): number {
  const today = startOfDay(new Date());
  const s = startOfDay(new Date(start));
  const e = startOfDay(new Date(end));
  const monthEnd = startOfDay(endOfMonth(today));

  const from = isBefore(today, s) ? s : today;
  const to = isBefore(e, monthEnd) ? e : monthEnd;
  if (isBefore(to, from)) return 0;
  return differenceInDays(to, from) + 1;
}

function utilizationColor(utilPercent: number): { solid: string; gradientFrom: string; gradientTo: string } {
  if (utilPercent >= 100) {
    return { solid: 'hsl(0 84% 60%)', gradientFrom: 'hsl(0 84% 60%)', gradientTo: 'hsl(0 72% 51%)' };
  }
  if (utilPercent >= 90) {
    return { solid: 'hsl(38 92% 50%)', gradientFrom: 'hsl(46 97% 65%)', gradientTo: 'hsl(32 95% 44%)' };
  }
  return { solid: 'hsl(142 76% 36%)', gradientFrom: 'hsl(142 69% 58%)', gradientTo: 'hsl(142 72% 29%)' };
}

type StatusFilter = 'all' | 'active' | 'paused' | 'completed';
type TimeframeFilter = 'all' | '7d' | 'month';
type PlatformFilter = 'both' | 'linkedin' | 'google';

function endDateMatchesTimeframe(end: Date, timeframe: TimeframeFilter): boolean {
  if (timeframe === 'all') return true;
  const today = startOfDay(new Date());
  const e = startOfDay(new Date(end));
  if (isBefore(e, today)) return false; // "Ends within..." implies upcoming

  if (timeframe === '7d') {
    const until = startOfDay(addDays(today, 7));
    return e <= until;
  }
  // timeframe === 'month'
  const monthEnd = startOfDay(endOfMonth(today));
  return e <= monthEnd;
}

function MetricCard({
  title,
  value,
  subvalue,
}: {
  title: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-display font-bold text-foreground">{value}</p>
        {subvalue && <p className="mt-1 text-sm text-muted-foreground">{subvalue}</p>}
      </CardContent>
    </Card>
  );
}

export function CustomerOverviewPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const { customers, channels, campaignGroups } = useDashboardStore();
  const { campaigns } = useCampaignStore();

  const customer = customers.find(c => c.customer_id === customerId) ?? customers[0];

  // Customer dashboard filters (affect summary metrics + spendwheel)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('both');

  const platformStats = useMemo(() => {
    if (!customer) return [];

    const channelsForCustomer = channels.filter(ch => ch.customer_id === customer.customer_id);
    const groupsForCustomer = campaignGroups.filter(g =>
      channelsForCustomer.some(ch => ch.channel_id === g.channel_id)
    );

    return PLATFORM_CARDS.map(cfg => {
      const channel = channelsForCustomer.find(ch => ch.name === cfg.channelName);
      const groupIds = new Set(
        groupsForCustomer
          .filter(g => g.channel_id === channel?.channel_id)
          .map(g => g.group_id)
      );
      const campaignsForChannel = campaigns.filter(c => groupIds.has(c.group_id));

      const totalSpend = campaignsForChannel.reduce((sum, c) => sum + c.actual_spend, 0);
      const totalBudget = campaignsForChannel.reduce((sum, c) => sum + c.total_budget, 0);
      const remaining = Math.max(0, totalBudget - totalSpend);
      const activeCampaigns = campaignsForChannel.filter(c => c.status === 'active').length;

      return {
        cfg,
        channel,
        totalBudget,
        totalSpend,
        remaining,
        activeCampaigns,
      };
    });
  }, [customer, channels, campaignGroups, campaigns]);

  const campaignsForCustomer = useMemo(() => {
    if (!customer) return [];

    const channelsForCustomer = channels.filter(ch => ch.customer_id === customer.customer_id);
    const channelIds = new Set(channelsForCustomer.map(ch => ch.channel_id));
    const groupIds = new Set(campaignGroups.filter(g => channelIds.has(g.channel_id)).map(g => g.group_id));
    return campaigns.filter(c => groupIds.has(c.group_id));
  }, [customer, channels, campaignGroups, campaigns]);

  const channelById = useMemo(() => new Map(channels.map(ch => [ch.channel_id, ch])), [channels]);
  const groupById = useMemo(() => new Map(campaignGroups.map(g => [g.group_id, g])), [campaignGroups]);

  const filteredCampaigns = useMemo(() => {
    const wantStatus = statusFilter;
    const wantTimeframe = timeframeFilter;
    const wantPlatform = platformFilter;

    return campaignsForCustomer.filter((c) => {
      // Status filter
      if (wantStatus !== 'all') {
        if (wantStatus === 'completed' && c.status !== 'stopped') return false;
        if (wantStatus === 'active' && c.status !== 'active') return false;
        if (wantStatus === 'paused' && c.status !== 'paused') return false;
      }

      // Timeframe filter (based on end date)
      if (wantTimeframe !== 'all') {
        if (!endDateMatchesTimeframe(c.end_date, wantTimeframe)) return false;
      }

      // Platform filter
      if (wantPlatform !== 'both') {
        const group = groupById.get(c.group_id);
        const channel = group ? channelById.get(group.channel_id) : undefined;
        const channelName = channel?.name;
        if (wantPlatform === 'linkedin' && channelName !== 'LinkedIn') return false;
        if (wantPlatform === 'google' && channelName !== 'Google Ads') return false;
      }

      return true;
    });
  }, [campaignsForCustomer, statusFilter, timeframeFilter, platformFilter, groupById, channelById]);

  const customerMetrics = useMemo(() => {
    const cs = filteredCampaigns;

    const totalBudget = cs.reduce((s, c) => s + c.total_budget, 0);
    const totalSpend = cs.reduce((s, c) => s + c.actual_spend, 0);
    const remaining = Math.max(0, totalBudget - totalSpend);
    const utilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    // Estimated end-of-month spend using our daily-budget forecast logic:
    // spentToDate + (dailyBudget * daysRemainingWithinCurrentMonth)
    const estimatedEomSpend = cs.reduce((s, c) => {
      const days = daysRemainingWithinMonth(c.start_date, c.end_date);
      return s + (c.actual_spend + c.daily_budget * days);
    }, 0);

    return {
      totalBudget,
      totalSpend,
      remaining,
      utilization,
      estimatedEomSpend,
      campaignCount: cs.length,
    };
  }, [filteredCampaigns]);

  if (!customer) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground">No customers found in dataset.</p>
      </div>
    );
  }

  const totalBudget = customerMetrics?.totalBudget ?? 0;
  const totalSpend = customerMetrics?.totalSpend ?? 0;
  const remaining = customerMetrics?.remaining ?? 0;
  const utilization = customerMetrics?.utilization ?? 0;
  const estimatedEomSpend = customerMetrics?.estimatedEomSpend ?? 0;
  const filteredCount = customerMetrics?.campaignCount ?? 0;

  const donutData = [
    { name: 'spent', value: clamp(utilization, 0, 100) },
    { name: 'rest', value: Math.max(0, 100 - clamp(utilization, 0, 100)) },
  ];

  const utilColors = utilizationColor(utilization);
  const platformMaxSpend = Math.max(...platformStats.map(p => p.totalSpend), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs items={[{ label: 'Customers', to: '/customers' }, { label: customer.name }]} />

      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          {customer.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Customer dashboard overview. Use the platform cards below to drill down.
        </p>
      </div>

      {/* Filters (interactive) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Remaining days</label>
                <select
                  value={timeframeFilter}
                  onChange={(e) => setTimeframeFilter(e.target.value as TimeframeFilter)}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="7d">Ends within 7 days</option>
                  <option value="month">Ends this month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Platform</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="both">Both</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="google">Google Ads</option>
                </select>
              </div>
            </div>

            <div className="lg:ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredCount.toFixed(0)}</span> campaigns
              </span>
              {filteredCount === 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  No matches
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main metrics + spendwheel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <MetricCard
            title="Total Budget"
            value={formatCurrency(totalBudget, 'SEK')}
          />
          <MetricCard
            title="Spent to Date"
            value={formatCurrency(totalSpend, 'SEK')}
          />
        </div>

        <div className="xl:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Utilization</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="utilGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={utilColors.gradientFrom} />
                          <stop offset="100%" stopColor={utilColors.gradientTo} />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius="70%"
                        outerRadius="95%"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        <Cell fill="url(#utilGradient)" />
                        <Cell fill="hsl(220 14% 96%)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Utilization</p>
                    <p className="mt-1 text-5xl font-display font-bold text-foreground">
                      {utilization.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total spend</p>
                    <p className="mt-1 text-2xl font-display font-bold text-foreground">
                      {formatCurrency(totalSpend, 'SEK')}
                    </p>
                  </div>
                  <div className="pt-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${clamp(utilization, 0, 120)}%`,
                          backgroundColor: utilColors.solid,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Green: safe · Yellow: &gt; 90% · Red: &gt; 100%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <MetricCard
            title="Remaining"
            value={formatCurrency(remaining, 'SEK')}
            subvalue="Total Budget − Spent"
          />
          <MetricCard
            title="Forecast"
            value={formatCurrency(estimatedEomSpend, 'SEK')}
            subvalue="Estimated End-of-Month"
          />
        </div>
      </div>

      {/* Platform quick-links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-foreground">Platforms</h2>
          <span className="text-sm text-muted-foreground">Click to drill down</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {platformStats.map(({ cfg, channel, totalBudget: pBudget, totalSpend: pSpend, remaining: pRemaining, activeCampaigns }) => {
            const Icon = cfg.icon;
            const disabled = !channel;
            const barWidth = (pSpend / platformMaxSpend) * 100;

            return (
              <button
                key={cfg.channelName}
                disabled={disabled}
                onClick={() => {
                  if (!channel) return;
                  navigate(`/customers/${customer.customer_id}/platform/${channel.channel_id}`);
                }}
                className={`text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Card hover>
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${cfg.accent}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Platform</p>
                          <p className="text-xl font-display font-bold text-foreground">{cfg.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Active campaigns</p>
                        <p className="text-lg font-semibold text-foreground">{activeCampaigns.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Spent</p>
                        <p className="text-base font-semibold text-foreground">{formatCurrency(pSpend, 'SEK')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                        <p className="text-base font-semibold text-foreground">{formatCurrency(pRemaining, 'SEK')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Budget</p>
                        <p className="text-base font-semibold text-foreground">{formatCurrency(pBudget, 'SEK')}</p>
                      </div>
                    </div>

                    {/* Mini spend bar (relative spend) */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Relative spend</span>
                        <span>{barWidth.toFixed(2)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${clamp(barWidth, 0, 100)}%`,
                            backgroundColor: cfg.channelName === 'LinkedIn' ? 'hsl(201 100% 35%)' : 'hsl(217 89% 61%)',
                          }}
                        />
                      </div>
                    </div>

                    {disabled && (
                      <div className="text-sm text-muted-foreground">
                        No data found for this platform for the selected customer.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

