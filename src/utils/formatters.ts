import { Currency } from '../types';

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: Currency = 'SEK'): string {
  const formatter = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large number with abbreviations (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a date to Swedish locale
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a date range
 */
export function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Get status color class
 */
export function getStatusColor(status: 'Active' | 'Paused' | 'Stopped'): string {
  switch (status) {
    case 'Active':
      return 'text-active bg-active/10';
    case 'Paused':
      return 'text-paused bg-paused/10';
    case 'Stopped':
      return 'text-stopped bg-stopped/10';
    default:
      return 'text-gray-500 bg-gray-100';
  }
}

/**
 * Get channel color
 */
export function getChannelColor(channel: 'Google' | 'LinkedIn' | 'Meta'): string {
  switch (channel) {
    case 'Google':
      return '#4285F4';
    case 'LinkedIn':
      return '#0A66C2';
    case 'Meta':
      return '#1877F2';
    default:
      return '#6B7280';
  }
}

/**
 * Get utilization color based on percentage
 */
export function getUtilizationColor(utilization: number): string {
  if (utilization >= 95) return 'text-red-600 bg-red-50';
  if (utilization >= 90) return 'text-amber-600 bg-amber-50';
  if (utilization >= 75) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

/**
 * Get utilization bar color
 */
export function getUtilizationBarColor(utilization: number): string {
  if (utilization >= 95) return 'bg-red-500';
  if (utilization >= 90) return 'bg-amber-500';
  if (utilization >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

