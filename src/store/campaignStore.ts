import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Campaign, PauseWindow, Alert } from '../types';
import { dataset } from '../data/dataset';
import type { CsvDataset } from '../data/buildDatasetFromCsv';
import { 
  calculateDailyBudget, 
  forecastTotalSpend, 
  checkCampaignAlerts,
} from '../utils/budgetCalculations';
import type { ForecastResult, AlertCheck } from '../utils/budgetCalculations';
import { v4 as uuidv4 } from 'uuid';
import type { SimulationBaseline } from '../data/buildDatasetFromCsv';
import { mergeCampaign, mergeSimulationBaselines } from '../data/mergeDatasets';


interface CampaignStore {
  // Data
  campaigns: Campaign[];
  invalidCampaigns: Campaign[];
  pauseWindows: PauseWindow[];
  alerts: Alert[];

  // Simulation (per-campaign)
  simulationByCampaignId: Record<string, SimulationBaseline>;
  
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

  // Simulation actions
  setSimulation: (campaignId: string, updates: Partial<SimulationBaseline>) => void;
  resetSimulation: (campaignId: string) => void;
  resetAllSimulations: () => void;
  
  // Helpers
  getCampaignDetails: (campaignId: string) => {
    campaign: Campaign | undefined;
    groupName: string | undefined;
    channelName: string | undefined;
    customerName: string | undefined;
    pauseWindows: PauseWindow[];
  };

  // CSV upload integration
  mergeInDataset: (added: CsvDataset) => void;
  resetToBaseDataset: () => void;
}

function isValidCampaignForCalculations(c: Campaign): { ok: boolean; reason?: string } {
  if (!Number.isFinite(c.total_budget) || c.total_budget <= 0) return { ok: false, reason: 'Missing/invalid total budget' };
  const start = new Date(c.start_date);
  const end = new Date(c.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, reason: 'Missing/invalid dates' };
  if (end.getTime() < start.getTime()) return { ok: false, reason: 'End date is before start date' };
  if (!Number.isFinite(c.actual_spend) || c.actual_spend < 0) return { ok: false, reason: 'Missing/invalid spend' };
  return { ok: true };
}

