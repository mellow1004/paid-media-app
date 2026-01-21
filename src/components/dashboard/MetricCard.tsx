import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: 'dollar' | 'trending-up' | 'trending-down';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  trend = 'neutral',
  variant = 'default'
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (variant === 'success' || trend === 'up') return 'text-success bg-success/10';
    if (variant === 'destructive' || trend === 'down') return 'text-destructive bg-destructive/10';
    if (variant === 'warning') return 'text-warning bg-warning/10';
    return 'text-muted-foreground bg-muted';
  };

  const getIconBgColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success';
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'destructive':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border/50 p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <p className="text-2xl font-display font-bold text-foreground">
            {value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                {change !== undefined && (
                  <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                )}
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${getIconBgColor()}`}>
          <DollarSign className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
