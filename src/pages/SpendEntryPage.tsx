import { useState } from 'react';
import { useCampaignStore } from '../store/campaignStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Receipt, Save, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export function SpendEntryPage() {
  const { campaigns, updateCampaignSpend } = useCampaignStore();
  const { user } = useAuthStore();
  const { customers } = useDashboardStore();
  const [spendEntries, setSpendEntries] = useState<Record<string, string>>({});
  const [savedCampaigns, setSavedCampaigns] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'admin';
  const currency = customers[0]?.currency || 'SEK';
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  const handleSpendChange = (campaignId: string, value: string) => {
    setSpendEntries(prev => ({
      ...prev,
      [campaignId]: value
    }));
    setSavedCampaigns(prev => {
      const newSet = new Set(prev);
      newSet.delete(campaignId);
      return newSet;
    });
  };

  const handleSave = async (campaignId: string) => {
    if (!isAdmin) return;

    const value = spendEntries[campaignId];
    if (!value) return;

    setIsSaving(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newSpend = parseFloat(value);
    if (!isNaN(newSpend)) {
      updateCampaignSpend(campaignId, newSpend);
      setSavedCampaigns(prev => new Set(prev).add(campaignId));
    }
    
    setIsSaving(false);
  };

  const handleSaveAll = async () => {
    if (!isAdmin) return;

    setIsSaving(true);

    for (const [campaignId, value] of Object.entries(spendEntries)) {
      if (value) {
        const newSpend = parseFloat(value);
        if (!isNaN(newSpend)) {
          updateCampaignSpend(campaignId, newSpend);
          setSavedCampaigns(prev => new Set(prev).add(campaignId));
        }
      }
    }

    setIsSaving(false);
  };

  const getUtilization = (campaign: typeof campaigns[0]) => {
    const enteredValue = spendEntries[campaign.campaign_id];
    const spend = enteredValue ? parseFloat(enteredValue) : campaign.actual_spend;
    return campaign.total_budget > 0 ? (spend / campaign.total_budget) * 100 : 0;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 95) return 'text-destructive';
    if (utilization >= 90) return 'text-warning-600';
    return 'text-success';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Spend Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Update actual spend for active campaigns
          </p>
        </div>
        
        {isAdmin ? (
          <button
            onClick={handleSaveAll}
            disabled={isSaving || Object.keys(spendEntries).length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Changes
              </>
            )}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-muted text-muted-foreground">
            <Lock className="w-4 h-4" />
            View Only
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Manual Spend Entry</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the current actual spend from your advertising platforms. Changes will automatically 
            trigger budget recalculations and alert checks.
          </p>
        </div>
      </div>

      {/* Spend Entry Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Campaigns</CardTitle>
          <span className="text-sm text-muted-foreground">
            {activeCampaigns.length} campaigns
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
                    Duration
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Current Spend
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    New Spend
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {activeCampaigns.map((campaign) => {
                  const utilization = getUtilization(campaign);
                  const isSaved = savedCampaigns.has(campaign.campaign_id);
                  const hasChanges = spendEntries[campaign.campaign_id] !== undefined;
                  
                  return (
                    <tr 
                      key={campaign.campaign_id} 
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isSaved && (
                            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                          )}
                          <span className="font-medium text-foreground">{campaign.name}</span>
                        </div>
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
                          {formatCurrency(campaign.actual_spend, currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            value={spendEntries[campaign.campaign_id] ?? ''}
                            onChange={(e) => handleSpendChange(campaign.campaign_id, e.target.value)}
                            placeholder={campaign.actual_spend.toString()}
                            disabled={!isAdmin}
                            className="w-32 h-9 px-3 rounded-lg border border-border bg-background text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                            min="0"
                            step="100"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${getUtilizationColor(utilization)}`}>
                          {utilization.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleSave(campaign.campaign_id)}
                            disabled={!isAdmin || !hasChanges || isSaving}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isAdmin && hasChanges
                                ? 'bg-primary text-primary-foreground hover:bg-primary-700'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Saved
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                Save
                              </>
                            )}
                          </button>
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

      {/* Warning for high utilization */}
      {activeCampaigns.some(c => getUtilization(c) >= 90) && (
        <div className="flex items-start gap-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-warning-700">High Utilization Warning</h3>
            <p className="text-sm text-warning-600 mt-1">
              Some campaigns are approaching or exceeding their budget limits. Consider reviewing 
              their spend and adjusting budgets if necessary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
