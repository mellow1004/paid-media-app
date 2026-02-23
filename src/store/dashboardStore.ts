import { create } from 'zustand';
import type { CampaignStatus, Customer, Channel } from '../types';
import type { CampaignGroup } from '../types';
import { dataset } from '../data/dataset';

interface DashboardStore {
  // Data
  customers: Customer[];
  channels: Channel[];
  campaignGroups: CampaignGroup[];
  
  // Filters
  selectedCustomerId: string | null;
  selectedChannelId: string | null;
  selectedCampaignStatus: CampaignStatus | null;
  
  // Filter actions
  setSelectedCustomerId: (id: string | null) => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedCampaignStatus: (status: CampaignStatus | null) => void;
  resetFilters: () => void;
  
  // Helpers
  getChannelsByCustomer: (customerId: string) => Channel[];
  getCampaignGroupsByChannel: (channelId: string) => CampaignGroup[];
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initialize with CSV-built data
  customers: dataset.customers,
  channels: dataset.channels,
  campaignGroups: dataset.campaignGroups,
  
  // Filter state
  selectedCustomerId: null,
  selectedChannelId: null,
  selectedCampaignStatus: null,
  
  // Filter actions
  setSelectedCustomerId: (id) => {
    set({ selectedCustomerId: id, selectedChannelId: null });
  },
  
  setSelectedChannelId: (id) => {
    set({ selectedChannelId: id });
  },
  
  setSelectedCampaignStatus: (status) => {
    set({ selectedCampaignStatus: status });
  },
  
  resetFilters: () => {
    set({
      selectedCustomerId: null,
      selectedChannelId: null,
      selectedCampaignStatus: null,
    });
  },
  
  // Helper functions
  getChannelsByCustomer: (customerId: string) => {
    return dataset.channels.filter(c => c.customer_id === customerId);
  },
  
  getCampaignGroupsByChannel: (channelId: string) => {
    return dataset.campaignGroups.filter(g => g.channel_id === channelId);
  },
}));
