import { useCampaignStore } from '../../store/campaignStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AlertCircle, AlertTriangle, Info, Clock, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export function AlertList() {
  const { alerts } = useCampaignStore();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          container: 'border-l-4 border-l-destructive bg-destructive/5',
          icon: 'text-destructive bg-destructive/10',
          badge: 'bg-destructive text-destructive-foreground animate-pulse-fast',
        };
      case 'warning':
        return {
          container: 'border-l-4 border-l-warning bg-warning/5',
          icon: 'text-warning-700 bg-warning/10',
          badge: 'bg-warning text-warning-foreground',
        };
      default:
        return {
          container: 'border-l-4 border-l-muted-foreground bg-muted/30',
          icon: 'text-muted-foreground bg-muted',
          badge: 'bg-muted text-muted-foreground',
        };
    }
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    // Sort by type priority (critical first, then warning, then info)
    const priority = { critical: 0, warning: 1, info: 2 };
    const priorityDiff = (priority[a.type as keyof typeof priority] || 2) - (priority[b.type as keyof typeof priority] || 2);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by date (most recent first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-4">
              <Info className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">All clear!</h3>
            <p className="text-muted-foreground">No alerts at this time. Your campaigns are running smoothly.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Alerts</CardTitle>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          {alerts.filter(a => a.type === 'critical').length} critical
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {sortedAlerts.map((alert) => {
            const styles = getAlertStyles(alert.type);
            return (
              <div
                key={alert.alert_id}
                className={`p-4 ${styles.container} transition-colors hover:bg-muted/20`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.icon}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                        {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{alert.message}</p>
                    {alert.campaign_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campaign ID: {alert.campaign_id}
                      </p>
                    )}
                  </div>

                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
