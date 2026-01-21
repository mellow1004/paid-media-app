import { useMemo } from 'react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { BudgetUtilizationChart } from '../components/dashboard/BudgetUtilizationChart';
import { CustomerBudgetChart } from '../components/dashboard/CustomerBudgetChart';
import { CampaignTable } from '../components/dashboard/CampaignTable';
import { FilterBar } from '../components/dashboard/FilterBar';
import { useCampaignStore } from '../store/campaignStore';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency } from '../utils/formatters';

export function DashboardPage() {
  const { campaigns, alerts } = useCampaignStore();
  const { customers } = useDashboardStore();
  
  const currency = customers[0]?.currency || 'SEK';

  const metrics = useMemo(() => {
    const totalBudget = campaigns.reduce((sum, c) => sum + c.total_budget, 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + c.actual_spend, 0);
    const utilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    
    // Calculate trend based on average daily spend
    const avgDailySpend = totalSpend / 30; // Simplified
    const expectedDailySpend = totalBudget / 30;
    const spendTrend = expectedDailySpend > 0 
      ? ((avgDailySpend - expectedDailySpend) / expectedDailySpend) * 100 
      : 0;

    return {
      totalBudget,
      totalSpend,
      utilization,
      activeCampaigns,
      criticalAlerts,
      spendTrend,
    };
  }, [campaigns, alerts]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Budget Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your advertising budgets across all platforms
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* KPI Cards - 4 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Budget"
          value={formatCurrency(metrics.totalBudget, currency)}
          change={2.5}
          changeLabel="vs last month"
          trend="up"
          variant="default"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(metrics.totalSpend, currency)}
          change={metrics.spendTrend}
          changeLabel="vs expected"
          trend={metrics.spendTrend > 5 ? 'up' : metrics.spendTrend < -5 ? 'down' : 'neutral'}
          variant={metrics.spendTrend > 10 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Budget Utilization"
          value={`${metrics.utilization.toFixed(1)}%`}
          change={metrics.utilization - 75}
          changeLabel="from target"
          trend={metrics.utilization > 90 ? 'up' : 'neutral'}
          variant={metrics.utilization > 95 ? 'destructive' : metrics.utilization > 90 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Active Campaigns"
          value={metrics.activeCampaigns.toString()}
          change={metrics.criticalAlerts}
          changeLabel={`${metrics.criticalAlerts} critical alerts`}
          trend={metrics.criticalAlerts > 0 ? 'up' : 'neutral'}
          variant={metrics.criticalAlerts > 0 ? 'destructive' : 'success'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetUtilizationChart />
        <CustomerBudgetChart />
      </div>

      {/* Campaign Table */}
      <CampaignTable />
    </div>
  );
}
