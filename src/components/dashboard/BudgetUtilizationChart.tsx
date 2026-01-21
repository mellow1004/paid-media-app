import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useCampaignStore } from '../../store/campaignStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

const CHANNEL_COLORS: Record<string, string> = {
  'LinkedIn': 'hsl(201 100% 35%)',
  'Google Ads': 'hsl(217 89% 61%)',
  'Meta Ads': 'hsl(214 89% 52%)',
};

export function BudgetUtilizationChart() {
  const { campaigns } = useCampaignStore();
  const { channels } = useDashboardStore();

  // Calculate budget per channel
  const channelData = channels.map((channel, channelIndex) => {
    const campaignsForChannel = campaigns.filter((_, idx) => idx % channels.length === channelIndex);
    
    const totalBudget = campaignsForChannel.reduce((sum, c) => sum + c.total_budget, 0);
    const totalSpend = campaignsForChannel.reduce((sum, c) => sum + c.actual_spend, 0);
    
    return {
      name: channel.name,
      budget: totalBudget,
      spend: totalSpend,
      value: totalBudget,
      color: CHANNEL_COLORS[channel.name] || 'hsl(220 9% 46%)',
    };
  });

  const totalBudget = channelData.reduce((sum, d) => sum + d.budget, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof channelData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalBudget > 0 ? ((data.budget / totalBudget) * 100).toFixed(1) : 0;
      return (
        <div className="bg-card border border-border rounded-lg shadow-soft p-3">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Budget: <span className="font-medium text-foreground">{data.budget.toLocaleString('sv-SE')} kr</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Andel: <span className="font-medium text-foreground">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => {
    return (
      <div className="flex flex-col gap-3 mt-4">
        {channelData.map((entry) => {
          const percentage = totalBudget > 0 ? ((entry.budget / totalBudget) * 100).toFixed(0) : 0;
          return (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Allocation by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {channelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderLegend()}
      </CardContent>
    </Card>
  );
}
