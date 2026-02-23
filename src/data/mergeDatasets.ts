import type { CsvDataset, SimulationBaseline } from './buildDatasetFromCsv';
import type { Campaign, CampaignStatus } from '../types';

function statusWeight(s: CampaignStatus): number {
  // Keep the "most stopped" interpretation when merging.
  // active < paused < stopped
  if (s === 'stopped') return 2;
  if (s === 'paused') return 1;
  return 0;
}

function mergeStatus(a: CampaignStatus, b: CampaignStatus): CampaignStatus {
  return statusWeight(b) > statusWeight(a) ? b : a;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function mergeCampaign(base: Campaign, added: Campaign): Campaign {
  const mergedTotalBudget = added.total_budget > 0 ? added.total_budget : base.total_budget;
  const mergedDailyBudget = added.daily_budget > 0 ? added.daily_budget : base.daily_budget;

  return {
    ...base,
    ...added,
    // Prefer not decreasing spend when merging.
    actual_spend: Math.max(base.actual_spend ?? 0, added.actual_spend ?? 0),
    total_budget: mergedTotalBudget,
    daily_budget: mergedDailyBudget,
    // Use widest flight window when merging.
    start_date: minDate(new Date(base.start_date), new Date(added.start_date)),
    end_date: maxDate(new Date(base.end_date), new Date(added.end_date)),
    status: mergeStatus(base.status, added.status),
    updated_at: new Date(),
  };
}

function upsertById<T, K extends keyof T>(items: T[], idKey: K): T[] {
  const map = new Map<string, T>();
  for (const it of items) map.set(String((it as any)[idKey]), it);
  return Array.from(map.values());
}

export function mergeSimulationBaselines(
  base: Record<string, SimulationBaseline>,
  added: Record<string, SimulationBaseline>
): Record<string, SimulationBaseline> {
  // Added overrides base for the same campaignId (so "New" columns win).
  return { ...base, ...added };
}

export function mergeDatasets(base: CsvDataset, added: CsvDataset): CsvDataset {
  const campaignsById = new Map<string, Campaign>();
  for (const c of base.campaigns) campaignsById.set(c.campaign_id, c);

  for (const c of added.campaigns) {
    const existing = campaignsById.get(c.campaign_id);
    campaignsById.set(c.campaign_id, existing ? mergeCampaign(existing, c) : c);
  }

  const customers = upsertById([...base.customers, ...added.customers], 'customer_id');
  const channels = upsertById([...base.channels, ...added.channels], 'channel_id');
  const campaignGroups = upsertById([...base.campaignGroups, ...added.campaignGroups], 'group_id');

  return {
    customers: customers.slice().sort((a, b) => a.name.localeCompare(b.name)),
    channels,
    campaignGroups,
    campaigns: Array.from(campaignsById.values()),
    simulationBaselinesByCampaignId: mergeSimulationBaselines(
      base.simulationBaselinesByCampaignId,
      added.simulationBaselinesByCampaignId
    ),
  };
}

