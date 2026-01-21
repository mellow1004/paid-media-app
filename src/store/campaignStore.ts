import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Campaign, PauseWindow, Alert } from '../types';
import { 
  mockCampaigns, 
  mockPauseWindows, 
  mockAlerts,
  mockCampaignGroups,
  mockChannels,
  mockCustomers 
} from '../data/mockData';
import { 
  calculateDailyBudget, 
  forecastTotalSpend, 
  checkCampaignAlerts,
} from '../utils/budgetCalculations';
import type { ForecastResult, AlertCheck } from '../utils/budgetCalculations';
import { v4 as uuidv4 } from 'uuid';


interface CampaignStore {
  // Data
  campaigns: Campaign[];
  pauseWindows: PauseWindow[];
  alerts: Alert[];
  
  // Campaign CRUD
  getCampaign: (campaignId: string) => Campaign | undefined;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  updateCampaignSpend: (campaignId: string, newSpend: number) => void;
  
  // Pause Window CRUD
  getPauseWindows: (campaignId: string) => PauseWindow[];
  addPauseWindow: (data: { campaign_id: string; pause_start_date: Date; pause_end_date: Date }) => void;
  deletePauseWindow: (windowId: string) => void;
  
  // Calculations
  getCampaignForecast: (campaignId: string) => ForecastResult | null;
  getCampaignAlertCheck: (campaignId: string) => AlertCheck | null;
  recalculateCampaignBudget: (campaignId: string) => void;
  
  // Alert management
  generateAlertsForCampaign: (campaignId: string) => void;
  
  // Helpers
  getCampaignDetails: (campaignId: string) => {
    campaign: Campaign | undefined;
    group: typeof mockCampaignGroups[0] | undefined;
    channel: typeof mockChannels[0] | undefined;
    customer: typeof mockCustomers[0] | undefined;
    pauseWindows: PauseWindow[];
  };
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      // Initialize with mock data
      campaigns: mockCampaigns.map(c => ({ ...c })),
      pauseWindows: mockPauseWindows.map(pw => ({ ...pw })),
      alerts: mockAlerts.map(a => ({ ...a })),
      
      getCampaign: (campaignId: string) => {
        return get().campaigns.find(c => c.campaign_id === campaignId);
      },
      
