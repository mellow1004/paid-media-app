import Papa from 'papaparse';
import { addDays, startOfDay, differenceInDays } from 'date-fns';
import { v5 as uuidv5 } from 'uuid';

import type { Campaign, CampaignGroup, CampaignStatus, Channel, ChannelName, Customer } from '../types';
import { csvSources } from './csvSources';
import type { CsvSource } from './csvSources';

export interface SimulationBaseline {
  totalBudget: number;
  dailyBudget: number;
}

export interface CsvDataset {
  customers: Customer[];
  channels: Channel[];
  campaignGroups: CampaignGroup[];
  campaigns: Campaign[];
  simulationBaselinesByCampaignId: Record<string, SimulationBaseline>;
}

type AnyRow = Record<string, string>;

const NOISE_KEYWORDS = ['total', 'adjustment', 'anticipated', 'by campaigns'];

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function normalizeHeader(header: string): string {
  return normalizeText(header)
    .toLowerCase()
    .replace(/GBP|SEK|USD|EUR/gi, '')
    .replace(/[£₤€$]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();
}

function rowContainsNoise(row: AnyRow): boolean {
  const all = Object.values(row).map(v => normalizeText(v).toLowerCase()).join(' | ');
  return NOISE_KEYWORDS.some(k => all.includes(k));
}

export function parseNumber(value: unknown): number {
  const raw = normalizeText(value);
  if (!raw) return 0;
  if (raw === '-' || raw === '—') return 0;

  // Some cells include notes like "plus £1,001.94" or "£78.80 (20 days)"
  const cleaned = raw
    .replace(/GBP|SEK/gi, '')
    .replace(/[£₤]/g, '')
    .replace(/kr/gi, '')
    .replace(/[–−]/g, '-') // normalize minus variants
    .replace(/plus/gi, '')
    .replace(/[^\d,.\-]/g, ' ')
    .trim();

  if (!cleaned) return 0;

  // Prefer the first numeric-like token
  const token = cleaned.split(/\s+/).find(t => /[\d]/.test(t));
  if (!token) return 0;

  const normalized = token.replace(/,/g, '');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: unknown): Date | null {
  const raw = normalizeText(value);
  if (!raw || raw === '-' || raw === '—') return null;

  // Accept ISO-ish formats directly
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(iso);

  // Handle M/D/YYYY or D/M/YYYY (we disambiguate using >12 rule)
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);

    const monthFirst = b > 12 || (a <= 12 && b <= 12); // default to M/D if ambiguous
    const month = monthFirst ? a : b;
    const day = monthFirst ? b : a;

    const d = new Date(y, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Try Date.parse fallback
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

function splitGroupCampaign(value: string): { group: string; campaign: string } | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  const parts = raw.split(/->|→/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { group: parts[0], campaign: parts.slice(1).join(' → ') };
}

function splitPathLike(value: string): string[] {
  return normalizeText(value)
    .replace(/\s*\|\s*/g, ' / ')
    .replace(/\s+I\s+/gi, ' / ')
    .replace(/:/g, ' / ')
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeGroupCampaign(customerName: string, groupName: string, campaignName: string): { groupName: string; campaignName: string } {
  const customerLower = customerName.toLowerCase();

  // If campaign name looks like a hierarchical path (common in these sheets), derive a consistent group + campaign.
  const campaignParts = splitPathLike(campaignName);
  const groupParts = splitPathLike(groupName);

  const stripPrefixes = (parts: string[]) =>
    parts.filter(p => {
      const pl = p.toLowerCase();
      return pl !== 'bv' && pl !== customerLower && pl !== 'brightvision';
    });

  const cleanedCampaign = stripPrefixes(campaignParts);
  const cleanedGroup = stripPrefixes(groupParts);

  // Prefer an explicit group if provided, but if it's a BV/customer-prefixed path, normalize to the first 2 logical segments.
  const normalizedGroupFromGroup =
    cleanedGroup.length >= 2 ? `${cleanedGroup[0]} / ${cleanedGroup[1]}` : cleanedGroup.join(' / ');

  const normalizedGroupFromCampaign =
    cleanedCampaign.length >= 2 ? `${cleanedCampaign[0]} / ${cleanedCampaign[1]}` : '';

  let finalGroup = normalizeText(normalizedGroupFromGroup || normalizedGroupFromCampaign || groupName);
  if (!finalGroup) finalGroup = 'Uncategorized';

  // If the campaign itself contains the group prefix, drop those first two segments to get the campaign "leaf" path.
  let finalCampaign = campaignName;
  if (cleanedCampaign.length >= 3) {
    finalCampaign = cleanedCampaign.slice(2).join(' / ');
  } else if (cleanedCampaign.length >= 1) {
    finalCampaign = cleanedCampaign.join(' / ');
  }

  return { groupName: finalGroup, campaignName: normalizeText(finalCampaign) || campaignName };
}

function inferCustomer(filename: string, group: string, campaign: string): string {
  const haystack = `${filename} ${group} ${campaign}`.toLowerCase();
  if (haystack.includes('nordcloud')) return 'Nordcloud';
  if (haystack.includes('decerno')) return 'Decerno';
  return 'Brightvision';
}

function inferChannelName(filename: string, group: string, campaign: string, platform?: string): ChannelName {
  const haystack = `${platform ?? ''} ${filename} ${group} ${campaign}`.toLowerCase();

  if (haystack.includes('linkedin')) return 'LinkedIn';
  if (haystack.includes('google')) return 'Google Ads';
  if (haystack.includes('meta') || haystack.includes('facebook') || haystack.includes('instagram')) return 'Meta Ads';

  // Heuristics based on campaign naming
  if (/(convo|spotlight|inmail|text ads|si ads)/i.test(haystack)) return 'LinkedIn';
  if (/(pmax|performance max|search ads|rda|display)/i.test(haystack)) return 'Google Ads';

  // Default to LinkedIn since most sheets are LinkedIn-focused
  return 'LinkedIn';
}

function normalizeCampaignKey(customerName: string, channelName: ChannelName, group: string, campaign: string): string {
  const base = `${customerName}|${channelName}|${group}|${campaign}`.toLowerCase();
  return base
    .replace(/\u00A0/g, ' ')
    .replace(/[|/]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && normalizeText(v) !== '') return v;
  }
  return '';
}

function parseCsvToRows(content: string): AnyRow[] {
  const result = Papa.parse<AnyRow>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    quoteChar: '"',
  });

  // Papa may return `unknown` keys; normalize to string map
  return (result.data ?? []).map((r) => {
    const out: AnyRow = {};
    for (const [k, v] of Object.entries(r ?? {})) out[normalizeHeader(k)] = normalizeText(v);
    return out;
  });
}