function buildAlertsForCampaigns(campaigns: Campaign[]): Alert[] {
  return campaigns.flatMap((c) => {
    const check = checkCampaignAlerts(c, []);
    const out: Alert[] = [];
    if (check.shouldTriggerUtilizationCritical) {
      out.push({
        alert_id: uuidv4(),
        campaign_id: c.campaign_id,
        type: 'critical',
        message: `Budget utilization has reached ${check.utilizationPercent.toFixed(2)}%. Immediate action required.`,
        threshold: 100,
        current_value: check.utilizationPercent,
        is_read: false,
        created_at: new Date(),
      });
    } else if (check.shouldTriggerUtilizationWarning) {
      out.push({
        alert_id: uuidv4(),
        campaign_id: c.campaign_id,
        type: 'warning',
        message: `Budget utilization has reached ${check.utilizationPercent.toFixed(2)}%. Consider reviewing budget allocation.`,
        threshold: 90,
        current_value: check.utilizationPercent,
        is_read: false,
        created_at: new Date(),
      });
    }
    if (check.shouldTriggerStatusAlert) {
      out.push({
        alert_id: uuidv4(),
        campaign_id: c.campaign_id,
        type: 'info',
        message: `Status alert: campaign is PAUSED while within active flight dates.`,
        threshold: 0,
        current_value: 0,
        is_read: false,
        created_at: new Date(),
      });
    }
    return out;
  });
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      // Initialize with CSV-built data
      campaigns: dataset.campaigns
        .map(c => ({ ...c }))
        .filter((c) => isValidCampaignForCalculations(c).ok),
      invalidCampaigns: dataset.campaigns
        .map(c => ({ ...c }))
        .filter((c) => !isValidCampaignForCalculations(c).ok),
      pauseWindows: [],
      alerts: buildAlertsForCampaigns(dataset.campaigns.filter((c) => isValidCampaignForCalculations(c).ok)),
      simulationByCampaignId: { ...dataset.simulationBaselinesByCampaignId },
      
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
            message: `Budget utilization has reached ${alertCheck.utilizationPercent.toFixed(2)}%. Immediate action required.`,
            threshold: 100,
            current_value: alertCheck.utilizationPercent,
            is_read: false,
            created_at: new Date(),
          });
        } else if (alertCheck.shouldTriggerUtilizationWarning) {
          newAlerts.push({
            alert_id: uuidv4(),
            campaign_id: campaignId,
            type: 'warning',
            message: `Budget utilization has reached ${alertCheck.utilizationPercent.toFixed(2)}%. Consider reviewing budget allocation.`,
            threshold: 90,
            current_value: alertCheck.utilizationPercent,
            is_read: false,
            created_at: new Date(),
          });
        }
        
        if (alertCheck.shouldTriggerStatusAlert) {
          newAlerts.push({
            alert_id: uuidv4(),
            campaign_id: campaignId,
            type: 'info',
            message: `Status alert: campaign is PAUSED while within active flight dates.`,
            threshold: 0,
            current_value: 0,
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

      setSimulation: (campaignId, updates) => {
        set((state) => ({
          simulationByCampaignId: {
            ...state.simulationByCampaignId,
            [campaignId]: {
              ...(state.simulationByCampaignId[campaignId] ?? dataset.simulationBaselinesByCampaignId[campaignId]),
              ...updates,
            },
          },
        }));
      },

      resetSimulation: (campaignId) => {
        set((state) => ({
          simulationByCampaignId: {
            ...state.simulationByCampaignId,
            [campaignId]: dataset.simulationBaselinesByCampaignId[campaignId] ?? { totalBudget: 0, dailyBudget: 0 },
          },
        }));
      },

      resetAllSimulations: () => {
        set(() => ({
          simulationByCampaignId: { ...dataset.simulationBaselinesByCampaignId },
        }));
      },
      
      getCampaignDetails: (campaignId: string) => {
        const campaign = get().getCampaign(campaignId);
        const group = campaign ? dataset.campaignGroups.find(g => g.group_id === campaign.group_id) : undefined;
        const channel = group ? dataset.channels.find(ch => ch.channel_id === group.channel_id) : undefined;
        const customer = channel ? dataset.customers.find(c => c.customer_id === channel.customer_id) : undefined;
        const pauseWindows = get().getPauseWindows(campaignId);
        
        return { 
          campaign, 
          groupName: group?.name, 
          channelName: channel?.name, 
          customerName: customer?.name, 
          pauseWindows 
        };
      },

      mergeInDataset: (added) => {
        const baseCampaigns = get().campaigns;
        const baseInvalid = get().invalidCampaigns;
        const map = new Map<string, Campaign>(baseCampaigns.map(c => [c.campaign_id, c]));
        const invalidNext: Campaign[] = [...baseInvalid];

        for (const c of added.campaigns) {
          const validity = isValidCampaignForCalculations(c);
          if (!validity.ok) {
            invalidNext.push(c);
            continue;
          }
          const existing = map.get(c.campaign_id);
          map.set(c.campaign_id, existing ? mergeCampaign(existing, c) : c);
        }

        const mergedCampaigns = Array.from(map.values());
        const mergedBaselines = mergeSimulationBaselines(get().simulationByCampaignId, added.simulationBaselinesByCampaignId);

        set({
          campaigns: mergedCampaigns,
          invalidCampaigns: invalidNext,
          simulationByCampaignId: mergedBaselines,
          alerts: buildAlertsForCampaigns(mergedCampaigns),
        });
      },

      resetToBaseDataset: () => {
        set({
          campaigns: dataset.campaigns
            .map(c => ({ ...c }))
            .filter((c) => isValidCampaignForCalculations(c).ok),
          invalidCampaigns: dataset.campaigns
            .map(c => ({ ...c }))
            .filter((c) => !isValidCampaignForCalculations(c).ok),
          pauseWindows: [],
          simulationByCampaignId: { ...dataset.simulationBaselinesByCampaignId },
          alerts: buildAlertsForCampaigns(dataset.campaigns.filter((c) => isValidCampaignForCalculations(c).ok)),
        });
      },
    }),
    {
      name: 'brightvision-campaigns-csv-v1',
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
        invalidCampaigns: state.invalidCampaigns,
        pauseWindows: state.pauseWindows,
        alerts: state.alerts,
        simulationByCampaignId: state.simulationByCampaignId,
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
          state.invalidCampaigns = (state.invalidCampaigns ?? []).map(c => ({
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
