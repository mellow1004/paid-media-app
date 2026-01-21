import { create } from 'zustand';
import type { CampaignStatus, Customer, Channel } from '../types';
import { 
  mockCustomers,
  mockChannels, 
  mockCampaignGroups 
} from '../data/mockData';

interface DashboardStore {
  // Data
  customers: Customer[];
  channels: Channel[];
  
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
  getCampaignGroupsByChannel: (channelId: string) => typeof mockCampaignGroups;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initialize with mock data
  customers: mockCustomers,
  channels: mockChannels,
  
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
    return mockChannels.filter(c => c.customer_id === customerId);
  },
  
  getCampaignGroupsByChannel: (channelId: string) => {
    return mockCampaignGroups.filter(g => g.channel_id === channelId);
  },
}));