type CampaignAccumulator = {
  customerName: string;
  channelName: ChannelName;
  groupName: string;
  campaignName: string;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  spentToDate?: number;
  totalBudget?: number;
  dailyBudget?: number;
  simulatedTotalBudget?: number;
  simulatedDailyBudget?: number;
};

function parseStatus(row: AnyRow): CampaignStatus {
  const statusRaw = `${pick(row, ['status', 'current status'])} ${pick(row, ['off/on'])}`.toLowerCase();

  if (statusRaw.includes('complete') || statusRaw.includes('completed') || statusRaw.includes('draft') || statusRaw.includes('stopped')) {
    return 'stopped';
  }
  if (statusRaw.includes('pause') || statusRaw.includes('paused') || statusRaw.includes('off')) {
    return 'paused';
  }
  return 'active';
}

function calculateDefaultEndDate(start: Date): Date {
  // If an end date is missing in the spreadsheet, treat it as a rolling 30-day plan window.
  return addDays(startOfDay(start), 30);
}

function ensureDates(start: Date | undefined, end: Date | undefined): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  const startDate = start ? startOfDay(start) : today;
  const endDate = end ? startOfDay(end) : calculateDefaultEndDate(startDate);
  return { start: startDate, end: endDate };
}

export function buildDatasetFromCsvSources(sources: CsvSource[]): CsvDataset {
  const now = new Date();

  const accByKey = new Map<string, CampaignAccumulator>();

  for (const source of sources) {
    const rows = parseCsvToRows(source.content);
    for (const row of rows) {
      if (rowContainsNoise(row)) continue;

      // Find group + campaign columns
      const combined = pick(row, ['group → campaign', 'group -> campaign']);
      const split = combined ? splitGroupCampaign(combined) : null;

      const groupName = normalizeText(
        split?.group ||
          pick(row, ['campaign group', 'campaign group name', 'group'])
      );

      const campaignName = normalizeText(
        split?.campaign ||
          pick(row, ['campaign name', 'campaign'])
      );

      if (!campaignName) continue; // required

      const customerName = inferCustomer(source.filename, groupName, campaignName);
      const platform = pick(row, ['platform']);
      const channelName = inferChannelName(source.filename, groupName, campaignName, platform);

      const normalized = normalizeGroupCampaign(customerName, groupName, campaignName);
      const key = normalizeCampaignKey(customerName, channelName, normalized.groupName || 'Uncategorized', normalized.campaignName);
      const existing = accByKey.get(key) ?? {
        customerName,
        channelName,
        groupName: normalized.groupName || 'Uncategorized',
        campaignName: normalized.campaignName,
      };

      // Status
      const status = parseStatus(row);
      existing.status = existing.status ?? status;

      // Dates
      const startDate = parseDate(pick(row, ['start date']));
      const endDate = parseDate(pick(row, ['end date', 'the end date']));
      existing.startDate = existing.startDate ?? startDate ?? undefined;
      existing.endDate = existing.endDate ?? endDate ?? undefined;

      // Spent
      const spent = parseNumber(pick(row, ['spent', 'total spent', 'current budget utilisation', 'already spend', 'spent to date']));
      if (spent > 0) existing.spentToDate = Math.max(existing.spentToDate ?? 0, spent);

      // Budgets (current/original)
      const currentTotalBudget = parseNumber(
        pick(row, ['lifetime budget', 'current budget total', 'current total', 'current budget', 'current budget  total'])
      );
      if (currentTotalBudget > 0) existing.totalBudget = Math.max(existing.totalBudget ?? 0, currentTotalBudget);

      const currentDailyBudget = parseNumber(
        pick(row, ['daily budget', 'daily budget (campaign level)', 'current daily', 'daily budget old', 'daily budget (before december)', 'average daily spend'])
      );
      if (currentDailyBudget > 0) existing.dailyBudget = Math.max(existing.dailyBudget ?? 0, currentDailyBudget);

      // Budgets (simulated baseline from "New" columns)
      const newTotal = parseNumber(
        pick(row, ['new budget', 'new total', 'new budget allocation - campaign level', 'new budget for the next month 30 days', 'new budget if on from 25 - 30'])
      );
      if (newTotal > 0) existing.simulatedTotalBudget = newTotal;

      const newDaily = parseNumber(
        pick(row, ['new daily', 'new daily £', 'new daily budget', 'daily budget new', 'new daily budget 16–31 dec'])
      );
      if (newDaily > 0) existing.simulatedDailyBudget = newDaily;

      accByKey.set(key, existing);
    }
  }

  // Build entities
  const customersByName = new Map<string, Customer>();
  const channelsByKey = new Map<string, Channel>();
  const groupsByKey = new Map<string, CampaignGroup>();

  const campaigns: Campaign[] = [];
  const simulationBaselinesByCampaignId: Record<string, SimulationBaseline> = {};

  for (const acc of accByKey.values()) {
    const customerId = uuidv5(`customer:${acc.customerName}`, uuidv5.URL);
    if (!customersByName.has(acc.customerName)) {
      customersByName.set(acc.customerName, {
        customer_id: customerId,
        name: acc.customerName,
        currency: 'SEK',
        created_at: now,
        updated_at: now,
      });
    }

    const channelKey = `${customerId}|${acc.channelName}`;
    const channelId = uuidv5(`channel:${channelKey}`, uuidv5.URL);
    if (!channelsByKey.has(channelKey)) {
      channelsByKey.set(channelKey, {
        channel_id: channelId,
        name: acc.channelName,
        customer_id: customerId,
        created_at: now,
        updated_at: now,
      });
    }

    const groupName = acc.groupName || 'Uncategorized';
    const groupKey = `${channelId}|${groupName}`;
    const groupId = uuidv5(`group:${groupKey}`, uuidv5.URL);
    if (!groupsByKey.has(groupKey)) {
      groupsByKey.set(groupKey, {
        group_id: groupId,
        name: groupName,
        channel_id: channelId,
        created_at: now,
        updated_at: now,
      });
    }

    const { start, end } = ensureDates(acc.startDate, acc.endDate);

    const totalBudget = acc.totalBudget ?? 0;
    const spentToDate = acc.spentToDate ?? 0;

    // Fallback: if daily budget is missing but total budget exists, distribute over total flight days
    const totalFlightDays = Math.max(1, differenceInDays(end, start) + 1);
    const dailyBudget = acc.dailyBudget ?? (totalBudget > 0 ? totalBudget / totalFlightDays : 0);

    const campaignId = uuidv5(`campaign:${groupId}|${acc.campaignName}`, uuidv5.URL);

    campaigns.push({
      campaign_id: campaignId,
      group_id: groupId,
      name: acc.campaignName,
      start_date: start,
      end_date: end,
      total_budget: totalBudget,
      daily_budget: dailyBudget,
      actual_spend: spentToDate,
      status: acc.status ?? 'active',
      created_at: now,
      updated_at: now,
    });

    // Simulation baseline from "New" columns (or fallback to current)
    const baselineTotal = acc.simulatedTotalBudget ?? totalBudget;
    const baselineDaily = acc.simulatedDailyBudget ?? dailyBudget;
    simulationBaselinesByCampaignId[campaignId] = {
      totalBudget: baselineTotal,
      dailyBudget: baselineDaily,
    };
  }

  return {
    customers: Array.from(customersByName.values()).sort((a, b) => a.name.localeCompare(b.name)),
    channels: Array.from(channelsByKey.values()),
    campaignGroups: Array.from(groupsByKey.values()),
    campaigns,
    simulationBaselinesByCampaignId,
  };
}

export function buildDatasetFromCsv(): CsvDataset {
  return buildDatasetFromCsvSources(csvSources);
}

