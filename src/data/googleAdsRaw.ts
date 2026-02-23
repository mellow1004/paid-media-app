import Papa from 'papaparse';

import googleNordcloud from '../../Copy of Budgets  - Google Nordcloud.csv?raw';

export type GoogleRawRow = {
  customer: string;
  campaign: string;
  dailyBudget: number;
  forecastedRemaining: number;
  totalSpent: number;
  status: string;
};

function cleanNumber(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw === '—') return 0;
  const cleaned = raw
    .replace(/GBP|SEK/gi, '')
    .replace(/[£₤]/g, '')
    .replace(/kr/gi, '')
    .replace(/,/g, '')
    .replace(/[^\d.\-]/g, '')
    .trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseGoogleNordcloudRaw(): GoogleRawRow[] {
  const parsed = Papa.parse<Record<string, string>>(googleNordcloud, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const rows = (parsed.data ?? [])
    .map((r) => ({
      campaign: (r['Campaign'] ?? '').trim(),
      dailyBudget: cleanNumber(r['Daily Budget']),
      forecastedRemaining: cleanNumber(r['Forecasted Remaining H2 Spend']),
      totalSpent: cleanNumber(r['Total spent '] ?? r['Total spent']),
      status: (r['Status'] ?? '').trim(),
    }))
    .filter((r) => r.campaign !== '');

  // This raw file is Nordcloud-specific.
  return rows.map((r) => ({ customer: 'Nordcloud', ...r }));
}

