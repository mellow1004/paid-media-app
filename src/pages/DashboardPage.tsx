import { useMemo, useState } from 'react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { BudgetUtilizationChart } from '../components/dashboard/BudgetUtilizationChart';
import { CustomerBudgetChart } from '../components/dashboard/CustomerBudgetChart';
import { CampaignTable } from '../components/dashboard/CampaignTable';
import { FilterBar } from '../components/dashboard/FilterBar';
import { useCampaignStore } from '../store/campaignStore';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency } from '../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import type { CsvSource } from '../data/csvSources';
import { buildDatasetFromCsvSources } from '../data/buildDatasetFromCsv';

export function DashboardPage() {
  const { campaigns, alerts, mergeInDataset: mergeCampaignDataset, resetToBaseDataset: resetCampaignDataset } = useCampaignStore();
  const { customers, mergeInDataset: mergeDashboardDataset, resetToBaseDataset: resetDashboardDataset } = useDashboardStore();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
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

      {/* CSV Upload */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Import CSV (additive)</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetCampaignDataset();
                resetDashboardDataset();
                setUploadedFiles([]);
                setUploadError(null);
              }}
              className="h-9 px-3 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted/30 transition-colors"
            >
              Reset to bundled data
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept=".csv"
                disabled={isUploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;

                  setIsUploading(true);
                  setUploadError(null);
                  try {
                    const contents = await Promise.all(files.map((f) => f.text()));
                    const sources: CsvSource[] = files.map((f, i) => ({
                      filename: f.name,
                      content: contents[i] ?? '',
                    }));

                    const added = buildDatasetFromCsvSources(sources);
                    mergeDashboardDataset(added);
                    mergeCampaignDataset(added);

                    setUploadedFiles((prev) => Array.from(new Set([...prev, ...files.map((f) => f.name)])));
                  } catch (err) {
                    setUploadError(err instanceof Error ? err.message : 'Failed to import CSV files.');
                  } finally {
                    setIsUploading(false);
                    // Allow re-uploading same files
                    e.target.value = '';
                  }
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upload one or multiple CSV files. They will be parsed with the same sanitization + mapping rules and added to the existing dataset.
              </p>
            </div>

            <div className="min-w-[220px]">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                <p className="text-xs text-muted-foreground">Imported files</p>
                <p className="text-lg font-semibold text-foreground">{uploadedFiles.length.toFixed(0)}</p>
                {isUploading && <p className="text-xs text-muted-foreground mt-1">Importing…</p>}
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive">
              {uploadError}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {uploadedFiles.slice(0, 6).join(', ')}
              {uploadedFiles.length > 6 ? ` … +${uploadedFiles.length - 6} more` : ''}
            </div>
          )}
        </CardContent>
      </Card>

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
          value={`${metrics.utilization.toFixed(2)}%`}
          change={metrics.utilization - 75}
          changeLabel="from target"
          trend={metrics.utilization > 90 ? 'up' : 'neutral'}
          variant={metrics.utilization >= 100 ? 'destructive' : metrics.utilization >= 90 ? 'warning' : 'success'}
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
