import { useDashboardStore } from '../../store/dashboardStore';
import { Filter } from 'lucide-react';

export function FilterBar() {
  const { 
    customers, 
    channels, 
    selectedCustomerId, 
    selectedChannelId,
    selectedCampaignStatus,
    setSelectedCustomerId, 
    setSelectedChannelId,
    setSelectedCampaignStatus 
  } = useDashboardStore();

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border border-border/50 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>
      
      <div className="h-6 w-px bg-border" />
      
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCustomerId || ''}
          onChange={(e) => setSelectedCustomerId(e.target.value || null)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">All Customers</option>
          {customers.map((customer) => (
            <option key={customer.customer_id} value={customer.customer_id}>
              {customer.name}
            </option>
          ))}
        </select>

        <select
          value={selectedChannelId || ''}
          onChange={(e) => setSelectedChannelId(e.target.value || null)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">All Channels</option>
          {channels.map((channel) => (
            <option key={channel.channel_id} value={channel.channel_id}>
              {channel.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCampaignStatus || ''}
          onChange={(e) => setSelectedCampaignStatus(e.target.value as 'active' | 'paused' | 'stopped' | null || null)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
        </select>
      </div>

      {(selectedCustomerId || selectedChannelId || selectedCampaignStatus) && (
        <button
          onClick={() => {
            setSelectedCustomerId(null);
            setSelectedChannelId(null);
            setSelectedCampaignStatus(null);
          }}
          className="ml-auto text-sm text-primary hover:text-primary-700 font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
