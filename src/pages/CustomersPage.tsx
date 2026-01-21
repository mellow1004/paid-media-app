import { useDashboardStore } from '../store/dashboardStore';
import { useCampaignStore } from '../store/campaignStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Users, Building2, DollarSign, TrendingUp } from 'lucide-react';

export function CustomersPage() {
  const { customers } = useDashboardStore();
  const { campaigns } = useCampaignStore();

  // Calculate stats per customer
  const customerStats = customers.map(customer => {
    // For demo, distribute campaigns evenly across customers
    const customerIndex = customers.findIndex(c => c.customer_id === customer.customer_id);
    const campaignsForCustomer = campaigns.filter((_, idx) => idx % customers.length === customerIndex);
    
    const totalBudget = campaignsForCustomer.reduce((sum, c) => sum + c.total_budget, 0);
    const totalSpend = campaignsForCustomer.reduce((sum, c) => sum + c.actual_spend, 0);
    const activeCampaigns = campaignsForCustomer.filter(c => c.status === 'active').length;
    
    return {
      ...customer,
      totalBudget,
      totalSpend,
      activeCampaigns,
      utilization: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
    };
  });

  const totalCustomers = customers.length;
  const totalBudget = customerStats.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalSpend = customerStats.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgUtilization = customerStats.length > 0 
    ? customerStats.reduce((sum, c) => sum + c.utilization, 0) / customerStats.length 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Customers
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage customer accounts and their advertising budgets
        </p>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{totalCustomers}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success/10 text-success">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {formatCurrency(totalBudget, 'SEK').replace(' kr', '')}
            </p>
            <p className="text-sm text-muted-foreground">Total Budget</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-warning/10 text-warning-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {formatCurrency(totalSpend, 'SEK').replace(' kr', '')}
            </p>
            <p className="text-sm text-muted-foreground">Total Spend</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{avgUtilization.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Avg Utilization</p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Campaigns
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Budget
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Spend
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {customerStats.map((customer) => (
                  <tr 
                    key={customer.customer_id} 
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-medium">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                        {customer.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(customer.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-foreground">{customer.activeCampaigns}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(customer.totalBudget, customer.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-foreground">
                        {formatCurrency(customer.totalSpend, customer.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 overflow-hidden rounded-full bg-muted">
                          <div 
                            className={`h-full transition-all duration-300 rounded-full ${
                              customer.utilization >= 95 ? 'bg-destructive' :
                              customer.utilization >= 90 ? 'bg-warning' :
                              'bg-success'
                            }`}
                            style={{ width: `${Math.min(customer.utilization, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          customer.utilization >= 95 ? 'text-destructive' :
                          customer.utilization >= 90 ? 'text-warning-600' :
                          'text-success'
                        }`}>
                          {customer.utilization.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
