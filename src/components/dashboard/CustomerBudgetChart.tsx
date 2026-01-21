import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCampaignStore } from '../../store/campaignStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export function CustomerBudgetChart() {
  const { campaigns } = useCampaignStore();
  const { customers } = useDashboardStore();

  // Calculate budget and spend per customer
  const customerData = customers.map(customer => {
    // For demo, distribute campaigns across customers
    const customerIndex = customers.findIndex(c => c.customer_id === customer.customer_id);
    const campaignsForCustomer = campaigns.filter((_, idx) => idx % customers.length === customerIndex);
    
    const totalBudget = campaignsForCustomer.reduce((sum, c) => sum + c.total_budget, 0);
    const totalSpend = campaignsForCustomer.reduce((sum, c) => sum + c.actual_spend, 0);
    
    return {
      name: customer.name.length > 15 ? customer.name.slice(0, 15) + '...' : customer.name,
      fullName: customer.name,
      budget: totalBudget,
      spend: totalSpend,
    };
  }).filter(d => d.budget > 0 || d.spend > 0);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = customerData.find(d => d.name === label);
      return (
        <div className="bg-card border border-border rounded-lg shadow-soft p-3">
          <p className="font-medium text-foreground mb-2">{data?.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.dataKey === 'budget' ? 'Budget' : 'Spend'}:{' '}
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.value.toLocaleString('sv-SE')} kr
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Budget vs Spend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={customerData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fill: 'hsl(220 9% 46%)', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                axisLine={{ stroke: 'hsl(220 13% 91%)' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: 'hsl(220 9% 46%)', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(220 13% 91%)' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-sm text-foreground">
                    {value === 'budget' ? 'Budget' : 'Spend'}
                  </span>
                )}
              />
              <Bar 
                dataKey="budget" 
                fill="hsl(0 72% 51%)" 
                radius={[0, 4, 4, 0]}
                name="budget"
              />
              <Bar 
                dataKey="spend" 
                fill="hsl(142 76% 36%)" 
                radius={[0, 4, 4, 0]}
                name="spend"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

