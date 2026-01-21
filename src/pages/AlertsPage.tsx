import { AlertList } from '../components/alerts/AlertList';
import { useCampaignStore } from '../store/campaignStore';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function AlertsPage() {
  const { alerts } = useCampaignStore();

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Alerts
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor budget alerts and campaign warnings
        </p>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critical Alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-warning/10 text-warning-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{warningCount}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{infoCount}</p>
            <p className="text-sm text-muted-foreground">Info</p>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <AlertList />
    </div>
  );
}
