import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CampaignStatus, Customer, Channel } from '../types';
import type { CampaignGroup } from '../types';
import { dataset } from '../data/dataset';
import type { CsvDataset } from '../data/buildDatasetFromCsv';
import { mergeDatasets } from '../data/mergeDatasets';

interface DashboardStore {
  // Data
  customers: Customer[];
  channels: Channel[];
  campaignGroups: CampaignGroup[];
  baseDataset: Pick<CsvDataset, 'customers' | 'channels' | 'campaignGroups'>;
  
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

  // CSV upload integration
  mergeInDataset: (added: CsvDataset) => void;
  resetToBaseDataset: () => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      baseDataset: {
        customers: dataset.customers,
        channels: dataset.channels,
        campaignGroups: dataset.campaignGroups,
      },

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
        return get().channels.filter(c => c.customer_id === customerId);
      },
  
      getCampaignGroupsByChannel: (channelId: string) => {
        return get().campaignGroups.filter(g => g.channel_id === channelId);
      },

      mergeInDataset: (added) => {
        const current: CsvDataset = {
          customers: get().customers,
          channels: get().channels,
          campaignGroups: get().campaignGroups,
          campaigns: [],
          simulationBaselinesByCampaignId: {},
        };
        const merged = mergeDatasets(current, added);
        set({
          customers: merged.customers,
          channels: merged.channels,
          campaignGroups: merged.campaignGroups,
        });
      },

      resetToBaseDataset: () => {
        const base = get().baseDataset;
        set({
          customers: base.customers,
          channels: base.channels,
          campaignGroups: base.campaignGroups,
          selectedCustomerId: null,
          selectedChannelId: null,
          selectedCampaignStatus: null,
        });
      },
    }),
    {
      name: 'brightvision-dashboard-csv-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        customers: state.customers,
        channels: state.channels,
        campaignGroups: state.campaignGroups,
        selectedCustomerId: state.selectedCustomerId,
        selectedChannelId: state.selectedChannelId,
        selectedCampaignStatus: state.selectedCampaignStatus,
      }),
    }
  )
);