      updateCampaign: (campaignId: string, updates: Partial<Campaign>) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) return;
        
        const pauseWindows = get().getPauseWindows(campaignId);
        
        // If budget or dates changed, recalculate daily budget
        const needsRecalculation = 
          updates.total_budget !== undefined ||
          updates.start_date !== undefined ||
          updates.end_date !== undefined;
        
        let newDailyBudget = campaign.daily_budget;
        
        if (needsRecalculation) {
          newDailyBudget = calculateDailyBudget(
            updates.total_budget ?? campaign.total_budget,
            updates.start_date ?? campaign.start_date,
            updates.end_date ?? campaign.end_date,
            pauseWindows
          );
        }
        
        set((state) => ({
          campaigns: state.campaigns.map(c => 
            c.campaign_id === campaignId 
              ? { ...c, ...updates, daily_budget: newDailyBudget, updated_at: new Date() }
              : c
          ),
        }));
        
        get().generateAlertsForCampaign(campaignId);
      },
      
      updateCampaignSpend: (campaignId: string, newSpend: number) => {
        set((state) => ({
          campaigns: state.campaigns.map(c => 
            c.campaign_id === campaignId 
              ? { ...c, actual_spend: newSpend, updated_at: new Date() }
              : c
          ),
        }));
        
        get().generateAlertsForCampaign(campaignId);
      },
      
      getPauseWindows: (campaignId: string) => {
        return get().pauseWindows.filter(pw => pw.campaign_id === campaignId);
      },
      
      addPauseWindow: (data) => {
        const newPauseWindow: PauseWindow = {
          window_id: uuidv4(),
          campaign_id: data.campaign_id,
          pause_start_date: data.pause_start_date,
          pause_end_date: data.pause_end_date,
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        set((state) => ({
          pauseWindows: [...state.pauseWindows, newPauseWindow],
        }));
        
        get().recalculateCampaignBudget(data.campaign_id);
      },
      
      deletePauseWindow: (windowId: string) => {
        const pauseWindow = get().pauseWindows.find(pw => pw.window_id === windowId);
        if (!pauseWindow) return;
        
        const campaignId = pauseWindow.campaign_id;
        
        set((state) => ({
          pauseWindows: state.pauseWindows.filter(pw => pw.window_id !== windowId),
        }));
        
        get().recalculateCampaignBudget(campaignId);
      },
      
      getCampaignForecast: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) return null;
        
        const pauseWindows = get().getPauseWindows(campaignId);
        return forecastTotalSpend(campaign, pauseWindows);
      },
      
      getCampaignAlertCheck: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) return null;
        
        const pauseWindows = get().getPauseWindows(campaignId);
        return checkCampaignAlerts(campaign, pauseWindows);
      },
      
      recalculateCampaignBudget: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) return;
        
        const pauseWindows = get().getPauseWindows(campaignId);
        
        const newDailyBudget = calculateDailyBudget(
          campaign.total_budget,
          campaign.start_date,
          campaign.end_date,
          pauseWindows
        );
        
        set((state) => ({
          campaigns: state.campaigns.map(c => 
            c.campaign_id === campaignId 
              ? { ...c, daily_budget: newDailyBudget, updated_at: new Date() }
              : c
          ),
        }));
        
        get().generateAlertsForCampaign(campaignId);
      },
      
      generateAlertsForCampaign: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) return;
        
        const pauseWindows = get().getPauseWindows(campaignId);
        const alertCheck = checkCampaignAlerts(campaign, pauseWindows);
        
        // Remove old unread alerts for this campaign
        set((state) => ({
          alerts: state.alerts.filter(a => 
            a.campaign_id !== campaignId || a.is_read
          ),
        }));
        
        const newAlerts: Alert[] = [];
        
        if (alertCheck.shouldTriggerUtilizationCritical) {
          newAlerts.push({
            alert_id: uuidv4(),
            campaign_id: campaignId,
            type: 'critical',
            message: `Budget utilization has reached ${alertCheck.utilizationPercent.toFixed(1)}%. Immediate action required.`,
            threshold: 95,
            current_value: alertCheck.utilizationPercent,
            is_read: false,
            created_at: new Date(),
          });
        } else if (alertCheck.shouldTriggerUtilizationWarning) {
          newAlerts.push({
            alert_id: uuidv4(),
            campaign_id: campaignId,
            type: 'warning',
            message: `Budget utilization has reached ${alertCheck.utilizationPercent.toFixed(1)}%. Consider reviewing budget allocation.`,
            threshold: 90,
            current_value: alertCheck.utilizationPercent,
            is_read: false,
            created_at: new Date(),
          });
        }
        
        if (alertCheck.shouldTriggerForecastOverrun) {
          newAlerts.push({
            alert_id: uuidv4(),
            campaign_id: campaignId,
            type: 'warning',
            message: `Forecast exceeds budget by ${alertCheck.forecastVariancePercent.toFixed(1)}%. Adjust daily budget to avoid overspending.`,
            threshold: 100,
            current_value: 100 + alertCheck.forecastVariancePercent,
            is_read: false,
            created_at: new Date(),
          });
        }
        
        if (newAlerts.length > 0) {
          set((state) => ({
            alerts: [...state.alerts, ...newAlerts],
          }));
        }
      },
      
      getCampaignDetails: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        const group = campaign 
          ? mockCampaignGroups.find(g => g.group_id === campaign.group_id)
          : undefined;
        const channel = group 
          ? mockChannels.find(ch => ch.channel_id === group.channel_id)
          : undefined;
        const customer = channel 
          ? mockCustomers.find(c => c.customer_id === channel.customer_id)
          : undefined;
        const pauseWindows = get().getPauseWindows(campaignId);
        
        return { campaign, group, channel, customer, pauseWindows };
      },
    }),
    {
      name: 'brightvision-campaigns',
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key, value) => {
          // Convert ISO date strings back to Date objects
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        campaigns: state.campaigns,
        pauseWindows: state.pauseWindows,
        alerts: state.alerts,
      }),
      onRehydrateStorage: () => (state) => {
        // Extra safety: ensure all dates are proper Date objects after rehydration
        if (state) {
          state.campaigns = state.campaigns.map(c => ({
            ...c,
            start_date: new Date(c.start_date),
            end_date: new Date(c.end_date),
            created_at: new Date(c.created_at),
            updated_at: new Date(c.updated_at),
          }));
          state.pauseWindows = state.pauseWindows.map(pw => ({
            ...pw,
            pause_start_date: new Date(pw.pause_start_date),
            pause_end_date: new Date(pw.pause_end_date),
            created_at: new Date(pw.created_at),
            updated_at: new Date(pw.updated_at),
          }));
          state.alerts = state.alerts.map(a => ({
            ...a,
            created_at: new Date(a.created_at),
          }));
        }
      },
    }
  )
);
